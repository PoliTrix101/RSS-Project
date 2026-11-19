const db = require('../db')

const tables = [
  `CREATE TABLE IF NOT EXISTS service_activities (
    id TEXT PRIMARY KEY,
    area_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    scheduled_start TEXT NOT NULL,
    scheduled_end TEXT NOT NULL,
    required_hours REAL NOT NULL DEFAULT 0 CHECK (required_hours >= 0),
    capacity INTEGER CHECK (capacity IS NULL OR capacity >= 0),
    eligibility TEXT,
    registration_open INTEGER NOT NULL DEFAULT 1
      CHECK (registration_open IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft', 'published', 'cancelled')),
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES service_areas(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS activity_registrations (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
    reviewed_by TEXT,
    reviewed_at TEXT,
    review_note TEXT,
    UNIQUE (activity_id, student_id),
    FOREIGN KEY (activity_id) REFERENCES service_activities(id),
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
  )`,
  'CREATE INDEX IF NOT EXISTS idx_service_activities_status_schedule ON service_activities(status, scheduled_start)',
  'CREATE INDEX IF NOT EXISTS idx_activity_registrations_student ON activity_registrations(student_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_attendance_student_activity ON attendance(student_id, activity_id)'
]

async function migrate() {
  try {
    for (const sql of tables.slice(0, 4)) {
      await db.execute(sql)
    }

    const attendanceColumns = await db.execute('PRAGMA table_info(attendance)')
    const hasActivityId = attendanceColumns.rows.some(column => column.name === 'activity_id')
    if (!hasActivityId) {
      await db.execute(
        'ALTER TABLE attendance ADD COLUMN activity_id TEXT REFERENCES service_activities(id)'
      )
    }

    await db.execute(tables[4])
    console.log('Student activity tables and attendance link are ready.')
  } catch (error) {
    console.error('Student activity migration failed:', error)
    process.exitCode = 1
  } finally {
    await db.close()
  }
}

migrate()
