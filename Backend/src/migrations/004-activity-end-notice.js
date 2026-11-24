const db = require('../db')

// ended_notified_at records when registered students were told an activity is
// done and asked to log their time, so the server sends that notice only once.
async function migrate() {
  try {
    const columns = await db.execute('PRAGMA table_info(service_activities)')
    const hasEndedNotifiedAt = columns.rows.some(column => column.name === 'ended_notified_at')
    if (!hasEndedNotifiedAt) {
      await db.execute('ALTER TABLE service_activities ADD COLUMN ended_notified_at TEXT')
    }

    console.log('Service activities table has the ended_notified_at column.')
  } catch (error) {
    console.error('Activity end notice migration failed:', error)
    process.exitCode = 1
  } finally {
    await db.close()
  }
}

migrate()
