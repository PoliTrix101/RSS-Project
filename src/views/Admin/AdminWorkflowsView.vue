<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="brand"><div class="brand-icon">R</div><div><h2>RSS ADMIN</h2><span>MANAGEMENT SYSTEM</span></div></div>
      <div class="admin-profile"><div class="avatar">A</div><div><strong>Administrator</strong><small>System Admin</small></div></div>
      <nav class="navigation" aria-label="Admin workflows">
        <button class="nav-link" type="button" @click="router.push('/admin/dashboard')"><span>▦</span>Dashboard</button>
        <button class="nav-link" type="button" @click="router.push('/admin/students')"><span>♙</span>Student Management</button>
        <p class="nav-label">WORKFLOWS</p>
        <button v-for="tab in tabs" :key="tab.id" class="nav-link" :class="{ active: activeTab === tab.id }" type="button" @click="selectTab(tab.id)">
          <span>{{ tab.icon }}</span>{{ tab.label }}
        </button>
      </nav>
      <button class="logout-button" type="button" @click="logout">↪ Sign Out</button>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div><p class="eyebrow">ADMINISTRATION</p><h1>{{ activeLabel }}</h1><p>Review and manage records from the connected Turso database.</p></div>
        <button class="secondary-button" type="button" :disabled="loading" @click="loadTab">↻ Refresh</button>
      </header>

      <div v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}<button @click="errorMessage = ''">×</button></div>
      <div v-if="successMessage" class="notice success" role="status">{{ successMessage }}<button @click="successMessage = ''">×</button></div>
      <div v-if="loading" class="loading" role="status"><span class="spinner"></span>Loading records…</div>

      <template v-else>
        <section v-if="activeTab === 'attendance'" class="page-content">
          <div class="intro"><h2>Attendance review</h2><p>Only approved submissions add hours to student progress.</p></div>
          <div class="filter-row">
            <label><span>Status</span><select v-model="attendanceStatus" @change="loadAttendance"><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
          </div>
          <div class="table-wrap">
            <table><thead><tr><th>Student</th><th>Student ID</th><th>Date</th><th>Activity</th><th>Time</th><th>Hours</th><th>Status</th><th>Remarks</th><th>Review</th></tr></thead>
              <tbody>
                <tr v-for="record in attendance" :key="record.id">
                  <td>{{ record.student_name }}</td><td>{{ record.student_number || '—' }}</td><td>{{ dateLabel(record.attendance_date) }}</td>
                  <td>{{ record.activity_title || 'General service' }}</td><td>{{ record.time_in }}–{{ record.time_out || '—' }}</td><td>{{ hours(record.total_hours) }}</td>
                  <td><span class="badge" :class="`status-${record.status}`">{{ titleCase(record.status) }}</span></td><td>{{ record.admin_remarks || '—' }}</td>
                  <td class="actions" v-if="record.status === 'pending'">
                    <button class="small-button approve" @click="reviewAttendance(record, 'approve')">Approve</button>
                    <button class="small-button reject" @click="reviewAttendance(record, 'reject')">Reject</button>
                  </td>
                  <td v-else>—</td>
                </tr>
                <tr v-if="attendance.length === 0"><td colspan="9" class="empty">No attendance submissions found.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-else-if="activeTab === 'activities'" class="page-content">
          <div class="intro"><h2>Service activities</h2><p>Create activities, publish registration, and review student registrations.</p></div>
          <form class="card form-grid" @submit.prevent="saveActivity">
            <h3>{{ activityForm.id ? 'Edit activity' : 'Create activity' }}</h3>
            <p v-if="areas.length === 0" class="note wide">No active service areas yet. <button class="text-button" type="button" @click="selectTab('areas')">Add one in Service Areas</button></p>
            <label><span>Title</span><input v-model="activityForm.title" maxlength="160" required></label>
            <label><span>Service area</span><select v-model="activityForm.area_id" required><option value="">Select an area</option><option v-for="area in areas" :key="area.id" :value="area.id">{{ area.area_name }}</option></select></label>
            <label><span>Location (optional override)</span><input v-model="activityForm.location" maxlength="250"></label>
            <label class="wide"><span>Description</span><textarea v-model="activityForm.description" maxlength="4000" rows="3" required></textarea></label>
            <label><span>Starts</span><input v-model="activityForm.scheduled_start" type="datetime-local" required></label>
            <label><span>Ends</span><input v-model="activityForm.scheduled_end" type="datetime-local" required></label>
            <label><span>Required hours</span><input v-model.number="activityForm.required_hours" type="number" min="0" step="0.25" required></label>
            <label><span>Capacity (blank = unlimited)</span><input v-model="activityForm.capacity" type="number" min="0" step="1"></label>
            <label><span>Eligibility</span><input v-model="activityForm.eligibility" maxlength="1000"></label>
            <label><span>Status</span><select v-model="activityForm.status"><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></label>
            <label class="checkbox"><input v-model="activityForm.registration_open" type="checkbox"><span>Registration open</span></label>
            <div class="form-actions"><button class="primary-button" :disabled="saving">{{ saving ? 'Saving…' : activityForm.id ? 'Save changes' : 'Create activity' }}</button><button v-if="activityForm.id" class="secondary-button" type="button" @click="resetActivityForm">Cancel edit</button></div>
          </form>

          <section class="card">
            <h3>Activities</h3>
            <div class="table-wrap"><table><thead><tr><th>Title</th><th>Area</th><th>Schedule</th><th>Registration</th><th>Status</th><th>Registered</th><th>Actions</th></tr></thead>
              <tbody><tr v-for="activity in activities" :key="activity.id">
                <td>{{ activity.title }}</td><td>{{ activity.service_area }}</td><td>{{ dateTime(activity.scheduled_start) }} – {{ dateTime(activity.scheduled_end) }}</td>
                <td>{{ Number(activity.registration_open) ? 'Open' : 'Closed' }}</td><td>{{ titleCase(activity.status) }}</td><td>{{ activity.registration_count }}</td>
                <td class="actions"><button class="text-button" @click="editActivity(activity)">Edit</button><button v-if="activity.status === 'draft'" class="danger-text" @click="deleteActivity(activity)">Delete</button></td>
              </tr><tr v-if="activities.length === 0"><td colspan="7" class="empty">No activities created.</td></tr></tbody>
            </table></div>
          </section>

          <section class="card">
            <div class="section-header"><div><h3>Student registrations</h3><p>Pending registrations can be approved or rejected.</p></div><select v-model="registrationStatus" @change="loadRegistrations"><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></select></div>
            <div class="table-wrap"><table><thead><tr><th>Student</th><th>Student ID</th><th>Activity</th><th>Registered</th><th>Status</th><th>Review note</th><th>Actions</th></tr></thead>
              <tbody><tr v-for="registration in registrations" :key="registration.id">
                <td>{{ registration.student_name }}</td><td>{{ registration.student_number || '—' }}</td><td>{{ registration.activity_title }}</td><td>{{ dateLabel(registration.registered_at) }}</td>
                <td><span class="badge" :class="`status-${registration.status}`">{{ titleCase(registration.status) }}</span></td><td>{{ registration.review_note || '—' }}</td>
                <td v-if="registration.status === 'pending'" class="actions"><button class="small-button approve" @click="reviewRegistration(registration, 'approve')">Approve</button><button class="small-button reject" @click="reviewRegistration(registration, 'reject')">Reject</button></td><td v-else>—</td>
              </tr><tr v-if="registrations.length === 0"><td colspan="7" class="empty">No registrations found.</td></tr></tbody>
            </table></div>
          </section>
        </section>

        <section v-else-if="activeTab === 'areas'" class="page-content">
          <div class="intro"><h2>Service areas</h2><p>Activities and cleaning assignments use an active service area. Inactive areas stay on existing records but can't be picked for new ones.</p></div>
          <form class="card form-grid" @submit.prevent="saveArea">
            <h3>{{ areaForm.id ? 'Edit service area' : 'Add service area' }}</h3>
            <label><span>Name</span><input v-model="areaForm.area_name" maxlength="100" required></label>
            <label><span>Location (optional)</span><input v-model="areaForm.location" maxlength="250"></label>
            <label><span>Status</span><select v-model="areaForm.status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <label class="wide"><span>Description (optional)</span><textarea v-model="areaForm.description" maxlength="500" rows="2"></textarea></label>
            <div class="form-actions"><button class="primary-button" :disabled="saving">{{ saving ? 'Saving…' : areaForm.id ? 'Save changes' : 'Add area' }}</button><button v-if="areaForm.id" class="secondary-button" type="button" @click="resetAreaForm">Cancel edit</button></div>
          </form>
          <section class="card"><h3>All service areas</h3><div class="table-wrap"><table><thead><tr><th>Name</th><th>Location</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            <tr v-for="area in allAreas" :key="area.id"><td>{{ area.area_name }}</td><td>{{ area.location || '—' }}</td><td>{{ area.description || '—' }}</td><td><span class="badge" :class="`status-${area.status}`">{{ titleCase(area.status) }}</span></td><td class="actions"><button class="text-button" @click="editArea(area)">Edit</button></td></tr>
            <tr v-if="allAreas.length === 0"><td colspan="5" class="empty">No service areas yet. Add one above to create activities and assignments.</td></tr>
          </tbody></table></div></section>
        </section>

        <section v-else-if="activeTab === 'assignments'" class="page-content">
          <div class="intro"><h2>Cleaning assignments</h2><p>Assign an active service area and notify the student.</p></div>
          <form class="card form-grid compact-form" @submit.prevent="createAssignment">
            <p v-if="areas.length === 0" class="note wide">No active service areas yet. <button class="text-button" type="button" @click="selectTab('areas')">Add one in Service Areas</button></p>
            <label><span>Student</span><select v-model="assignmentForm.student_id" required><option value="">Select approved student</option><option v-for="student in assignableStudents" :key="student.id" :value="student.id">{{ student.full_name }} · {{ student.student_id }}</option></select></label>
            <label><span>Service area</span><select v-model="assignmentForm.area_id" required><option value="">Select area</option><option v-for="area in areas" :key="area.id" :value="area.id">{{ area.area_name }}</option></select></label>
            <label><span>Assigned date</span><input v-model="assignmentForm.assigned_date" type="date" required></label>
            <label><span>Start time</span><input v-model="assignmentForm.schedule_start" type="time"></label>
            <label><span>End time</span><input v-model="assignmentForm.schedule_end" type="time"></label>
            <button class="primary-button" :disabled="saving">Create assignment</button>
          </form>
          <section class="card"><h3>Current assignments</h3><div class="table-wrap"><table><thead><tr><th>Student</th><th>Area</th><th>Date</th><th>Schedule</th><th>Location</th><th></th></tr></thead><tbody>
            <tr v-for="assignment in assignments" :key="assignment.id"><td>{{ assignment.student_name }}</td><td>{{ assignment.area_name }}</td><td>{{ dateLabel(assignment.assigned_date) }}</td><td>{{ assignment.schedule_start || 'TBD' }}–{{ assignment.schedule_end || 'TBD' }}</td><td>{{ assignment.location || '—' }}</td><td><button class="danger-text" @click="removeAssignment(assignment)">Remove</button></td></tr>
            <tr v-if="assignments.length === 0"><td colspan="6" class="empty">No assignments have been made.</td></tr>
          </tbody></table></div><p class="note">The existing assignment schema has no completion or cancellation status.</p></section>
        </section>

        <section v-else-if="activeTab === 'hours'" class="page-content">
          <div class="intro"><h2>Service-hour adjustments</h2><p>Every adjustment requires a reason and is recorded in the activity log.</p></div>
          <form class="card form-grid compact-form" @submit.prevent="createAdjustment">
            <label><span>Student</span><select v-model="adjustmentForm.student_id" required @change="loadAdjustments"><option value="">Select student</option><option v-for="student in students" :key="student.id" :value="student.id">{{ student.full_name }} · {{ student.student_id }}</option></select></label>
            <label><span>Type</span><select v-model="adjustmentForm.adjustment_type"><option value="add">Add hours</option><option value="deduct">Deduct hours</option></select></label>
            <label><span>Hours</span><input v-model.number="adjustmentForm.adjustment_amount" type="number" min="0.01" max="340" step="0.01" required></label>
            <label class="wide"><span>Reason (required)</span><textarea v-model="adjustmentForm.reason" minlength="3" maxlength="500" required></textarea></label>
            <button class="primary-button" :disabled="saving || !adjustmentForm.student_id">Save adjustment</button>
          </form>
          <section class="card"><h3>Adjustment history</h3><div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Hours</th><th>Reason</th></tr></thead><tbody>
            <tr v-for="adjustment in adjustments" :key="adjustment.id"><td>{{ dateLabel(adjustment.created_at) }}</td><td>{{ titleCase(adjustment.adjustment_type) }}</td><td>{{ hours(adjustment.adjustment_amount) }}</td><td>{{ adjustment.reason }}</td></tr>
            <tr v-if="adjustments.length === 0"><td colspan="4" class="empty">Select a student to view adjustments.</td></tr>
          </tbody></table></div></section>
        </section>

        <section v-else-if="activeTab === 'documents'" class="page-content">
          <div class="intro"><h2>Document review</h2><p>Review submitted documents and leave notes visible to the student.</p></div>
          <div class="filter-row"><label><span>Status</span><select v-model="documentStatus" @change="loadDocuments"><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label></div>
          <div class="table-wrap card"><table><thead><tr><th>Student</th><th>Document</th><th>Type</th><th>Submitted</th><th>Status</th><th>Remarks</th><th>Actions</th></tr></thead><tbody>
            <tr v-for="document in documents" :key="document.id"><td>{{ document.student_name }}</td><td>{{ document.document_name }}</td><td>{{ document.document_type || '—' }}</td><td>{{ dateLabel(document.submitted_at) }}</td>
              <td><span class="badge" :class="`status-${document.status}`">{{ titleCase(document.status) }}</span></td><td>{{ document.admin_remarks || '—' }}</td>
              <td class="actions"><button class="text-button" @click="downloadDocument(document)">View file</button><template v-if="document.status === 'pending'"><button class="small-button approve" @click="reviewDocument(document, 'approve')">Approve</button><button class="small-button reject" @click="reviewDocument(document, 'reject')">Reject</button></template></td>
            </tr><tr v-if="documents.length === 0"><td colspan="7" class="empty">No documents found.</td></tr>
          </tbody></table></div>
        </section>

        <section v-else-if="activeTab === 'announcements'" class="page-content">
          <div class="intro"><h2>Announcements</h2><p>Publishing sends a notification to approved students in the target audience.</p></div>
          <form class="card form-grid" @submit.prevent="saveAnnouncement">
            <h3>{{ announcementForm.id ? 'Edit announcement' : 'Publish announcement' }}</h3>
            <label><span>Title</span><input v-model="announcementForm.title" maxlength="200" required></label>
            <label><span>Target section (blank = all students)</span><select v-model="announcementForm.target_section_id"><option value="">All students</option><option v-for="section in sections" :key="section.id" :value="section.id">{{ section.course }} · {{ section.year_level }} · {{ section.section_name }}</option></select></label>
            <label class="wide"><span>Content</span><textarea v-model="announcementForm.content" rows="4" maxlength="10000" required></textarea></label>
            <div class="form-actions"><button class="primary-button" :disabled="saving">{{ announcementForm.id ? 'Save changes' : 'Publish' }}</button><button v-if="announcementForm.id" class="secondary-button" type="button" @click="resetAnnouncementForm">Cancel edit</button></div>
          </form>
          <section class="card"><h3>Published announcements</h3><div class="table-wrap"><table><thead><tr><th>Title</th><th>Target</th><th>Created</th><th>Actions</th></tr></thead><tbody>
            <tr v-for="announcement in announcements" :key="announcement.id"><td>{{ announcement.title }}</td><td>{{ announcement.section_name || 'All students' }}</td><td>{{ dateLabel(announcement.created_at) }}</td><td class="actions"><button class="text-button" @click="editAnnouncement(announcement)">Edit</button><button class="danger-text" @click="deleteAnnouncement(announcement)">Delete</button></td></tr>
            <tr v-if="announcements.length === 0"><td colspan="4" class="empty">No announcements published.</td></tr>
          </tbody></table></div><p class="note">The current schema has no draft, archive, category, or importance fields. Announcements publish immediately and can be edited or deleted.</p></section>
        </section>
      </template>

      <footer class="footer">RSS Administration Panel · 2026</footer>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { parseApiDate } from '@/utils/dates'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const route = useRoute()
