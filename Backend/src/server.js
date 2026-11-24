
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const adminRoutes = require('./routes/admin')
const studentRoutes = require('./routes/student')
const { startActivityEndNotices } = require('./activity-end-notices')

const app = express()

// Any local dev server (localhost or 127.0.0.1, any port) may call the API.
// For a deployed frontend, list its origin in CORS_ORIGINS (comma-separated).
const localDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

app.use(cors({
  origin(origin, callback) {
    const configuredOrigins = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
    callback(null, !origin || localDevOrigin.test(origin) || configuredOrigins.includes(origin))
  }
}))

app.use(express.json())

// Backend health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'RSS Backend is running!'
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/student', studentRoutes)

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`RSS Backend running on http://localhost:${PORT}`)
  startActivityEndNotices()
})
