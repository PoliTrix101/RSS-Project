import { parseApiDate } from './dates'

const dateFormat = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
const dateTimeFormat = new Intl.DateTimeFormat('en-PH', {
  year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
})
const timeFormat = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' })
const monthFormat =new Intl.DateTimeFormat('en-PH', { month: 'short' })
const numberFormat = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 })

export function formatDate(value) {
  if (!value) return '—'
  const date = parseApiDate(value)
  return date ? dateFormat.format(date) : String(value)
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = parseApiDate(value)
  return date ? dateTimeFormat.format(date) : String(value)
}

// { month: 'NOV', day: '24' } for calendar-style date tiles.
export function dateParts(value) {
  const date = parseApiDate(value)
  if (!date) return { month: '—', day: '' }
  return { month: monthFormat.format(date), day: String(date.getDate()) }
}

// "2 hours ago", "3 days ago", or the date for anything older than a week.
export function timeAgo(value) {
  const date = parseApiDate(value)
  if (!date) return '—'
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 0) return formatDateTime(value)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatDate(value)
}

// "07:30" or "07:30:00" → "7:30 AM".
export function formatTime(value) {
  if (!value) return ''
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value))
  if (!match) return String(value)
  const hours = Number(match[1])
  const suffix = hours >= 12 ? 'PM' : 'AM'
  return `${hours % 12 || 12}:${match[2]} ${suffix}`
}

export function formatTimeRange(start, end, missing = 'TBD') {
  if (!start && !end) return missing
  return `${formatTime(start) || missing} – ${formatTime(end) || missing}`
}

// An activity's start and end, without repeating the date when both fall on the same day.
export function formatSchedule(start, end) {
  const from = parseApiDate(start)
  const to = parseApiDate(end)
  if (!from) return '—'
  if (to && from.toDateString() === to.toDateString()) {
    return `${dateFormat.format(from)} · ${timeFormat.format(from)} – ${timeFormat.format(to)}`
  }
  return `${dateTimeFormat.format(from)} – ${to ? dateTimeFormat.format(to) : '—'}`
}

export function formatHours(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Number(number.toFixed(2)).toString() : '0'
}

export function formatNumber(value) {
  return numberFormat.format(Number(value) || 0)
}

export function titleCase(value) {
  return value ? String(value).replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : '—'
}

export function badgeClass(status) {
  return `badge badge-${String(status || 'neutral').toLowerCase()}`
}
