const db = require('../db')

async function migrate() {
  try {
    const documentColumns = await db.execute('PRAGMA table_info(documents)')
    const hasReviewedBy = documentColumns.rows.some(column => column.name === 'reviewed_by')
    if (!hasReviewedBy) {
      await db.execute('ALTER TABLE documents ADD COLUMN reviewed_by TEXT REFERENCES users(id)')
    }

    console.log('Documents table has the reviewed_by column.')
  } catch (error) {
    console.error('Documents reviewed_by migration failed:', error)
    process.exitCode = 1
  } finally {
    await db.close()
  }
}

migrate()
