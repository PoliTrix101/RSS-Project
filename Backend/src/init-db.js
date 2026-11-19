
const db = require('./db')

const tables = [
  `CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_name TEXT NOT NULL,
    course TEXT NOT NULL,
    year_level TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(section_name, course, year_level)
  )`,

  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student'
      CHECK(role IN ('student', 'admin')),
    course TEXT,
    year_level TEXT,
    section_id INTEGER,
    contact_number TEXT,
    account_status TEXT NOT NULL DEFAULT 'pending'
      CHECK(account_status IN ('pending', 'active', 'rejected', 'disabled')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(section_id) REFERENCES sections(id)
  )`,

  `CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    attendance_date TEXT NOT NULL,
    time_in TEXT NOT NULL,
    time_out TEXT,
    total_hours REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending', 'approved', 'rejected')),
    verified_by INTEGER,
    admin_remarks TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(verified_by) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS hour_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    adjustment_amount REAL NOT NULL,
    adjustment_type TEXT NOT NULL
      CHECK(adjustment_type IN ('add', 'deduct')),
    reason TEXT NOT NULL,
    adjusted_by INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(adjusted_by) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS service_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_name TEXT NOT NULL UNIQUE,
    description TEXT,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS service_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    area_id INTEGER NOT NULL,
    assigned_date TEXT NOT NULL,
    schedule_start TEXT,
    schedule_end TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(area_id) REFERENCES service_areas(id)
  )`,

  `CREATE TABLE IF NOT EXISTS service_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    area_id INTEGER,
    activity_description TEXT,
    service_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    total_hours REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending', 'approved', 'rejected')),
    verified_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(area_id) REFERENCES service_areas(id),
    FOREIGN KEY(verified_by) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    document_name TEXT NOT NULL,
    document_type TEXT,
    description TEXT,
    file_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending', 'approved', 'rejected')),
    admin_remarks TEXT,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TEXT,
    FOREIGN KEY(student_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_section_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(admin_id) REFERENCES users(id),
    FOREIGN KEY(target_section_id) REFERENCES sections(id)
  )`,

  `CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    student_id INTEGER,
    action TEXT NOT NULL,
    reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(admin_id) REFERENCES users(id),
    FOREIGN KEY(student_id) REFERENCES users(id)
  )`
]

async function initializeDatabase() {
  try {
    await db.execute('PRAGMA foreign_keys = ON')

    for (const sql of tables) {
      await db.execute(sql)
    }

    console.log('RSS database tables created successfully!')
    console.log(`${tables.length} tables are ready.`)
  } catch (error) {
    console.error('Database initialization failed:', error)
    process.exitCode = 1
  } finally {
    await db.close()
  }
}

initializeDatabase()
