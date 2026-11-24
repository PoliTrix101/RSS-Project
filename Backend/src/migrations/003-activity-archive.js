const db = require('../db')

// Archived activities leave the admin's active list but keep their
// registrations and attendance, so the participant record survives.
async function migrate() {
  try {
    const columns = await db.execute('PRAGMA table_info(service_activities)')
    const hasArchivedAt = columns.rows.some(column => column.name === 'archived_at')
    if (!hasArchivedAt) {
      await db.execute('ALTER TABLE service_activities ADD COLUMN archived_at TEXT')
    }

    console.log('Service activities table has the archived_at column.')
  } catch (error) {
    console.error('Activity archive migration failed:', error)
    process.exitCode = 1
  } finally {
    await db.close()
  }
}

migrate()
