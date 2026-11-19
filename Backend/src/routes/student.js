const express = require('express')
const bcrypt = require('bcryptjs')
const { randomUUID } = require('crypto')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const db = require('../db')
const requireStudent = require('../middleware/student-auth')
const {
  documentDirectory,
  resolveDocumentPath,
  getDocumentMimeType
} = require('../document-storage')

const router = express.Router()
const requiredHours = 340
const attendanceStatuses = new Set(['pending', 'approved', 'rejected'])
const acceptedDocumentExtensions = new Map([
  ['application/pdf', new Set(['.pdf'])],
  ['image/jpeg', new Set(['.jpg', '.jpeg'])],
  ['image/png', new Set(['.png'])],
  ['image/webp', new Set(['.webp'])]
])
const storedDocumentExtensions = new Map([
  ['application/pdf', '.pdf'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
])
fs.mkdirSync(documentDirectory, { recursive: true })

const documentUpload = multer({
  storage: multer.diskStorage({
    destination: documentDirectory,
    filename: (req, file, callback) => {
      callback(null, `${randomUUID()}${storedDocumentExtensions.get(file.mimetype) || '.upload'}`)
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 10
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    if (!acceptedDocumentExtensions.get(file.mimetype)?.has(extension)) {
      return callback(new Error('Upload a PDF, JPEG, PNG, or WebP document.'))
    }
    return callback(null, true)
  }
})
const activitySelect = `
  SELECT
    a.id,
    a.title,
    a.description,
    a.location,
    a.scheduled_start,
    a.scheduled_end,
    a.required_hours,
    a.capacity,
    a.eligibility,
    a.registration_open,
    a.status AS activity_status,
    s.area_name AS service_area,
    s.location AS area_location,
    r.status AS registration_status,
    COALESCE(registrations.active_count, 0) AS registration_count,
    COALESCE(completed.hours, 0) AS completed_hours,
    CASE WHEN completed.activity_id IS NULL THEN 0 ELSE 1 END AS is_completed
  FROM service_activities a
  JOIN service_areas s ON s.id = a.area_id
  LEFT JOIN activity_registrations r
    ON r.activity_id = a.id AND r.student_id = ?
  LEFT JOIN (
    SELECT activity_id, COUNT(*) AS active_count
    FROM activity_registrations
    WHERE status IN ('pending', 'approved')
    GROUP BY activity_id
  ) registrations ON registrations.activity_id = a.id
  LEFT JOIN (
    SELECT activity_id, SUM(total_hours) AS hours
    FROM attendance
    WHERE student_id = ? AND status = 'approved' AND activity_id IS NOT NULL
    GROUP BY activity_id
  ) completed ON completed.activity_id = a.id
`

function readQueryString(value, field, maxLength, res) {
  if (value === undefined) return null
  if (typeof value !== 'string' || value.length > maxLength) {
    res.status(400).json({
      success: false,
      message: `${field} must be text no longer than ${maxLength} characters.`
    })
    return undefined
  }

  return value.trim() || null
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function validateRecordId(value, res) {
  if (typeof value !== 'string' || !value.trim() || value.length > 128) {
    res.status(400).json({
      success: false,
      message: 'A valid record ID is required.'
    })
    return null
  }
  return value.trim()
}

function validDocumentSignature(buffer, mimeType) {
  if (mimeType === 'application/pdf') return buffer.subarray(0, 5).toString() === '%PDF-'
  if (mimeType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  }
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (mimeType === 'image/webp') {
    return buffer.subarray(0, 4).toString() === 'RIFF' &&
      buffer.subarray(8, 12).toString() === 'WEBP'
  }
  return false
}

async function removeUploadedFile(filePath) {
  try {
    await fs.promises.unlink(filePath)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to remove uploaded document:', error)
    }
  }
}

function handleDocumentUpload(req, res, next) {
  documentUpload.single('file')(req, res, error => {
    if (!error) return next()
    const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
      ? 413
      : 400
    return res.status(status).json({
      success: false,
      message: error.message || 'Document upload failed.'
    })
  })
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

router.use(requireStudent)

router.get('/dashboard', async (req, res) => {
  try {
    const studentId = req.student.id
    const [profile, progress, attendance, serviceActivities, assignments, announcements, notifications, unread] =
      await Promise.all([
        db.execute({
          sql: `
            SELECT
              u.id,
              u.student_id,
              u.first_name,
              u.middle_name,
              u.last_name,
              u.email,
              u.contact_number,
              u.course,
              u.year_level,
              u.account_status,
              u.created_at AS registration_date,
              s.section_name AS section
            FROM users u
            LEFT JOIN sections s ON s.id = u.section_id
            WHERE u.id = ? AND u.role = 'student'
          `,
          args: [studentId]
        }),
        getHourProgress(studentId),
        db.execute({
          sql: `
            SELECT id, attendance_date, time_in, time_out, total_hours, status, admin_remarks
            FROM attendance
            WHERE student_id = ?
            ORDER BY attendance_date DESC, created_at DESC
            LIMIT 5
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
              a.area_name AS service_area
            FROM service_records r
            LEFT JOIN service_areas a ON a.id = r.area_id
            WHERE r.student_id = ?
            ORDER BY r.service_date DESC, r.created_at DESC
            LIMIT 5
          `,
          args: [studentId]
        }),
        db.execute({
          sql: `
            SELECT
              a.id,
              a.assigned_date,
              a.schedule_start,
              a.schedule_end,
              s.area_name,
              s.description,
              s.location
            FROM service_assignments a
            JOIN service_areas s ON s.id = a.area_id
            WHERE a.student_id = ?
              AND date(a.assigned_date) >= date('now')
            ORDER BY a.assigned_date, a.schedule_start
            LIMIT 5
          `,
          args: [studentId]
        }),
        db.execute({
          sql: `
            SELECT a.id, a.title, a.content, a.created_at, u.first_name, u.last_name
            FROM announcements a
            JOIN users u ON u.id = a.admin_id
            WHERE a.target_section_id IS NULL
              OR a.target_section_id = (
                SELECT section_id FROM users WHERE id = ?
              )
            ORDER BY a.created_at DESC
            LIMIT 5
          `,
          args: [studentId]
        }),
        db.execute({
          sql: `
            SELECT id, title, message, is_read, created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 5
          `,
          args: [studentId]
        }),
        db.execute({
          sql: 'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0',
          args: [studentId]
        })
      ])

    if (profile.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile was not found.'
      })
    }

    return res.json({
      success: true,
      profile: profile.rows[0],
      progress,
      recentAttendance: attendance.rows,
      recentActivities: serviceActivities.rows,
      upcomingAssignments: assignments.rows,
      announcements: announcements.rows.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        created_at: item.created_at,
        author: [item.first_name, item.last_name].filter(Boolean).join(' ')
      })),
      notifications: notifications.rows,
      unreadNotificationCount: Number(unread.rows[0].total)
    })
  } catch (error) {
    console.error('Student dashboard error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load student dashboard.'
    })
  }
})

