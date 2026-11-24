// The school runs on Philippine time. Dates and times people enter in the app
// ("today", an activity's start time) are local wall-clock values, so the server
// compares them with the local date and time instead of UTC.
// Set APP_TIME_ZONE in Backend/.env to use a different IANA time zone.
const DEFAULT_TIME_ZONE = 'Asia/Manila'
const formatters = new Map()

function zonedParts(date) {
  const timeZone = process.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE
  if (!formatters.has(timeZone)) {
    formatters.set(timeZone, new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }))
  }

  const parts = {}
  for (const part of formatters.get(timeZone).formatToParts(date)) {
    parts[part.type] = part.value
  }
  return parts
}

// 'YYYY-MM-DD' in the app's time zone.
function todayInAppZone(date = new Date()) {
  const { year, month, day } = zonedParts(date)
  return `${year}-${month}-${day}`
}

// 'YYYY-MM-DD HH:MM:SS' in the app's time zone, comparable with SQLite datetime().
function nowInAppZone(date = new Date()) {
  const { year, month, day, hour, minute, second } = zonedParts(date)
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

module.exports = {
  todayInAppZone,
  nowInAppZone
}
