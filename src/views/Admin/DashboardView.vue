
<template>
  <div class="admin-layout">

    <!-- SIDEBAR -->
    <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <div class="sidebar-brand">
        <div class="brand-icon">R</div>
        <div>
          <h2>RSS ADMIN</h2>
          <span>MANAGEMENT SYSTEM</span>
        </div>
      </div>

      <div class="admin-profile">
        <div class="profile-avatar">A</div>
        <div>
          <strong>Administrator</strong>
          <span>System Admin</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <p class="nav-label">MAIN MENU</p>

        <a href="#" class="nav-item active" @click.prevent="activePage = 'Dashboard'; sidebarOpen = false">
          <span>▦</span> Dashboard
        </a>

        <a href="/admin/students" class="nav-item" @click.prevent="goToStudentManagement">
          <span>♙</span> Student Management
        </a>

        <a href="/admin/workflows/attendance" class="nav-item" @click.prevent="goToWorkflow('attendance')">
          <span>▣</span> Attendance
        </a>

        <a href="/admin/workflows/hours" class="nav-item" @click.prevent="goToWorkflow('hours')">
          <span>◷</span> Service Hours
        </a>

        <p class="nav-label">MANAGEMENT</p>

        <a href="/admin/workflows/activities" class="nav-item" @click.prevent="goToWorkflow('activities')">
          <span>✦</span> Service Activities
        </a>

        <a href="/admin/workflows/documents" class="nav-item" @click.prevent="goToWorkflow('documents')">
          <span>▤</span> Documents
        </a>

        <a href="/admin/workflows/assignments" class="nav-item" @click.prevent="goToWorkflow('assignments')">
          <span>⌂</span> Cleaning Assignments
        </a>

        <a href="#" class="nav-item" @click.prevent="activePage = 'Reports'; sidebarOpen = false">
          <span>▥</span> Reports
        </a>

        <p class="nav-label">SYSTEM</p>

        <a href="/admin/workflows/announcements" class="nav-item" @click.prevent="goToWorkflow('announcements')">
          <span>♧</span> Announcements
        </a>

        <a href="#" class="nav-item" @click.prevent="activePage = 'System Logs'; sidebarOpen = false">
          <span>◉</span> System Logs
        </a>

        <a href="#" class="nav-item" @click.prevent="activePage = 'Settings'; sidebarOpen = false">
          <span>⚙</span> Settings
        </a>
      </nav>

      <div class="sidebar-bottom">
        <button class="logout-button" @click="logout">
          <span>↪</span> Sign Out
        </button>
        <p>RSS Management System v1.0</p>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="main-content">

      <!-- TOPBAR -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="menu-button" @click="sidebarOpen = !sidebarOpen">☰</button>
          <div>
            <h2>{{ activePage }}</h2>
            <p>Welcome to the RSS Administration Panel.</p>
          </div>
        </div>

        <div class="topbar-right">
          <button class="notification-button" title="Notifications">♧</button>
          <div class="topbar-avatar">A</div>
        </div>
      </header>

      <!-- DASHBOARD -->
      <section v-if="activePage === 'Dashboard'" class="page-content">

        <div class="page-heading">
          <div>
            <h1>Dashboard Overview</h1>
            <p>Here's what's happening in your Return of Service System.</p>
          </div>

          <div class="date-display">
            <span>▣</span>
            {{ currentDate }}
          </div>
        </div>

        <div v-if="errorMessage" class="dashboard-message error-message" role="alert">
          <span>{{ errorMessage }}</span>
          <button @click="loadDashboard">Retry</button>
        </div>

        <div v-else-if="loading" class="dashboard-message loading-message" role="status">
          Loading live dashboard data…
        </div>

        <template v-else>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-top"><span>Total Registered Students</span><div class="stat-icon blue">♙</div></div>
              <h2>{{ formatNumber(stats.totalStudents) }}</h2>
              <p>All student accounts</p>
            </div>
            <div class="stat-card">
              <div class="stat-top"><span>Approved Students</span><div class="stat-icon green">✓</div></div>
              <h2>{{ formatNumber(stats.approvedStudents) }}</h2>
              <p>Accounts approved for service</p>
            </div>
            <div class="stat-card">
              <div class="stat-top"><span>Pending Registrations</span><div class="stat-icon orange">◷</div></div>
              <h2>{{ formatNumber(stats.pendingRegistrations) }}</h2>
              <p>Awaiting account review</p>
            </div>
            <div class="stat-card">
              <div class="stat-top"><span>Rejected Registrations</span><div class="stat-icon red">×</div></div>
              <h2>{{ formatNumber(stats.rejectedStudents) }}</h2>
              <p>Rejected student accounts</p>
            </div>
            <div class="stat-card">
              <div class="stat-top"><span>Completed Service Hours</span><div class="stat-icon green">◷</div></div>
              <h2>{{ formatNumber(stats.completedHours) }}</h2>
              <p>Approved attendance and adjustments</p>
            </div>
            <div class="stat-card">
              <div class="stat-top"><span>Completed Students</span><div class="stat-icon purple">★</div></div>
              <h2>{{ formatNumber(stats.completedStudents) }}</h2>
              <p>Reached the 340-hour requirement</p>
            </div>
            <div class="stat-card">
              <div class="stat-top"><span>Pending Attendance</span><div class="stat-icon orange">▣</div></div>
              <h2>{{ formatNumber(stats.pendingAttendance) }}</h2>
              <p>Submissions waiting for review</p>
            </div>
            <div class="stat-card">
              <div class="stat-top"><span>Pending Documents</span><div class="stat-icon blue">▤</div></div>
              <h2>{{ formatNumber(stats.pendingDocuments) }}</h2>
              <p>Documents waiting for review</p>
            </div>
          </div>

          <div class="dashboard-grid">
            <div class="content-card">
              <div class="card-header">
                <div><h3>Recent Registrations</h3><p>Latest student accounts registered</p></div>
                <button class="view-button" @click="goToStudentManagement">View All →</button>
              </div>
              <div v-if="recentRegistrations.length" class="table-wrap">
                <table class="dashboard-table">
                  <thead><tr><th>Student</th><th>Course / Year</th><th>Registered</th><th>Status</th></tr></thead>
                  <tbody>
                    <tr v-for="student in recentRegistrations" :key="student.id">
                      <td><strong>{{ student.full_name }}</strong><small>{{ student.student_id }}</small></td>
                      <td>{{ student.course || '—' }}<small>{{ student.year_level || 'Year not set' }}<span v-if="student.section"> · {{ student.section }}</span></small></td>
                      <td>{{ formatDate(student.registration_date) }}</td>
                      <td><span class="status-badge" :class="`status-${student.account_status}`">{{ student.account_status }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="empty-state compact-empty">
                <div class="empty-icon">♙</div><h4>No student registrations yet</h4>
                <p>New student accounts will appear here.</p>
              </div>
            </div>

            <div class="content-card">
              <div class="card-header">
                <div><h3>Pending Attendance</h3><p>Submissions waiting for administrator review</p></div>
                <button class="view-button" @click="goToWorkflow('attendance')">View All →</button>
              </div>
              <div v-if="pendingAttendance.length" class="table-wrap">
                <table class="dashboard-table">
                  <thead><tr><th>Student</th><th>Date</th><th>Time</th><th>Hours</th></tr></thead>
                  <tbody>
                    <tr v-for="record in pendingAttendance" :key="record.id">
                      <td><strong>{{ record.student_name }}</strong><small>{{ record.student_id }}</small></td>
                      <td>{{ formatDate(record.attendance_date) }}</td>
                      <td>{{ record.time_in || '—' }}–{{ record.time_out || '—' }}</td>
                      <td>{{ formatNumber(record.total_hours) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="empty-state compact-empty">
                <div class="empty-icon">▣</div><h4>No pending attendance</h4>
                <p>New attendance submissions will appear here.</p>
              </div>
            </div>
          </div>

          <div class="charts-grid">
            <div class="content-card chart-card">
              <div class="card-header"><div><h3>Students by Course</h3><p>Registered student distribution</p></div></div>
              <div v-if="distributions.courses.length" class="chart-list">
                <div v-for="course in distributions.courses" :key="course.label" class="bar-row">
                  <div class="bar-label"><span>{{ course.label }}</span><strong>{{ formatNumber(course.total) }}</strong></div>
                  <div class="bar-track"><span class="bar-fill blue-fill" :style="{ width: barWidth(course.total, distributions.courses) }"></span></div>
                </div>
              </div>
              <div v-else class="chart-empty">No course data available.</div>
            </div>

            <div class="content-card chart-card">
              <div class="card-header"><div><h3>Students by Year Level</h3><p>Registered student distribution</p></div></div>
              <div v-if="distributions.yearLevels.length" class="chart-list">
                <div v-for="year in distributions.yearLevels" :key="year.label" class="bar-row">
                  <div class="bar-label"><span>{{ year.label }}</span><strong>{{ formatNumber(year.total) }}</strong></div>
                  <div class="bar-track"><span class="bar-fill purple-fill" :style="{ width: barWidth(year.total, distributions.yearLevels) }"></span></div>
                </div>
              </div>
              <div v-else class="chart-empty">No year-level data available.</div>
            </div>

            <div class="content-card chart-card">
              <div class="card-header"><div><h3>Service-Hour Completion</h3><p>Student progress toward 340 hours</p></div></div>
              <div class="chart-list">
                <div v-for="item in serviceHourSeries" :key="item.label" class="bar-row">
                  <div class="bar-label"><span>{{ item.label }}</span><strong>{{ formatNumber(item.total) }}</strong></div>
                  <div class="bar-track"><span class="bar-fill" :class="item.color" :style="{ width: barWidth(item.total, serviceHourSeries) }"></span></div>
                </div>
              </div>
            </div>

            <div class="content-card chart-card">
              <div class="card-header"><div><h3>Attendance Overview</h3><p>Submission status across all records</p></div></div>
              <div class="chart-list">
                <div v-for="item in attendanceSeries" :key="item.label" class="bar-row">
                  <div class="bar-label"><span>{{ item.label }}</span><strong>{{ formatNumber(item.total) }}</strong></div>
                  <div class="bar-track"><span class="bar-fill" :class="item.color" :style="{ width: barWidth(item.total, attendanceSeries) }"></span></div>
                </div>
              </div>
            </div>
          </div>

          <div class="content-card activity-card">
            <div class="card-header"><div><h3>Recent Activities</h3><p>Recent registrations and administrator actions</p></div></div>
            <div v-if="recentActivities.length" class="activity-list">
              <article v-for="activity in recentActivities" :key="activity.id" class="activity-item">
                <span class="activity-dot"></span>
                <div class="activity-copy">
                  <strong>{{ actionLabel(activity.action) }}</strong>
                  <p><span v-if="activity.student_name">{{ activity.student_name }} · </span>{{ activity.actor_name }}</p>
                  <small v-if="activity.reason">{{ activity.reason }}</small>
                </div>
                <time>{{ formatDate(activity.created_at) }}</time>
              </article>
            </div>
            <div v-else class="chart-empty">No recent activity has been recorded.</div>
          </div>

          <div class="content-card quick-access">
            <div class="card-header"><div><h3>Quick Access</h3><p>Frequently used administration tools</p></div></div>
            <div class="quick-grid">
              <button @click="goToStudentManagement"><span class="quick-icon blue">♙</span><strong>Manage Students</strong><small>View and approve accounts</small></button>
              <button @click="goToWorkflow('attendance')"><span class="quick-icon green">▣</span><strong>Review Attendance</strong><small>Approve service records</small></button>
              <button @click="goToWorkflow('hours')"><span class="quick-icon purple">▥</span><strong>Manage Service Hours</strong><small>Review hours and adjustments</small></button>
              <button @click="goToWorkflow('announcements')"><span class="quick-icon orange">♧</span><strong>Post Announcement</strong><small>Share updates with students</small></button>
            </div>
          </div>
        </template>

      </section>

      <!-- PLACEHOLDER FOR OTHER MODULES -->
      <section v-else class="page-content">
        <div class="module-placeholder">
          <div class="placeholder-icon">▦</div>
          <h1>{{ activePage }}</h1>
          <p>
            The {{ activePage }} module is ready to be developed.
            Its features and database connection will be added next.
          </p>
          <button @click="activePage = 'Dashboard'">
            ← Back to Dashboard
          </button>
        </div>
      </section>

      <footer class="main-footer">
        <span>© 2026 Return of Service Management System</span>
        <span>Administration Panel</span>
      </footer>

    </main>

    <div
      v-if="sidebarOpen"
      class="sidebar-overlay"
      @click="sidebarOpen = false"
    ></div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

const activePage = ref('Dashboard')
const sidebarOpen = ref(false)
const loading = ref(true)
const errorMessage = ref('')
const stats = ref({})
const recentRegistrations = ref([])
const pendingAttendance = ref([])
const recentActivities = ref([])
const distributions = ref({
  courses: [],
  yearLevels: [],
  serviceHours: { completed: 0, inProgress: 0, notStarted: 0 },
  attendance: { pending: 0, approved: 0, rejected: 0 }
})
const serviceHourSeries = computed(() => [
  { label: 'Completed', total: distributions.value.serviceHours.completed, color: 'green-fill' },
  { label: 'In progress', total: distributions.value.serviceHours.inProgress, color: 'blue-fill' },
  { label: 'Not started', total: distributions.value.serviceHours.notStarted, color: 'gray-fill' }
])
const attendanceSeries = computed(() => [
  { label: 'Approved', total: distributions.value.attendance.approved, color: 'green-fill' },
  { label: 'Pending', total: distributions.value.attendance.pending, color: 'orange-fill' },
  { label: 'Rejected', total: distributions.value.attendance.rejected, color: 'red-fill' }
])

const currentDate = computed(() => {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date())
})

function formatNumber(value) {
  return new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(Number(value) || 0)
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

function barWidth(value, series) {
  const maximum = Math.max(0, ...series.map(item => Number(item.total) || 0))
  const amount = Number(value) || 0
  if (!maximum || !amount) return '0%'
  return `${Math.max(4, Math.round((amount / maximum) * 100))}%`
}

function actionLabel(action) {
  return String(action || 'System event')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
}

async function loadDashboard() {
  const token = localStorage.getItem('rss_token') || sessionStorage.getItem('rss_token')
  const rawUser = localStorage.getItem('rss_user') || sessionStorage.getItem('rss_user')
  if (!token || !rawUser) {
    router.replace('/login')
    return
  }

  try {
    if (JSON.parse(rawUser)?.role !== 'admin') {
      router.replace('/login')
      return
    }
  } catch {
    router.replace('/login')
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    const response = await fetch(`${API_URL}/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${token}` }
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
      throw new Error(data.message || 'Unable to load the dashboard.')
    }
    stats.value = data.stats
    recentRegistrations.value = data.recentRegistrations
    pendingAttendance.value = data.pendingAttendance
    recentActivities.value = data.recentActivities
    distributions.value = data.distributions
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load the dashboard.'
  } finally {
    loading.value = false
  }
}

function logout() {
  localStorage.removeItem('rss_token')
  localStorage.removeItem('rss_user')
  sessionStorage.removeItem('rss_token')
  sessionStorage.removeItem('rss_user')

  router.push('/login')
}

function goToStudentManagement() {
  sidebarOpen.value = false
  router.push('/admin/students')
}

function goToWorkflow(module) {
  sidebarOpen.value = false
  router.push(`/admin/workflows/${module}`)
}

onMounted(loadDashboard)
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

/* SIDEBAR */

.sidebar {
  width: 255px;
  min-width: 255px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #101e38;
  color: white;
  padding: 25px 17px 18px;
  z-index: 20;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 7px 28px;
  border-bottom: 1px solid rgba(255,255,255,.09);
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
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 22px 7px;
  border-bottom: 1px solid rgba(255,255,255,.09);
}

.profile-avatar,
.topbar-avatar {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #29466f;
  color: white;
  font-weight: 700;
}

.admin-profile strong {
  display: block;
  font-size: 12px;
}

.admin-profile span {
  display: block;
  margin-top: 5px;
  color: #93a5c0;
  font-size: 10px;
}

.sidebar-nav {
  flex: 1;
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
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 5px;
  padding: 12px 11px;
  border-radius: 7px;
  color: #b7c5da;
  text-decoration: none;
  font-size: 12px;
  transition: .2s;
}

.nav-item span {
  width: 17px;
  font-size: 17px;
  text-align: center;
}

.nav-item:hover,
.nav-item.active {
  background: #263f65;
  color: white;
}

.nav-item.active {
  box-shadow: inset 3px 0 #4d91ff;
}

.sidebar-bottom {
  border-top: 1px solid rgba(255,255,255,.09);
  padding-top: 15px;
}

.logout-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: none;
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

/* MAIN CONTENT */

.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  min-height: 83px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 35px;
  background: white;
  border-bottom: 1px solid #e9edf3;
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

.topbar-right {
  display: flex;
  align-items: center;
  gap: 18px;
}

.notification-button {
  width: 35px;
  height: 35px;
  border: 1px solid #e7ebf1;
  border-radius: 9px;
  background: white;
  color: #52627a;
  font-size: 17px;
  cursor: pointer;
}

.topbar-avatar {
  background: #3478f6;
}

.menu-button {
  display: none;
  border: none;
  background: transparent;
  font-size: 23px;
  cursor: pointer;
}

.page-content {
  width: 100%;
  max-width: 1500px;
  margin: 0 auto;
  padding: 32px 35px;
  flex: 1;
}

.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 26px;
}

.page-heading h1 {
  font-size: 22px;
  letter-spacing: -.5px;
}

.page-heading p {
  margin-top: 8px;
  color: #8994a5;
  font-size: 12px;
}

.date-display {
  padding: 10px 14px;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: white;
  color: #64748b;
  font-size: 11px;
}

/* STAT CARDS */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 17px;
  margin-bottom: 23px;
}