router.get('/activities', async (req, res) => {
  const search = readQueryString(req.query.search, 'Search', 100, res)
  if (search === undefined) return

  const conditions = [
    "(a.status = 'published' OR r.id IS NOT NULL)",
    "(date(a.scheduled_end) >= date('now') OR r.id IS NOT NULL)"
  ]
  const args = [req.student.id, req.student.id]
  if (search) {
    conditions.push('(a.title LIKE ? OR a.description LIKE ? OR a.location LIKE ? OR s.area_name LIKE ?)')
    args.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }

  try {
    const result = await db.execute({
      sql: `${activitySelect}
        WHERE ${conditions.join(' AND ')}
        ORDER BY a.scheduled_start ASC
      `,
      args
    })

    return res.json({ success: true, activities: result.rows })
  } catch (error) {
    console.error('Student activities error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load service activities.'
    })
  }
})

router.get('/activities/:id', async (req, res) => {
  const activityId = validateRecordId(req.params.id, res)
  if (!activityId) return

  try {
    const result = await db.execute({
      sql: `${activitySelect}
        WHERE a.id = ? AND (a.status = 'published' OR r.id IS NOT NULL)
      `,
      args: [req.student.id, req.student.id, activityId]
    })
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service activity was not found.'
      })
    }

    return res.json({ success: true, activity: result.rows[0] })
  } catch (error) {
    console.error('Student activity detail error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load service activity.'
    })
  }
})

