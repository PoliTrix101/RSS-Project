const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { randomInt, randomUUID } = require('crypto')
const fs = require('fs')
const db = require('../db')
const { resolveDocumentPath, getDocumentMimeType } = require('../document-storage')
const { nowInAppZone } = require('../app-time')
const { PHOTO_KINDS, sendAttendancePhoto } = require('../attendance-photos')

const router = express.Router()
const requiredHours = 340
const accountStatuses = new Set(['pending', 'approved', 'rejected', 'disabled'])

async function authenticateAdmin(req, res, next) {
  const authorization = req.get('authorization')
  const match = authorization && authorization.match(/^Bearer\s+(.+)$/i)

  if (!match) {
    return res.status(401).json({
      success: false,
      message: 'Administrator authentication is required.'
    })
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is missing from backend/.env')
    return res.status(500).json({
      success: false,
      message: 'Authentication is not configured on the server.'
    })
  }

  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET)

    if (!payload || typeof payload !== 'object' || payload.role !== 'admin' || !payload.id) {
      return res.status(403).json({
        success: false,
        message: 'Administrator access is required.'
      })
    }

    const result = await db.execute({
      sql: `
        SELECT id
        FROM users
        WHERE id = ?
          AND role = 'admin'
          AND account_status = 'approved'
      `,
      args: [String(payload.id)]
    })

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Administrator access is required.'
      })
    }

    req.admin = { id: String(payload.id) }
    return next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session is invalid or has expired.'
      })
    }

    console.error('Admin authentication error:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to verify administrator access.'
    })
  }
}

function getOptionalQueryString(value, field, maxLength, res) {
  if (value === undefined) return null

  if (typeof value !== 'string' || value.length > maxLength) {
    res.status(400).json({
      success: false,
      message: `${field} must be a text value no longer than ${maxLength} characters.`
    })
    return undefined
  }

  const trimmed = value.trim()
  return trimmed || null
}

function validateStudentId(value, res) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 128) {
    res.status(400).json({
      success: false,
      message: 'A valid student account ID is required.'
    })
    return null
  }

  return value.trim()
}

function validateRecordId(value, res, label = 'Record') {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 128) {
    res.status(400).json({
      success: false,
      message: `${label} ID is invalid.`
    })
    return null
  }
  return value.trim()
}

// Activity times are local wall-clock values from a datetime-local input
// (YYYY-MM-DDTHH:MM). The student routes compare them with the local time in SQL,
// so a time zone suffix or any other format would be compared incorrectly.
function isValidSchedule(value) {
  const match = typeof value === 'string' &&
    value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return false

  const [year, month, day, hour, minute, second] = match.slice(1).map(part => Number(part || 0))
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day && date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute && date.getUTCSeconds() === second
}

function isValidCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function validateOptionalReason(req, res) {
  const reason = req.body && req.body.reason
  if (reason === undefined || reason === null || reason === '') return null
  if (typeof reason !== 'string' || reason.trim().length > 500) {
    res.status(400).json({
      success: false,
      message: 'Reason must be text no longer than 500 characters.'
    })
    return undefined
  }
  return reason.trim() || null
}

async function getHourProgress(studentId, executor = db) {
  const result = await executor.execute({
    sql: `
      SELECT
        COALESCE((
          SELECT SUM(total_hours)
          FROM attendance
          WHERE student_id = ? AND status = 'approved'
        ), 0) +
        COALESCE((
          SELECT SUM(
            CASE
              WHEN adjustment_type = 'add' THEN adjustment_amount
              ELSE -adjustment_amount
            END
          )
          FROM hour_adjustments
          WHERE student_id = ?
        ), 0) AS completed_hours
    `,
    args: [studentId, studentId]
  })

  const completedHours = Math.max(0, Number(result.rows[0].completed_hours) || 0)
  const remainingHours = Math.max(0, requiredHours - completedHours)

  return {
    requiredHours,
    completedHours,
    remainingHours,
    completionPercentage: Math.min(
      100,
      Number(((completedHours / requiredHours) * 100).toFixed(2))
    )
  }
}

async function changeStudentStatus(req, res, nextStatus, expectedStatus, action) {
  const studentId = validateStudentId(req.params.id, res)
  if (!studentId) return

  let reason = null
  if (req.body && req.body.reason !== undefined) {
    if (typeof req.body.reason !== 'string' || req.body.reason.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Reason must be text no longer than 500 characters.'
      })
    }
    reason = req.body.reason.trim() || null
  }

  let transaction
  try {
    transaction = await db.transaction('write')

    const update = await transaction.execute({
      sql: `
        UPDATE users
        SET account_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND role = 'student'
          AND account_status = ?
      `,
      args: [nextStatus, studentId, expectedStatus]
    })

    if (Number(update.rowsAffected) === 0) {
      const target = await transaction.execute({
        sql: 'SELECT role, account_status FROM users WHERE id = ?',
        args: [studentId]
      })

      await transaction.rollback()
      transaction = null

      if (target.rows.length === 0 || target.rows[0].role !== 'student') {
        return res.status(404).json({
          success: false,
          message: 'Student account was not found.'
        })
      }

      return res.status(409).json({
        success: false,
        message: `Student account must be ${expectedStatus} before it can be ${nextStatus}.`
      })
    }

    await transaction.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, student_id, action, reason)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [randomUUID(), req.admin.id, studentId, action, reason]
    })

    const notification = {
      student_approved: ['Account approved', 'Your student account has been approved.'],
      student_rejected: ['Registration rejected', 'Your student registration was rejected.'],
      student_disabled: ['Account disabled', 'Your student account has been disabled.'],
      student_enabled: ['Account re-enabled', 'Your student account has been re-enabled.']
    }[action]
    await transaction.execute({
      sql: `
        INSERT INTO notifications (id, user_id, title, message)
        VALUES (?, ?, ?, ?)
      `,
      args: [randomUUID(), studentId, notification[0], notification[1]]
    })

    await transaction.commit()
    transaction = null

    return res.json({
      success: true,
      message: `Student account ${nextStatus}.`,
      account_status: nextStatus
    })
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back student status update:', rollbackError)
      }
    }

    console.error('Student status update error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update student account status.'
    })
  }
}

router.use(authenticateAdmin)

