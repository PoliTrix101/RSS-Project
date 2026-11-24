<template>
  <AdminLayout active="students" title="Students" subtitle="Search records, review registrations, and manage accounts">
    <template #actions>
      <button class="btn btn-secondary btn-sm" type="button" :disabled="loading" @click="loadStudents">
        <AppIcon name="refresh" :size="16" :class="{ spinning: loading }" /> Refresh
      </button>
    </template>

    <div class="page">
      <div v-if="pageError" class="alert alert-error" role="alert">
        <AppIcon name="alert-circle" />
        <div class="alert-body">{{ pageError }}</div>
        <button class="alert-close" type="button" aria-label="Dismiss error" @click="pageError = ''"><AppIcon name="x" :size="16" /></button>
      </div>

      <section class="card" aria-label="Student list">
        <div class="card-body filters">
          <div class="segmented" role="group" aria-label="Filter by account status">
            <button
              v-for="option in statusOptions"
              :key="option.value"
              type="button"
              :class="{ active: filters.status === option.value }"
              :aria-pressed="filters.status === option.value"
              @click="filters.status = option.value"
            >
              {{ option.label }}
            </button>
          </div>

          <div class="toolbar">
            <label class="field grow">
              <span class="sr-only">Search students</span>
              <span class="input-icon">
                <AppIcon name="search" :size="16" />
                <input v-model="filters.search" type="search" placeholder="Search by name or student ID" autocomplete="off">
              </span>
            </label>
            <label class="field">
              <span class="sr-only">Course</span>
              <select v-model="filters.course">
                <option value="">All courses</option>
                <option v-for="course in filterOptions.courses" :key="course" :value="course">{{ course }}</option>
              </select>
            </label>
            <label class="field">
              <span class="sr-only">Year level</span>
              <select v-model="filters.year_level">
                <option value="">All year levels</option>
                <option v-for="year in filterOptions.yearLevels" :key="year" :value="year">Year {{ year }}</option>
              </select>
            </label>
            <label class="field">
              <span class="sr-only">Section</span>
              <select v-model="filters.section">
                <option value="">All sections</option>
                <option v-for="section in filterOptions.sections" :key="section" :value="section">{{ section }}</option>
              </select>
            </label>
          </div>
        </div>

        <div class="table-summary">
          <span>
            <strong>{{ students.length }}</strong> {{ students.length === 1 ? 'student' : 'students' }}
            <template v-if="hasActiveFilters"> match your filters</template>
          </span>
          <button v-if="hasActiveFilters" class="btn btn-link btn-sm" type="button" @click="clearFilters">Clear filters</button>
        </div>

        <div v-if="loading && students.length === 0" class="loading-state" role="status">
          <span class="spinner"></span>
          <p>Loading student records…</p>
        </div>

        <div v-else-if="!loading && students.length === 0" class="empty-state">
          <span class="empty-state-icon"><AppIcon name="users" :size="22" /></span>
          <h4>{{ hasActiveFilters ? 'No matching students' : 'No student records yet' }}</h4>
          <p>{{ hasActiveFilters ? 'Try changing or clearing the search and filters.' : 'Registered students will appear here.' }}</p>
          <button v-if="hasActiveFilters" class="btn btn-secondary btn-sm" type="button" @click="clearFilters">Clear filters</button>
        </div>

        <div v-else class="table-wrap" :class="{ refreshing: loading }">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Student ID</th>
                <th scope="col">Program</th>
                <th scope="col">Status</th>
                <th scope="col" class="cell-actions"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in students" :key="student.id">
                <td>
                  <button class="person person-button" type="button" @click="openDetails(student)">
                    <StudentAvatar :name="student.full_name" :photo-url="student.profile_photo_url" />
                    <div>
                      <span class="cell-strong">{{ student.full_name }}</span>
                      <span class="cell-sub">{{ student.email }}</span>
                    </div>
                  </button>
                </td>
                <td class="nowrap mono">{{ student.student_id || '—' }}</td>
                <td class="nowrap">
                  {{ student.course || '—' }}
                  <span class="cell-sub">Year {{ student.year_level || '—' }} · {{ student.section || 'No section' }}</span>
                </td>
                <td class="nowrap">
                  <span :class="badgeClass(student.account_status)">{{ titleCase(student.account_status) }}</span>
                  <span class="cell-sub">Registered {{ formatDate(student.registration_date) }}</span>
                </td>
                <td class="cell-actions">
                  <div class="button-row">
                    <template v-if="student.account_status === 'pending'">
                      <button class="btn btn-success-soft btn-sm" type="button" @click="openActionDialog('approve', student)">
                        <AppIcon name="check" :size="15" /> Approve
                      </button>
                      <button class="btn btn-danger-soft btn-sm" type="button" @click="openActionDialog('reject', student)">
                        Reject
                      </button>
                    </template>
                    <template v-else-if="student.account_status === 'approved'">
                      <button class="btn btn-ghost btn-sm btn-icon" type="button" title="Reset password" :aria-label="`Reset password for ${student.full_name}`" @click="openActionDialog('reset-password', student)">
                        <AppIcon name="key" :size="16" />
                      </button>
                      <button class="btn btn-danger-ghost btn-sm btn-icon" type="button" title="Disable account" :aria-label="`Disable ${student.full_name}`" @click="openActionDialog('disable', student)">
                        <AppIcon name="ban" :size="16" />
                      </button>
                    </template>
                    <button
                      v-else-if="student.account_status === 'disabled'"
                      class="btn btn-success-soft btn-sm"
                      type="button"
                      @click="openActionDialog('enable', student)"
                    >
                      <AppIcon name="rotate-ccw" :size="15" /> Re-enable
                    </button>
                    <button class="btn btn-secondary btn-sm" type="button" @click="openDetails(student)">View</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- STUDENT DETAILS -->
    <AppModal
      :open="detailsOpen"
      size="xl"
      eyebrow="Student profile"
      :title="details?.student?.full_name || 'Student details'"
      :subtitle="details?.student ? `${details.student.student_id || 'No student ID'} · ${details.student.email}` : ''"
      @close="closeDetails"
    >
      <div v-if="detailsLoading" class="loading-state modal-state" role="status">
        <span class="spinner"></span>
        <p>Loading student details…</p>
      </div>
      <div v-else-if="detailsError" class="alert alert-error" role="alert">
        <AppIcon name="alert-circle" />
        <div class="alert-body">{{ detailsError }}</div>
      </div>
      <template v-else-if="details">
        <StudentAvatar
          v-if="details.student.profile_photo_url"
          class="details-avatar"
          :name="details.student.full_name"
          :photo-url="details.student.profile_photo_url"
        />
        <div class="details-top">
          <dl class="detail-list detail-grid">
            <div><dt>Status</dt><dd><span :class="badgeClass(details.student.account_status)">{{ titleCase(details.student.account_status) }}</span></dd></div>
            <div><dt>Course</dt><dd>{{ details.student.course || '—' }}</dd></div>
            <div><dt>Year level</dt><dd>{{ details.student.year_level || '—' }}</dd></div>
            <div><dt>Section</dt><dd>{{ details.student.section || '—' }}</dd></div>
            <div><dt>Contact number</dt><dd>{{ details.student.contact_number || '—' }}</dd></div>
            <div><dt>Registered</dt><dd>{{ formatDate(details.student.registration_date) }}</dd></div>
          </dl>

          <section class="progress-panel" aria-label="Service hour progress">
            <p class="eyebrow">Service-hour progress</p>
            <div class="progress-heading">
              <p><strong>{{ formatHours(details.progress.completedHours) }}</strong> of {{ details.progress.requiredHours }} hours</p>
              <span>{{ details.progress.completionPercentage }}%</span>
            </div>
            <div class="progress progress-lg" role="progressbar" :aria-valuenow="Math.min(100, details.progress.completionPercentage)" aria-valuemin="0" aria-valuemax="100">
              <div class="progress-fill" :style="{ width: `${Math.min(100, details.progress.completionPercentage)}%` }"></div>
            </div>
            <p class="progress-remaining">{{ formatHours(details.progress.remainingHours) }} hours remaining</p>
          </section>
        </div>

        <section class="history-section">
          <h3>Attendance history</h3>
          <p>Only approved attendance contributes to completed hours.</p>
          <div v-if="details.attendance.length === 0" class="history-empty">No attendance records.</div>
          <div v-else class="table-wrap history-table">
            <table class="table">
              <thead><tr><th>Date</th><th>Time</th><th>Hours</th><th>Status</th><th>Remarks</th></tr></thead>
              <tbody>
                <tr v-for="record in details.attendance" :key="record.id">
                  <td class="nowrap cell-strong">{{ formatDate(record.attendance_date) }}</td>
                  <td class="nowrap">{{ formatTimeRange(record.time_in, record.time_out, '—') }}</td>
                  <td class="cell-num">{{ formatHours(record.total_hours) }}</td>
                  <td><span :class="badgeClass(record.status)">{{ titleCase(record.status) }}</span></td>
                  <td class="cell-wrap muted">{{ record.admin_remarks || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="history-section">
          <h3>Service activity history</h3>
          <p>Listed separately so the same hours are never counted twice.</p>
          <div v-if="details.serviceActivities.length === 0" class="history-empty">No service activity records.</div>
          <div v-else class="table-wrap history-table">
            <table class="table">
              <thead><tr><th>Date</th><th>Activity</th><th>Service area</th><th>Hours</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="activity in details.serviceActivities" :key="activity.id">
                  <td class="nowrap cell-strong">{{ formatDate(activity.service_date) }}</td>
                  <td class="cell-wrap">{{ activity.activity_description || '—' }}</td>
                  <td>{{ activity.service_area || '—' }}</td>
                  <td class="cell-num">{{ formatHours(activity.total_hours) }}</td>
                  <td><span :class="badgeClass(activity.status)">{{ titleCase(activity.status) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </AppModal>

    <!-- ACCOUNT ACTION -->
    <AppModal
      :open="actionDialog.open"
      size="sm"
      :eyebrow="temporaryPassword ? 'Password reset' : 'Confirm account action'"
      :title="actionTitle"
      :close-on-backdrop="!temporaryPassword"
      @close="closeActionDialog"
    >
      <template v-if="temporaryPassword">
        <p class="confirmation-copy">Temporary password for <strong>{{ actionDialog.student?.full_name }}</strong>:</p>
        <div class="temporary-password">
          <code>{{ temporaryPassword }}</code>
          <button class="btn btn-secondary btn-sm" type="button" @click="copyTemporaryPassword">
            <AppIcon :name="passwordCopied ? 'check' : 'copy'" :size="15" /> {{ passwordCopied ? 'Copied' : 'Copy' }}
          </button>
        </div>
        <div class="alert alert-warning password-note">
          <AppIcon name="alert-triangle" :size="16" />
          <div class="alert-body">It is shown only once. Give it to the student privately and ask them to choose a new password under Settings after they sign in.</div>
        </div>
        <p v-if="actionError" class="inline-error" role="alert">{{ actionError }}</p>
      </template>
      <template v-else>
        <div class="action-summary">
          <StudentAvatar :name="actionDialog.student?.full_name" :photo-url="actionDialog.student?.profile_photo_url" />
          <div>
            <strong>{{ actionDialog.student?.full_name }}</strong>
            <span>{{ actionDialog.student?.student_id || 'No student ID' }} · {{ actionDialog.student?.course || 'No course' }}</span>
          </div>
        </div>
        <p class="confirmation-copy">{{ actionDescription }}</p>
        <label v-if="actionDialog.action === 'reject'" class="field reason-field">
          <span class="field-label">Reason <span class="optional">(optional)</span></span>
          <textarea v-model="actionReason" rows="3" maxlength="500" placeholder="Add a note for the activity log"></textarea>
        </label>
        <p v-if="actionError" class="inline-error" role="alert">{{ actionError }}</p>
      </template>

      <template #footer>
        <button v-if="temporaryPassword" class="btn btn-primary" type="button" @click="closeActionDialog">Done</button>
        <template v-else>
          <button class="btn btn-secondary" type="button" :disabled="actionLoading" @click="closeActionDialog">Cancel</button>
          <button
            class="btn"
            :class="isDangerAction ? 'btn-danger' : 'btn-primary'"
            type="button"
            :disabled="actionLoading"
            @click="confirmAction"
          >
            <span v-if="actionLoading" class="spinner spinner-sm"></span>
            {{ actionLoading ? 'Saving…' : actionTitle }}
          </button>
        </template>
      </template>
    </AppModal>
  </AdminLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import StudentAvatar from '@/components/StudentAvatar.vue'
import { useToast } from '@/composables/useToast'
import { badgeClass, formatDate, formatHours, formatTimeRange, titleCase } from '@/utils/format'
import { readSession } from '@/utils/session'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const router = useRouter()
const route = useRoute()
const toast = useToast()

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'disabled', label: 'Disabled' }
]
// The dashboard links here with ?status=pending.
const initialStatus = statusOptions.some(option => option.value && option.value === route.query.status)
  ? route.query.status
  : ''

const students = ref([])
const filterOptions = ref({ courses: [], yearLevels: [], sections: [] })
const filters = reactive({ search: '', course: '', year_level: '', section: '', status: initialStatus })
const loading = ref(false)
const pageError = ref('')
const authToken = ref('')
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

const hasActiveFilters = computed(() => Object.values(filters).some(Boolean))
const isDangerAction = computed(() => ['reject', 'disable'].includes(actionDialog.action))
const actionTitle = computed(() => ({
  approve: 'Approve registration',
  reject: 'Reject registration',
  disable: 'Disable account',
  enable: 'Re-enable account',
  'reset-password': 'Reset password'
}[actionDialog.action] || 'Confirm action'))
const actionDescription = computed(() => ({
  approve: 'The student will be able to sign in and start logging service hours.',
  reject: 'The registration will be marked as rejected and the student will not be able to sign in.',
  disable: 'The student will be signed out and blocked from signing in until the account is re-enabled.',
  enable: 'The student will be able to sign in again.',
  'reset-password': 'A new temporary password will be created. Their current password stops working right away.'
}[actionDialog.action] || 'Apply this change to the account?'))

function readAdminSession() {
  const session = readSession('admin')
  if (!session) {
    router.replace('/login')
    return false
  }
  authToken.value = session.token
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
    if (actionDialog.action === 'reset-password') {
      // Keep the dialog open: this is the only time the temporary password is shown.
      temporaryPassword.value = result.temporaryPassword
      return
    }
    toast.success(result.message)
    actionDialog.open = false
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

watch(filters, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(loadStudents, 250)
}, { deep: true })

onMounted(() => {
  if (readAdminSession()) loadStudents()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimeout)
})
</script>

<style scoped>
.filters { display: flex; flex-direction: column; gap: 14px; padding-bottom: 16px; }
.toolbar .field { flex: 1 1 150px; }
.toolbar .field.grow { flex: 2 1 260px; }

.table-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  padding: 8px 20px;
  border-top: 1px solid var(--border);
  color: var(--text-3);
  font-size: 13px;
}
.table-summary strong { color: var(--text); }
.table-wrap { border-top: 1px solid var(--border); transition: opacity .15s ease; }
.table-wrap.refreshing { opacity: 0.6; }
.table tbody tr:last-child td:first-child { border-bottom-left-radius: var(--radius-lg); }

