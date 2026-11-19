
const db = require('./db')

async function testConnection() {
  try {
    const result = await db.execute('SELECT 1 AS connection_test')

    console.log('Successfully connected to Turso!')
    console.log(result.rows)

  } catch (error) {
    console.error('Turso connection failed:', error.message)
  } finally {
    await db.close()
  }
}

testConnection()