.stat-card {
  padding: 21px;
  border: 1px solid #e9edf3;
  border-radius: 11px;
  background: white;
  box-shadow: 0 3px 12px rgba(20,40,70,.025);
}

.stat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #7e899b;
  font-size: 11px;
}

.stat-icon,
.quick-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  font-size: 18px;
}

.blue {
  background: #eaf2ff;
  color: #3478f6;
}

.orange {
  background: #fff4e5;
  color: #e99a24;
}

.green {
  background: #e8f8ef;
  color: #20a56a;
}

.purple {
  background: #f1eaff;
  color: #8960d8;
}

.stat-card h2 {
  margin-top: 19px;
  font-size: 27px;
  letter-spacing: -1px;
}

.stat-card p {
  margin-top: 7px;
  color: #9aa4b3;
  font-size: 10px;
}

/* DASHBOARD CONTENT */

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 20px;
}

.content-card {
  padding: 22px;
  border: 1px solid #e9edf3;
  border-radius: 11px;
  background: white;
  box-shadow: 0 3px 12px rgba(20,40,70,.025);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.card-header h3 {
  font-size: 13px;
}

.card-header p {
  margin-top: 6px;
  color: #99a2b1;
  font-size: 10px;
}

.view-button {
  border: none;
  background: transparent;
  color: #3478f6;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.empty-state {
  min-height: 190px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
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

.empty-state h4 {
  margin-top: 13px;
  color: #475569;
  font-size: 12px;
}

.empty-state p {
  margin-top: 7px;
  color: #9aa4b3;
  font-size: 10px;
}

.compact-empty {
  min-height: 170px;
}

.dashboard-message {
  margin-bottom: 20px;
  padding: 14px 17px;
  border: 1px solid #dce5f2;
  border-radius: 9px;
  background: white;
  color: #52627a;
  font-size: 12px;
}

.error-message {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  border-color: #f1c7c7;
  background: #fff7f7;
  color: #a33434;
}

.error-message button {
  padding: 7px 12px;
  border: 0;
  border-radius: 6px;
  background: #a33434;
  color: white;
  cursor: pointer;
}

.table-wrap {
  width: 100%;
  margin-top: 18px;
  overflow-x: auto;
}

.dashboard-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  white-space: nowrap;
}

.dashboard-table th {
  padding: 9px 10px;
  border-bottom: 1px solid #edf0f5;
  color: #8994a5;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
}

.dashboard-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #f0f2f6;
  color: #52627a;
  font-size: 10px;
}