router.get('/dashboard-stats', async (req, res) => {
  try {
    const [
      studentCounts,
      serviceHours,
      attendanceCounts,
      pendingDocuments,
      recentRegistrations,
      pendingAttendance,
      recentActivities,
      courseDistribution,
      yearLevelDistribution
    ] = await Promise.all([
      db.execute(`
        SELECT
          COUNT(*) AS total_students,
          SUM(CASE WHEN account_status = 'approved' THEN 1 ELSE 0 END) AS approved_students,
          SUM(CASE WHEN account_status = 'pending' THEN 1 ELSE 0 END) AS pending_registrations,
          SUM(CASE WHEN account_status = 'rejected' THEN 1 ELSE 0 END) AS rejected_students
        FROM users
        WHERE role = 'student'
      `),
      db.execute(`
        WITH student_hours AS (
          SELECT
            u.id,
            COALESCE(attendance.approved_hours, 0) +
              COALESCE(adjustments.adjusted_hours, 0) AS completed_hours
          FROM users u
          LEFT JOIN (
            SELECT student_id, SUM(total_hours) AS approved_hours
            FROM attendance
            WHERE status = 'approved'
            GROUP BY student_id
          ) attendance ON attendance.student_id = u.id
          LEFT JOIN (
            SELECT
              student_id,
              SUM(CASE WHEN adjustment_type = 'add' THEN adjustment_amount ELSE -adjustment_amount END) AS adjusted_hours
            FROM hour_adjustments
            GROUP BY student_id
          ) adjustments ON adjustments.student_id = u.id
          WHERE u.role = 'student'
        )
        SELECT
          COALESCE(SUM(CASE WHEN completed_hours > 0 THEN completed_hours ELSE 0 END), 0) AS completed_hours,
          SUM(CASE WHEN completed_hours >= ? THEN 1 ELSE 0 END) AS completed_students,
          SUM(CASE WHEN completed_hours > 0 AND completed_hours < ? THEN 1 ELSE 0 END) AS in_progress_students,
          SUM(CASE WHEN completed_hours <= 0 THEN 1 ELSE 0 END) AS not_started_students
        FROM student_hours
      `, [requiredHours, requiredHours]),
      db.execute(`
        SELECT
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
        FROM attendance
      `),
      db.execute("SELECT COUNT(*) AS total FROM documents WHERE status = 'pending'"),
      db.execute(`
        SELECT
          u.id,
          u.student_id,
          TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS full_name,
          u.course,
          u.year_level,
          u.account_status,
          u.created_at AS registration_date,
          s.section_name AS section
        FROM users u
        LEFT JOIN sections s ON s.id = u.section_id
        WHERE u.role = 'student'
        ORDER BY u.created_at DESC
        LIMIT 6
      `),
      db.execute(`
        SELECT
          a.id,
          u.student_id,
          TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS student_name,
          a.attendance_date,
          a.time_in,
          a.time_out,
          a.total_hours,
          a.status
        FROM attendance a
        JOIN users u ON u.id = a.student_id
        WHERE a.status = 'pending'
        ORDER BY a.attendance_date ASC, a.created_at ASC
        LIMIT 6
      `),
      db.execute(`
        SELECT *
        FROM (
          SELECT
            'log:' || l.id AS id,
            l.action,
            TRIM(COALESCE(admin.first_name, 'Administrator') || ' ' || COALESCE(admin.last_name, '')) AS actor_name,
            TRIM(COALESCE(student.first_name || ' ', '') || COALESCE(student.middle_name || ' ', '') || COALESCE(student.last_name, '')) AS student_name,
            l.created_at,
            l.reason
          FROM activity_logs l
          LEFT JOIN users admin ON admin.id = l.admin_id
          LEFT JOIN users student ON student.id = l.student_id

          UNION ALL

          SELECT
            'registration:' || u.id AS id,
            'student_registered' AS action,
            'System' AS actor_name,
            TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS student_name,
            u.created_at,
            NULL AS reason
          FROM users u
          WHERE u.role = 'student'
        )
        ORDER BY created_at DESC
        LIMIT 8
      `),
      db.execute(`
        SELECT COALESCE(NULLIF(TRIM(course), ''), 'Unspecified') AS label, COUNT(*) AS total
        FROM users
        WHERE role = 'student'
        GROUP BY COALESCE(NULLIF(TRIM(course), ''), 'Unspecified')
        ORDER BY total DESC, label
        LIMIT 8
      `),
      db.execute(`
        SELECT COALESCE(NULLIF(TRIM(year_level), ''), 'Unspecified') AS label, COUNT(*) AS total
        FROM users
        WHERE role = 'student'
        GROUP BY COALESCE(NULLIF(TRIM(year_level), ''), 'Unspecified')
        ORDER BY total DESC, label
        LIMIT 8
      `)
    ])

    return res.json({
      success: true,
      stats: {
        totalStudents: Number(studentCounts.rows[0].total_students || 0),
        approvedStudents: Number(studentCounts.rows[0].approved_students || 0),
        pendingRegistrations: Number(studentCounts.rows[0].pending_registrations || 0),
        pendingApprovals: Number(studentCounts.rows[0].pending_registrations || 0),
        rejectedStudents: Number(studentCounts.rows[0].rejected_students || 0),
        completedHours: Number(serviceHours.rows[0].completed_hours || 0),
        completedStudents: Number(serviceHours.rows[0].completed_students || 0),
        pendingAttendance: Number(attendanceCounts.rows[0].pending || 0),
        pendingDocuments: Number(pendingDocuments.rows[0].total || 0)
      },
      recentRegistrations: recentRegistrations.rows,
      pendingAttendance: pendingAttendance.rows,
      recentActivities: recentActivities.rows,
      distributions: {
        courses: courseDistribution.rows.map(row => ({ label: row.label, total: Number(row.total) })),
        yearLevels: yearLevelDistribution.rows.map(row => ({ label: row.label, total: Number(row.total) })),
        serviceHours: {
          completed: Number(serviceHours.rows[0].completed_students || 0),
          inProgress: Number(serviceHours.rows[0].in_progress_students || 0),
          notStarted: Number(serviceHours.rows[0].not_started_students || 0)
        },
        attendance: {
          pending: Number(attendanceCounts.rows[0].pending || 0),
          approved: Number(attendanceCounts.rows[0].approved || 0),
          rejected: Number(attendanceCounts.rows[0].rejected || 0)
        }
      }
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load dashboard statistics.'
    })
  }
})

router.get('/students', async (req, res) => {
  const search = getOptionalQueryString(req.query.search, 'Search', 100, res)
  if (search === undefined) return

  const course = getOptionalQueryString(req.query.course, 'Course', 100, res)
  if (course === undefined) return

  const yearLevel = getOptionalQueryString(req.query.year_level, 'Year level', 50, res)
  if (yearLevel === undefined) return

  const section = getOptionalQueryString(req.query.section, 'Section', 100, res)
  if (section === undefined) return

  const status = getOptionalQueryString(req.query.status, 'Status', 20, res)
  if (status === undefined) return
  if (status && !accountStatuses.has(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status filter is invalid.'
    })
  }

  const conditions = ["u.role = 'student'"]
  const args = []

  if (search) {
    conditions.push(`(
      u.student_id LIKE ?
      OR u.first_name LIKE ?
      OR u.middle_name LIKE ?
      OR u.last_name LIKE ?
      OR (u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) LIKE ?
    )`)
    const pattern = `%${search}%`
    args.push(pattern, pattern, pattern, pattern, pattern)
  }
  if (course) {
    conditions.push('u.course = ?')
    args.push(course)
  }
  if (yearLevel) {
    conditions.push('u.year_level = ?')
    args.push(yearLevel)
  }
  if (section) {
    conditions.push('s.section_name = ?')
    args.push(section)
  }
  if (status) {
    conditions.push('u.account_status = ?')
    args.push(status)
  }

  try {
    const [students, filterOptions] = await Promise.all([
      db.execute({
        sql: `
          SELECT
            u.id,
            u.student_id,
            u.first_name,
            u.middle_name,
            u.last_name,
            TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS full_name,
            u.email,
            u.course,
            u.year_level,
            u.account_status,
            u.created_at AS registration_date,
            s.section_name AS section
          FROM users u
          LEFT JOIN sections s ON s.id = u.section_id
          WHERE ${conditions.join(' AND ')}
          ORDER BY u.created_at DESC, u.last_name, u.first_name
        `,
        args
      }),
      db.execute(`
        SELECT DISTINCT users.course, users.year_level, sections.section_name
        FROM users
        LEFT JOIN sections ON sections.id = users.section_id
        WHERE users.role = 'student'
        ORDER BY users.course, users.year_level, sections.section_name
      `)
    ])

    const options = {
      courses: [...new Set(filterOptions.rows.map(row => row.course).filter(Boolean))],
      yearLevels: [...new Set(filterOptions.rows.map(row => row.year_level).filter(Boolean))],
      sections: [...new Set(filterOptions.rows.map(row => row.section_name).filter(Boolean))]
    }

    return res.json({ success: true, students: students.rows, filters: options })
  } catch (error) {
    console.error('Admin student list error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load student accounts.'
    })
  }
})

