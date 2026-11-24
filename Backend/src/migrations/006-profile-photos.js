const db = require('../db')

// Students can upload a profile picture. The column holds a file name inside
// private_profile_photos, or NULL when the student shows their initials instead.
async function migrate() {
  try {
    const columns = await db.execute('PRAGMA table_info(users)')
    if (!columns.rows.some(column => column.name === 'profile_photo_path')) {
      await db.execute('ALTER TABLE users ADD COLUMN profile_photo_path TEXT')
    }

    console.log('Users table has the profile photo column.')
  } catch (error) {
    console.error('Profile photo migration failed:', error)
    process.exitCode = 1
  } finally {
    await db.close()
  }
}

migrate()