router.post('/activities/:id/register', async (req, res) => {
  const activityId = validateRecordId(req.params.id, res)
  if (!activityId) return

  let transaction
  try {
    transaction = await db.transaction('write')
    const activity = await transaction.execute({
      sql: `
        SELECT id, capacity
        FROM service_activities
        WHERE id = ?
          AND status = 'published'
          AND registration_open = 1
          AND datetime(scheduled_start) > datetime('now')
      `,
      args: [activityId]
    })

    if (activity.rows.length === 0) {
      await transaction.rollback()
      transaction = null
      return res.status(404).json({
        success: false,
        message: 'This activity is not open for registration.'
      })
    }

    const existing = await transaction.execute({
      sql: `
        SELECT id, status
        FROM activity_registrations
        WHERE activity_id = ? AND student_id = ?
      `,
      args: [activityId, req.student.id]
    })

    if (existing.rows.length > 0 && !['cancelled', 'rejected'].includes(existing.rows[0].status)) {
      await transaction.rollback()
      transaction = null
      return res.status(409).json({
        success: false,
        message: 'You already have an active registration for this activity.'
      })
    }

    if (activity.rows[0].capacity !== null) {
      const count = await transaction.execute({
        sql: `
          SELECT COUNT(*) AS total
          FROM activity_registrations
          WHERE activity_id = ? AND status IN ('pending', 'approved')
        `,
        args: [activityId]
      })
      if (Number(count.rows[0].total) >= Number(activity.rows[0].capacity)) {
        await transaction.rollback()
        transaction = null
        return res.status(409).json({
          success: false,
          message: 'This activity has reached its registration capacity.'
        })
      }
    }

    if (existing.rows.length > 0) {
      await transaction.execute({
        sql: `
          UPDATE activity_registrations
          SET status = 'pending', registered_at = CURRENT_TIMESTAMP,
              reviewed_by = NULL, reviewed_at = NULL, review_note = NULL
          WHERE id = ? AND student_id = ?
        `,
        args: [existing.rows[0].id, req.student.id]
      })
    } else {
      await transaction.execute({
        sql: `
          INSERT INTO activity_registrations (id, activity_id, student_id, status)
          VALUES (?, ?, ?, 'pending')
        `,
        args: [randomUUID(), activityId, req.student.id]
      })
    }

    await transaction.commit()
    transaction = null
    return res.status(201).json({
      success: true,
      message: 'Activity registration submitted for administrator review.'
    })
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back activity registration:', rollbackError)
      }
    }
    console.error('Student activity registration error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to register for the activity.'
    })
  }
})

router.delete('/activities/:id/register', async (req, res) => {
  const activityId = validateRecordId(req.params.id, res)
  if (!activityId) return

  try {
    const result = await db.execute({
      sql: `
        UPDATE activity_registrations
        SET status = 'cancelled'
        WHERE activity_id = ? AND student_id = ? AND status = 'pending'
      `,
      args: [activityId, req.student.id]
    })

    if (Number(result.rowsAffected) === 0) {
      return res.status(409).json({
        success: false,
        message: 'Only a pending registration can be cancelled.'
      })
    }

    return res.json({ success: true, message: 'Activity registration cancelled.' })
  } catch (error) {
    console.error('Student activity cancellation error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel activity registration.'
    })
  }
})