router.get('/students/:id', async (req, res) => {
  const studentId = validateStudentId(req.params.id, res)
  if (!studentId) return

  try {
    const result = await db.execute({
      sql: `
        SELECT
          u.id,
          u.student_id,
          u.first_name,
          u.middle_name,
          u.last_name,
          TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS full_name,
          u.email,
          u.contact_number,
          u.course,
          u.year_level,
          u.account_status,
          u.created_at AS registration_date,
          u.updated_at,
          s.section_name AS section
        FROM users u
        LEFT JOIN sections s ON s.id = u.section_id
        WHERE u.id = ? AND u.role = 'student'
      `,
      args: [studentId]
    })

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student account was not found.'
      })
    }

    const [progress, attendance, serviceActivities] = await Promise.all([
      getHourProgress(studentId),
      db.execute({
        sql: `
          SELECT id, attendance_date, time_in, time_out, total_hours, status, admin_remarks, created_at
          FROM attendance
          WHERE student_id = ?
          ORDER BY attendance_date DESC, created_at DESC
        `,
        args: [studentId]
      }),
      db.execute({
        sql: `
          SELECT
            r.id,
            r.service_date,
            r.activity_description,
            r.total_hours,
            r.status,
            a.area_name AS service_area,
            r.created_at
          FROM service_records r
          LEFT JOIN service_areas a ON a.id = r.area_id
          WHERE r.student_id = ?
          ORDER BY r.service_date DESC, r.created_at DESC
        `,
        args: [studentId]
      })
    ])

    return res.json({
      success: true,
      student: result.rows[0],
      progress,
      attendance: attendance.rows,
      serviceActivities: serviceActivities.rows
    })
  } catch (error) {
    console.error('Admin student detail error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load student details.'
    })
  }
})

router.patch('/students/:id/approve', (req, res) => {
  return changeStudentStatus(req, res, 'approved', 'pending', 'student_approved')
})

router.patch('/students/:id/reject', (req, res) => {
  return changeStudentStatus(req, res, 'rejected', 'pending', 'student_rejected')
})

router.patch('/students/:id/disable', (req, res) => {
  return changeStudentStatus(req, res, 'disabled', 'approved', 'student_disabled')
})

router.patch('/students/:id/enable', (req, res) => {
  return changeStudentStatus(req, res, 'approved', 'disabled', 'student_enabled')
})

// No look-alike characters (0/O, 1/l/I), so the password is easy to read out and type.
const temporaryPasswordAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

function createTemporaryPassword(length = 12) {
  let password = ''
  for (let index = 0; index < length; index++) {
    password += temporaryPasswordAlphabet[randomInt(temporaryPasswordAlphabet.length)]
  }
  return password
}

router.patch('/students/:id/reset-password', async (req, res) => {
  const studentId = validateStudentId(req.params.id, res)
  if (!studentId) return

  let transaction
  try {
    const temporaryPassword = createTemporaryPassword()
    // Hash before taking the write lock: bcrypt is deliberately slow.
    const passwordHash = await bcrypt.hash(temporaryPassword, 12)

    transaction = await db.transaction('write')
    const update = await transaction.execute({
      sql: `
        UPDATE users
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND role = 'student'
      `,
      args: [passwordHash, studentId]
    })
    if (Number(update.rowsAffected) === 0) {
      await transaction.rollback()
      transaction = null
      return res.status(404).json({
        success: false,
        message: 'Student account was not found.'
      })
    }

    await transaction.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, student_id, action, reason)
        VALUES (?, ?, ?, 'student_password_reset', NULL)
      `,
      args: [randomUUID(), req.admin.id, studentId]
    })
    await transaction.execute({
      sql: `
        INSERT INTO notifications (id, user_id, title, message)
        VALUES (?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        studentId,
        'Password reset',
        'An administrator reset your password. Sign in with the temporary password they gave you, then choose a new one under Settings.'
      ]
    })
    await transaction.commit()
    transaction = null

    // The admin sees the temporary password only in this response, so it must never be cached.
    res.set('Cache-Control', 'no-store')
    return res.json({
      success: true,
      message: 'Password reset. Give the temporary password to the student.',
      temporaryPassword
    })
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back password reset:', rollbackError)
      }
    }
    console.error('Student password reset error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to reset the student password.'
    })
  }
})

router.get('/attendance', async (req, res) => {
  const status = getOptionalQueryString(req.query.status, 'Status', 20, res)
  if (status === undefined) return
  if (status && !['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Attendance status filter is invalid.'
    })
  }

  const conditions = ["u.role = 'student'"]
  const args = []
  if (status) {
    conditions.push('a.status = ?')
    args.push(status)
  }

  try {
    const result = await db.execute({
      sql: `
        SELECT
          a.id,
          a.student_id,
          u.student_id AS student_number,
          TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS student_name,
          a.attendance_date,
          a.time_in,
          a.time_out,
          a.total_hours,
          a.activity_id,
          s.title AS activity_title,
          a.status,
          a.admin_remarks,
          a.created_at,
          CASE WHEN a.before_photo_path IS NULL THEN 0 ELSE 1 END AS has_before_photo,
          CASE WHEN a.after_photo_path IS NULL THEN 0 ELSE 1 END AS has_after_photo
        FROM attendance a
        JOIN users u ON u.id = a.student_id
        LEFT JOIN service_activities s ON s.id = a.activity_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY CASE WHEN a.status = 'pending' THEN 0 ELSE 1 END,
          a.attendance_date DESC, a.created_at DESC
      `,
      args
    })
    return res.json({ success: true, attendance: result.rows })
  } catch (error) {
    console.error('Admin attendance list error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load attendance submissions.'
    })
  }
})

async function reviewAttendance(req, res, nextStatus) {
  const attendanceId = validateRecordId(req.params.id, res, 'Attendance')
  if (!attendanceId) return
  const reason = validateOptionalReason(req, res)
  if (reason === undefined) return

  let transaction
  try {
    transaction = await db.transaction('write')
    const current = await transaction.execute({
      sql: 'SELECT student_id, status, attendance_date FROM attendance WHERE id = ?',
      args: [attendanceId]
    })
    if (current.rows.length === 0) {
      await transaction.rollback()
      transaction = null
      return res.status(404).json({
        success: false,
        message: 'Attendance submission was not found.'
      })
    }
    if (current.rows[0].status !== 'pending') {
      await transaction.rollback()
      transaction = null
      return res.status(409).json({
        success: false,
        message: 'Only pending attendance can be reviewed.'
      })
    }

    const studentId = String(current.rows[0].student_id)
    const update = await transaction.execute({
      sql: `
        UPDATE attendance
        SET status = ?, verified_by = ?, admin_remarks = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'pending'
      `,
      args: [nextStatus, req.admin.id, reason, attendanceId]
    })
    if (Number(update.rowsAffected) !== 1) {
      await transaction.rollback()
      transaction = null
      return res.status(409).json({
        success: false,
        message: 'Attendance submission has already been reviewed.'
      })
    }

    const approved = nextStatus === 'approved'
    await transaction.execute({
      sql: `
        INSERT INTO notifications (id, user_id, title, message)
        VALUES (?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        studentId,
        approved ? 'Attendance approved' : 'Attendance rejected',
        approved
          ? `Your attendance for ${current.rows[0].attendance_date} has been approved.${reason ? ` Note: ${reason}` : ''}`
          : `Your attendance for ${current.rows[0].attendance_date} was rejected.${reason ? ` Reason: ${reason}` : ''}`
      ]
    })
    await transaction.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, student_id, action, reason)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        req.admin.id,
        studentId,
        `attendance_${nextStatus}`,
        reason
      ]
    })

    await transaction.commit()
    transaction = null
    return res.json({
      success: true,
      message: `Attendance ${nextStatus}.`
    })
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back attendance review:', rollbackError)
      }
    }
    console.error('Attendance review error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to review attendance.'
    })
  }
}

router.patch('/attendance/:id/approve', (req, res, next) => {
  return reviewAttendance(req, res, 'approved').catch(next)
})

router.patch('/attendance/:id/reject', (req, res, next) => {
  return reviewAttendance(req, res, 'rejected').catch(next)
})

router.get('/attendance/:id/photos/:kind', async (req, res) => {
  const attendanceId = validateRecordId(req.params.id, res, 'Attendance')
  if (!attendanceId) return
  if (!PHOTO_KINDS.includes(req.params.kind)) {
    return res.status(404).json({ success: false, message: 'Photo was not found.' })
  }

  try {
    const result = await db.execute({
      sql: 'SELECT before_photo_path, after_photo_path FROM attendance WHERE id = ?',
      args: [attendanceId]
    })
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance record was not found.' })
    }
    return await sendAttendancePhoto(res, result.rows[0], req.params.kind)
  } catch (error) {
    console.error('Admin attendance photo error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load the photo.' })
  }
})

router.get('/activity-areas', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT id, area_name, description, location
      FROM service_areas
      WHERE status = 'active'
      ORDER BY area_name
    `)
    return res.json({ success: true, areas: result.rows })
  } catch (error) {
    console.error('Admin service area list error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load service areas.'
    })
  }
})