.person-button { padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.person-button:hover .cell-strong { color: var(--primary-text); text-decoration: underline; }
.mono { font-family: var(--font-mono); font-size: 13px; }
.spinning { animation: spin 0.8s linear infinite; }

/* Details modal */
.modal-state { min-height: 200px; }
.details-avatar { width: 96px; height: 96px; margin-bottom: 18px; font-size: 32px; }
.details-top { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 24px; align-items: start; }
.detail-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.progress-panel { padding: 16px; border: 1px solid var(--primary-soft-2); border-radius: var(--radius); background: var(--primary-soft); }
.progress-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 6px 0 10px; }
.progress-heading p { margin: 0; color: var(--text-3); font-size: 14px; }
.progress-heading p strong { color: var(--text); font-size: 22px; font-weight: 700; }
.progress-heading span { color: var(--primary-text); font-size: 18px; font-weight: 700; }
.progress-panel .progress { background: #fff; }
.progress-remaining { margin: 8px 0 0; color: var(--text-3); font-size: 13px; }
.history-section { margin-top: 26px; }
.history-section h3 { margin: 0; color: var(--text); font-size: 15px; font-weight: 650; }
.history-section > p { margin: 2px 0 0; color: var(--text-3); font-size: 13px; }
.history-empty { margin-top: 12px; padding: 18px; border: 1px dashed var(--border-strong); border-radius: var(--radius); color: var(--text-3); font-size: 13px; text-align: center; }
.history-table { margin-top: 12px; border: 1px solid var(--border); border-radius: var(--radius); }

/* Action modal */
.action-summary { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface-2); }
.action-summary strong { display: block; color: var(--text); font-size: 14px; }
.action-summary span:not(.avatar) { display: block; color: var(--text-3); font-size: 13px; }
.confirmation-copy { margin: 14px 0 0; color: var(--text-2); font-size: 14px; line-height: 1.6; }
.reason-field { margin-top: 16px; }
.inline-error { margin: 12px 0 0; color: var(--danger); font-size: 13px; }
.temporary-password {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface-2);
}
.temporary-password code { color: var(--text); font-family: var(--font-mono); font-size: 18px; font-weight: 700; letter-spacing: 0.04em; user-select: all; }
.password-note { margin-top: 14px; font-size: 13px; }

@media (max-width: 860px) {
  .details-top { grid-template-columns: 1fr; }
  .detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
