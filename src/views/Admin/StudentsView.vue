<template>
  <div class="admin-layout">
    <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <div class="sidebar-brand">
        <div class="brand-icon">R</div>
        <div>
          <h2>RSS ADMIN</h2>
          <span>MANAGEMENT SYSTEM</span>
        </div>
      </div>

      <div class="admin-profile">
        <div class="profile-avatar">{{ adminInitial }}</div>
        <div>
          <strong>{{ adminName }}</strong>
          <span>System Admin</span>
        </div>
      </div>

      <nav class="sidebar-nav" aria-label="Admin navigation">
        <p class="nav-label">MAIN MENU</p>
        <button class="nav-item" type="button" @click="goToDashboard">
          <span>▦</span> Dashboard
        </button>
        <button class="nav-item active" type="button" aria-current="page">
          <span>♙</span> Student Management
        </button>
        <button class="nav-item" type="button" @click="goToWorkflow('attendance')">
          <span>▣</span> Attendance
        </button>
        <button class="nav-item" type="button" @click="goToWorkflow('hours')">
          <span>◷</span> Service Hours
        </button>
        <p class="nav-label">MANAGEMENT</p>
        <button class="nav-item" type="button" @click="goToWorkflow('activities')">
          <span>✦</span> Service Activities
        </button>
        <button class="nav-item" type="button" @click="goToWorkflow('areas')">
          <span>⌖</span> Service Areas
        </button>
        <button class="nav-item" type="button" @click="goToWorkflow('documents')">
          <span>▤</span> Documents
        </button>
        <button class="nav-item" type="button" @click="goToWorkflow('assignments')">
          <span>⌂</span> Cleaning Assignments
        </button>
        <p class="nav-label">SYSTEM</p>
        <button class="nav-item" type="button" @click="goToWorkflow('announcements')">
          <span>♧</span> Announcements
        </button>
      </nav>

      <div class="sidebar-bottom">
        <button class="logout-button" type="button" @click="logout">
          <span>↪</span> Sign Out
        </button>
        <p>RSS Management System v1.0</p>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="menu-button"
            type="button"
            aria-label="Toggle navigation"
            :aria-expanded="sidebarOpen"
            @click="sidebarOpen = !sidebarOpen"
          >
            ☰
          </button>
          <div>
            <h2>Student Management</h2>
            <p>Find and manage registered student accounts.</p>
          </div>
        </div>
        <div class="topbar-avatar">{{ adminInitial }}</div>
      </header>

      <section class="page-content">
        <div class="page-heading">
          <div>
            <h1>Students</h1>
            <p>Search student records, review account details, and manage registration status.</p>
          </div>
          <button class="refresh-button" type="button" :disabled="loading" @click="loadStudents">
            {{ loading ? 'Loading…' : '↻ Refresh' }}
          </button>
        </div>

        <div v-if="pageError" class="notice notice-error" role="alert">
          <span>{{ pageError }}</span>
          <button type="button" aria-label="Dismiss error" @click="pageError = ''">×</button>
        </div>
        <div v-if="successMessage" class="notice notice-success" role="status">
          <span>{{ successMessage }}</span>
          <button type="button" aria-label="Dismiss message" @click="successMessage = ''">×</button>
        </div>

        <section class="content-card" aria-label="Student list">
          <div class="filter-grid">
            <label class="search-field">
              <span>Search students</span>
              <input
                v-model="filters.search"
                type="search"
                placeholder="Name or student ID"
                autocomplete="off"
              >
            </label>

            <label>
              <span>Course</span>
              <select v-model="filters.course">
                <option value="">All courses</option>
                <option v-for="course in filterOptions.courses" :key="course" :value="course">
                  {{ course }}
                </option>
              </select>
            </label>

            <label>
              <span>Year level</span>
              <select v-model="filters.year_level">
                <option value="">All year levels</option>
                <option v-for="year in filterOptions.yearLevels" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </label>

            <label>
              <span>Section</span>
              <select v-model="filters.section">
                <option value="">All sections</option>
                <option v-for="section in filterOptions.sections" :key="section" :value="section">
                  {{ section }}
                </option>
              </select>
            </label>

            <label>
              <span>Account status</span>
              <select v-model="filters.status">
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
          </div>

          <div class="table-summary">
            <span>{{ students.length }} {{ students.length === 1 ? 'student' : 'students' }}</span>
            <button
              v-if="hasActiveFilters"
              class="clear-filters"
              type="button"
              @click="clearFilters"
            >
              Clear filters
            </button>
          </div>

          <div v-if="loading && students.length === 0" class="state-panel" role="status">
            <span class="spinner"></span>
            <p>Loading student records…</p>
          </div>

          <div v-else-if="!loading && students.length === 0" class="state-panel">
            <div class="empty-icon">♙</div>
            <h3>{{ hasActiveFilters ? 'No matching students' : 'No student records yet' }}</h3>
            <p>
              {{ hasActiveFilters
                ? 'Try changing or clearing the search and filters.'
                : 'Registered students will appear here when the database has records.' }}
            </p>
          </div>

          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Student ID</th>
                  <th scope="col">Full name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Course</th>
                  <th scope="col">Year</th>
                  <th scope="col">Section</th>
                  <th scope="col">Status</th>
                  <th scope="col">Registered</th>
                  <th scope="col"><span class="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="student in students" :key="student.id">
                  <td class="student-id">{{ student.student_id || '—' }}</td>
                  <td class="student-name">{{ student.full_name }}</td>
                  <td>{{ student.email }}</td>
                  <td>{{ student.course || '—' }}</td>
                  <td>{{ student.year_level || '—' }}</td>
                  <td>{{ student.section || '—' }}</td>
                  <td>
                    <span class="status-badge" :class="`status-${student.account_status}`">
                      {{ formatStatus(student.account_status) }}
                    </span>
                  </td>
                  <td>{{ formatDate(student.registration_date) }}</td>
                  <td>
                    <div class="row-actions">
                      <button class="button-small button-view" type="button" @click="openDetails(student)">
                        View
                      </button>
                      <button
                        v-if="student.account_status === 'pending'"
                        class="button-small button-approve"
                        type="button"
                        @click="openActionDialog('approve', student)"
                      >
                        Approve
                      </button>
                      <button
                        v-if="student.account_status === 'pending'"
                        class="button-small button-reject"
                        type="button"
                        @click="openActionDialog('reject', student)"
                      >
                        Reject
                      </button>
                      <button
                        v-if="student.account_status === 'approved'"
                        class="button-small button-view"
                        type="button"
                        @click="openActionDialog('reset-password', student)"
                      >
                        Reset password
                      </button>
                      <button
                        v-if="student.account_status === 'approved'"
                        class="button-small button-disable"
                        type="button"
                        @click="openActionDialog('disable', student)"
                      >
                        Disable
                      </button>
                      <button
                        v-if="student.account_status === 'disabled'"
                        class="button-small button-approve"
                        type="button"
                        @click="openActionDialog('enable', student)"
                      >
                        Re-enable
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <footer class="main-footer">
        <span>© 2026 Return of Service Management System</span>
        <span>Administration Panel</span>
      </footer>
    </main>

    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>

    <div v-if="detailsOpen" class="modal-backdrop" @click.self="closeDetails">
      <section class="modal details-modal" role="dialog" aria-modal="true" aria-labelledby="details-title">
        <header class="modal-header">
          <div>
            <p class="eyebrow">STUDENT PROFILE</p>
            <h2 id="details-title">{{ details?.student?.full_name || 'Student details' }}</h2>
          </div>
          <button class="icon-button" type="button" aria-label="Close details" @click="closeDetails">×</button>
        </header>

        <div v-if="detailsLoading" class="state-panel modal-state" role="status">
          <span class="spinner"></span>
          <p>Loading student details…</p>
        </div>
        <div v-else-if="detailsError" class="notice notice-error" role="alert">{{ detailsError }}</div>
        <template v-else-if="details">
          <div class="modal-body">
            <div class="detail-grid">
              <div><span>Student ID</span><strong>{{ details.student.student_id || '—' }}</strong></div>
              <div><span>Email</span><strong>{{ details.student.email }}</strong></div>
              <div><span>Contact number</span><strong>{{ details.student.contact_number || '—' }}</strong></div>
              <div><span>Course</span><strong>{{ details.student.course || '—' }}</strong></div>
              <div><span>Year level</span><strong>{{ details.student.year_level || '—' }}</strong></div>
              <div><span>Section</span><strong>{{ details.student.section || '—' }}</strong></div>
              <div><span>Account status</span><strong>{{ formatStatus(details.student.account_status) }}</strong></div>
              <div><span>Registration date</span><strong>{{ formatDate(details.student.registration_date) }}</strong></div>
            </div>

            <section class="progress-card" aria-label="Service hour progress">
              <div class="progress-heading">
                <div>
                  <p class="eyebrow">SERVICE HOUR PROGRESS</p>
                  <strong>{{ formatHours(details.progress.completedHours) }} of {{ details.progress.requiredHours }} hours</strong>
                </div>
                <strong class="progress-percent">{{ details.progress.completionPercentage }}%</strong>
              </div>
              <div
                class="progress-track"
                role="progressbar"
                :aria-valuenow="Math.min(100, details.progress.completionPercentage)"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <span :style="{ width: `${Math.min(100, details.progress.completionPercentage)}%` }"></span>
              </div>
              <p>{{ formatHours(details.progress.remainingHours) }} hours remaining</p>
            </section>

            <section class="history-section">
              <div class="section-title">
                <div>
                  <h3>Attendance history</h3>
                  <p>Only approved attendance contributes to completed hours.</p>
                </div>
              </div>
              <div v-if="details.attendance.length === 0" class="history-empty">No attendance records.</div>
              <div v-else class="history-table-wrap">
                <table class="history-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Time in</th>
                      <th scope="col">Time out</th>
                      <th scope="col">Hours</th>
                      <th scope="col">Status</th>
                      <th scope="col">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="record in details.attendance" :key="record.id">
                      <td>{{ formatDate(record.attendance_date) }}</td>
                      <td>{{ record.time_in || '—' }}</td>
                      <td>{{ record.time_out || '—' }}</td>
                      <td>{{ formatHours(record.total_hours) }}</td>
                      <td><span class="status-badge" :class="`status-${record.status}`">{{ formatStatus(record.status) }}</span></td>
                      <td>{{ record.admin_remarks || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="history-section">
              <div class="section-title">
                <div>
                  <h3>Service activity history</h3>
                  <p>Activities are listed separately to prevent counting the same hours twice.</p>
                </div>
              </div>
              <div v-if="details.serviceActivities.length === 0" class="history-empty">No service activity records.</div>
              <div v-else class="history-table-wrap">
                <table class="history-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Activity</th>
                      <th scope="col">Service area</th>
                      <th scope="col">Hours</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="activity in details.serviceActivities" :key="activity.id">
                      <td>{{ formatDate(activity.service_date) }}</td>
                      <td>{{ activity.activity_description || '—' }}</td>
                      <td>{{ activity.service_area || '—' }}</td>
                      <td>{{ formatHours(activity.total_hours) }}</td>
                      <td><span class="status-badge" :class="`status-${activity.status}`">{{ formatStatus(activity.status) }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </template>
      </section>
    </div>

    <div v-if="actionDialog.open" class="modal-backdrop" @click.self="temporaryPassword || closeActionDialog()">
      <section class="modal action-modal" role="dialog" aria-modal="true" aria-labelledby="action-title">
        <header class="modal-header">
          <div>
            <p class="eyebrow">{{ temporaryPassword ? 'PASSWORD RESET' : 'CONFIRM ACCOUNT ACTION' }}</p>
            <h2 id="action-title">{{ actionTitle }}</h2>
          </div>
          <button class="icon-button" type="button" aria-label="Close confirmation" @click="closeActionDialog">×</button>
        </header>
        <div v-if="temporaryPassword" class="modal-body">
          <p class="confirmation-copy">
            Temporary password for <strong>{{ actionDialog.student?.full_name }}</strong>:
          </p>
          <div class="temporary-password">
            <code>{{ temporaryPassword }}</code>
            <button class="button-secondary" type="button" @click="copyTemporaryPassword">
              {{ passwordCopied ? 'Copied' : 'Copy' }}
            </button>
          </div>
          <p class="password-note">
            It is shown only once. Give it to the student privately and ask them to choose a new
            password under Settings after they sign in.
          </p>
          <p v-if="actionError" class="inline-error" role="alert">{{ actionError }}</p>
          <div class="modal-actions">
            <button class="button-primary" type="button" @click="closeActionDialog">Done</button>
          </div>
        </div>
        <div v-else class="modal-body">
          <p class="confirmation-copy">
            {{ actionDescription }}
            <strong>{{ actionDialog.student?.full_name }}</strong>
            ({{ actionDialog.student?.student_id || 'No student ID' }})?
          </p>
          <p v-if="actionDialog.action === 'reset-password'" class="password-note">
            Their current password stops working right away.
          </p>
          <label v-if="actionDialog.action === 'reject'" class="reason-field">
            <span>Reason (optional)</span>
            <textarea v-model="actionReason" rows="3" maxlength="500" placeholder="Add a note for the activity log"></textarea>
          </label>
          <p v-if="actionError" class="inline-error" role="alert">{{ actionError }}</p>
          <div class="modal-actions">
            <button class="button-secondary" type="button" :disabled="actionLoading" @click="closeActionDialog">
              Cancel
            </button>
            <button
              class="button-primary"
              :class="{ 'danger-button': actionDialog.action === 'reject' || actionDialog.action === 'disable' }"
              type="button"
              :disabled="actionLoading"
              @click="confirmAction"
            >
              {{ actionLoading ? 'Saving…' : actionTitle }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { parseApiDate } from '@/utils/dates'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const router = useRouter()

const students = ref([])
const filterOptions = ref({ courses: [], yearLevels: [], sections: [] })
const filters = reactive({ search: '', course: '', year_level: '', section: '', status: '' })
const loading = ref(false)
const pageError = ref('')
const successMessage = ref('')
const authToken = ref('')
const adminName = ref('Administrator')
const sidebarOpen = ref(false)
const detailsOpen = ref(false)
const detailsLoading = ref(false)
const detailsError = ref('')
const details = ref(null)
const actionLoading = ref(false)
const actionError = ref('')
const actionReason = ref('')
const actionDialog = reactive({ open: false, action: '', student: null })
const temporaryPassword = ref('')
const passwordCopied = ref(false)
let searchTimeout
let latestListRequest = 0

const adminInitial = computed(() => adminName.value.trim().charAt(0).toUpperCase() || 'A')
const hasActiveFilters = computed(() => Object.values(filters).some(Boolean))
const actionTitle = computed(() => ({
  approve: 'Approve registration',
  reject: 'Reject registration',
  disable: 'Disable account',
  enable: 'Re-enable account',
  'reset-password': 'Reset password'
}[actionDialog.action] || 'Confirm action'))
const actionDescription = computed(() => ({
  approve: 'Approve the registration for',
  reject: 'Reject the registration for',
  disable: 'Disable the account for',
  enable: 'Re-enable the account for',
  'reset-password': 'Create a new temporary password for'
}[actionDialog.action] || 'Apply this change to'))

function readSession() {
  const token = localStorage.getItem('rss_token') || sessionStorage.getItem('rss_token')
  const storedUser = localStorage.getItem('rss_user') || sessionStorage.getItem('rss_user')

  if (!token || !storedUser) {
    router.replace('/login')
    return false
  }

  let user
  try {
    user = JSON.parse(storedUser)
  } catch {
    router.replace('/login')
    return false
  }

  if (!user || user.role !== 'admin') {
    router.replace('/login')
    return false
  }

  authToken.value = token
  adminName.value = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Administrator'
  return true
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${authToken.value}`,
      ...options.headers
    }
  })

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('The server returned an invalid response.')
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      router.replace('/login')
    }
    throw new Error(data.message || 'The request could not be completed.')
  }

  return data
}

async function loadStudents() {
  const requestId = ++latestListRequest
  loading.value = true
  pageError.value = ''

  try {
    const query = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value)
    })
    const suffix = query.toString() ? `?${query.toString()}` : ''
    const data = await apiRequest(`/admin/students${suffix}`)

    if (requestId !== latestListRequest) return
    students.value = data.students
    filterOptions.value = data.filters
  } catch (error) {
    if (requestId === latestListRequest) {
      pageError.value = error instanceof Error ? error.message : 'Failed to load student accounts.'
    }
  } finally {
    if (requestId === latestListRequest) loading.value = false
  }
}

function clearFilters() {
  Object.keys(filters).forEach(key => {
    filters[key] = ''
  })
}

function formatStatus(status) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'
}

function formatDate(value) {
  if (!value) return '—'
  const date = parseApiDate(value)
  if (!date) return String(value)
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

function formatHours(value) {
  const hours = Number(value)
  return Number.isFinite(hours) ? Number(hours.toFixed(2)).toString() : '0'
}

async function openDetails(student) {
  detailsOpen.value = true
  detailsLoading.value = true
  detailsError.value = ''
  details.value = null

  try {
    details.value = await apiRequest(`/admin/students/${encodeURIComponent(student.id)}`)
  } catch (error) {
    detailsError.value = error instanceof Error ? error.message : 'Failed to load student details.'
  } finally {
    detailsLoading.value = false
  }
}

function closeDetails() {
  detailsOpen.value = false
  details.value = null
  detailsError.value = ''
}

function openActionDialog(action, student) {
  actionDialog.action = action
  actionDialog.student = student
  actionDialog.open = true
  actionError.value = ''
  actionReason.value = ''
  temporaryPassword.value = ''
  passwordCopied.value = false
}

function closeActionDialog() {
  if (actionLoading.value) return
  actionDialog.open = false
  actionDialog.student = null
  actionReason.value = ''
  actionError.value = ''
  temporaryPassword.value = ''
  passwordCopied.value = false
}

async function confirmAction() {
  if (!actionDialog.student || actionLoading.value) return

  actionLoading.value = true
  actionError.value = ''
  try {
    const body = actionDialog.action === 'reject' && actionReason.value.trim()
      ? JSON.stringify({ reason: actionReason.value.trim() })
      : JSON.stringify({})
    const result = await apiRequest(
      `/admin/students/${encodeURIComponent(actionDialog.student.id)}/${actionDialog.action}`,
      { method: 'PATCH', body }
    )
    successMessage.value = result.message
    if (actionDialog.action === 'reset-password') {
      // Keep the dialog open: this is the only time the temporary password is shown.
      temporaryPassword.value = result.temporaryPassword
      return
    }
    actionDialog.open = false
    actionDialog.student = null
    await loadStudents()
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Failed to update the account.'
  } finally {
    actionLoading.value = false
  }
}

async function copyTemporaryPassword() {
  actionError.value = ''
  let copied = false
  try {
    await navigator.clipboard.writeText(temporaryPassword.value)
    copied = true
  } catch {
    // navigator.clipboard doesn't exist on plain-http sites (e.g. a school intranet IP).
    copied = copyWithSelection(temporaryPassword.value)
  }
  passwordCopied.value = copied
  if (!copied) actionError.value = 'Copy failed. Select the password and copy it manually.'
}

function copyWithSelection(text) {
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }
  field.remove()
  return copied
}

function goToDashboard() {
  router.push('/admin/dashboard')
}

function goToWorkflow(module) {
  router.push(`/admin/workflows/${module}`)
}

function logout() {
  localStorage.removeItem('rss_token')
  localStorage.removeItem('rss_user')
  sessionStorage.removeItem('rss_token')
  sessionStorage.removeItem('rss_user')
  router.push('/login')
}

watch(filters, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(loadStudents, 250)
}, { deep: true })

onMounted(() => {
  if (readSession()) loadStudents()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimeout)
})
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.admin-layout {
  min-height: 100vh;
  display: flex;
  background: #f5f7fb;
  color: #172033;
  font-family: Arial, Helvetica, sans-serif;
}

.sidebar {
  width: 255px;
  min-width: 255px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 25px 17px 18px;
  background: #101e38;
  color: #fff;
  z-index: 20;
}

.sidebar-brand,
.admin-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,.09);
}

.sidebar-brand {
  padding: 5px 7px 28px;
}

.brand-icon {
  width: 43px;
  height: 43px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: #3478f6;
  font-size: 23px;
  font-weight: 800;
}

.sidebar-brand h2 {
  font-size: 13px;
  letter-spacing: 1px;
}

.sidebar-brand span {
  display: block;
  margin-top: 5px;
  color: #8fa7cb;
  font-size: 9px;
  letter-spacing: 1.5px;
}

.admin-profile {
  padding: 22px 7px;
}

.profile-avatar,
.topbar-avatar {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #29466f;
  color: #fff;
  font-weight: 700;
}

.admin-profile strong,
.admin-profile span {
  display: block;
}

.admin-profile strong {
  max-width: 160px;
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-profile span {
  margin-top: 5px;
  color: #93a5c0;
  font-size: 10px;
}

.sidebar-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-top: 20px;
}

.nav-label {
  margin: 17px 9px 10px;
  color: #7185a5;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 5px;
  padding: 12px 11px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #b7c5da;
  text-align: left;
  font-size: 12px;
  cursor: pointer;
}

.nav-item span {
  width: 17px;
  font-size: 17px;
  text-align: center;
}

.nav-item:hover,
.nav-item.active {
  background: #263f65;
  color: #fff;
}

.nav-item.active {
  box-shadow: inset 3px 0 #4d91ff;
}

.sidebar-bottom {
  padding-top: 15px;
  border-top: 1px solid rgba(255,255,255,.09);
}

.logout-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #d3deed;
  text-align: left;
  font-size: 12px;
  cursor: pointer;
}

.logout-button:hover {
  background: rgba(255,255,255,.08);
}

.sidebar-bottom p {
  margin-top: 15px;
  color: #7185a5;
  font-size: 9px;
  text-align: center;
}

.main-content {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.topbar {
  min-height: 83px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 35px;
  border-bottom: 1px solid #e9edf3;
  background: #fff;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.topbar h2 {
  font-size: 17px;
}

.topbar p {
  margin-top: 5px;
  color: #8792a4;
  font-size: 11px;
}

.topbar-avatar {
  background: #3478f6;
}

.menu-button {
  display: none;
  border: 0;
  background: transparent;
  font-size: 23px;
  cursor: pointer;
}

.page-content {
  width: 100%;
  max-width: 1600px;
  flex: 1;
  margin: 0 auto;
  padding: 32px 35px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
}

.page-heading h1 {
  font-size: 22px;
  letter-spacing: -.5px;
}

.page-heading p {
  margin-top: 8px;
  color: #8994a5;
  font-size: 12px;
  line-height: 1.6;
}

.refresh-button,
.button-small,
.button-secondary,
.button-primary {
  border-radius: 7px;
  font-weight: 700;
  cursor: pointer;
}

.refresh-button {
  flex: 0 0 auto;
  padding: 10px 14px;
  border: 1px solid #dce5f2;
  background: #fff;
  color: #29466f;
  font-size: 11px;
}

button:disabled {
  cursor: not-allowed;
  opacity: .65;
}

.content-card {
  overflow: hidden;
  border: 1px solid #e9edf3;
  border-radius: 11px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(20,40,70,.025);
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(200px, 1.5fr) repeat(4, minmax(125px, 1fr));
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid #edf0f5;
}

.filter-grid label,
.reason-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.filter-grid label > span,
.reason-field > span {
  color: #66758a;
  font-size: 10px;
  font-weight: 700;
}

.filter-grid input,
.filter-grid select,
.reason-field textarea {
  width: 100%;
  min-height: 39px;
  padding: 9px 11px;
  border: 1px solid #dfe5ed;
  border-radius: 7px;
  outline: none;
  background: #fff;
  color: #26364d;
  font: inherit;
  font-size: 11px;
}

.filter-grid input:focus,
.filter-grid select:focus,
.reason-field textarea:focus {
  border-color: #3478f6;
  box-shadow: 0 0 0 3px rgba(52,120,246,.12);
}

.table-summary {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
  color: #778398;
  font-size: 10px;
}

.clear-filters {
  border: 0;
  background: transparent;
  color: #3478f6;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.table-wrap,
.history-table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

th {
  padding: 12px 13px;
  background: #f8fafd;
  color: #708098;
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
}

td {
  padding: 13px;
  border-top: 1px solid #edf0f5;
  color: #59677b;
  font-size: 10px;
  white-space: nowrap;
}

tbody tr:hover {
  background: #fbfcfe;
}

.student-id {
  color: #41536e;
  font-weight: 700;
}

.student-name {
  color: #27364d;
  font-weight: 700;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 8px;
  border-radius: 20px;
  font-size: 9px;
  font-weight: 700;
}

.status-pending {
  background: #fff4e5;
  color: #a9680c;
}

.status-approved {
  background: #e8f8ef;
  color: #18764d;
}

.status-rejected {
  background: #ffeded;
  color: #b34141;
}

.status-disabled {
  background: #eef1f5;
  color: #677386;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 5px;
}

.button-small {
  padding: 6px 8px;
  border: 1px solid transparent;
  font-size: 9px;
  white-space: nowrap;
}

.button-view {
  border-color: #dce5f2;
  background: #fff;
  color: #355a8b;
}

.button-approve {
  background: #e8f8ef;
  color: #18764d;
}

.button-reject,
.button-disable {
  background: #ffeded;
  color: #b34141;
}

.state-panel {
  min-height: 230px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 25px;
  color: #8792a4;
  text-align: center;
}

.state-panel h3 {
  margin-top: 12px;
  color: #475569;
  font-size: 13px;
}

.state-panel p {
  margin-top: 7px;
  font-size: 11px;
  line-height: 1.6;
}

.empty-icon {
  width: 45px;
  height: 45px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #f0f4fa;
  color: #94a3b8;
  font-size: 21px;
}

.spinner {
  width: 25px;
  height: 25px;
  border: 3px solid #dce7f8;
  border-top-color: #3478f6;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.notice {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.5;
}

.notice button {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.notice-error {
  border: 1px solid #f4c9c9;
  background: #fff3f3;
  color: #a83b3b;
}

.notice-success {
  border: 1px solid #bfe7d2;
  background: #effaf4;
  color: #18764d;
}

.main-footer {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 20px 35px;
  border-top: 1px solid #e9edf3;
  background: #fff;
  color: #9aa4b3;
  font-size: 10px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 24px;
  background: rgba(12, 24, 43, .58);
}

.modal {
  width: min(100%, 620px);
  max-height: min(90vh, 900px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 60px rgba(7, 18, 35, .25);
}

.details-modal {
  width: min(100%, 900px);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
  padding: 20px 23px;
  border-bottom: 1px solid #edf0f5;
}

.modal-header h2 {
  margin-top: 5px;
  color: #172033;
  font-size: 17px;
}

.eyebrow {
  color: #8792a4;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
}

.icon-button {
  width: 30px;
  height: 30px;
  border: 1px solid #e3e8ef;
  border-radius: 7px;
  background: #fff;
  color: #68778c;
  font-size: 19px;
  cursor: pointer;
}

.modal-body {
  overflow-y: auto;
  padding: 21px 23px 24px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 15px 20px;
}

.detail-grid div {
  min-width: 0;
}

.detail-grid span,
.detail-grid strong {
  display: block;
  overflow-wrap: anywhere;
}

.detail-grid span {
  color: #8792a4;
  font-size: 9px;
}

.detail-grid strong {
  margin-top: 5px;
  color: #344054;
  font-size: 11px;
}

.progress-card {
  margin-top: 22px;
  padding: 17px;
  border: 1px solid #e4ecf8;
  border-radius: 9px;
  background: #f8fafd;
}

.progress-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.progress-heading strong {
  display: block;
  margin-top: 6px;
  color: #27364d;
  font-size: 12px;
}

.progress-heading .progress-percent {
  color: #3478f6;
  font-size: 17px;
}

.progress-track {
  height: 8px;
  overflow: hidden;
  margin-top: 14px;
  border-radius: 10px;
  background: #e5ebf4;
}

.progress-track span {
  height: 100%;
  display: block;
  border-radius: inherit;
  background: #3478f6;
}

.progress-card > p {
  margin-top: 8px;
  color: #778398;
  font-size: 10px;
}

.history-section {
  margin-top: 24px;
}

.section-title h3 {
  color: #27364d;
  font-size: 12px;
}

.section-title p {
  margin-top: 5px;
  color: #8792a4;
  font-size: 10px;
}

.history-empty {
  margin-top: 12px;
  padding: 16px;
  border: 1px dashed #dfe5ed;
  border-radius: 8px;
  color: #8792a4;
  font-size: 10px;
  text-align: center;
}

.history-table-wrap {
  margin-top: 11px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.history-table th,
.history-table td {
  padding: 10px;
}

.history-table td {
  white-space: normal;
}

.modal-state {
  min-height: 180px;
}

.action-modal .modal-body {
  padding: 20px 23px 23px;
}

.confirmation-copy {
  color: #5d6b7f;
  font-size: 12px;
  line-height: 1.7;
}

.confirmation-copy strong {
  color: #26364d;
}

.temporary-password {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid #dce5f2;
  border-radius: 8px;
  background: #f5f8fd;
}

.temporary-password code {
  color: #1d2b40;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  user-select: all;
}

.password-note {
  margin-top: 12px;
  color: #7a8699;
  font-size: 11px;
  line-height: 1.6;
}

.reason-field {
  margin-top: 17px;
}

.reason-field textarea {
  min-height: 80px;
  resize: vertical;
}

.inline-error {
  margin-top: 12px;
  color: #b34141;
  font-size: 11px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 21px;
}

.button-secondary,
.button-primary {
  min-height: 37px;
  padding: 9px 14px;
  font-size: 11px;
}

.button-secondary {
  border: 1px solid #dfe5ed;
  background: #fff;
  color: #52627a;
}

.button-primary {
  border: 1px solid #3478f6;
  background: #3478f6;
  color: #fff;
}

.button-primary.danger-button {
  border-color: #c94d4d;
  background: #c94d4d;
}

.sidebar-overlay {
  display: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (max-width: 1200px) {
  .filter-grid {
    grid-template-columns: repeat(3, minmax(130px, 1fr));
  }
}

@media (max-width: 750px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
    transition: transform .25s ease;
  }

  .sidebar.sidebar-open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: block;
    background: rgba(0,0,0,.35);
  }

  .menu-button {
    display: block;
  }

  .topbar {
    padding: 15px 20px;
  }

  .page-content {
    padding: 25px 20px;
  }

  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .search-field {
    grid-column: span 2;
  }

  .main-footer {
    padding: 17px 20px;
  }
}

@media (max-width: 500px) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .search-field {
    grid-column: auto;
  }

  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .modal-backdrop {
    align-items: start;
    padding: 10px;
  }

  .modal-header,
  .modal-body {
    padding-right: 16px;
    padding-left: 16px;
  }

  .main-footer {
    flex-direction: column;
  }
}
</style>