router.get('/service-areas', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT id, area_name, description, location, status, created_at
      FROM service_areas
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, area_name
    `)
    return res.json({ success: true, areas: result.rows })
  } catch (error) {
    console.error('Admin service area management list error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load service areas.'
    })
  }
})

function readServiceArea(body, current = {}) {
  const pick = field => (body[field] === undefined ? current[field] : body[field])
  const areaName = pick('area_name')
  const description = pick('description')
  const location = pick('location')
  const status = pick('status') || 'active'

  if (typeof areaName !== 'string' || !areaName.trim() || areaName.trim().length > 100) {
    return { error: 'Service area name is required and must be no longer than 100 characters.' }
  }
  if (description != null && (typeof description !== 'string' || description.trim().length > 500)) {
    return { error: 'Service area description must be text no longer than 500 characters.' }
  }
  if (location != null && (typeof location !== 'string' || location.trim().length > 250)) {
    return { error: 'Service area location must be text no longer than 250 characters.' }
  }
  if (!['active', 'inactive'].includes(status)) {
    return { error: 'Service area status must be active or inactive.' }
  }

  return {
    area: {
      area_name: areaName.trim(),
      description: description ? description.trim() || null : null,
      location: location ? location.trim() || null : null,
      status
    }
  }
}

router.post('/service-areas', async (req, res) => {
  const { area, error: validationError } = readServiceArea(req.body || {})
  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError
    })
  }

  try {
    const duplicate = await db.execute({
      sql: 'SELECT id FROM service_areas WHERE lower(area_name) = lower(?)',
      args: [area.area_name]
    })
    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A service area with this name already exists.'
      })
    }

    const id = randomUUID()
    await db.execute({
      sql: `
        INSERT INTO service_areas (id, area_name, description, location, status)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [id, area.area_name, area.description, area.location, area.status]
    })
    await db.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, action, reason)
        VALUES (?, ?, 'service_area_created', ?)
      `,
      args: [randomUUID(), req.admin.id, area.area_name]
    })
    return res.status(201).json({
      success: true,
      message: 'Service area added.',
      id
    })
  } catch (error) {
    console.error('Admin create service area error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to add service area.'
    })
  }
})

router.patch('/service-areas/:id', async (req, res) => {
  const areaId = validateRecordId(req.params.id, res, 'Service area')
  if (!areaId) return
  const body = req.body || {}
  const fields = Object.keys(body)
  if (fields.length === 0 || fields.some(field => !['area_name', 'description', 'location', 'status'].includes(field))) {
    return res.status(400).json({
      success: false,
      message: 'Service area update fields are invalid.'
    })
  }

  try {
    const currentResult = await db.execute({
      sql: 'SELECT area_name, description, location, status FROM service_areas WHERE id = ?',
      args: [areaId]
    })
    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service area was not found.'
      })
    }

    const { area, error: validationError } = readServiceArea(body, currentResult.rows[0])
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      })
    }

    const duplicate = await db.execute({
      sql: 'SELECT id FROM service_areas WHERE lower(area_name) = lower(?) AND id <> ?',
      args: [area.area_name, areaId]
    })
    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A service area with this name already exists.'
      })
    }

    await db.execute({
      sql: `
        UPDATE service_areas
        SET area_name = ?, description = ?, location = ?, status = ?
        WHERE id = ?
      `,
      args: [area.area_name, area.description, area.location, area.status, areaId]
    })
    await db.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, action, reason)
        VALUES (?, ?, 'service_area_updated', ?)
      `,
      args: [randomUUID(), req.admin.id, area.area_name]
    })
    return res.json({ success: true, message: 'Service area updated.' })
  } catch (error) {
    console.error('Admin update service area error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update service area.'
    })
  }
})