router.get('/attendance', async (req, res) => {
  const from = readQueryString(req.query.from, 'Start date', 10, res)
  if (from === undefined) return
  const to = readQueryString(req.query.to, 'End date', 10, res)
  if (to === undefined) return
  const status = readQueryString(req.query.status, 'Status', 20, res)
  if (status === undefined) return
  const search = readQueryString(req.query.search, 'Search', 100, res)
  if (search === undefined) return

  if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
    return res.status(400).json({
      success: false,
      message: 'Date filters must use YYYY-MM-DD format.'
    })
  }
  if (from && to && from > to) {
    return res.status(400).json({
      success: false,
      message: 'Start date must not be after end date.'
    })
  }
  if (status && !attendanceStatuses.has(status)) {
    return res.status(400).json({
      success: false,
      message: 'Attendance status filter is invalid.'
    })
  }

  const conditions = ['a.student_id = ?']
  const args = [req.student.id]
  if (from) {
    conditions.push('a.attendance_date >= ?')
    args.push(from)
  }
  if (to) {
    conditions.push('a.attendance_date <= ?')
    args.push(to)
  }
  if (status) {
    conditions.push('a.status = ?')
    args.push(status)
  }
  if (search) {
    conditions.push('(a.attendance_date LIKE ? OR a.admin_remarks LIKE ?)')
    args.push(`%${search}%`, `%${search}%`)
  }

  try {
    const [records, totals] = await Promise.all([
      db.execute({
        sql: `
          SELECT a.id, a.attendance_date, a.time_in, a.time_out, a.total_hours,
            a.status, a.admin_remarks, a.created_at, a.activity_id,
            s.title AS activity_title
          FROM attendance a
          LEFT JOIN service_activities s ON s.id = a.activity_id
          WHERE ${conditions.join(' AND ')}
          ORDER BY a.attendance_date DESC, a.created_at DESC
        `,
        args
      }),
      db.execute({
        sql: `
          SELECT COALESCE(SUM(total_hours), 0) AS total
          FROM attendance
          WHERE student_id = ? AND status = 'approved'
        `,
        args: [req.student.id]
      })
    ])

    return res.json({
      success: true,
      attendance: records.rows,
      approvedHours: Number(totals.rows[0].total)
    })
  } catch (error) {
    console.error('Student attendance list error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load attendance records.'
    })
  }
})

router.post('/attendance', async (req, res) => {
  const body = req.body || {}
  const attendanceDate = body.attendance_date
  const timeIn = body.time_in
  const timeOut = body.time_out
  const activityId = body.activity_id === undefined || body.activity_id === null || body.activity_id === ''
    ? null
    : body.activity_id

  if (!isValidDate(attendanceDate)) {
    return res.status(400).json({
      success: false,
      message: 'Attendance date must be a valid YYYY-MM-DD date.'
    })
  }
  if (attendanceDate > new Date().toISOString().slice(0, 10)) {
    return res.status(400).json({
      success: false,
      message: 'Future attendance dates are not allowed.'
    })
  }
  if (!isValidTime(timeIn) || !isValidTime(timeOut)) {
    return res.status(400).json({
      success: false,
      message: 'Time in and time out must use 24-hour HH:MM format.'
    })
  }
  if (activityId !== null && (typeof activityId !== 'string' || activityId.length > 128)) {
    return res.status(400).json({
      success: false,
      message: 'Activity ID is invalid.'
    })
  }

  const startMinutes = Number(timeIn.slice(0, 2)) * 60 + Number(timeIn.slice(3, 5))
  const endMinutes = Number(timeOut.slice(0, 2)) * 60 + Number(timeOut.slice(3, 5))
  if (endMinutes <= startMinutes) {
    return res.status(400).json({
      success: false,
      message: 'Time out must be later than time in on the same day.'
    })
  }

  const totalHours = Number(((endMinutes - startMinutes) / 60).toFixed(2))
  let transaction
  try {
    transaction = await db.transaction('write')
    if (activityId) {
      const registration = await transaction.execute({
        sql: `
          SELECT r.id
          FROM activity_registrations r
          JOIN service_activities a ON a.id = r.activity_id
          WHERE r.activity_id = ?
            AND r.student_id = ?
            AND r.status = 'approved'
            AND a.status = 'published'
        `,
        args: [activityId, req.student.id]
      })
      if (registration.rows.length === 0) {
        await transaction.rollback()
        transaction = null
        return res.status(403).json({
          success: false,
          message: 'You must have an approved registration to submit activity attendance.'
        })
      }
    }

    const existing = await transaction.execute({
      sql: 'SELECT id FROM attendance WHERE student_id = ? AND attendance_date = ? LIMIT 1',
      args: [req.student.id, attendanceDate]
    })

    if (existing.rows.length > 0) {
      await transaction.rollback()
      transaction = null
      return res.status(409).json({
        success: false,
        message: 'An attendance record has already been submitted for this date.'
      })
    }

    const id = randomUUID()
    await transaction.execute({
      sql: `
        INSERT INTO attendance (
          id, student_id, attendance_date, time_in, time_out, total_hours, status, activity_id
        )
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
      `,
      args: [id, req.student.id, attendanceDate, timeIn, timeOut, totalHours, activityId]
    })
    await transaction.commit()
    transaction = null

    return res.status(201).json({
      success: true,
      message: 'Attendance submitted for administrator review.',
      attendance: {
        id,
        attendance_date: attendanceDate,
        time_in: timeIn,
        time_out: timeOut,
        total_hours: totalHours,
        status: 'pending',
        activity_id: activityId
      }
    })
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back attendance submission:', rollbackError)
      }
    }
    console.error('Student attendance submission error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to submit attendance.'
    })
  }
})