.dashboard-table tr:last-child td {
  border-bottom: 0;
}

.dashboard-table td strong,
.dashboard-table td small {
  display: block;
}

.dashboard-table td strong {
  max-width: 180px;
  overflow: hidden;
  color: #344054;
  font-size: 10px;
  text-overflow: ellipsis;
}

.dashboard-table td small {
  margin-top: 5px;
  color: #98a2b3;
  font-size: 9px;
}

.status-badge {
  display: inline-block;
  padding: 5px 8px;
  border-radius: 99px;
  background: #f1f3f6;
  color: #667085;
  font-size: 9px;
  text-transform: capitalize;
}

.status-approved {
  background: #e8f8ef;
  color: #168552;
}

.status-pending {
  background: #fff4e5;
  color: #b7791f;
}

.status-rejected,
.status-disabled {
  background: #fff0f0;
  color: #b54747;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 20px;
}

.chart-list {
  display: grid;
  gap: 15px;
  margin-top: 22px;
}

.bar-row {
  min-width: 0;
}

.bar-label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 7px;
  color: #52627a;
  font-size: 10px;
}

.bar-label span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-label strong {
  color: #344054;
  font-size: 10px;
}

.bar-track {
  height: 7px;
  overflow: hidden;
  border-radius: 99px;
  background: #eef1f6;
}

.bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width .25s ease;
}

.blue-fill {
  background: #3478f6;
}

.green-fill {
  background: #20a56a;
}

.purple-fill {
  background: #8960d8;
}

.orange-fill {
  background: #e99a24;
}

.red-fill {
  background: #d65b5b;
}

.gray-fill {
  background: #98a2b3;
}

.chart-empty {
  padding: 32px 10px;
  color: #98a2b3;
  font-size: 11px;
  text-align: center;
}

.activity-card {
  margin-bottom: 20px;
}

.activity-list {
  margin-top: 12px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 13px 3px;
  border-bottom: 1px solid #f0f2f6;
}

.activity-item:last-child {
  border-bottom: 0;
}

.activity-dot {
  width: 9px;
  height: 9px;
  margin-top: 4px;
  flex: 0 0 9px;
  border-radius: 50%;
  background: #3478f6;
  box-shadow: 0 0 0 4px #eaf2ff;
}

.activity-copy {
  min-width: 0;
  flex: 1;
}

.activity-copy strong {
  color: #344054;
  font-size: 11px;
}

.activity-copy p,
.activity-copy small {
  display: block;
  margin-top: 5px;
  overflow-wrap: anywhere;
  color: #8792a4;
  font-size: 10px;
}

.activity-item time {
  flex: 0 0 auto;
  color: #98a2b3;
  font-size: 9px;
}