router.get('/activities', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT
        a.id,
        a.area_id,
        a.title,
        a.description,
        a.location,
        a.scheduled_start,
        a.scheduled_end,
        a.required_hours,
        a.capacity,
        a.eligibility,
        a.registration_open,
        a.status,
        a.created_at,
        a.archived_at,
        a.ended_notified_at,
        s.area_name AS service_area,
        COALESCE(r.registration_count, 0) AS registration_count,
        COALESCE(r.approved_count, 0) AS approved_count,
        COALESCE(h.approved_hours, 0) AS approved_hours
      FROM service_activities a
      JOIN service_areas s ON s.id = a.area_id
      LEFT JOIN (
        SELECT
          activity_id,
          SUM(CASE WHEN status IN ('pending', 'approved') THEN 1 ELSE 0 END) AS registration_count,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count
        FROM activity_registrations
        GROUP BY activity_id
      ) r ON r.activity_id = a.id
      LEFT JOIN (
        SELECT activity_id, SUM(total_hours) AS approved_hours
        FROM attendance
        WHERE status = 'approved' AND activity_id IS NOT NULL
        GROUP BY activity_id
      ) h ON h.activity_id = a.id
      ORDER BY a.scheduled_start DESC
    `)
    return res.json({ success: true, activities: result.rows })
  } catch (error) {
    console.error('Admin service activities error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load service activities.'
    })
  }
})

router.post('/activities', async (req, res) => {
  const body = req.body || {}
  const textFields = ['area_id', 'title', 'description', 'scheduled_start', 'scheduled_end']
  for (const field of textFields) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      return res.status(400).json({
        success: false,
        message: `${field.replaceAll('_', ' ')} is required.`
      })
    }
  }
  if (body.title.trim().length > 160 || body.description.trim().length > 4000) {
    return res.status(400).json({
      success: false,
      message: 'Activity title or description is too long.'
    })
  }
  if (!isValidSchedule(body.scheduled_start) || !isValidSchedule(body.scheduled_end) ||
      Date.parse(body.scheduled_start) >= Date.parse(body.scheduled_end)) {
    return res.status(400).json({
      success: false,
      message: 'Activity start and end must use the YYYY-MM-DDTHH:MM format, with the end after the start.'
    })
  }

  const requiredHoursValue = body.required_hours === undefined ? 0 : Number(body.required_hours)
  const capacityValue = body.capacity === undefined || body.capacity === null || body.capacity === ''
    ? null
    : Number(body.capacity)
  const registrationOpen = body.registration_open === undefined ? true : body.registration_open
  const status = body.status === undefined ? 'draft' : body.status
  const location = body.location === undefined || body.location === null ? null : String(body.location).trim()
  const eligibility = body.eligibility === undefined || body.eligibility === null
    ? null
    : String(body.eligibility).trim()

  if (!Number.isFinite(requiredHoursValue) || requiredHoursValue < 0 ||
      (capacityValue !== null && (!Number.isInteger(capacityValue) || capacityValue < 0)) ||
      typeof registrationOpen !== 'boolean' ||
      !['draft', 'published', 'cancelled'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Activity hours, capacity, registration setting, or status is invalid.'
    })
  }
  if ((body.location !== undefined && body.location !== null && typeof body.location !== 'string') ||
      (body.eligibility !== undefined && body.eligibility !== null && typeof body.eligibility !== 'string') ||
      (location && location.length > 250) || (eligibility && eligibility.length > 1000)) {
    return res.status(400).json({
      success: false,
      message: 'Activity location or eligibility text is too long.'
    })
  }

  try {
    const area = await db.execute({
      sql: "SELECT id FROM service_areas WHERE id = ? AND status = 'active'",
      args: [body.area_id.trim()]
    })
    if (area.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Select an active service area.'
      })
    }

    const id = randomUUID()
    await db.execute({
      sql: `
        INSERT INTO service_activities (
          id, area_id, title, description, location, scheduled_start,
          scheduled_end, required_hours, capacity, eligibility,
          registration_open, status, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        body.area_id.trim(),
        body.title.trim(),
        body.description.trim(),
        location || null,
        body.scheduled_start,
        body.scheduled_end,
        requiredHoursValue,
        capacityValue,
        eligibility || null,
        registrationOpen ? 1 : 0,
        status,
        req.admin.id
      ]
    })
    await db.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, action, reason)
        VALUES (?, ?, 'activity_created', ?)
      `,
      args: [randomUUID(), req.admin.id, body.title.trim()]
    })
    return res.status(201).json({
      success: true,
      message: 'Service activity created.',
      id
    })
  } catch (error) {
    console.error('Admin create activity error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to create service activity.'
    })
  }
})

router.patch('/activities/:id', async (req, res) => {
  const activityId = validateRecordId(req.params.id, res, 'Activity')
  if (!activityId) return
  const body = req.body || {}
  const allowedFields = new Set([
    'area_id', 'title', 'description', 'location', 'scheduled_start',
    'scheduled_end', 'required_hours', 'capacity', 'eligibility',
    'registration_open', 'status'
  ])
  const fields = Object.keys(body)
  if (fields.length === 0 || fields.some(field => !allowedFields.has(field))) {
    return res.status(400).json({
      success: false,
      message: 'Activity update fields are invalid.'
    })
  }

  try {
    const currentResult = await db.execute({
      sql: 'SELECT * FROM service_activities WHERE id = ?',
      args: [activityId]
    })
    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service activity was not found.'
      })
    }

    const current = currentResult.rows[0]
    const value = { ...current, ...body }
    for (const field of ['title', 'description', 'area_id']) {
      if (typeof value[field] !== 'string' || !value[field].trim()) {
        return res.status(400).json({
          success: false,
          message: `${field.replaceAll('_', ' ')} is required.`
        })
      }
      value[field] = value[field].trim()
    }
    if (value.title.length > 160 || value.description.length > 4000) {
      return res.status(400).json({
        success: false,
        message: 'Activity title or description is too long.'
      })
    }
    if (body.location !== undefined && body.location !== null && typeof body.location !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Activity location must be text.'
      })
    }
    if (body.eligibility !== undefined && body.eligibility !== null && typeof body.eligibility !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Activity eligibility must be text.'
      })
    }
    if (!isValidSchedule(value.scheduled_start) || !isValidSchedule(value.scheduled_end) ||
        Date.parse(value.scheduled_start) >= Date.parse(value.scheduled_end)) {
      return res.status(400).json({
        success: false,
        message: 'Activity start and end must use the YYYY-MM-DDTHH:MM format, with the end after the start.'
      })
    }
    value.required_hours = Number(value.required_hours)
    value.capacity = value.capacity === null || value.capacity === '' ? null : Number(value.capacity)
    if (typeof value.registration_open === 'number') {
      value.registration_open = value.registration_open === 1
    }
    if (typeof value.registration_open !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Activity registration setting must be true or false.'
      })
    }
    if (!Number.isFinite(value.required_hours) || value.required_hours < 0 ||
        (value.capacity !== null && (!Number.isInteger(value.capacity) || value.capacity < 0)) ||
        !['draft', 'published', 'cancelled'].includes(value.status)) {
      return res.status(400).json({
        success: false,
        message: 'Activity hours, capacity, or status is invalid.'
      })
    }
    value.location = value.location === null || value.location === '' ? null : String(value.location).trim()
    value.eligibility = value.eligibility === null || value.eligibility === ''
      ? null
      : String(value.eligibility).trim()

    const area = await db.execute({
      sql: "SELECT id FROM service_areas WHERE id = ? AND status = 'active'",
      args: [value.area_id]
    })
    if (area.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Select an active service area.'
      })
    }

    await db.execute({
      sql: `
        UPDATE service_activities
        SET area_id = ?, title = ?, description = ?, location = ?,
            scheduled_start = ?, scheduled_end = ?, required_hours = ?,
            capacity = ?, eligibility = ?, registration_open = ?,
            status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        value.area_id,
        value.title,
        value.description,
        value.location,
        value.scheduled_start,
        value.scheduled_end,
        value.required_hours,
        value.capacity,
        value.eligibility,
        value.registration_open ? 1 : 0,
        value.status,
        activityId
      ]
    })
    await db.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, action, reason)
        VALUES (?, ?, 'activity_updated', ?)
      `,
      args: [randomUUID(), req.admin.id, value.title]
    })
    return res.json({ success: true, message: 'Service activity updated.' })
  } catch (error) {
    console.error('Admin update activity error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update service activity.'
    })
  }
})

router.delete('/activities/:id', async (req, res) => {
  const activityId = validateRecordId(req.params.id, res, 'Activity')
  if (!activityId) return

  let transaction
  try {
    transaction = await db.transaction('write')
    const activity = await transaction.execute({
      sql: 'SELECT title, status FROM service_activities WHERE id = ?',
      args: [activityId]
    })
    if (activity.rows.length === 0) {
      await transaction.rollback()
      transaction = null
      return res.status(404).json({
        success: false,
        message: 'Service activity was not found.'
      })
    }
    const usage = await transaction.execute({
      sql: `
        SELECT
          (SELECT COUNT(*) FROM activity_registrations WHERE activity_id = ?) +
          (SELECT COUNT(*) FROM attendance WHERE activity_id = ?) AS total
      `,
      args: [activityId, activityId]
    })
    if (activity.rows[0].status !== 'draft' || Number(usage.rows[0].total) > 0) {
      await transaction.rollback()
      transaction = null
      return res.status(409).json({
        success: false,
        message: 'Only unused draft activities can be deleted. Cancel published activities instead.'
      })
    }

    await transaction.execute({
      sql: 'DELETE FROM service_activities WHERE id = ?',
      args: [activityId]
    })
    await transaction.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, action, reason)
        VALUES (?, ?, 'activity_deleted', ?)
      `,
      args: [randomUUID(), req.admin.id, activity.rows[0].title]
    })
    await transaction.commit()
    transaction = null
    return res.json({ success: true, message: 'Draft activity deleted.' })
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back activity deletion:', rollbackError)
      }
    }
    console.error('Admin delete activity error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to delete service activity.'
    })
  }
})

// Archiving hides a finished activity from the admin's active list and the student
// browse list. Registrations and attendance stay, so the participant record survives.
async function setActivityArchived(req, res, archive) {
  const activityId = validateRecordId(req.params.id, res, 'Activity')
  if (!activityId) return

  try {
    const result = await db.execute({
      sql: `
        SELECT
          title,
          archived_at,
          CASE
            WHEN status = 'cancelled' OR datetime(scheduled_end) <= datetime(?) THEN 1
            ELSE 0
          END AS is_finished
        FROM service_activities
        WHERE id = ?
      `,
      args: [nowInAppZone(), activityId]
    })
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service activity was not found.'
      })
    }

    const activity = result.rows[0]
    if (archive && !Number(activity.is_finished)) {
      return res.status(409).json({
        success: false,
        message: 'Only activities that have ended or were cancelled can be archived.'
      })
    }
    if (Boolean(activity.archived_at) === archive) {
      return res.status(409).json({
        success: false,
        message: archive ? 'This activity is already archived.' : 'This activity is not archived.'
      })
    }

    await db.execute({
      sql: `
        UPDATE service_activities
        SET archived_at = ${archive ? 'CURRENT_TIMESTAMP' : 'NULL'}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [activityId]
    })
    await db.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, action, reason)
        VALUES (?, ?, ?, ?)
      `,
      args: [randomUUID(), req.admin.id, archive ? 'activity_archived' : 'activity_restored', activity.title]
    })
    return res.json({
      success: true,
      message: archive ? 'Activity moved to completed activities.' : 'Activity restored to the active list.'
    })
  } catch (error) {
    console.error('Admin archive activity error:', error)
    return res.status(500).json({
      success: false,
      message: archive ? 'Failed to archive service activity.' : 'Failed to restore service activity.'
    })
  }
}

