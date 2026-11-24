<template>
  <AdminLayout active="dashboard" title="Dashboard" :subtitle="`Overview of the Return of Service program · ${currentDate}`">
    <template #actions>
      <button class="btn btn-ghost btn-icon" type="button" title="Refresh" aria-label="Refresh dashboard" :disabled="loading" @click="loadDashboard">
        <AppIcon name="refresh" />
      </button>
      <router-link class="btn btn-primary btn-sm new-announcement" to="/admin/workflows/announcements">
        <AppIcon name="megaphone" :size="16" /> <span>New announcement</span>
      </router-link>
    </template>

    <div v-if="errorMessage" class="alert alert-error" role="alert">
      <AppIcon name="alert-circle" />
      <div class="alert-body">{{ errorMessage }}</div>
      <button class="btn btn-sm btn-secondary" type="button" @click="loadDashboard">Retry</button>
    </div>

    <div v-else-if="loading" class="loading-state" role="status">
      <span class="spinner"></span>
      <span>Loading live dashboard data…</span>
    </div>

    <div v-else class="page">
      <section>
        <h2 class="section-title">Needs your attention</h2>
        <div class="attention-grid">
          <router-link
            v-for="item in attentionItems"
            :key="item.label"
            :to="item.to"
            class="attention-card"
            :class="{ quiet: !Number(item.value) }"
          >
            <span class="stat-icon" :class="Number(item.value) ? 'tone-amber' : 'tone-gray'"><AppIcon :name="item.icon" /></span>
            <div class="attention-copy">
              <strong>{{ formatNumber(item.value) }}</strong>
              <span>{{ item.label }}</span>
            </div>
            <span class="attention-cta">
              {{ Number(item.value) ? 'Review' : 'All clear' }}
              <AppIcon v-if="Number(item.value)" name="arrow-right" :size="15" />
            </span>
          </router-link>
        </div>
      </section>

      <section>
        <h2 class="section-title">Program overview</h2>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-label">Students <span class="stat-icon tone-blue"><AppIcon name="users" /></span></div>
            <div class="stat-value">{{ formatNumber(stats.totalStudents) }}</div>
            <div class="stat-meta">{{ formatNumber(stats.approvedStudents) }} approved · {{ formatNumber(stats.rejectedStudents) }} rejected</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Finished program <span class="stat-icon tone-violet"><AppIcon name="award" /></span></div>
            <div class="stat-value">{{ formatNumber(stats.completedStudents) }}</div>
            <div class="stat-meta">Reached the 340-hour requirement</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Hours completed <span class="stat-icon tone-green"><AppIcon name="clock" /></span></div>
            <div class="stat-value">{{ formatNumber(stats.completedHours) }}<small>hrs</small></div>
            <div class="stat-meta">Approved attendance and adjustments</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Completion rate <span class="stat-icon tone-blue"><AppIcon name="trending-up" /></span></div>
            <div class="stat-value">{{ completionRate }}<small>%</small></div>
            <div class="stat-meta">Of approved students</div>
          </div>
        </div>
      </section>

      <div class="grid-2">
        <section class="card">
          <div class="card-header">
            <div><h3>Recent registrations</h3><p>Latest student accounts</p></div>
            <router-link class="btn btn-link btn-sm" to="/admin/students">View all</router-link>
          </div>
          <div v-if="recentRegistrations.length" class="table-wrap card-divider spaced">
            <table class="table">
              <thead><tr><th>Student</th><th>Program</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="student in recentRegistrations" :key="student.id">
                  <td>
                    <div class="person">
                      <span class="avatar avatar-sm">{{ initialsOf(student.full_name) }}</span>
                      <div><span class="cell-strong truncate">{{ student.full_name }}</span><span class="cell-sub">{{ student.student_id || '—' }}</span></div>
                    </div>
                  </td>
                  <td class="nowrap">{{ student.course || '—' }}<span class="cell-sub">Year {{ student.year_level || '—' }}<template v-if="student.section"> · {{ student.section }}</template></span></td>
                  <td class="nowrap">
                    <span :class="badgeClass(student.account_status)">{{ titleCase(student.account_status) }}</span>
                    <span class="cell-sub">{{ formatDate(student.registration_date) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state compact">
            <span class="empty-state-icon"><AppIcon name="users" :size="22" /></span>
            <h4>No registrations yet</h4>
            <p>New student accounts will appear here.</p>
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <div><h3>Pending attendance</h3><p>Submissions waiting for review</p></div>
            <router-link class="btn btn-link btn-sm" to="/admin/workflows/attendance">Review all</router-link>
          </div>
          <div v-if="pendingAttendance.length" class="table-wrap card-divider spaced">
            <table class="table">
              <thead><tr><th>Student</th><th>Service day</th><th class="num-head">Hours</th></tr></thead>
              <tbody>
                <tr v-for="record in pendingAttendance" :key="record.id">
                  <td>
                    <div class="person">
                      <span class="avatar avatar-sm">{{ initialsOf(record.student_name) }}</span>
                      <div><span class="cell-strong truncate">{{ record.student_name }}</span><span class="cell-sub">{{ record.student_id || '—' }}</span></div>
                    </div>
                  </td>
                  <td class="nowrap">{{ formatDate(record.attendance_date) }}<span class="cell-sub">{{ formatTimeRange(record.time_in, record.time_out, '—') }}</span></td>
                  <td class="cell-num num-cell">{{ formatNumber(record.total_hours) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state compact">
            <span class="empty-state-icon"><AppIcon name="check-check" :size="22" /></span>
            <h4>All caught up</h4>
            <p>New attendance submissions will appear here.</p>
          </div>
        </section>
      </div>

      <div class="grid-2">
        <section class="card">
          <div class="card-header"><div><h3>Service-hour completion</h3><p>Students by progress toward 340 hours</p></div></div>
          <div class="card-body">
            <SegmentedBar :segments="serviceHourSeries" unit="students" />
          </div>
        </section>

        <section class="card">
          <div class="card-header"><div><h3>Attendance decisions</h3><p>Status of every attendance submission</p></div></div>
          <div class="card-body">
            <SegmentedBar :segments="attendanceSeries" unit="submissions" />
          </div>
        </section>

        <section class="card">
          <div class="card-header"><div><h3>Students by course</h3><p>Registered student distribution</p></div></div>
          <div class="card-body">
            <BarList v-if="distributions.courses.length" :items="distributions.courses" unit="students" />
            <p v-else class="chart-empty">No course data available.</p>
          </div>
        </section>

        <section class="card">
          <div class="card-header"><div><h3>Students by year level</h3><p>Registered student distribution</p></div></div>
          <div class="card-body">
            <BarList v-if="distributions.yearLevels.length" :items="distributions.yearLevels" unit="students" />
            <p v-else class="chart-empty">No year-level data available.</p>
          </div>
        </section>
      </div>

      <section class="card">
        <div class="card-header"><div><h3>Recent activity</h3><p>Registrations and administrator actions</p></div></div>
        <ul v-if="recentActivities.length" class="list timeline">
          <li v-for="activity in recentActivities" :key="activity.id" class="list-item">
            <span class="list-icon" :class="activityStyle(activity.action).tone"><AppIcon :name="activityStyle(activity.action).icon" :size="17" /></span>
            <div class="list-item-body">
              <p class="list-item-title">{{ actionLabel(activity.action) }}</p>
              <p class="list-item-text">
                <template v-if="activity.student_name">{{ activity.student_name }}</template>
                <template v-if="activity.student_name && activity.actor_name"> · by </template>
                <template v-if="activity.actor_name">{{ activity.actor_name }}</template>
              </p>
              <p v-if="activity.reason" class="activity-reason">“{{ activity.reason }}”</p>
            </div>
            <time class="activity-time" :title="formatDateTime(activity.created_at)">{{ timeAgo(activity.created_at) }}</time>
          </li>
        </ul>
        <div v-else class="empty-state compact">
          <span class="empty-state-icon"><AppIcon name="activity" :size="22" /></span>
          <h4>No recent activity</h4>
          <p>Actions taken by administrators will be logged here.</p>
        </div>
      </section>
    </div>
  </AdminLayout>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import AppIcon from '@/components/AppIcon.vue'
import {
  badgeClass, formatDate, formatDateTime, formatNumber, formatTimeRange, timeAgo, titleCase
} from '@/utils/format'
import { initialsOf, readSession } from '@/utils/session'

const router = useRouter()
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

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

// Status colors validated for adjacent-pair color-vision separation; every
// segment is also labelled with its name and value in the legend.
const serviceHourSeries = computed(() => [
  { label: 'Completed', total: distributions.value.serviceHours.completed, color: '#16a36f' },
  { label: 'In progress', total: distributions.value.serviceHours.inProgress, color: '#2563eb' },
  { label: 'Not started', total: distributions.value.serviceHours.notStarted, color: '#94a0b2' }
])
const attendanceSeries = computed(() => [
  { label: 'Approved', total: distributions.value.attendance.approved, color: '#16a36f' },
  { label: 'Pending', total: distributions.value.attendance.pending, color: '#d4860b' },
  { label: 'Rejected', total: distributions.value.attendance.rejected, color: '#d93a2f' }
])
const attentionItems = computed(() => [
  { label: 'Pending registrations', value: stats.value.pendingRegistrations, icon: 'user-plus', to: '/admin/students?status=pending' },
  { label: 'Attendance to review', value: stats.value.pendingAttendance, icon: 'clipboard-check', to: '/admin/workflows/attendance' },
  { label: 'Documents to review', value: stats.value.pendingDocuments, icon: 'file-text', to: '/admin/workflows/documents' }
])
const completionRate = computed(() => {
  const approved = Number(stats.value.approvedStudents) || 0
  if (!approved) return 0
  return Math.round((Number(stats.value.completedStudents) || 0) / approved * 100)
})
const currentDate = new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())

function share(value, items) {
  const total = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
  return total ? Math.round(((Number(value) || 0) / total) * 100) : 0
}

// Horizontal bars for one measure across categories. One hue, so no legend;
// each row carries its own label and value.
const BarList = defineComponent({
  props: { items: { type: Array, required: true }, unit: { type: String, default: '' } },
  setup(props) {
    return () => {
      const maximum = Math.max(0, ...props.items.map(item => Number(item.total) || 0))
      return h('ul', { class: 'bar-list' }, props.items.map(item => {
        const amount = Number(item.total) || 0
        const width = maximum && amount ? Math.max(2, (amount / maximum) * 100) : 0
        const tip = `${item.label}: ${formatNumber(amount)} ${props.unit} (${share(amount, props.items)}%)`
        return h('li', { class: 'bar-row', title: tip }, [
          h('span', { class: 'bar-label' }, item.label),
          h('span', { class: 'bar-track' }, [h('span', { class: 'bar-fill', style: { width: `${width}%` } })]),
          h('span', { class: 'bar-value' }, [formatNumber(amount), h('small', `${share(amount, props.items)}%`)])
        ])
      }))
    }
  }
})

// A single 100% bar split into parts, with a legend that names every part.
const SegmentedBar = defineComponent({
  props: { segments: { type: Array, required: true }, unit: { type: String, default: '' } },
  setup(props) {
    return () => {
      const total = props.segments.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
      const visible = props.segments.filter(item => Number(item.total) > 0)
      return h('div', { class: 'segmented-chart' }, [
        h('div', { class: 'segment-headline' }, [
          h('strong', formatNumber(total)),
          h('span', ` ${props.unit} total`)
        ]),
        h('div', { class: 'segment-track', role: 'img', 'aria-label': props.segments.map(item => `${item.label} ${formatNumber(item.total)}`).join(', ') },
          total
            ? visible.map(item => h('span', {
              class: 'segment',
              title: `${item.label}: ${formatNumber(item.total)} ${props.unit} (${share(item.total, props.segments)}%)`,
              style: { flexGrow: Number(item.total), background: item.color }
            }))
            : [h('span', { class: 'segment segment-empty' })]
        ),
        h('ul', { class: 'segment-legend' }, props.segments.map(item => h('li', [
          h('span', { class: 'swatch', style: { background: item.color } }),
          h('span', { class: 'legend-label' }, item.label),
          h('strong', formatNumber(item.total)),
          h('span', { class: 'legend-share' }, `${share(item.total, props.segments)}%`)
        ])))
      ])
    }
  }
})

function actionLabel(action) {
  return titleCase(action || 'System event')
}

function activityStyle(action = '') {
  const text = String(action).toLowerCase()
  if (text.includes('reject')) return { icon: 'x-circle', tone: 'tone-red' }
  if (text.includes('disable')) return { icon: 'ban', tone: 'tone-red' }
  if (text.includes('approv') || text.includes('enable')) return { icon: 'check-circle', tone: 'tone-green' }
  if (text.includes('regist')) return { icon: 'user-plus', tone: 'tone-blue' }
  if (text.includes('password')) return { icon: 'key', tone: 'tone-violet' }
  if (text.includes('hour') || text.includes('adjust')) return { icon: 'clock', tone: 'tone-violet' }
  if (text.includes('announce')) return { icon: 'megaphone', tone: 'tone-amber' }
  return { icon: 'activity', tone: 'tone-gray' }
}

async function loadDashboard() {
  const session = readSession('admin')
  if (!session) {
    router.replace('/login')
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    const response = await fetch(`${API_URL}/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${session.token}` }
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

onMounted(loadDashboard)
</script>

<style scoped>
.section-title { margin: 0 0 12px; color: var(--text-2); font-size: 14px; font-weight: 650; }
.spaced { margin-top: 14px; }
.num-head, .num-cell { text-align: right; }
.truncate { display: block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.list-icon { display: grid; place-items: center; width: 36px; height: 36px; flex: 0 0 auto; border-radius: 10px; }

/* Needs-attention cards */
.attention-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.attention-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid #f3dfb6;
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, #fffaf0, #fff);
  color: inherit;
  text-decoration: none;
  box-shadow: var(--shadow-xs);
  transition: box-shadow .15s ease, transform .15s ease, border-color .15s ease;
}
.attention-card:hover { border-color: #ebc77d; box-shadow: var(--shadow-md); transform: translateY(-1px); }
.attention-card.quiet { border-color: var(--border); background: var(--surface); }
.attention-card.quiet:hover { border-color: var(--border-strong); }
.attention-copy { flex: 1; min-width: 0; }
.attention-copy strong { display: block; color: var(--text); font-size: 24px; font-weight: 700; line-height: 1.15; font-variant-numeric: tabular-nums; }
.attention-copy span { display: block; color: var(--text-3); font-size: 13px; font-weight: 500; }
.attention-cta { display: inline-flex; align-items: center; gap: 4px; color: var(--warning); font-size: 13px; font-weight: 600; white-space: nowrap; }
.quiet .attention-cta { color: var(--text-4); }

/* Bar list */
:deep(.bar-list) { display: grid; gap: 14px; margin: 0; padding: 0; list-style: none; }
:deep(.bar-row) { display: grid; grid-template-columns: minmax(70px, 120px) minmax(0, 1fr) 72px; align-items: center; gap: 14px; }
:deep(.bar-label) { overflow: hidden; color: var(--text-2); font-size: 13px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
:deep(.bar-track) { height: 10px; overflow: hidden; border-radius: 4px; background: var(--surface-3); }
:deep(.bar-fill) { display: block; height: 100%; border-radius: 4px; background: var(--primary); transition: width .4s ease; }
:deep(.bar-row:hover .bar-fill) { background: var(--primary-hover); }
:deep(.bar-value) { color: var(--text); font-size: 13px; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
:deep(.bar-value small) { margin-left: 6px; color: var(--text-4); font-size: 12px; font-weight: 500; }

/* Segmented bar */
:deep(.segment-headline) { margin-bottom: 12px; color: var(--text-3); font-size: 13px; }
:deep(.segment-headline strong) { color: var(--text); font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
:deep(.segment-track) { display: flex; gap: 2px; height: 14px; }
:deep(.segment) { min-width: 4px; border-radius: 4px; transition: filter .15s ease; }
:deep(.segment:hover) { filter: brightness(0.92); }
:deep(.segment-empty) { flex: 1; background: var(--surface-3); }
:deep(.segment-legend) { display: grid; gap: 10px; margin: 18px 0 0; padding: 0; list-style: none; }
:deep(.segment-legend li) { display: flex; align-items: center; gap: 10px; color: var(--text-2); font-size: 13px; }
:deep(.swatch) { width: 10px; height: 10px; flex: 0 0 auto; border-radius: 3px; }
:deep(.legend-label) { flex: 1; }
:deep(.segment-legend strong) { color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }
:deep(.legend-share) { width: 40px; color: var(--text-4); text-align: right; font-variant-numeric: tabular-nums; }
.chart-empty { margin: 0; padding: 24px 0; color: var(--text-3); font-size: 13px; text-align: center; }

/* Activity timeline */
.timeline { margin-top: 8px; }
.activity-reason { margin: 4px 0 0; color: var(--text-3); font-size: 13px; font-style: italic; overflow-wrap: anywhere; }
.activity-time { flex: 0 0 auto; color: var(--text-4); font-size: 12px; white-space: nowrap; }

@media (max-width: 1100px) {
  .attention-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .new-announcement span { display: none; }
  :deep(.bar-row) { grid-template-columns: 80px minmax(0, 1fr) 64px; gap: 10px; }
}
</style>