router.get('/service-hours', async (req, res) => {
  const from = readQueryString(req.query.from, 'Start date', 10, res)
  if (from === undefined) return
  const to = readQueryString(req.query.to, 'End date', 10, res)
  if (to === undefined) return
  const status = readQueryString(req.query.status, 'Status', 20, res)
  if (status === undefined) return
  const search = readQueryString(req.query.search, 'Search', 100, res)
  if (search === undefined) return

  if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
    return res.status(400).json({
      success: false,
      message: 'Date filters must use YYYY-MM-DD format.'
    })
  }
  if (from && to && from > to) {
    return res.status(400).json({
      success: false,
      message: 'Start date must not be after end date.'
    })
  }
  if (status && !attendanceStatuses.has(status)) {
    return res.status(400).json({
      success: false,
      message: 'Service-hour status filter is invalid.'
    })
  }

  const historyConditions = []
  const historyArgs = []
  if (from) {
    historyConditions.push('date(history_date) >= ?')
    historyArgs.push(from)
  }
  if (to) {
    historyConditions.push('date(history_date) <= ?')
    historyArgs.push(to)
  }
  if (status) {
    historyConditions.push('status = ?')
    historyArgs.push(status)
  }
  if (search) {
    historyConditions.push('(activity LIKE ? OR source LIKE ? OR remarks LIKE ?)')
    historyArgs.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  try {
    const [progress, history] = await Promise.all([
      getHourProgress(req.student.id),
      db.execute({
        sql: `
          SELECT id, history_date, activity, hours, source, status, remarks, counted_hours
          FROM (
            SELECT
              id,
              attendance_date AS history_date,
              'Attendance' AS activity,
              total_hours AS hours,
              'attendance' AS source,
              status,
              admin_remarks AS remarks,
              CASE WHEN status = 'approved' THEN total_hours ELSE 0 END AS counted_hours
            FROM attendance
            WHERE student_id = ?
            UNION ALL
            SELECT
              id,
              created_at AS history_date,
              reason AS activity,
              CASE
                WHEN adjustment_type = 'add' THEN adjustment_amount
                ELSE -adjustment_amount
              END AS hours,
              'hour_adjustment' AS source,
              'approved' AS status,
              reason AS remarks,
              CASE
                WHEN adjustment_type = 'add' THEN adjustment_amount
                ELSE -adjustment_amount
              END AS counted_hours
            FROM hour_adjustments
            WHERE student_id = ?
          ) AS hour_history
          ${historyConditions.length ? `WHERE ${historyConditions.join(' AND ')}` : ''}
          ORDER BY history_date DESC
        `,
        args: [req.student.id, req.student.id, ...historyArgs]
      })
    ])

    return res.json({
      success: true,
      progress,
      history: history.rows
    })
  } catch (error) {
    console.error('Student service-hours error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load service-hour history.'
    })
  }
})

