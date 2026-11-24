// The login page stores the token and user in localStorage ("Remember me")
// or sessionStorage (this tab only). These helpers read and clear both.

export function readSession(role) {
  const persistentToken = localStorage.getItem('rss_token')
  const token = persistentToken || sessionStorage.getItem('rss_token')
  const rawUser = localStorage.getItem('rss_user') || sessionStorage.getItem('rss_user')
  if (!token || !rawUser) return null

  let user
  try {
    user = JSON.parse(rawUser)
  } catch {
    return null
  }
  if (!user || (role && user.role !== role)) return null

  return { token, user, persistent: Boolean(persistentToken) }
}

export function clearSession() {
  localStorage.removeItem('rss_token')
  localStorage.removeItem('rss_user')
  sessionStorage.removeItem('rss_token')
  sessionStorage.removeItem('rss_user')
}

export function fullName(person, fallback = '') {
  if (!person) return fallback
  return [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(' ') || fallback
}

export function initialsOf(name, fallback = '?') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return `${first}${last}`.toUpperCase()
}