const router = useRouter()
const tabs = [
  { id: 'attendance', label: 'Attendance', icon: '▣' },
  { id: 'hours', label: 'Service Hours', icon: '◷' },
  { id: 'activities', label: 'Service Activities', icon: '✦' },
  { id: 'areas', label: 'Service Areas', icon: '⌖' },
  { id: 'assignments', label: 'Cleaning Assignments', icon: '⌂' },
  { id: 'documents', label: 'Documents', icon: '▤' },
  { id: 'announcements', label: 'Announcements', icon: '♧' }
]
const activeTab = computed(() => tabs.some(tab => tab.id === route.params.module) ? route.params.module : 'attendance')
const activeLabel = computed(() => tabs.find(tab => tab.id === activeTab.value)?.label || 'Attendance')
const token = ref('')
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const attendance = ref([])
const activities = ref([])
const registrations = ref([])
const assignments = ref([])
const students = ref([])
const areas = ref([])
const adjustments = ref([])
const documents = ref([])
const announcements = ref([])
const sections = ref([])
const allAreas = ref([])
const attendanceStatus = ref('pending')
const registrationStatus = ref('pending')
const documentStatus = ref('pending')

const activityForm = reactive({
  id: '', title: '', area_id: '', description: '', location: '',
  scheduled_start: '', scheduled_end: '', required_hours: 0,
  capacity: '', eligibility: '', registration_open: true, status: 'draft'
})
const assignmentForm = reactive({ student_id: '', area_id: '', assigned_date: '', schedule_start: '', schedule_end: '' })
const adjustmentForm = reactive({ student_id: '', adjustment_type: 'add', adjustment_amount: '', reason: '' })
const announcementForm = reactive({ id: '', title: '', content: '', target_section_id: '' })
const areaForm = reactive({ id: '', area_name: '', location: '', description: '', status: 'active' })
// The API only accepts approved students for assignments.
const assignableStudents = computed(() => students.value.filter(student => student.account_status === 'approved'))

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${token.value}`)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (options.responseType === 'blob') {
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) router.replace('/login')
      throw new Error('Unable to access the document file.')
    }
    return response.blob()
  }
  let data
  try { data = await response.json() } catch { throw new Error('The server returned an invalid response.') }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) router.replace('/login')
    throw new Error(data.message || 'The request could not be completed.')
  }
  return data
}

function authenticate() {
  const value = localStorage.getItem('rss_token') || sessionStorage.getItem('rss_token')
  const rawUser = localStorage.getItem('rss_user') || sessionStorage.getItem('rss_user')
  if (!value || !rawUser) {
    router.replace('/login')
    return false
  }
  try {
    if (JSON.parse(rawUser)?.role !== 'admin') {
      router.replace('/login')
      return false
    }
  } catch {
    router.replace('/login')
    return false
  }
  token.value = value
  return true
}

async function loadTab() {
  if (!token.value) return
  errorMessage.value = ''
  loading.value = true
  try {
    if (activeTab.value === 'attendance') await loadAttendance()
    else if (activeTab.value === 'activities') await Promise.all([loadActivities(), loadRegistrations(), loadAreas()])
    else if (activeTab.value === 'areas') await loadAllAreas()
    else if (activeTab.value === 'assignments') await Promise.all([loadAssignments(), loadStudents(), loadAreas()])
    else if (activeTab.value === 'hours') {
      await loadStudents()
      if (adjustmentForm.student_id) await loadAdjustments()
    } else if (activeTab.value === 'documents') await loadDocuments()
    else if (activeTab.value === 'announcements') await Promise.all([loadAnnouncements(), loadSections()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load this admin module.'
  } finally {
    loading.value = false
  }
}

function selectTab(tab) {
  router.push(`/admin/workflows/${tab}`)
}

async function loadAttendance() {
  const query = attendanceStatus.value ? `?status=${encodeURIComponent(attendanceStatus.value)}` : ''
  attendance.value = (await request(`/admin/attendance${query}`)).attendance
}

async function reviewAttendance(record, decision) {
  const reason = decision === 'reject'
    ? window.prompt('Enter a reason for rejecting this attendance record:')
    : window.prompt('Optional note for this attendance review:') || ''
  if (decision === 'reject' && reason === null) return
  if (!window.confirm(`${decision === 'approve' ? 'Approve' : 'Reject'} attendance for ${record.student_name} on ${dateLabel(record.attendance_date)}?`)) return
  saving.value = true
  try {
    const data = await request(`/admin/attendance/${encodeURIComponent(record.id)}/${decision}`, {
      method: 'PATCH', body: JSON.stringify({ reason: reason || '' })
    })
    successMessage.value = data.message
    await loadAttendance()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Attendance review failed.'
  } finally { saving.value = false }
}

async function loadAreas() {
  areas.value = (await request('/admin/activity-areas')).areas
}

async function loadAllAreas() {
  allAreas.value = (await request('/admin/service-areas')).areas
}

function resetAreaForm() {
  Object.assign(areaForm, { id: '', area_name: '', location: '', description: '', status: 'active' })
}

function editArea(area) {
  Object.assign(areaForm, {
    id: area.id,
    area_name: area.area_name,
    location: area.location || '',
    description: area.description || '',
    status: area.status === 'inactive' ? 'inactive' : 'active'
  })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function saveArea() {
  saving.value = true
  errorMessage.value = ''
  try {
    const { id, ...fields } = areaForm
    const path = id ? `/admin/service-areas/${encodeURIComponent(id)}` : '/admin/service-areas'
    const result = await request(path, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(fields) })
    successMessage.value = result.message
    resetAreaForm()
    await loadAllAreas()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Service area could not be saved.'
  } finally { saving.value = false }
}

async function loadActivities() {
  activities.value = (await request('/admin/activities')).activities
}

async function loadRegistrations() {
  const query = registrationStatus.value ? `?status=${encodeURIComponent(registrationStatus.value)}` : ''
  registrations.value = (await request(`/admin/activity-registrations${query}`)).registrations
}

async function reviewRegistration(registration, decision) {
  const reason = decision === 'reject' ? window.prompt('Optional rejection reason:') : ''
  if (decision === 'reject' && reason === null) return
  if (!window.confirm(`${decision === 'approve' ? 'Approve' : 'Reject'} ${registration.student_name}'s registration for "${registration.activity_title}"?`)) return
  saving.value = true
  try {
    const data = await request(`/admin/activity-registrations/${encodeURIComponent(registration.id)}/${decision}`, {
      method: 'PATCH', body: JSON.stringify({ reason: reason || '' })
    })
    successMessage.value = data.message
    await loadRegistrations()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Registration review failed.'
  } finally { saving.value = false }
}