router.get('/assignments', async (req, res) => {
  try {
    const result = await db.execute({
      sql: `
        SELECT
          a.id,
          a.assigned_date,
          a.schedule_start,
          a.schedule_end,
          s.area_name,
          s.description,
          s.location
        FROM service_assignments a
        JOIN service_areas s ON s.id = a.area_id
        WHERE a.student_id = ?
        ORDER BY a.assigned_date DESC, a.schedule_start
      `,
      args: [req.student.id]
    })

    return res.json({ success: true, assignments: result.rows })
  } catch (error) {
    console.error('Student assignments error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load assignments.'
    })
  }
})

router.get('/documents', async (req, res) => {
  try {
    const result = await db.execute({
      sql: `
        SELECT id, document_name, document_type, description, status,
          admin_remarks, submitted_at, reviewed_at
        FROM documents
        WHERE student_id = ?
        ORDER BY submitted_at DESC
      `,
      args: [req.student.id]
    })
    return res.json({
      success: true,
      documents: result.rows.map(document => ({
        ...document,
        file_url: `/api/student/documents/${encodeURIComponent(document.id)}/file`,
        can_delete: document.status === 'pending'
      }))
    })
  } catch (error) {
    console.error('Student documents error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load submitted documents.'
    })
  }
})

router.post('/documents', handleDocumentUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Choose a document file to upload.'
    })
  }

  const documentType = req.body && req.body.document_type
  const description = req.body && req.body.description
  if (
    typeof documentType !== 'string' ||
    documentType.trim().length === 0 ||
    documentType.trim().length > 100 ||
    (description !== undefined && (typeof description !== 'string' || description.trim().length > 1000))
  ) {
    await removeUploadedFile(req.file.path)
    return res.status(400).json({
      success: false,
      message: 'Document type is required and description must be no longer than 1000 characters.'
    })
  }

  try {
    const contents = await fs.promises.readFile(req.file.path)
    if (!validDocumentSignature(contents, req.file.mimetype)) {
      await removeUploadedFile(req.file.path)
      return res.status(400).json({
        success: false,
        message: 'The file contents do not match an allowed document format.'
      })
    }

    const documentName = req.file.originalname
      .split(/[\\/]/)
      .pop()
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .slice(0, 200)
    if (!documentName) {
      await removeUploadedFile(req.file.path)
      return res.status(400).json({
        success: false,
        message: 'The uploaded file name is invalid.'
      })
    }

    const id = randomUUID()
    await db.execute({
      sql: `
        INSERT INTO documents (
          id, student_id, document_name, document_type, description, file_path, status
        )
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `,
      args: [
        id,
        req.student.id,
        documentName,
        documentType.trim(),
        description ? description.trim() : null,
        path.basename(req.file.filename)
      ]
    })

    return res.status(201).json({
      success: true,
      message: 'Document submitted for administrator review.',
      document: {
        id,
        document_name: documentName,
        document_type: documentType.trim(),
        description: description ? description.trim() : null,
        status: 'pending',
        file_url: `/api/student/documents/${encodeURIComponent(id)}/file`,
        can_delete: true
      }
    })
  } catch (error) {
    await removeUploadedFile(req.file.path)
    console.error('Student document upload error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to save the uploaded document.'
    })
  }
})

router.get('/documents/:id/file', async (req, res) => {
  const documentId = validateRecordId(req.params.id, res)
  if (!documentId) return

  try {
    const result = await db.execute({
      sql: 'SELECT file_path, document_name, document_type FROM documents WHERE id = ? AND student_id = ?',
      args: [documentId, req.student.id]
    })
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document was not found.'
      })
    }

    const document = result.rows[0]
    const fileName = String(document.file_path)
    const filePath = resolveDocumentPath(fileName)
    if (!filePath) {
      console.error('Invalid stored document path for document:', documentId)
      return res.status(500).json({
        success: false,
        message: 'The stored document cannot be accessed.'
      })
    }

    await fs.promises.access(filePath, fs.constants.R_OK)
    const safeName = String(document.document_name)
      .replace(/[^a-zA-Z0-9._ ()-]/g, '_')
      .slice(0, 120) || 'document'
    const mimeType = getDocumentMimeType(fileName)

    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
    return res.sendFile(filePath, error => {
      if (error && !res.headersSent) {
        console.error('Document file response error:', error)
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
    console.error('Student document file error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to access the document.'
    })
  }
})

