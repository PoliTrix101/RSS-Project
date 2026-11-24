// The API sends three kinds of date values:
//   'YYYY-MM-DD'           a calendar day (attendance_date, assigned_date)
//   'YYYY-MM-DD HH:MM:SS'  a SQLite CURRENT_TIMESTAMP, which is in UTC
//   'YYYY-MM-DDTHH:MM'     a local wall-clock time from a datetime-local input
// new Date() would read the second kind as local time, 8 hours off in the Philippines.
export function parseApiDate(value) {
  if (!value) return null
  const text = String(value).trim()

  let date
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    date = new Date(`${text}T00:00:00`)
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(text)) {
    date = new Date(`${text.replace(' ', 'T')}Z`)
  } else {
    date = new Date(text)
  }
  return Number.isNaN(date.getTime()) ? null : date
}

// A date as YYYY-MM-DD in the browser's own time zone (toISOString() gives the UTC day).
export function localDateString(date = new Date()) {
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