router.patch('/activities/:id/archive', (req, res, next) => {
  return setActivityArchived(req, res, true).catch(next)
})

router.patch('/activities/:id/restore', (req, res, next) => {
  return setActivityArchived(req, res, false).catch(next)
})

router.get('/activities/:id/participants', async (req, res) => {
  const activityId = validateRecordId(req.params.id, res, 'Activity')
  if (!activityId) return

  try {
    const activity = await db.execute({
      sql: 'SELECT id FROM service_activities WHERE id = ?',
      args: [activityId]
    })
    if (activity.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service activity was not found.'
      })
    }

    // Everyone who registered, plus anyone who logged attendance against the
    // activity without a registration row.
    const result = await db.execute({
      sql: `
        SELECT
          u.id AS student_id,
          u.student_id AS student_number,
          TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS student_name,
          r.status AS registration_status,
          r.registered_at,
          COALESCE(h.approved_hours, 0) AS approved_hours,
          COALESCE(h.pending_hours, 0) AS pending_hours
        FROM users u
        LEFT JOIN activity_registrations r
          ON r.student_id = u.id AND r.activity_id = ?
        LEFT JOIN (
          SELECT
            student_id,
            SUM(CASE WHEN status = 'approved' THEN total_hours ELSE 0 END) AS approved_hours,
            SUM(CASE WHEN status = 'pending' THEN total_hours ELSE 0 END) AS pending_hours
          FROM attendance
          WHERE activity_id = ?
          GROUP BY student_id
        ) h ON h.student_id = u.id
        WHERE r.id IS NOT NULL OR h.student_id IS NOT NULL
        ORDER BY
          CASE r.status WHEN 'approved' THEN 0 WHEN 'pending' THEN 1 WHEN 'rejected' THEN 3 WHEN 'cancelled' THEN 4 ELSE 2 END,
          student_name
      `,
      args: [activityId, activityId]
    })
    return res.json({ success: true, participants: result.rows })
  } catch (error) {
    console.error('Admin activity participants error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load activity participants.'
    })
  }
})

router.get('/activity-registrations', async (req, res) => {
  const status = getOptionalQueryString(req.query.status, 'Status', 20, res)
  if (status === undefined) return
  if (status && !['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Registration status filter is invalid.'
    })
  }
  const args = []
  const condition = status ? 'WHERE r.status = ?' : ''
  if (status) args.push(status)

  try {
    const result = await db.execute({
      sql: `
        SELECT
          r.id,
          r.student_id,
          u.student_id AS student_number,
          TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS student_name,
          r.activity_id,
          a.title AS activity_title,
          r.status,
          r.registered_at,
          r.reviewed_at,
          r.review_note
        FROM activity_registrations r
        JOIN users u ON u.id = r.student_id
        JOIN service_activities a ON a.id = r.activity_id
        ${condition}
        ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.registered_at DESC
      `,
      args
    })
    return res.json({ success: true, registrations: result.rows })
  } catch (error) {
    console.error('Admin activity registrations error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load activity registrations.'
    })
  }
})

async function reviewActivityRegistration(req, res, nextStatus) {
  const registrationId = validateRecordId(req.params.id, res, 'Registration')
  if (!registrationId) return
  const reason = validateOptionalReason(req, res)
  if (reason === undefined) return

  let transaction
  try {
    transaction = await db.transaction('write')
    const current = await transaction.execute({
      sql: 'SELECT student_id, status FROM activity_registrations WHERE id = ?',
      args: [registrationId]
    })
    if (current.rows.length === 0) {
      await transaction.rollback()
      transaction = null
      return res.status(404).json({
        success: false,
        message: 'Activity registration was not found.'
      })
    }
    if (current.rows[0].status !== 'pending') {
      await transaction.rollback()
      transaction = null
      return res.status(409).json({
        success: false,
        message: 'Only pending activity registrations can be reviewed.'
      })
    }

    const studentId = String(current.rows[0].student_id)
    await transaction.execute({
      sql: `
        UPDATE activity_registrations
        SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_note = ?
        WHERE id = ? AND status = 'pending'
      `,
      args: [nextStatus, req.admin.id, reason, registrationId]
    })
    const approved = nextStatus === 'approved'
    await transaction.execute({
      sql: `
        INSERT INTO notifications (id, user_id, title, message)
        VALUES (?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        studentId,
        approved ? 'Activity registration approved' : 'Activity registration rejected',
        approved
          ? 'Your service activity registration has been approved.'
          : `Your service activity registration was rejected.${reason ? ` Reason: ${reason}` : ''}`
      ]
    })
    await transaction.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, student_id, action, reason)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        req.admin.id,
        studentId,
        `activity_registration_${nextStatus}`,
        reason
      ]
    })
    await transaction.commit()
    transaction = null
    return res.json({
      success: true,
      message: `Activity registration ${nextStatus}.`
    })
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back activity registration review:', rollbackError)
      }
    }
    console.error('Activity registration review error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to review activity registration.'
    })
  }
}

router.patch('/activity-registrations/:id/approve', (req, res, next) => {
  return reviewActivityRegistration(req, res, 'approved').catch(next)
})

router.patch('/activity-registrations/:id/reject', (req, res, next) => {
  return reviewActivityRegistration(req, res, 'rejected').catch(next)
})

// Every adjustment across all students, with the student's course, year level and
// section so the admin history table can filter them.
router.get('/hour-adjustments', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT
        a.id,
        a.student_id,
        a.adjustment_amount,
        a.adjustment_type,
        a.reason,
        a.created_at,
        u.student_id AS student_number,
        TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS student_name,
        u.course,
        u.year_level,
        s.section_name AS section
      FROM hour_adjustments a
      JOIN users u ON u.id = a.student_id
      LEFT JOIN sections s ON s.id = u.section_id
      ORDER BY a.created_at DESC
    `)
    return res.json({ success: true, adjustments: result.rows })
  } catch (error) {
    console.error('Admin hour adjustments error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load hour adjustments.'
    })
  }
})

router.get('/students/:id/hour-adjustments', async (req, res) => {
  const studentId = validateStudentId(req.params.id, res)
  if (!studentId) return

  try {
    const result = await db.execute({
      sql: `
        SELECT id, adjustment_amount, adjustment_type, reason, created_at
        FROM hour_adjustments
        WHERE student_id = ?
        ORDER BY created_at DESC
      `,
      args: [studentId]
    })
    return res.json({ success: true, adjustments: result.rows })
  } catch (error) {
    console.error('Admin student hour adjustments error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load hour adjustments.'
    })
  }
})

router.post('/students/:id/hour-adjustments', async (req, res) => {
  const studentId = validateStudentId(req.params.id, res)
  if (!studentId) return
  const body = req.body || {}
  const amount = body.adjustment_amount
  const type = body.adjustment_type
  const reason = body.reason

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 340) {
    return res.status(400).json({
      success: false,
      message: 'Adjustment amount must be a positive number no greater than 340.'
    })
  }
  if (!['add', 'deduct'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Adjustment type must be add or deduct.'
    })
  }
  if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 500) {
    return res.status(400).json({
      success: false,
      message: 'A reason between 3 and 500 characters is required.'
    })
  }

  let transaction
  try {
    transaction = await db.transaction('write')
    const student = await transaction.execute({
      sql: "SELECT id FROM users WHERE id = ? AND role = 'student'",
      args: [studentId]
    })
    if (student.rows.length === 0) {
      await transaction.rollback()
      transaction = null
      return res.status(404).json({
        success: false,
        message: 'Student account was not found.'
      })
    }

    await transaction.execute({
      sql: `
        INSERT INTO hour_adjustments (
          id, student_id, adjustment_amount, adjustment_type, reason, adjusted_by
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [randomUUID(), studentId, amount, type, reason.trim(), req.admin.id]
    })
    await transaction.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, student_id, action, reason)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        req.admin.id,
        studentId,
        `hours_${type}`,
        reason.trim()
      ]
    })
    await transaction.execute({
      sql: `
        INSERT INTO notifications (id, user_id, title, message)
        VALUES (?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        studentId,
        'Service hours adjusted',
        `${amount} service hours were ${type === 'add' ? 'added' : 'deducted'}. Reason: ${reason.trim()}`
      ]
    })
    await transaction.commit()
    transaction = null
    return res.status(201).json({
      success: true,
      message: 'Service-hour adjustment recorded.'
    })
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back hour adjustment:', rollbackError)
      }
    }
    console.error('Admin hour adjustment error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to record hour adjustment.'
    })
  }
})

