
const { createClient } = require('@libsql/client')
const path = require('path')
require('dotenv').config({
  path: path.join(__dirname, '../.env')
})

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('Missing Turso database credentials in backend/.env')
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

module.exports = db
