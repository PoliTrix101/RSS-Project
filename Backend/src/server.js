
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const adminRoutes = require('./routes/admin')
const studentRoutes = require('./routes/student')

const app = express()

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174'
  ]
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
})