router.get('/documents/:id', async (req, res) => {
  const documentId = validateRecordId(req.params.id, res)
  if (!documentId) return

  try {
    const result = await db.execute({
      sql: `
        SELECT id, document_name, document_type, description, status,
          admin_remarks, submitted_at, reviewed_at
        FROM documents
        WHERE id = ? AND student_id = ?
      `,
      args: [documentId, req.student.id]
    })
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document was not found.'
      })
    }
    return res.json({ success: true, document: result.rows[0] })
  } catch (error) {
    console.error('Student document detail error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load document details.'
    })
  }
})

router.delete('/documents/:id', async (req, res) => {
  const documentId = validateRecordId(req.params.id, res)
  if (!documentId) return

  try {
    const result = await db.execute({
      sql: `
        DELETE FROM documents
        WHERE id = ? AND student_id = ? AND status = 'pending'
        RETURNING file_path
      `,
      args: [documentId, req.student.id]
    })
    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'Only your unreviewed documents can be deleted.'
      })
    }

    const fileName = String(result.rows[0].file_path)
    const filePath = resolveDocumentPath(fileName)
    if (!filePath) {
      console.error('Invalid stored document path during delete:', documentId)
      return res.status(500).json({
        success: false,
        message: 'Document metadata was deleted, but its file could not be safely removed.'
      })
    }

    try {
      await fs.promises.unlink(filePath)
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Document metadata was deleted but file cleanup failed:', error)
        return res.status(500).json({
          success: false,
          message: 'Document metadata was deleted, but file cleanup failed.'
        })
      }
    }
    return res.json({ success: true, message: 'Unreviewed document deleted.' })
  } catch (error) {
    console.error('Student document delete error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to delete the document.'
    })
  }
})

router.get('/announcements', async (req, res) => {
  const search = readQueryString(req.query.search, 'Search', 100, res)
  if (search === undefined) return

  try {
    const conditions = [
      '(a.target_section_id IS NULL OR a.target_section_id = (SELECT section_id FROM users WHERE id = ?))'
    ]
    const args = [req.student.id]
    if (search) {
      conditions.push('(a.title LIKE ? OR a.content LIKE ?)')
      args.push(`%${search}%`, `%${search}%`)
    }

    const result = await db.execute({
      sql: `
        SELECT
          a.id,
          a.title,
          a.content,
          a.created_at,
          u.first_name,
          u.last_name
        FROM announcements a
        JOIN users u ON u.id = a.admin_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY a.created_at DESC
      `,
      args
    })

    return res.json({
      success: true,
      announcements: result.rows.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        created_at: item.created_at,
        author: [item.first_name, item.last_name].filter(Boolean).join(' ')
      }))
    })
  } catch (error) {
    console.error('Student announcements error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load announcements.'
    })
  }
})

router.get('/notifications', async (req, res) => {
  const filter = readQueryString(req.query.filter, 'Notification filter', 10, res)
  if (filter === undefined) return
  if (filter && !['read', 'unread'].includes(filter)) {
    return res.status(400).json({
      success: false,
      message: 'Notification filter must be read or unread.'
    })
  }

  const conditions = ['user_id = ?']
  const args = [req.student.id]
  if (filter) {
    conditions.push('is_read = ?')
    args.push(filter === 'read' ? 1 : 0)
  }

  try {
    const [notifications, unread] = await Promise.all([
      db.execute({
        sql: `
          SELECT id, title, message, is_read, created_at
          FROM notifications
          WHERE ${conditions.join(' AND ')}
          ORDER BY created_at DESC
        `,
        args
      }),
      db.execute({
        sql: 'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0',
        args: [req.student.id]
      })
    ])

    return res.json({
      success: true,
      notifications: notifications.rows,
      unreadCount: Number(unread.rows[0].total)
    })
  } catch (error) {
    console.error('Student notifications error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load notifications.'
    })
  }
})