router.get('/sections', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT id, section_name, course, year_level
      FROM sections
      ORDER BY course, year_level, section_name
    `)
    return res.json({ success: true, sections: result.rows })
  } catch (error) {
    console.error('Admin sections error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load sections.'
    })
  }
})

router.get('/announcements', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT
        a.id,
        a.title,
        a.content,
        a.target_section_id,
        s.section_name,
        a.created_at,
        a.updated_at,
        u.first_name AS admin_first_name,
        u.last_name AS admin_last_name
      FROM announcements a
      LEFT JOIN sections s ON s.id = a.target_section_id
      JOIN users u ON u.id = a.admin_id
      ORDER BY a.created_at DESC
    `)
    return res.json({ success: true, announcements: result.rows })
  } catch (error) {
    console.error('Admin announcements error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load announcements.'
    })
  }
})

router.post('/announcements', async (req, res) => {
  const body = req.body || {}
  if (
    typeof body.title !== 'string' ||
    !body.title.trim() ||
    body.title.trim().length > 200 ||
    typeof body.content !== 'string' ||
    !body.content.trim() ||
    body.content.trim().length > 10000
  ) {
    return res.status(400).json({
      success: false,
      message: 'Announcement title and content are required and must be within the allowed length.'
    })
  }
  const sectionId = body.target_section_id === undefined || body.target_section_id === ''
    ? null
    : body.target_section_id
  if (sectionId !== null && (typeof sectionId !== 'string' || sectionId.length > 128)) {
    return res.status(400).json({
      success: false,
      message: 'Target section is invalid.'
    })
  }

  let transaction
  try {
    transaction = await db.transaction('write')
    if (sectionId) {
      const section = await transaction.execute({
        sql: 'SELECT id FROM sections WHERE id = ?',
        args: [sectionId]
      })
      if (section.rows.length === 0) {
        await transaction.rollback()
        transaction = null
        return res.status(400).json({
          success: false,
          message: 'Selected section was not found.'
        })
      }
    }

    const id = randomUUID()
    await transaction.execute({
      sql: `
        INSERT INTO announcements (id, admin_id, title, content, target_section_id)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [id, req.admin.id, body.title.trim(), body.content.trim(), sectionId]
    })
    const students = await transaction.execute({
      sql: `
        SELECT id
        FROM users
        WHERE role = 'student'
          AND account_status = 'approved'
          AND (? IS NULL OR section_id = ?)
      `,
      args: [sectionId, sectionId]
    })
    for (const student of students.rows) {
      await transaction.execute({
        sql: `
          INSERT INTO notifications (id, user_id, title, message)
          VALUES (?, ?, ?, ?)
        `,
        args: [
          randomUUID(),
          String(student.id),
          'New announcement',
          body.title.trim()
        ]
      })
    }
    await transaction.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, action, reason)
        VALUES (?, ?, 'announcement_created', ?)
      `,
      args: [randomUUID(), req.admin.id, body.title.trim()]
    })
    await transaction.commit()
    transaction = null
    return res.status(201).json({
      success: true,
      message: 'Announcement published.',
      id
    })
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back announcement creation:', rollbackError)
      }
    }
    console.error('Admin create announcement error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to publish announcement.'
    })
  }
})

router.patch('/announcements/:id', async (req, res) => {
  const announcementId = validateRecordId(req.params.id, res, 'Announcement')
  if (!announcementId) return
  const body = req.body || {}
  const fields = Object.keys(body)
  if (fields.length === 0 || fields.some(field => !['title', 'content', 'target_section_id'].includes(field))) {
    return res.status(400).json({
      success: false,
      message: 'Announcement update fields are invalid.'
    })
  }

  try {
    const currentResult = await db.execute({
      sql: 'SELECT title, content, target_section_id FROM announcements WHERE id = ?',
      args: [announcementId]
    })
    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Announcement was not found.'
      })
    }
    const current = currentResult.rows[0]
    const title = body.title === undefined ? current.title : body.title
    const content = body.content === undefined ? current.content : body.content
    const sectionId = body.target_section_id === undefined
      ? current.target_section_id
      : (body.target_section_id === '' ? null : body.target_section_id)
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 200 ||
        typeof content !== 'string' || !content.trim() || content.trim().length > 10000 ||
        (sectionId !== null && (typeof sectionId !== 'string' || sectionId.length > 128))) {
      return res.status(400).json({
        success: false,
        message: 'Announcement title, content, or target section is invalid.'
      })
    }
    if (sectionId) {
      const section = await db.execute({
        sql: 'SELECT id FROM sections WHERE id = ?',
        args: [sectionId]
      })
      if (section.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected section was not found.'
        })
      }
    }

    await db.execute({
      sql: `
        UPDATE announcements
        SET title = ?, content = ?, target_section_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [title.trim(), content.trim(), sectionId, announcementId]
    })
    await db.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, action, reason)
        VALUES (?, ?, 'announcement_updated', ?)
      `,
      args: [randomUUID(), req.admin.id, title.trim()]
    })
    return res.json({ success: true, message: 'Announcement updated.' })
  } catch (error) {
    console.error('Admin update announcement error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update announcement.'
    })
  }
})

router.delete('/announcements/:id', async (req, res) => {
  const announcementId = validateRecordId(req.params.id, res, 'Announcement')
  if (!announcementId) return

  let transaction
  try {
    transaction = await db.transaction('write')
    const existing = await transaction.execute({
      sql: 'SELECT title FROM announcements WHERE id = ?',
      args: [announcementId]
    })
    if (existing.rows.length === 0) {
      await transaction.rollback()
      transaction = null
      return res.status(404).json({
        success: false,
        message: 'Announcement was not found.'
      })
    }
    await transaction.execute({
      sql: 'DELETE FROM announcements WHERE id = ?',
      args: [announcementId]
    })
    await transaction.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, action, reason)
        VALUES (?, ?, 'announcement_deleted', ?)
      `,
      args: [randomUUID(), req.admin.id, existing.rows[0].title]
    })
    await transaction.commit()
    transaction = null
    return res.json({ success: true, message: 'Announcement deleted.' })
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back announcement deletion:', rollbackError)
      }
    }
    console.error('Admin delete announcement error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to delete announcement.'
    })
  }
})

router.get('/assignments', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT
        a.id,
        a.student_id,
        u.student_id AS student_number,
        TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS student_name,
        a.area_id,
        s.area_name,
        a.assigned_date,
        a.schedule_start,
        a.schedule_end,
        s.description,
        s.location
      FROM service_assignments a
      JOIN users u ON u.id = a.student_id
      JOIN service_areas s ON s.id = a.area_id
      ORDER BY a.assigned_date DESC, a.schedule_start
    `)
    return res.json({ success: true, assignments: result.rows })
  } catch (error) {
    console.error('Admin assignments error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load service assignments.'
    })
  }
})

