const jwt = require('jsonwebtoken')
const db = require('../db')

async function requireStudent(req, res, next) {
  const authorization = req.get('authorization')
  const match = authorization && authorization.match(/^Bearer\s+(.+)$/i)

  if (!match) {
    return res.status(401).json({
      success: false,
      message: 'Student authentication is required.'
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

    if (!payload || typeof payload !== 'object' || payload.role !== 'student' || !payload.id) {
      return res.status(403).json({
        success: false,
        message: 'Student access is required.'
      })
    }

    const result = await db.execute({
      sql: `
        SELECT id
        FROM users
        WHERE id = ?
          AND role = 'student'
          AND account_status = 'approved'
      `,
      args: [String(payload.id)]
    })

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Student access is required.'
      })
    }

    req.student = { id: String(payload.id) }
    return next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session is invalid or has expired.'
      })
    }

    console.error('Student authentication error:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to verify student access.'
    })
  }
}

module.exports = requireStudent