router.patch('/notifications/read-all', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      args: [req.student.id]
    })
    return res.json({
      success: true,
      updated: Number(result.rowsAffected)
    })
  } catch (error) {
    console.error('Mark all notifications read error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read.'
    })
  }
})

router.patch('/notifications/:id/read', async (req, res) => {
  const notificationId = validateRecordId(req.params.id, res)
  if (!notificationId) return

  try {
    const result = await db.execute({
      sql: 'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      args: [notificationId, req.student.id]
    })
    if (Number(result.rowsAffected) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification was not found.'
      })
    }
    return res.json({ success: true, message: 'Notification marked as read.' })
  } catch (error) {
    console.error('Mark notification read error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read.'
    })
  }
})

router.get('/profile', async (req, res) => {
  try {
    const result = await db.execute({
      sql: `
        SELECT
          u.id,
          u.student_id,
          u.first_name,
          u.middle_name,
          u.last_name,
          u.email,
          u.contact_number,
          u.course,
          u.year_level,
          u.account_status,
          u.created_at AS registration_date,
          s.section_name AS section
        FROM users u
        LEFT JOIN sections s ON s.id = u.section_id
        WHERE u.id = ? AND u.role = 'student'
      `,
      args: [req.student.id]
    })

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile was not found.'
      })
    }
    return res.json({ success: true, profile: result.rows[0] })
  } catch (error) {
    console.error('Student profile error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load student profile.'
    })
  }
})

router.patch('/profile', async (req, res) => {
  const body = req.body || {}
  const allowedFields = new Set(['first_name', 'middle_name', 'last_name', 'contact_number'])
  const fields = Object.keys(body)

  if (fields.length === 0 || fields.some(field => !allowedFields.has(field))) {
    return res.status(400).json({
      success: false,
      message: 'Only first name, middle name, last name, and contact number can be changed.'
    })
  }

  const values = {}
  for (const field of fields) {
    const value = body[field]
    if (field === 'middle_name' && (value === null || value === '')) {
      values[field] = null
      continue
    }
    if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: `${field.replace('_', ' ')} must be text between 1 and 100 characters.`
      })
    }
    values[field] = value.trim()
  }

  try {
    const assignments = fields.map(field => `${field} = ?`)
    const args = fields.map(field => values[field])
    assignments.push('updated_at = CURRENT_TIMESTAMP')
    args.push(req.student.id)

    await db.execute({
      sql: `
        UPDATE users
        SET ${assignments.join(', ')}
        WHERE id = ? AND role = 'student' AND account_status = 'approved'
      `,
      args
    })

    return res.json({ success: true, message: 'Profile updated.' })
  } catch (error) {
    console.error('Student profile update error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update student profile.'
    })
  }
})

router.patch('/change-password', async (req, res) => {
  const body = req.body || {}
  const { currentPassword, newPassword, confirmPassword } = body

  if (
    typeof currentPassword !== 'string' ||
    typeof newPassword !== 'string' ||
    typeof confirmPassword !== 'string'
  ) {
    return res.status(400).json({
      success: false,
      message: 'Current password, new password, and confirmation are required.'
    })
  }
  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'New password must contain at least 8 characters.'
    })
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'New password and confirmation do not match.'
    })
  }

  try {
    const result = await db.execute({
      sql: 'SELECT password_hash FROM users WHERE id = ? AND role = ?',
      args: [req.student.id, 'student']
    })
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student account was not found.'
      })
    }
    if (!(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.'
      })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await db.execute({
      sql: `
        UPDATE users
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND role = 'student' AND account_status = 'approved'
      `,
      args: [passwordHash, req.student.id]
    })

    return res.json({ success: true, message: 'Password changed successfully.' })
  } catch (error) {
    console.error('Student password update error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to change password.'
    })
  }
})

module.exports = router