/* QUICK ACCESS */

.quick-access {
  margin-bottom: 20px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 13px;
  margin-top: 22px;
}

.quick-grid button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
  padding: 17px;
  border: 1px solid #edf0f5;
  border-radius: 9px;
  background: white;
  text-align: left;
  cursor: pointer;
  transition: .2s;
}

.quick-grid button:hover {
  border-color: #b6ccf5;
  background: #f8faff;
  transform: translateY(-2px);
}

.quick-grid strong {
  color: #344054;
  font-size: 11px;
}

.quick-grid small {
  color: #9aa4b3;
  font-size: 9px;
}

/* PLACEHOLDER */

.module-placeholder {
  min-height: 450px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  border: 1px solid #e9edf3;
  border-radius: 12px;
  background: white;
  text-align: center;
}

.placeholder-icon {
  width: 65px;
  height: 65px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  background: #eaf2ff;
  color: #3478f6;
  font-size: 29px;
}

.module-placeholder h1 {
  margin-top: 20px;
  font-size: 23px;
}

.module-placeholder p {
  max-width: 400px;
  margin-top: 10px;
  color: #8994a5;
  font-size: 12px;
  line-height: 1.7;
}

.module-placeholder button {
  margin-top: 23px;
  padding: 11px 17px;
  border: none;
  border-radius: 7px;
  background: #3478f6;
  color: white;
  font-size: 11px;
  cursor: pointer;
}

/* FOOTER */

.main-footer {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 20px 35px;
  border-top: 1px solid #e9edf3;
  background: white;
  color: #9aa4b3;
  font-size: 10px;
}

/* RESPONSIVE */

.sidebar-overlay {
  display: none;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 750px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: 255px;
    min-height: 100vh;
    transform: translateX(-100%);
    transition: transform .25s ease;
  }

  .sidebar.sidebar-open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    position: fixed;
    inset: 0;
    display: block;
    background: rgba(0,0,0,.35);
    z-index: 10;
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

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 500px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .stat-card {
    padding: 15px;
  }

  .stat-card h2 {
    font-size: 23px;
  }

  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .quick-grid {
    grid-template-columns: 1fr 1fr;
  }

  .main-footer {
    flex-direction: column;
    padding: 17px 20px;
  }

  .topbar p {
    max-width: 210px;
  }
}
</style>
