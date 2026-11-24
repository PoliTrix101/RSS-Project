const db = require('../db')

// Students attach a photo from before and after their service (the area before
// cleaning and after). The columns hold file names inside private_attendance_photos.
async function migrate() {
  try {
    const columns = await db.execute('PRAGMA table_info(attendance)')
    const names = new Set(columns.rows.map(column => column.name))
    for (const column of ['before_photo_path', 'after_photo_path']) {
      if (!names.has(column)) {
        await db.execute(`ALTER TABLE attendance ADD COLUMN ${column} TEXT`)
      }
    }

    console.log('Attendance table has the before and after photo columns.')
  } catch (error) {
    console.error('Attendance photo migration failed:', error)
    process.exitCode = 1
  } finally {
    await db.close()
  }
}

migrate()