router.post('/assignments', async (req, res) => {
  const body = req.body || {}
  const studentId = body.student_id
  const areaId = body.area_id
  const assignedDate = body.assigned_date
  const scheduleStart = body.schedule_start || null
  const scheduleEnd = body.schedule_end || null

  if (
    typeof studentId !== 'string' || !studentId || studentId.length > 128 ||
    typeof areaId !== 'string' || !areaId || areaId.length > 128 ||
    !isValidCalendarDate(assignedDate)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Student, active service area, and a valid assigned date are required.'
    })
  }
  if (
    (scheduleStart !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduleStart)) ||
    (scheduleEnd !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduleEnd)) ||
    (scheduleStart && scheduleEnd && scheduleEnd <= scheduleStart)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Schedule times must use HH:MM and end after start.'
    })
  }

  let transaction
  try {
    transaction = await db.transaction('write')
    const student = await transaction.execute({
      sql: "SELECT id FROM users WHERE id = ? AND role = 'student' AND account_status = 'approved'",
      args: [studentId]
    })
    const area = await transaction.execute({
      sql: "SELECT id, area_name FROM service_areas WHERE id = ? AND status = 'active'",
      args: [areaId]
    })
    if (student.rows.length === 0 || area.rows.length === 0) {
      await transaction.rollback()
      transaction = null
      return res.status(400).json({
        success: false,
        message: 'The selected student or service area is unavailable.'
      })
    }

    const id = randomUUID()
    await transaction.execute({
      sql: `
        INSERT INTO service_assignments (
          id, student_id, area_id, assigned_date, schedule_start, schedule_end
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, studentId, areaId, assignedDate, scheduleStart, scheduleEnd]
    })
    await transaction.execute({
      sql: `
        INSERT INTO notifications (id, user_id, title, message)
        VALUES (?, ?, 'New service assignment', ?)
      `,
      args: [
        randomUUID(),
        studentId,
        `You have been assigned to ${area.rows[0].area_name} on ${assignedDate}.`
      ]
    })
    await transaction.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, student_id, action, reason)
        VALUES (?, ?, ?, 'assignment_created', ?)
      `,
      args: [randomUUID(), req.admin.id, studentId, area.rows[0].area_name]
    })
    await transaction.commit()
    transaction = null
    return res.status(201).json({
      success: true,
      message: 'Service assignment created.',
      id
    })
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back service assignment:', rollbackError)
      }
    }
    console.error('Admin create assignment error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to create service assignment.'
    })
  }
})

router.delete('/assignments/:id', async (req, res) => {
  const assignmentId = validateRecordId(req.params.id, res, 'Assignment')
  if (!assignmentId) return

  let transaction
  try {
    transaction = await db.transaction('write')
    const assignment = await transaction.execute({
      sql: `
        SELECT a.student_id, s.area_name
        FROM service_assignments a
        JOIN service_areas s ON s.id = a.area_id
        WHERE a.id = ?
      `,
      args: [assignmentId]
    })
    if (assignment.rows.length === 0) {
      await transaction.rollback()
      transaction = null
      return res.status(404).json({
        success: false,
        message: 'Service assignment was not found.'
      })
    }
    await transaction.execute({
      sql: 'DELETE FROM service_assignments WHERE id = ?',
      args: [assignmentId]
    })
    await transaction.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, student_id, action, reason)
        VALUES (?, ?, ?, 'assignment_deleted', ?)
      `,
      args: [
        randomUUID(),
        req.admin.id,
        assignment.rows[0].student_id,
        assignment.rows[0].area_name
      ]
    })
    await transaction.commit()
    transaction = null
    return res.json({ success: true, message: 'Service assignment removed.' })
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back assignment deletion:', rollbackError)
      }
    }
    console.error('Admin delete assignment error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to remove service assignment.'
    })
  }
})

router.get('/documents', async (req, res) => {
  const status = getOptionalQueryString(req.query.status, 'Status', 20, res)
  if (status === undefined) return
  if (status && !['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Document status filter is invalid.'
    })
  }
  const args = []
  const condition = status ? 'WHERE d.status = ?' : ''
  if (status) args.push(status)

  try {
    const result = await db.execute({
      sql: `
        SELECT
          d.id,
          d.student_id,
          u.student_id AS student_number,
          TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS student_name,
          d.document_name,
          d.document_type,
          d.description,
          d.status,
          d.admin_remarks,
          d.submitted_at,
          d.reviewed_at
        FROM documents d
        JOIN users u ON u.id = d.student_id
        ${condition}
        ORDER BY CASE WHEN d.status = 'pending' THEN 0 ELSE 1 END, d.submitted_at DESC
      `,
      args
    })
    return res.json({ success: true, documents: result.rows })
  } catch (error) {
    console.error('Admin documents error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load submitted documents.'
    })
  }
})

router.get('/documents/:id/file', async (req, res) => {
  const documentId = validateRecordId(req.params.id, res, 'Document')
  if (!documentId) return

  try {
    const result = await db.execute({
      sql: 'SELECT file_path, document_name FROM documents WHERE id = ?',
      args: [documentId]
    })
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document was not found.'
      })
    }

    const fileName = String(result.rows[0].file_path)
    const filePath = resolveDocumentPath(fileName)
    const mimeType = getDocumentMimeType(fileName)
    if (!filePath || !mimeType) {
      console.error('Invalid stored document path for document:', documentId)
      return res.status(500).json({
        success: false,
        message: 'The stored document cannot be accessed.'
      })
    }

    await fs.promises.access(filePath, fs.constants.R_OK)
    const safeName = String(result.rows[0].document_name)
      .replace(/[^a-zA-Z0-9._ ()-]/g, '_')
      .slice(0, 120) || 'document'
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
    return res.sendFile(filePath, error => {
      if (error && !res.headersSent) {
        console.error('Admin document file response error:', error)
        res.status(500).json({
          success: false,
          message: 'Failed to send the document.'
        })
      }
    })
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        message: 'Document file was not found.'
      })
    }
    console.error('Admin document file error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to access the document.'
    })
  }
})

async function reviewStudentDocument(req, res, nextStatus) {
  const documentId = validateRecordId(req.params.id, res, 'Document')
  if (!documentId) return
  const reason = validateOptionalReason(req, res)
  if (reason === undefined) return

  let transaction
  try {
    transaction = await db.transaction('write')
    const current = await transaction.execute({
      sql: 'SELECT student_id, status FROM documents WHERE id = ?',
      args: [documentId]
    })
    if (current.rows.length === 0) {
      await transaction.rollback()
      transaction = null
      return res.status(404).json({
        success: false,
        message: 'Document was not found.'
      })
    }
    if (current.rows[0].status !== 'pending') {
      await transaction.rollback()
      transaction = null
      return res.status(409).json({
        success: false,
        message: 'Only pending documents can be reviewed.'
      })
    }

    const studentId = String(current.rows[0].student_id)
    await transaction.execute({
      sql: `
        UPDATE documents
        SET status = ?, admin_remarks = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?
        WHERE id = ? AND status = 'pending'
      `,
      args: [nextStatus, reason, req.admin.id, documentId]
    })
    const approved = nextStatus === 'approved'
    await transaction.execute({
      sql: `
        INSERT INTO notifications (id, user_id, title, message)
        VALUES (?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        studentId,
        approved ? 'Document approved' : 'Document rejected',
        approved
          ? 'Your submitted document has been approved.'
          : `Your submitted document was rejected.${reason ? ` Reason: ${reason}` : ''}`
      ]
    })
    await transaction.execute({
      sql: `
        INSERT INTO activity_logs (id, admin_id, student_id, action, reason)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        req.admin.id,
        studentId,
        `document_${nextStatus}`,
        reason
      ]
    })
    await transaction.commit()
    transaction = null
    return res.json({
      success: true,
      message: `Document ${nextStatus}.`
    })
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back document review:', rollbackError)
      }
    }
    console.error('Document review error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to review document.'
    })
  }
}

router.patch('/documents/:id/approve', (req, res, next) => {
  return reviewStudentDocument(req, res, 'approved').catch(next)
})

router.patch('/documents/:id/reject', (req, res, next) => {
  return reviewStudentDocument(req, res, 'rejected').catch(next)
})

module.exports = router
