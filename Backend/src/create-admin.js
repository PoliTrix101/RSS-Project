
const { randomUUID } = require('crypto')
const bcrypt = require('bcryptjs')
const db = require('./db')

async function createAdmin() {
  try {
    const firstName = process.env.ADMIN_FIRST_NAME
    const lastName = process.env.ADMIN_LAST_NAME
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    const password = process.env.ADMIN_PASSWORD

    // Validate environment variables
    if (!firstName || !lastName || !email || !password) {
      throw new Error(
        'Please configure all ADMIN values in backend/.env'
      )
    }

    if (password.length < 12) {
      throw new Error(
        'Admin password must be at least 12 characters.'
      )
    }

    // Check if email already exists
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email]
    })

    if (existing.rows.length > 0) {
      throw new Error(
        'This email is already registered. Use another email.'
      )
    }

    // Hash admin password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create admin account
    await db.execute({
      sql: `
        INSERT INTO users (
          id,
          first_name,
          last_name,
          email,
          password_hash,
          role,
          account_status
        )
        VALUES (?, ?, ?, ?, ?, 'admin', 'approved')
      `,
      args: [
        randomUUID(),
        firstName.trim(),
        lastName.trim(),
        email,
        passwordHash
      ]
    })

    console.log('')
    console.log('================================')
    console.log('ADMIN ACCOUNT CREATED!')
    console.log('================================')
    console.log(`Admin Name: ${firstName} ${lastName}`)
    console.log(`Admin Email: ${email}`)
    console.log('Role: admin')
    console.log('Status: approved')
    console.log('================================')

  } catch (error) {
    console.error('')
    console.error('Admin creation failed:', error.message)

  } finally {
    await db.close()
  }
}

createAdmin()
    