function resetActivityForm() {
  Object.assign(activityForm, {
    id: '', title: '', area_id: '', description: '', location: '',
    scheduled_start: '', scheduled_end: '', required_hours: 0,
    capacity: '', eligibility: '', registration_open: true, status: 'draft'
  })
}

function editActivity(activity) {
  Object.assign(activityForm, {
    id: activity.id,
    title: activity.title,
    area_id: activity.area_id,
    description: activity.description,
    location: activity.location || '',
    scheduled_start: String(activity.scheduled_start).slice(0, 16),
    scheduled_end: String(activity.scheduled_end).slice(0, 16),
    required_hours: Number(activity.required_hours),
    capacity: activity.capacity === null ? '' : Number(activity.capacity),
    eligibility: activity.eligibility || '',
    registration_open: Boolean(Number(activity.registration_open)),
    status: activity.status
  })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function saveActivity() {
  saving.value = true
  errorMessage.value = ''
  try {
    const { id, ...fields } = activityForm
    const payload = {
      ...fields,
      capacity: activityForm.capacity === '' ? null : Number(activityForm.capacity),
      required_hours: Number(activityForm.required_hours)
    }
    const isEdit = Boolean(id)
    const path = isEdit ? `/admin/activities/${encodeURIComponent(id)}` : '/admin/activities'
    const result = await request(path, { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
    successMessage.value = result.message
    resetActivityForm()
    await Promise.all([loadActivities(), loadRegistrations()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Activity could not be saved.'
  } finally { saving.value = false }
}

async function deleteActivity(activity) {
  if (!window.confirm(`Delete draft activity "${activity.title}"?`)) return
  try {
    const result = await request(`/admin/activities/${encodeURIComponent(activity.id)}`, { method: 'DELETE' })
    successMessage.value = result.message
    await loadActivities()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Activity could not be deleted.'
  }
}

async function loadStudents() {
  students.value = (await request('/admin/students')).students
}

async function loadAssignments() {
  assignments.value = (await request('/admin/assignments')).assignments
}

async function createAssignment() {
  saving.value = true
  errorMessage.value = ''
  try {
    const result = await request('/admin/assignments', {
      method: 'POST',
      body: JSON.stringify({
        ...assignmentForm,
        schedule_start: assignmentForm.schedule_start || null,
        schedule_end: assignmentForm.schedule_end || null
      })
    })
    successMessage.value = result.message
    Object.assign(assignmentForm, { student_id: '', area_id: '', assigned_date: '', schedule_start: '', schedule_end: '' })
    await loadAssignments()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Assignment could not be created.'
  } finally { saving.value = false }
}

async function removeAssignment(assignment) {
  if (!window.confirm(`Remove ${assignment.area_name} assignment for ${assignment.student_name}?`)) return
  try {
    const result = await request(`/admin/assignments/${encodeURIComponent(assignment.id)}`, { method: 'DELETE' })
    successMessage.value = result.message
    await loadAssignments()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Assignment could not be removed.'
  }
}

async function loadAdjustments() {
  if (!adjustmentForm.student_id) {
    adjustments.value = []
    return
  }
  adjustments.value = (await request(`/admin/students/${encodeURIComponent(adjustmentForm.student_id)}/hour-adjustments`)).adjustments
}

async function createAdjustment() {
  saving.value = true
  errorMessage.value = ''
  try {
    const result = await request(`/admin/students/${encodeURIComponent(adjustmentForm.student_id)}/hour-adjustments`, {
      method: 'POST',
      body: JSON.stringify({
        adjustment_type: adjustmentForm.adjustment_type,
        adjustment_amount: Number(adjustmentForm.adjustment_amount),
        reason: adjustmentForm.reason
      })
    })
    successMessage.value = result.message
    adjustmentForm.adjustment_amount = ''
    adjustmentForm.reason = ''
    await loadAdjustments()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Adjustment could not be saved.'
  } finally { saving.value = false }
}

async function loadDocuments() {
  const query = documentStatus.value ? `?status=${encodeURIComponent(documentStatus.value)}` : ''
  documents.value = (await request(`/admin/documents${query}`)).documents
}

async function downloadDocument(document) {
  try {
    const file = await request(`/admin/documents/${encodeURIComponent(document.id)}/file`, { responseType: 'blob' })
    const url = URL.createObjectURL(file)
    const link = window.document.createElement('a')
    link.href = url
    link.download = document.document_name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Document file could not be opened.'
  }
}

async function reviewDocument(document, decision) {
  const reason = decision === 'reject' ? window.prompt('Enter a reason for rejecting this document:') : window.prompt('Optional review note:') || ''
  if (decision === 'reject' && reason === null) return
  if (!window.confirm(`${decision === 'approve' ? 'Approve' : 'Reject'} "${document.document_name}" for ${document.student_name}?`)) return
  saving.value = true
  try {
    const result = await request(`/admin/documents/${encodeURIComponent(document.id)}/${decision}`, {
      method: 'PATCH', body: JSON.stringify({ reason: reason || '' })
    })
    successMessage.value = result.message
    await loadDocuments()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Document review failed.'
  } finally { saving.value = false }
}

async function loadAnnouncements() {
  announcements.value = (await request('/admin/announcements')).announcements
}

async function loadSections() {
  sections.value = (await request('/admin/sections')).sections
}

function editAnnouncement(announcement) {
  Object.assign(announcementForm, {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    target_section_id: announcement.target_section_id || ''
  })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function resetAnnouncementForm() {
  Object.assign(announcementForm, { id: '', title: '', content: '', target_section_id: '' })
}

async function saveAnnouncement() {
  saving.value = true
  errorMessage.value = ''
  try {
    const isEdit = Boolean(announcementForm.id)
    const path = isEdit ? `/admin/announcements/${encodeURIComponent(announcementForm.id)}` : '/admin/announcements'
    const result = await request(path, {
      method: isEdit ? 'PATCH' : 'POST',
      body: JSON.stringify({
        title: announcementForm.title,
        content: announcementForm.content,
        target_section_id: announcementForm.target_section_id || null
      })
    })
    successMessage.value = result.message
    resetAnnouncementForm()
    await loadAnnouncements()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Announcement could not be saved.'
  } finally { saving.value = false }
}

async function deleteAnnouncement(announcement) {
  if (!window.confirm(`Delete announcement "${announcement.title}"?`)) return
  try {
    const result = await request(`/admin/announcements/${encodeURIComponent(announcement.id)}`, { method: 'DELETE' })
    successMessage.value = result.message
    await loadAnnouncements()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Announcement could not be deleted.'
  }
}

function dateLabel(value) {
  if (!value) return '—'
  const date = parseApiDate(value)
  return date ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(date) : String(value)
}

function dateTime(value) {
  if (!value) return '—'
  const date = parseApiDate(value)
  return date ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : String(value)
}

function titleCase(value) {
  return value ? String(value).replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : '—'
}

function hours(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Number(number.toFixed(2)).toString() : '0'
}

function logout() {
  localStorage.removeItem('rss_token')
  localStorage.removeItem('rss_user')
  sessionStorage.removeItem('rss_token')
  sessionStorage.removeItem('rss_user')
  router.replace('/login')
}

watch(activeTab, () => {
  if (token.value) loadTab()
})
onMounted(() => {
  if (authenticate()) loadTab()
})
</script>

<style scoped>
* { box-sizing: border-box; }
.admin-layout { min-height: 100vh; display: flex; background: #f5f7fb; color: #172033; font-family: Arial, Helvetica, sans-serif; }
.sidebar { width: 255px; min-width: 255px; min-height: 100vh; display: flex; flex-direction: column; padding: 23px 16px; background: #101e38; color: #fff; }
.brand, .admin-profile { display: flex; align-items: center; gap: 11px; }
.brand { padding: 4px 5px 25px; border-bottom: 1px solid rgba(255,255,255,.1); }
.brand-icon { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 10px; background: #3478f6; font-size: 21px; font-weight: 800; }
.brand h2 { margin: 0 0 4px; font-size: 13px; letter-spacing: .8px; }
.brand span { color: #8fa7cb; font-size: 8px; letter-spacing: 1.4px; }
.admin-profile { padding: 17px 4px; border-bottom: 1px solid rgba(255,255,255,.1); }
.avatar { width: 35px; height: 35px; display: grid; place-items: center; border-radius: 50%; background: #29466f; font-weight: 700; }
.admin-profile strong, .admin-profile small { display: block; }
.admin-profile strong { font-size: 11px; }
.admin-profile small { margin-top: 4px; color: #93a5c0; font-size: 9px; }
.navigation { flex: 1; padding-top: 17px; overflow-y: auto; }
.nav-label { margin: 15px 9px 8px; color: #7185a5; font-size: 9px; font-weight: 700; letter-spacing: 1.3px; }
.nav-link { width: 100%; display: flex; align-items: center; gap: 11px; margin-bottom: 4px; padding: 11px; border: 0; border-radius: 7px; background: transparent; color: #b7c5da; text-align: left; font-size: 11px; cursor: pointer; }
.nav-link span { width: 17px; text-align: center; font-size: 15px; }
.nav-link:hover, .nav-link.active { background: #263f65; color: white; }
.logout-button { margin-top: 14px; padding: 11px; border: 1px solid #3b4e6b; border-radius: 7px; background: transparent; color: #d3deed; text-align: left; font-size: 11px; cursor: pointer; }
.main-content { min-width: 0; flex: 1; display: flex; flex-direction: column; padding: 24px 30px 16px; }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 19px; }
.eyebrow { margin: 0; color: #8792a4; font-size: 9px; letter-spacing: 1px; }
.topbar h1 { margin: 5px 0; font-size: 21px; }
.topbar p:last-child { margin: 0; color: #8792a4; font-size: 10px; }
.page-content { width: 100%; max-width: 1500px; margin: 0 auto; }
.intro { margin-bottom: 14px; }
.intro h2 { margin: 0 0 6px; font-size: 16px; }
.intro p, .section-header p { margin: 0; color: #8792a4; font-size: 10px; }
.card { margin-bottom: 14px; padding: 17px; border: 1px solid #e8edf3; border-radius: 10px; background: #fff; box-shadow: 0 3px 12px rgba(20,40,70,.025); }
.card h3 { margin: 0 0 13px; color: #2e3d53; font-size: 12px; }
.form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 11px; align-items: end; }
.form-grid > h3, .wide, .form-actions { grid-column: 1 / -1; }
.form-grid label, .filter-row label { display: flex; flex-direction: column; gap: 5px; }
.form-grid label > span, .filter-row label > span { color: #68778c; font-size: 9px; font-weight: 700; }
.form-grid input, .form-grid select, .form-grid textarea, .filter-row select, .section-header select { width: 100%; min-height: 34px; padding: 7px 9px; border: 1px solid #dfe5ed; border-radius: 6px; outline: none; background: #fff; color: #334258; font: inherit; font-size: 10px; }
.form-grid textarea { resize: vertical; }
.form-grid input:focus, .form-grid select:focus, .form-grid textarea:focus, .filter-row select:focus { border-color: #3478f6; box-shadow: 0 0 0 3px rgba(52,120,246,.1); }
.checkbox { flex-direction: row !important; align-items: center; gap: 7px !important; min-height: 34px; }
.checkbox input { width: 15px; min-height: 15px; }
.checkbox span { color: #52627a; font-size: 10px; }
.form-actions { display: flex; gap: 8px; }
.compact-form { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.primary-button, .secondary-button, .small-button { min-height: 33px; padding: 7px 11px; border: 1px solid transparent; border-radius: 6px; font-size: 9px; font-weight: 700; cursor: pointer; }
.primary-button { background: #3478f6; color: #fff; }
.secondary-button { border-color: #dfe5ed; background: #fff; color: #40536f; }
.small-button { min-height: 27px; padding: 5px 7px; }
.approve { background: #e6f7ed; color: #18764d; }
.reject { background: #ffeded; color: #b34141; }
button:disabled { cursor: not-allowed; opacity: .6; }
.filter-row { margin-bottom: 12px; }
.filter-row label { max-width: 220px; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.section-header h3 { margin: 0 0 5px; }
.section-header select { width: auto; min-width: 130px; }
.table-wrap { width: 100%; overflow-x: auto; border: 1px solid #edf0f5; border-radius: 8px; background: #fff; }
.card.table-wrap { padding: 0; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th { padding: 10px 9px; background: #f8fafd; color: #748299; font-size: 9px; white-space: nowrap; }
td { padding: 10px 9px; border-top: 1px solid #edf0f5; color: #526177; font-size: 9px; vertical-align: top; }
.actions { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.text-button, .danger-text { padding: 3px; border: 0; background: transparent; color: #3478f6; font-size: 9px; font-weight: 700; cursor: pointer; }
.danger-text { color: #b34141; }
.badge { display: inline-flex; padding: 4px 7px; border-radius: 20px; font-size: 8px; font-weight: 700; }
.status-pending { background: #fff4e5; color: #a9680c; }
.status-approved { background: #e8f8ef; color: #18764d; }
.status-rejected { background: #ffeded; color: #b34141; }
.status-cancelled { background: #eef1f5; color: #677386; }
.status-active { background: #e8f8ef; color: #18764d; }
.status-inactive { background: #eef1f5; color: #677386; }
.empty { padding: 25px; color: #8994a4; text-align: center; }
.note { margin: 10px 0 0; color: #8792a4; font-size: 9px; line-height: 1.5; }
.notice { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin: 0 0 12px; padding: 10px 12px; border-radius: 7px; font-size: 10px; }
.notice button { border: 0; background: transparent; color: inherit; font-size: 16px; cursor: pointer; }
.notice.error { background: #fff1f1; color: #a83b3b; }
.notice.success { background: #effaf4; color: #18764d; }
.loading { min-height: 220px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #778398; font-size: 10px; }
.spinner { width: 20px; height: 20px; border: 3px solid #dce7f8; border-top-color: #3478f6; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.footer { margin-top: auto; padding: 20px 0 3px; color: #9aa4b3; font-size: 9px; text-align: center; }
@media (max-width: 1050px) { .sidebar { width: 220px; min-width: 220px; } .form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .compact-form { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 700px) { .admin-layout { display: block; } .sidebar { width: 100%; min-width: 0; min-height: auto; padding: 12px; } .admin-profile, .logout-button { display: none; } .brand { padding-bottom: 12px; } .navigation { display: flex; gap: 3px; overflow-x: auto; padding-top: 10px; } .nav-label { display: none; } .nav-link { flex: 0 0 auto; width: auto; white-space: nowrap; } .main-content { padding: 17px 13px; } }
@media (max-width: 470px) { .form-grid, .compact-form { grid-template-columns: 1fr; } .topbar { align-items: flex-start; } .section-header { align-items: flex-start; flex-direction: column; } }
</style>
