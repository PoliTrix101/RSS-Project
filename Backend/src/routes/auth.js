
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { randomUUID } = require('crypto')
const db = require('../db')

const router = express.Router()

// ==========================================
// STUDENT REGISTRATION
// ==========================================

router.post('/register', async (req, res) => {
  try {
    const {
      student_id,
      first_name,
      middle_name,
      last_name,
      email,
      password,
      course,
      year_level,
      section
    } = req.body

    if (
      !student_id ||
      !first_name ||
      !last_name ||
      !email ||
      !password ||
      !course ||
      !year_level ||
      !section
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.'
      })
    }

    const studentId = String(student_id).trim()
    const firstName = String(first_name).trim()
    const lastName = String(last_name).trim()
    const normalizedEmail = String(email).trim().toLowerCase()
    const normalizedCourse = String(course).trim().toUpperCase()
    const normalizedYear = String(year_level).trim()
    const normalizedSection = String(section).trim().toUpperCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      })
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters.'
      })
    }

    const existing = await db.execute({
      sql: `
        SELECT id FROM users
        WHERE student_id = ? OR email = ?
      `,
      args: [studentId, normalizedEmail]
    })

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Student ID or email is already registered.'
      })
    }

    let sectionResult = await db.execute({
      sql: `
        SELECT id FROM sections
        WHERE section_name = ?
          AND course = ?
          AND year_level = ?
      `,
      args: [normalizedSection, normalizedCourse, normalizedYear]
    })

    let sectionId

    if (sectionResult.rows.length > 0) {
      sectionId = sectionResult.rows[0].id

      if (!sectionId) {
        sectionId = randomUUID()
        await db.execute({
          sql: `
            UPDATE sections
            SET id = ?
            WHERE id IS NULL
              AND section_name = ?
              AND course = ?
              AND year_level = ?
          `,
          args: [sectionId, normalizedSection, normalizedCourse, normalizedYear]
        })
      }
    } else {
      sectionId = randomUUID()
      await db.execute({
        sql: `
          INSERT INTO sections (id, section_name, course, year_level)
          VALUES (?, ?, ?, ?)
        `,
        args: [sectionId, normalizedSection, normalizedCourse, normalizedYear]
      })
    }

    const passwordHash = await bcrypt.hash(String(password), 12)

    await db.execute({
      sql: `
        INSERT INTO users (
          id,
          student_id,
          first_name,
          middle_name,
          last_name,
          email,
          password_hash,
          role,
          course,
          year_level,
          section_id,
          account_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'student', ?, ?, ?, 'pending')
      `,
      args: [
        randomUUID(),
        studentId,
        firstName,
        middle_name ? String(middle_name).trim() : null,
        lastName,
        normalizedEmail,
        passwordHash,
        normalizedCourse,
        normalizedYear,
        sectionId
      ]
    })

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Your account is waiting for admin approval.'
    })

  } catch (error) {
    console.error('Registration error:', error)

    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    })
  }
})

// ==========================================
// LOGIN (ADMIN AND STUDENT)
// ==========================================

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your email and password.'
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const result = await db.execute({
      sql: `
        SELECT
          id,
          student_id,
          first_name,
          middle_name,
          last_name,
          email,
          password_hash,
          role,
          course,
          year_level,
          section_id,
          account_status
        FROM users
        WHERE email = ?
      `,
      args: [normalizedEmail]
    })

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      })
    }

    const user = result.rows[0]

    const passwordMatch = await bcrypt.compare(
      String(password),
      user.password_hash
    )

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      })
    }

    if (user.account_status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: user.account_status === 'pending'
          ? 'Your account is waiting for admin approval.'
          : 'Your account is not currently allowed to log in.'
      })
    }

    if (!['admin', 'student'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid account role.'
      })
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is missing from backend/.env')
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        student_id: user.student_id,
        first_name: user.first_name,
        middle_name: user.middle_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        course: user.course,
        year_level: user.year_level,
        section_id: user.section_id,
        account_status: user.account_status
      }
    })

  } catch (error) {
    console.error('Login error:', error)

    return res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    })
  }
})

module.exports = router
