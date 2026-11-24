<template>
  <AppShell
    brand-subtitle="Student Portal"
    :sections="sections"
    :active-id="activeModule"
    :title="activeMeta.title"
    :subtitle="activeMeta.subtitle"
    :user-name="displayName"
    user-role="Student"
    :user-meta="studentNumber || 'Student'"
    :user-initials="initials"
    @navigate="selectModule"
  >
    <template #actions>
      <button
        class="btn btn-ghost btn-icon bell-button"
        type="button"
        :aria-label="unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'"
        @click="selectModule('notifications')"
      >
        <AppIcon name="bell" :size="20" />
        <span v-if="unreadCount" class="bell-count">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </button>
    </template>

    <div v-if="pageError" class="alert alert-error page-alert" role="alert">
      <AppIcon name="alert-circle" />
      <div class="alert-body">{{ pageError }}</div>
      <button class="btn btn-sm btn-secondary" type="button" @click="loadModule()">Try again</button>
    </div>

    <div v-if="loading" class="loading-state" role="status">
      <span class="spinner"></span>
      <span>Loading your information…</span>
    </div>

    <template v-else>
      <!-- DASHBOARD -->
      <div v-if="activeModule === 'dashboard'" class="page">
        <section class="hero">
          <div class="hero-main">
            <p class="hero-eyebrow">Return of Service Program</p>
            <h2>{{ greeting }}, {{ firstName }}</h2>
            <p class="hero-text">{{ heroMessage }}</p>
            <div class="hero-chips">
              <span v-if="profileSummary.student_id" class="hero-chip"><AppIcon name="user" :size="14" />{{ profileSummary.student_id }}</span>
              <span v-if="profileSummary.course" class="hero-chip"><AppIcon name="graduation-cap" :size="14" />{{ profileSummary.course }}</span>
              <span v-if="profileSummary.year_level || profileSummary.section" class="hero-chip">
                Year {{ profileSummary.year_level || '—' }} · Section {{ profileSummary.section || '—' }}
              </span>
            </div>
            <div class="button-row hero-actions">
              <button class="btn hero-primary" type="button" @click="selectModule('attendance')">
                <AppIcon name="plus" :size="16" /> Log attendance
              </button>
              <button class="btn hero-secondary" type="button" @click="selectModule('activities')">
                Browse activities <AppIcon name="arrow-right" :size="16" />
              </button>
            </div>
          </div>

          <div
            class="hero-ring"
            role="progressbar"
            :aria-valuenow="completion"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label="Service hour completion"
          >
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle class="ring-track" cx="60" cy="60" r="52" />
              <circle
                class="ring-fill"
                cx="60"
                cy="60"
                r="52"
                :stroke-dasharray="RING_LENGTH"
                :stroke-dashoffset="RING_LENGTH * (1 - completion / 100)"
              />
            </svg>
            <div class="ring-label">
              <strong>{{ completion }}%</strong>
              <span>{{ formatHours(progress.completedHours) }} / {{ progress.requiredHours ?? 340 }} hrs</span>
            </div>
          </div>
        </section>

        <div class="stat-grid cols-3">
          <div class="stat-card">
            <div class="stat-label">Completed hours <span class="stat-icon tone-green"><AppIcon name="check-circle" /></span></div>
            <div class="stat-value">{{ formatHours(progress.completedHours) }}<small>hrs</small></div>
            <div class="stat-meta">Approved attendance and adjustments</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Remaining hours <span class="stat-icon tone-amber"><AppIcon name="hourglass" /></span></div>
            <div class="stat-value">{{ formatHours(progress.remainingHours) }}<small>hrs</small></div>
            <div class="stat-meta">Left to reach {{ progress.requiredHours ?? 340 }} hours</div>
          </div>
          <button class="stat-card" type="button" @click="selectModule('notifications')">
            <div class="stat-label">Unread notifications <span class="stat-icon tone-violet"><AppIcon name="bell" /></span></div>
            <div class="stat-value">{{ unreadCount }}</div>
            <div class="stat-meta">Open notifications →</div>
          </button>
        </div>

        <div class="grid-2">
          <section class="card">
            <div class="card-header">
              <div><h3>Recent attendance</h3><p>Your latest submissions and decisions</p></div>
              <button class="btn btn-link btn-sm" type="button" @click="selectModule('attendance')">View all</button>
            </div>
            <div v-if="!dashboard?.recentAttendance?.length" class="empty-state compact">
              <span class="empty-state-icon"><AppIcon name="clipboard-check" :size="22" /></span>
              <h4>No attendance yet</h4>
              <p>Log your first service day to start counting hours.</p>
            </div>
            <ul v-else class="list list-spaced">
              <li v-for="record in dashboard.recentAttendance" :key="record.id" class="list-item">
                <div class="date-tile"><span>{{ dateParts(record.attendance_date).month }}</span><strong>{{ dateParts(record.attendance_date).day }}</strong></div>
                <div class="list-item-body">
                  <p class="list-item-title">{{ formatHours(record.total_hours) }} hours</p>
                  <div class="list-item-meta"><AppIcon name="clock" :size="14" />{{ formatTimeRange(record.time_in, record.time_out, '—') }}</div>
                </div>
                <span :class="badgeClass(record.status)">{{ titleCase(record.status) }}</span>
              </li>
            </ul>
          </section>

          <section class="card">
            <div class="card-header">
              <div><h3>Recent service activities</h3><p>Your submitted service records</p></div>
              <button class="btn btn-link btn-sm" type="button" @click="selectModule('activities')">Browse</button>
            </div>
            <div v-if="!dashboard?.recentActivities?.length" class="empty-state compact">
              <span class="empty-state-icon"><AppIcon name="calendar-check" :size="22" /></span>
              <h4>No service activities yet</h4>
              <p>Register for a published activity to get started.</p>
            </div>
            <ul v-else class="list list-spaced">
              <li v-for="activity in dashboard.recentActivities" :key="activity.id" class="list-item">
                <span class="list-icon tone-blue"><AppIcon name="activity" :size="18" /></span>
                <div class="list-item-body">
                  <p class="list-item-title">{{ activity.activity_description }}</p>
                  <div class="list-item-meta">
                    {{ formatDate(activity.service_date) }}<span class="dot">·</span>{{ formatHours(activity.total_hours) }} hrs
                    <template v-if="activity.service_area"><span class="dot">·</span>{{ activity.service_area }}</template>
                  </div>
                </div>
                <span :class="badgeClass(activity.status)">{{ titleCase(activity.status) }}</span>
              </li>
            </ul>
          </section>

          <section class="card span-full">
            <div class="card-header">
              <div><h3>Latest announcements</h3><p>Updates for you and your section</p></div>
              <button class="btn btn-link btn-sm" type="button" @click="selectModule('announcements')">View all</button>
            </div>
            <div v-if="!dashboard?.announcements?.length" class="empty-state compact">
              <span class="empty-state-icon"><AppIcon name="megaphone" :size="22" /></span>
              <h4>No announcements</h4>
              <p>You're all caught up.</p>
            </div>
            <ul v-else class="list list-spaced">
              <li v-for="announcement in dashboard.announcements" :key="announcement.id" class="list-item">
                <span class="list-icon tone-amber"><AppIcon name="megaphone" :size="18" /></span>
                <div class="list-item-body">
                  <p class="list-item-title">{{ announcement.title }}</p>
                  <p class="list-item-text clamp-2">{{ announcement.content }}</p>
                  <div class="list-item-meta">{{ formatDate(announcement.created_at) }}<span class="dot">·</span>{{ announcement.author || 'Administrator' }}</div>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <!-- ATTENDANCE -->
      <div v-else-if="activeModule === 'attendance'" class="page">
        <section class="card">
          <div class="card-header">
            <div><h3>Log a service day</h3><p>Submit each day you served. An administrator reviews it before the hours count.</p></div>
          </div>
          <form class="card-body" @submit.prevent="submitAttendance">
            <div class="form-grid cols-4">
              <label class="field">
                <span class="field-label">Date</span>
                <input v-model="attendanceForm.attendance_date" type="date" :max="localDateString()" required>
              </label>
              <label class="field">
                <span class="field-label">Time in</span>
                <input v-model="attendanceForm.time_in" type="time" required>
              </label>
              <label class="field">
                <span class="field-label">Time out</span>
                <input v-model="attendanceForm.time_out" type="time" required>
              </label>
              <label class="field">
                <span class="field-label">Related activity <span class="optional">(optional)</span></span>
                <select v-model="attendanceForm.activity_id">
                  <option value="">General service</option>
                  <option v-for="activity in approvedActivities" :key="activity.id" :value="activity.id">{{ activity.title }}</option>
                </select>
              </label>
            </div>
            <div class="photo-grid">
              <PhotoPicker
                v-model="attendancePhotos.before"
                label="Before photo"
                name="before"
                hint="The area before you started"
                :required="photosRequired"
                :disabled="saving"
              />
              <PhotoPicker
                v-model="attendancePhotos.after"
                label="After photo"
                name="after"
                hint="The same area after you finished"
                :required="photosRequired"
                :disabled="saving"
              />
            </div>
            <div class="submit-row">
              <div class="hours-preview" :class="{ empty: !attendanceHoursPreview || photosMissing }">
                <AppIcon :name="attendanceHoursPreview && photosMissing ? 'camera' : 'clock'" :size="16" />
                <span v-if="attendanceHoursPreview && photosMissing">Add a before and after photo for this activity</span>
                <span v-else-if="attendanceHoursPreview"><strong>{{ attendanceHoursPreview }}</strong> will be submitted</span>
                <span v-else-if="attendanceForm.time_in && attendanceForm.time_out">Time out must be after time in</span>
                <span v-else>Enter your time in and time out</span>
              </div>
              <button class="btn btn-primary" type="submit" :disabled="saving || !attendanceHoursPreview || photosMissing">
                <span v-if="saving" class="spinner spinner-sm"></span>
                {{ saving ? 'Submitting…' : 'Submit for review' }}
              </button>
            </div>
            <p class="form-note">Only approved attendance counts toward your hours. Activity attendance needs a before and after photo. You can have one pending or approved record per date; a rejected date can be submitted again.</p>
          </form>
        </section>

        <section class="card">
          <div class="card-header">
            <div><h3>Attendance history</h3><p>Administrator remarks appear once a record is reviewed.</p></div>
            <div class="summary-chip"><AppIcon name="check-circle" :size="15" /> {{ formatHours(approvedAttendanceHours) }} approved hrs</div>
          </div>
          <form class="card-body toolbar" @submit.prevent="runFilter(loadAttendance)">
            <label class="field">
              <span class="field-label">Status</span>
              <select v-model="attendanceFilters.status" @change="runFilter(loadAttendance)">
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label class="field"><span class="field-label">From</span><input v-model="attendanceFilters.from" type="date"></label>
            <label class="field"><span class="field-label">To</span><input v-model="attendanceFilters.to" type="date"></label>
            <label class="field grow">
              <span class="field-label">Search</span>
              <span class="input-icon"><AppIcon name="search" :size="16" /><input v-model="attendanceFilters.search" type="search" placeholder="Date or remarks"></span>
            </label>
            <div class="button-row">
              <button class="btn btn-secondary" type="submit" :disabled="filtering">Apply</button>
              <button v-if="hasFilters(attendanceFilters)" class="btn btn-ghost" type="button" @click="resetFilters(attendanceFilters, loadAttendance)">Reset</button>
            </div>
          </form>
          <div class="table-wrap card-divider">
            <table class="table">
              <thead><tr><th>Date</th><th>Activity</th><th>Time</th><th>Hours</th><th>Photos</th><th>Status</th><th>Admin remarks</th></tr></thead>
              <tbody>
                <tr v-for="record in attendance" :key="record.id">
                  <td class="cell-strong nowrap">{{ formatDate(record.attendance_date) }}</td>
                  <td>{{ record.activity_title || 'General service' }}</td>
                  <td class="nowrap">{{ formatTimeRange(record.time_in, record.time_out, '—') }}</td>
                  <td class="cell-num">{{ formatHours(record.total_hours) }}</td>
                  <td class="nowrap">
                    <div v-if="Number(record.has_before_photo) || Number(record.has_after_photo)" class="photo-pair">
                      <template v-for="kind in ['before', 'after']" :key="kind">
                        <AuthPhoto
                          v-if="Number(record[`has_${kind}_photo`])"
                          :src="`${API_URL}/student/attendance/${encodeURIComponent(record.id)}/photos/${kind}`"
                          :token="token"
                          :label="`${titleCase(kind)} photo`"
                          :caption="titleCase(kind)"
                          :subtitle="`${record.activity_title || 'General service'} · ${formatDate(record.attendance_date)}`"
                        />
                      </template>
                    </div>
                    <span v-else class="muted">—</span>
                  </td>
                  <td><span :class="badgeClass(record.status)">{{ titleCase(record.status) }}</span></td>
                  <td class="cell-wrap muted">{{ record.admin_remarks || '—' }}</td>
                </tr>
                <tr v-if="attendance.length === 0" class="table-empty">
                  <td colspan="7">
                    <div class="empty-state compact">
                      <span class="empty-state-icon"><AppIcon name="clipboard-check" :size="22" /></span>
                      <h4>No attendance records</h4>
                      <p>{{ hasFilters(attendanceFilters) ? 'Nothing matches these filters.' : 'Records you submit will appear here.' }}</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- ACTIVITIES -->
      <div v-else-if="activeModule === 'activities'" class="page">
        <form class="toolbar search-bar" @submit.prevent="runFilter(loadActivities)">
          <label class="field grow">
            <span class="sr-only">Search activities</span>
            <span class="input-icon"><AppIcon name="search" :size="16" /><input v-model="activitySearchInput" type="search" placeholder="Search by title, area, or location"></span>
          </label>
          <button class="btn btn-secondary" type="submit" :disabled="filtering">Search</button>
        </form>

        <div v-if="activities.length === 0" class="card">
          <div class="empty-state">
            <span class="empty-state-icon"><AppIcon name="calendar-check" :size="22" /></span>
            <h4>No activities found</h4>
            <p>{{ activitySearchInput ? 'Try a different search.' : 'Published service activities will appear here.' }}</p>
          </div>
        </div>
        <div v-else class="activity-grid">
          <article v-for="activity in activities" :key="activity.id" class="card activity-card">
            <div class="card-body activity-body">
              <div class="activity-top">
                <span class="eyebrow">{{ activity.service_area }}</span>
                <span v-if="Number(activity.is_completed)" class="badge badge-completed">Completed</span>
                <span v-else-if="activity.registration_status === 'approved' && hasEnded(activity)" class="badge badge-completed">Done</span>
                <span v-else-if="activity.registration_status" :class="badgeClass(activity.registration_status)">
                  {{ registrationLabel(activity.registration_status) }}
                </span>
              </div>
              <h3>{{ activity.title }}</h3>
              <p class="activity-description">{{ activity.description }}</p>
              <ul class="meta-list">
                <li><AppIcon name="calendar" :size="16" /><span>{{ formatSchedule(activity.scheduled_start, activity.scheduled_end) }}</span></li>
                <li><AppIcon name="map-pin" :size="16" /><span>{{ activity.location || activity.area_location || 'Location to be announced' }}</span></li>
                <li><AppIcon name="clock" :size="16" /><span>{{ formatHours(activity.required_hours) }} service hours</span></li>
                <li v-if="activity.eligibility"><AppIcon name="shield" :size="16" /><span>{{ activity.eligibility }}</span></li>
              </ul>
              <div v-if="activity.capacity !== null" class="capacity">
                <div class="capacity-label">
                  <span>{{ spotsLeft(activity) }} of {{ activity.capacity }} spots left</span>
                  <span>{{ activity.registration_count }} registered</span>
                </div>
                <div class="progress"><div class="progress-fill" :class="{ full: spotsLeft(activity) === 0 }" :style="{ width: `${capacityPercent(activity)}%` }"></div></div>
              </div>
            </div>
            <div class="card-footer">
              <span class="registration-state">
                <template v-if="hasEnded(activity)"><AppIcon name="lock" :size="14" /> Activity done</template>
                <template v-else-if="!Number(activity.registration_open)"><AppIcon name="lock" :size="14" /> Registration closed</template>
                <template v-else-if="!canRegister(activity)"><AppIcon name="clock" :size="14" /> Already started</template>
                <template v-else><span class="open-dot"></span> Registration open</template>
              </span>
              <button
                v-if="!activity.registration_status || ['rejected', 'cancelled'].includes(activity.registration_status)"
                class="btn btn-primary btn-sm"
                type="button"
                :disabled="saving || !Number(activity.registration_open) || !canRegister(activity)"
                @click="registerActivity(activity)"
              >
                {{ activity.registration_status ? 'Register again' : 'Register' }}
              </button>
              <button
                v-else-if="activity.registration_status === 'pending'"
                class="btn btn-secondary btn-sm"
                type="button"
                :disabled="saving"
                @click="cancelActivity(activity)"
              >
                Cancel registration
              </button>
              <button
                v-else-if="needsAttendance(activity)"
                class="btn btn-primary btn-sm"
                type="button"
                @click="logActivityAttendance(activity)"
              >
                <AppIcon name="clipboard-check" :size="15" /> Log attendance
              </button>
              <span v-else-if="activity.registration_status === 'approved' && Number(activity.has_attendance)" class="approved-note">
                <AppIcon name="check" :size="16" /> {{ Number(activity.is_completed) ? 'Hours approved' : 'Attendance submitted' }}
              </span>
              <span v-else-if="activity.registration_status === 'approved'" class="approved-note"><AppIcon name="check" :size="16" /> You're registered</span>
            </div>
          </article>
        </div>
      </div>

      <!-- SERVICE HOURS -->
      <div v-else-if="activeModule === 'hours'" class="page">
        <section class="card hours-summary">
          <div class="card-body">
            <div class="hours-summary-top">
              <div>
                <p class="eyebrow">Overall progress</p>
                <p class="hours-big"><strong>{{ formatHours(hoursData?.progress?.completedHours) }}</strong> of {{ hoursData?.progress?.requiredHours ?? 340 }} hours</p>
              </div>
              <span class="hours-percent">{{ hoursData?.progress?.completionPercentage ?? 0 }}%</span>
            </div>
            <div class="progress progress-lg" role="progressbar" :aria-valuenow="hoursCompletion" aria-valuemin="0" aria-valuemax="100">
              <div class="progress-fill" :style="{ width: `${hoursCompletion}%` }"></div>
            </div>
            <div class="hours-split">
              <div><span class="legend-dot done"></span>Completed <strong>{{ formatHours(hoursData?.progress?.completedHours) }} hrs</strong></div>
              <div><span class="legend-dot left"></span>Remaining <strong>{{ formatHours(hoursData?.progress?.remainingHours) }} hrs</strong></div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <div><h3>Hour history</h3><p>Pending and rejected attendance don't count toward your total.</p></div>
          </div>
          <form class="card-body toolbar" @submit.prevent="runFilter(loadHours)">
            <label class="field"><span class="field-label">From</span><input v-model="hoursFilters.from" type="date"></label>
            <label class="field"><span class="field-label">To</span><input v-model="hoursFilters.to" type="date"></label>
            <label class="field">
              <span class="field-label">Status</span>
              <select v-model="hoursFilters.status" @change="runFilter(loadHours)">
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label class="field grow">
              <span class="field-label">Search</span>
              <span class="input-icon"><AppIcon name="search" :size="16" /><input v-model="hoursFilters.search" type="search" placeholder="Activity, source, remarks"></span>
            </label>
            <div class="button-row">
              <button class="btn btn-secondary" type="submit" :disabled="filtering">Apply</button>
              <button v-if="hasFilters(hoursFilters)" class="btn btn-ghost" type="button" @click="resetFilters(hoursFilters, loadHours)">Reset</button>
            </div>
          </form>
          <div class="table-wrap card-divider">
            <table class="table">
              <thead><tr><th>Date</th><th>Activity / reason</th><th>Source</th><th>Hours</th><th>Counted</th><th>Status</th><th>Remarks</th></tr></thead>
              <tbody>
                <tr v-for="entry in hoursData?.history || []" :key="`${entry.source}-${entry.id}`">
                  <td class="cell-strong nowrap">{{ formatDate(entry.history_date) }}</td>
                  <td class="cell-wrap">{{ entry.activity || '—' }}</td>
                  <td class="nowrap">{{ titleCase(entry.source.replace('_', ' ')) }}</td>
                  <td class="cell-num">{{ formatHours(entry.hours) }}</td>
                  <td class="cell-num counted" :class="{ zero: !Number(entry.counted_hours), negative: Number(entry.counted_hours) < 0 }">{{ Number(entry.counted_hours) > 0 ? '+' : '' }}{{ formatHours(entry.counted_hours) }}</td>
                  <td><span :class="badgeClass(entry.status)">{{ titleCase(entry.status) }}</span></td>
                  <td class="cell-wrap muted">{{ entry.remarks || '—' }}</td>
                </tr>
                <tr v-if="!hoursData?.history?.length" class="table-empty">
                  <td colspan="7">
                    <div class="empty-state compact">
                      <span class="empty-state-icon"><AppIcon name="clock" :size="22" /></span>
                      <h4>No service-hour history</h4>
                      <p>{{ hasFilters(hoursFilters) ? 'Nothing matches these filters.' : 'Approved attendance and adjustments will be listed here.' }}</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- DOCUMENTS -->
      <div v-else-if="activeModule === 'documents'" class="page">
        <section ref="uploadCard" class="card">
          <div class="card-header">
            <div><h3>Submit a document</h3><p>PDF, JPEG, PNG, or WebP, up to 5 MB. Only you and administrators can open it.</p></div>
          </div>
          <form class="card-body" @submit.prevent="submitDocument">
            <div class="form-grid cols-2">
              <label class="field">
                <span class="field-label">Document type</span>
                <input v-model="documentForm.document_type" maxlength="100" required placeholder="e.g. Service agreement">
              </label>
              <label class="field">
                <span class="field-label">Description <span class="optional">(optional)</span></span>
                <input v-model="documentForm.description" maxlength="1000" placeholder="Add a short description">
              </label>
              <label
                class="dropzone span-full"
                :class="{ dragging: dragActive, chosen: documentForm.file }"
                @dragenter.prevent="dragActive = true"
                @dragover.prevent="dragActive = true"
                @dragleave.prevent="dragActive = false"
                @drop.prevent="onFileDrop"
              >
                <input
                  ref="documentFileInput"
                  class="sr-only"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  @change="chooseDocumentFile($event.target.files?.[0] || null)"
                >
                <span class="dropzone-icon"><AppIcon :name="documentForm.file ? 'file-text' : 'upload'" :size="22" /></span>
                <span v-if="documentForm.file" class="dropzone-copy">
                  <strong>{{ documentForm.file.name }}</strong>
                  <span>{{ formatBytes(documentForm.file.size) }} · Click to choose a different file</span>
                </span>
                <span v-else class="dropzone-copy">
                  <strong>Click to choose a file <span class="muted">or drag it here</span></strong>
                  <span>PDF, JPEG, PNG, or WebP · max 5 MB</span>
                </span>
              </label>
            </div>
            <div class="form-actions form-actions-top">
              <button v-if="documentForm.file" class="btn btn-ghost" type="button" :disabled="saving" @click="clearDocumentFile">Remove file</button>
              <button class="btn btn-primary" type="submit" :disabled="saving || !documentForm.file">
                <span v-if="saving" class="spinner spinner-sm"></span>
                <AppIcon v-else name="upload" :size="16" />
                {{ saving ? 'Uploading…' : 'Upload document' }}
              </button>
            </div>
          </form>
        </section>

        <section class="card">
          <div class="card-header">
            <div><h3>Submitted documents</h3><p>Follow the review status of each file you've sent.</p></div>
          </div>
          <div v-if="documents.length === 0" class="empty-state">
            <span class="empty-state-icon"><AppIcon name="file-text" :size="22" /></span>
            <h4>No documents yet</h4>
            <p>Documents you upload will be listed here with their review status.</p>
          </div>
          <div v-else class="table-wrap card-divider spaced-top">
            <table class="table">
              <thead><tr><th>Document</th><th>Submitted</th><th>Review</th><th class="cell-actions">Actions</th></tr></thead>
              <tbody>
                <tr v-for="document in documents" :key="document.id">
                  <td class="doc-cell">
                    <div class="person">
                      <span class="file-icon"><AppIcon name="file-text" :size="18" /></span>
                      <div><span class="cell-strong doc-name" :title="document.document_name">{{ document.document_name }}</span><span class="cell-sub">{{ document.document_type || 'Document' }}</span></div>
                    </div>
                  </td>
                  <td class="nowrap">{{ formatDate(document.submitted_at) }}</td>
                  <td class="cell-wrap">
                    <span :class="badgeClass(document.status)">{{ titleCase(document.status) }}</span>
                    <span v-if="document.admin_remarks" class="cell-sub review-remark">{{ document.admin_remarks }}</span>
                  </td>
                  <td class="cell-actions">
                    <div class="button-row">
                      <button v-if="document.status === 'rejected'" class="btn btn-secondary btn-sm" type="button" @click="prepareReplacement(document)">
                        <AppIcon name="upload" :size="15" /> Replace
                      </button>
                      <button class="btn btn-ghost btn-sm btn-icon" type="button" :aria-label="`Download ${document.document_name}`" title="Download" @click="downloadDocument(document)">
                        <AppIcon name="download" :size="16" />
                      </button>
                      <button v-if="document.can_delete" class="btn btn-danger-ghost btn-sm btn-icon" type="button" :aria-label="`Delete ${document.document_name}`" title="Delete" @click="deleteDocument(document)">
                        <AppIcon name="trash" :size="15" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- ANNOUNCEMENTS -->
      <div v-else-if="activeModule === 'announcements'" class="page narrow-page">
        <form class="toolbar search-bar" @submit.prevent="runFilter(loadAnnouncements)">
          <label class="field grow">
            <span class="sr-only">Search announcements</span>
            <span class="input-icon"><AppIcon name="search" :size="16" /><input v-model="announcementSearch" type="search" placeholder="Search title or content"></span>
          </label>
          <button class="btn btn-secondary" type="submit" :disabled="filtering">Search</button>
        </form>

        <div v-if="announcements.length === 0" class="card">
          <div class="empty-state">
            <span class="empty-state-icon"><AppIcon name="megaphone" :size="22" /></span>
            <h4>No announcements</h4>
            <p>{{ announcementSearch ? 'Nothing matches your search.' : 'Updates from your administrators will appear here.' }}</p>
          </div>
        </div>
        <article v-for="announcement in announcements" :key="announcement.id" class="card announcement-card">
          <div class="card-body">
            <div class="announcement-head">
              <span class="avatar avatar-sm">{{ initialsOf(announcement.author || 'Administrator', 'A') }}</span>
              <div>
                <strong>{{ announcement.author || 'Administrator' }}</strong>
                <span>{{ formatDate(announcement.created_at) }}</span>
              </div>
            </div>
            <h3>{{ announcement.title }}</h3>
            <p class="announcement-content">{{ announcement.content }}</p>
          </div>
        </article>
      </div>

      <!-- NOTIFICATIONS -->
      <div v-else-if="activeModule === 'notifications'" class="page narrow-page">
        <div class="page-header">
          <div class="segmented" role="group" aria-label="Filter notifications">
            <button
              v-for="option in notificationOptions"
              :key="option.value"
              type="button"
              :class="{ active: notificationFilter === option.value }"
              :aria-pressed="notificationFilter === option.value"
              @click="setNotificationFilter(option.value)"
            >
              {{ option.label }}<template v-if="option.value === 'unread' && unreadCount"> ({{ unreadCount }})</template>
            </button>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" :disabled="!unreadCount || saving" @click="markAllNotificationsRead">
            <AppIcon name="check-check" :size="16" /> Mark all as read
          </button>
        </div>

        <section class="card">
          <div v-if="notifications.length === 0" class="empty-state">
            <span class="empty-state-icon"><AppIcon name="bell" :size="22" /></span>
            <h4>{{ notificationFilter === 'unread' ? 'No unread notifications' : 'No notifications' }}</h4>
            <p>You're all caught up.</p>
          </div>
          <ul v-else class="list">
            <li
              v-for="notification in notifications"
              :key="notification.id"
              class="list-item notification-item"
              :class="{ unread: !Number(notification.is_read) }"
            >
              <span class="list-icon" :class="notificationTone(notification.title)">
                <AppIcon :name="notificationIcon(notification.title)" :size="18" />
              </span>
              <div class="list-item-body">
                <p class="list-item-title">{{ notification.title }}</p>
                <p class="list-item-text">{{ notification.message }}</p>
                <div class="list-item-meta">{{ timeAgo(notification.created_at) }}</div>
                <button
                  v-if="isActivityDoneNotice(notification)"
                  class="btn btn-secondary btn-sm notice-action"
                  type="button"
                  @click="selectModule('activities')"
                >
                  <AppIcon name="clipboard-check" :size="15" /> Log attendance
                </button>
              </div>
              <button
                v-if="!Number(notification.is_read)"
                class="btn btn-link btn-sm"
                type="button"
                @click="markNotificationRead(notification)"
              >
                Mark read
              </button>
            </li>
          </ul>
        </section>
      </div>

      <!-- PROFILE -->
      <div v-else-if="activeModule === 'profile'" class="page">
        <div v-if="profile" class="profile-layout">
          <section class="card profile-summary">
            <div class="card-body">
              <span class="avatar avatar-lg">{{ initials }}</span>
              <h3>{{ displayName }}</h3>
              <p>{{ profile.email }}</p>
              <span :class="badgeClass(profile.account_status)">{{ titleCase(profile.account_status) }}</span>
            </div>
            <dl class="profile-facts">
              <div><dt>Student ID</dt><dd>{{ profile.student_id || '—' }}</dd></div>
              <div><dt>Course</dt><dd>{{ profile.course || '—' }}</dd></div>
              <div><dt>Year &amp; section</dt><dd>Year {{ profile.year_level || '—' }} · {{ profile.section || '—' }}</dd></div>
              <div><dt>Member since</dt><dd>{{ formatDate(profile.registration_date) }}</dd></div>
            </dl>
          </section>

          <section class="card">
            <div class="card-header">
              <div><h3>Personal details</h3><p>You can update your name and contact number.</p></div>
            </div>
            <form class="card-body" @submit.prevent="saveProfile">
              <div class="form-grid cols-2">
                <label class="field"><span class="field-label">First name</span><input v-model="profileForm.first_name" maxlength="100" required autocomplete="given-name"></label>
                <label class="field"><span class="field-label">Middle name <span class="optional">(optional)</span></span><input v-model="profileForm.middle_name" maxlength="100" autocomplete="additional-name"></label>
                <label class="field"><span class="field-label">Last name</span><input v-model="profileForm.last_name" maxlength="100" required autocomplete="family-name"></label>
                <label class="field"><span class="field-label">Contact number</span><input v-model="profileForm.contact_number" maxlength="100" autocomplete="tel" placeholder="e.g. 0917 123 4567"></label>
                <label class="field span-full">
                  <span class="field-label">Email</span>
                  <input :value="profile.email" disabled>
                  <span class="field-hint">Contact your administrator to change your email or academic details.</span>
                </label>
              </div>
              <div class="form-actions form-actions-top">
                <button class="btn btn-secondary" type="button" :disabled="saving || !profileDirty" @click="resetProfileForm">Discard changes</button>
                <button class="btn btn-primary" type="submit" :disabled="saving || !profileDirty">
                  <span v-if="saving" class="spinner spinner-sm"></span>
                  Save changes
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      <!-- SETTINGS -->
      <div v-else-if="activeModule === 'settings'" class="page">
        <div class="grid-2 settings-grid">
          <section class="card">
            <div class="card-header">
              <div><h3>Change password</h3><p>Use at least 8 characters. You'll stay signed in on this browser.</p></div>
            </div>
            <form class="card-body stacked-form" @submit.prevent="changePassword">
              <label class="field"><span class="field-label">Current password</span><input v-model="passwordForm.currentPassword" type="password" autocomplete="current-password" required></label>
              <label class="field"><span class="field-label">New password</span><input v-model="passwordForm.newPassword" type="password" minlength="8" autocomplete="new-password" required></label>
              <label class="field">
                <span class="field-label">Confirm new password</span>
                <input v-model="passwordForm.confirmPassword" type="password" minlength="8" autocomplete="new-password" required>
                <span v-if="passwordMismatch" class="field-hint field-error">Passwords don't match yet.</span>
              </label>
              <div class="form-actions">
                <button class="btn btn-primary" type="submit" :disabled="saving || passwordMismatch">
                  <span v-if="saving" class="spinner spinner-sm"></span>
                  Update password
                </button>
              </div>
            </form>
          </section>

          <section class="card">
            <div class="card-header">
              <div><h3>Account &amp; session</h3><p>Details about how you're signed in.</p></div>
            </div>
            <div class="card-body">
              <dl class="detail-list single">
                <div><dt>Signed in as</dt><dd>{{ profile?.email || dashboard?.profile?.email || sessionUser?.email || '—' }}</dd></div>
                <div><dt>Account status</dt><dd><span :class="badgeClass(profile?.account_status || dashboard?.profile?.account_status)">{{ titleCase(profile?.account_status || dashboard?.profile?.account_status) }}</span></dd></div>
                <div><dt>This browser</dt><dd>{{ sessionIsPersistent ? 'Remembered — you stay signed in after closing the browser' : 'Temporary — you are signed out when this tab closes' }}</dd></div>
              </dl>
            </div>
            <div class="card-footer">
              <span>Done for now?</span>
              <button class="btn btn-danger-soft" type="button" @click="logout"><AppIcon name="log-out" :size="16" /> Sign out</button>
            </div>
          </section>
        </div>
      </div>
    </template>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import AppShell from '@/components/AppShell.vue'
import AuthPhoto from '@/components/AuthPhoto.vue'
import PhotoPicker from '@/components/PhotoPicker.vue'
import { confirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { localDateString, parseApiDate } from '@/utils/dates'
import {
  badgeClass, dateParts, formatDate, formatHours, formatSchedule, formatTimeRange, timeAgo, titleCase
} from '@/utils/format'
import { clearSession, fullName, initialsOf, readSession } from '@/utils/session'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const RING_LENGTH = 2 * Math.PI * 52
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
const ACCEPTED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

const router = useRouter()
const route = useRoute()
const toast = useToast()

const moduleMeta = {
  dashboard: { title: 'Dashboard', subtitle: 'Your Return of Service progress at a glance' },
  attendance: { title: 'Attendance', subtitle: 'Submit service days and follow their review' },
  hours: { title: 'Service Hours', subtitle: 'Approved hours and adjustments toward your requirement' },
  activities: { title: 'Service Activities', subtitle: 'Browse published activities and manage registrations' },
  documents: { title: 'Documents', subtitle: 'Submit documents and check their review status' },
  announcements: { title: 'Announcements', subtitle: 'Updates for all students and your section' },
  notifications: { title: 'Notifications', subtitle: 'Decisions and updates about your account' },
  profile: { title: 'My Profile', subtitle: 'Your personal and academic details' },
  settings: { title: 'Settings', subtitle: 'Password and session' }
}
const notificationOptions = [
  { value: '', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' }
]

const token = ref('')
const sessionUser = ref(null)
const sessionIsPersistent = ref(false)
const loading = ref(false)
const saving = ref(false)
const filtering = ref(false)
const pageError = ref('')
const dashboard = ref(null)
const attendance = ref([])
const approvedAttendanceHours = ref(0)
const activities = ref([])
const hoursData = ref(null)
const documents = ref([])
const announcements = ref([])
const notifications = ref([])
const unreadCount = ref(0)
const profile = ref(null)
const activitySearchInput = ref('')
const announcementSearch = ref('')
const notificationFilter = ref('')
const attendanceFilters = reactive({ status: '', from: '', to: '', search: '' })
const hoursFilters = reactive({ status: '', from: '', to: '', search: '' })
const attendanceForm = reactive({
  attendance_date: localDateString(),
  time_in: '',
  time_out: '',
  activity_id: ''
})
// Before and after photos for the attendance form; required when an activity is selected.
const attendancePhotos = reactive({ before: null, after: null })
const photosRequired = computed(() => Boolean(attendanceForm.activity_id))
const photosMissing = computed(() => photosRequired.value && (!attendancePhotos.before || !attendancePhotos.after))
const documentForm = reactive({ document_type: '', description: '', file: null })
const documentFileInput = ref(null)
const uploadCard = ref(null)
const dragActive = ref(false)
const profileForm = reactive({ first_name: '', middle_name: '', last_name: '', contact_number: '' })
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })

const activeModule = computed(() => (route.query.tab in moduleMeta ? route.query.tab : 'dashboard'))
const activeMeta = computed(() => moduleMeta[activeModule.value])

const sections = computed(() => [
  { label: '', items: [{ id: 'dashboard', label: 'Dashboard', icon: 'dashboard' }] },
  {
    label: 'My service',
    items: [
      { id: 'attendance', label: 'Attendance', icon: 'clipboard-check' },
      { id: 'hours', label: 'Service Hours', icon: 'clock' },
      { id: 'activities', label: 'Activities', icon: 'calendar-check' },
      { id: 'documents', label: 'Documents', icon: 'file-text' }
    ]
  },
  {
    label: 'Updates',
    items: [
      { id: 'announcements', label: 'Announcements', icon: 'megaphone' },
      { id: 'notifications', label: 'Notifications', icon: 'bell', badge: unreadCount.value || '' }
    ]
  },
  {
    label: 'Account',
    items: [
      { id: 'profile', label: 'My Profile', icon: 'user' },
      { id: 'settings', label: 'Settings', icon: 'settings' }
    ]
  }
])

const person = computed(() => profile.value || dashboard.value?.profile || sessionUser.value)
const displayName = computed(() => fullName(person.value, 'Student'))
const firstName = computed(() => person.value?.first_name || 'Student')
const initials = computed(() => {
  const value = person.value
  return `${value?.first_name?.charAt(0) || 'S'}${value?.last_name?.charAt(0) || ''}`.toUpperCase()
})
const studentNumber = computed(() => person.value?.student_id || '')
const profileSummary = computed(() => dashboard.value?.profile || {})
const progress = computed(() => dashboard.value?.progress || {})
const completion = computed(() => Math.min(100, Math.max(0, Number(progress.value.completionPercentage) || 0)))
const hoursCompletion = computed(() => Math.min(100, Math.max(0, Number(hoursData.value?.progress?.completionPercentage) || 0)))
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})
const heroMessage = computed(() => {
  const required = progress.value.requiredHours ?? 340
  if (completion.value >= 100) return `You've completed all ${required} required service hours. Well done!`
  if (!Number(progress.value.completedHours)) return `You're just getting started. Log your service days to work toward ${required} hours.`
  return `You've completed ${formatHours(progress.value.completedHours)} of ${required} hours — ${formatHours(progress.value.remainingHours)} to go.`
})
const approvedActivities = computed(() =>
  activities.value.filter(activity => activity.registration_status === 'approved' && !Number(activity.has_attendance))
)
const attendanceHoursPreview = computed(() => {
  if (!attendanceForm.time_in || !attendanceForm.time_out) return ''
  const start = attendanceForm.time_in.split(':').map(Number)
  const end = attendanceForm.time_out.split(':').map(Number)
  const minutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1])
  return minutes > 0 ? `${(minutes / 60).toFixed(2)} hours` : ''
})
const profileDirty = computed(() => {
  const value = profile.value
  if (!value) return false
  return ['first_name', 'middle_name', 'last_name', 'contact_number']
    .some(key => (profileForm[key] || '') !== (value[key] || ''))
})
const passwordMismatch = computed(() =>
  Boolean(passwordForm.confirmPassword) && passwordForm.newPassword !== passwordForm.confirmPassword
)

function errorText(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${token.value}`)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (options.responseType === 'blob') {
    if (!response.ok) {
      let errorData
      try { errorData = await response.json() } catch { errorData = null }
      if (response.status === 401 || response.status === 403) router.replace('/login')
      throw new Error(errorData?.message || 'The document could not be downloaded.')
    }
    return response.blob()
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('The server returned an invalid response.')
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) router.replace('/login')
    throw new Error(data.message || 'The request could not be completed.')
  }
  return data
}

function getSession() {
  const session = readSession('student')
  if (!session) {
    router.replace('/login')
    return false
  }
  token.value = session.token
  sessionUser.value = session.user
  sessionIsPersistent.value = session.persistent
  return true
}

function setProfileForm(value) {
  profileForm.first_name = value?.first_name || ''
  profileForm.middle_name = value?.middle_name || ''
  profileForm.last_name = value?.last_name || ''
  profileForm.contact_number = value?.contact_number || ''
}

async function loadSummary() {
  dashboard.value = await request('/student/dashboard')
  unreadCount.value = dashboard.value.unreadNotificationCount
}

async function loadModule(module = activeModule.value) {
  pageError.value = ''
  loading.value = true
  try {
    if (module === 'dashboard') {
      await loadSummary()
    } else if (module === 'attendance') {
      await Promise.all([loadAttendance(), loadActivities()])
    } else if (module === 'activities') {
      await loadActivities()
    } else if (module === 'hours') {
      await loadHours()
    } else if (module === 'documents') {
      const data = await request('/student/documents')
      documents.value = data.documents
    } else if (module === 'announcements') {
      await loadAnnouncements()
    } else if (module === 'notifications') {
      await loadNotifications()
    } else if (module === 'profile' || module === 'settings') {
      const data = await request('/student/profile')
      profile.value = data.profile
      setProfileForm(data.profile)
    }
  } catch (error) {
    pageError.value = errorText(error, 'Failed to load this section.')
  } finally {
    loading.value = false
  }
}

function selectModule(module) {
  if (module === activeModule.value) {
    loadModule(module)
    return
  }
  router.push({ query: module === 'dashboard' ? {} : { tab: module } })
}

function buildQuery(filters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  return params.toString()
}

function hasFilters(filters) {
  return Object.values(filters).some(Boolean)
}

async function runFilter(loader) {
  filtering.value = true
  try {
    await loader()
  } catch (error) {
    toast.error(errorText(error, 'The list could not be updated.'))
  } finally {
    filtering.value = false
  }
}

function resetFilters(filters, loader) {
  Object.keys(filters).forEach(key => { filters[key] = '' })
  runFilter(loader)
}

async function loadAttendance() {
  const query = buildQuery(attendanceFilters)
  const data = await request(`/student/attendance${query ? `?${query}` : ''}`)
  attendance.value = data.attendance
  approvedAttendanceHours.value = data.approvedHours
}

async function submitAttendance() {
  if (saving.value || photosMissing.value) return
  saving.value = true
  try {
    const body = new FormData()
    body.set('attendance_date', attendanceForm.attendance_date)
    body.set('time_in', attendanceForm.time_in)
    body.set('time_out', attendanceForm.time_out)
    if (attendanceForm.activity_id) body.set('activity_id', attendanceForm.activity_id)
    if (attendancePhotos.before) body.set('before_photo', attendancePhotos.before)
    if (attendancePhotos.after) body.set('after_photo', attendancePhotos.after)

    const data = await request('/student/attendance', { method: 'POST', body })
    toast.success(data.message)
    attendanceForm.time_in = ''
    attendanceForm.time_out = ''
    attendanceForm.activity_id = ''
    attendancePhotos.before = null
    attendancePhotos.after = null
    await Promise.all([loadAttendance(), loadActivities()])
  } catch (error) {
    toast.error(errorText(error, 'Attendance could not be submitted.'))
  } finally {
    saving.value = false
  }
}

async function loadActivities() {
  const query = buildQuery({ search: activitySearchInput.value.trim() })
  const data = await request(`/student/activities${query ? `?${query}` : ''}`)
  activities.value = data.activities
}

function canRegister(activity) {
  const start = parseApiDate(activity.scheduled_start)
  return activity.activity_status === 'published' &&
    Number(activity.registration_open) === 1 &&
    start !== null &&
    start > new Date()
}

function hasEnded(activity) {
  const end = parseApiDate(activity.scheduled_end)
  return end !== null && end <= new Date()
}

// After an approved activity ends, the student logs the time they started and finished.
function needsAttendance(activity) {
  return activity.registration_status === 'approved' &&
    activity.activity_status === 'published' &&
    hasEnded(activity) &&
    !Number(activity.has_attendance)
}

function logActivityAttendance(activity) {
  attendanceForm.activity_id = activity.id
  attendanceForm.attendance_date = String(activity.scheduled_start).slice(0, 10)
  attendanceForm.time_in = ''
  attendanceForm.time_out = ''
  attendancePhotos.before = null
  attendancePhotos.after = null
  selectModule('attendance')
}

function spotsLeft(activity) {
  return Math.max(0, Number(activity.capacity) - Number(activity.registration_count))
}

function capacityPercent(activity) {
  const capacity = Number(activity.capacity)
  if (!capacity) return 100
  return Math.min(100, Math.round((Number(activity.registration_count) / capacity) * 100))
}

function registrationLabel(status) {
  return {
    pending: 'Awaiting approval',
    approved: 'Registered',
    rejected: 'Not approved',
    cancelled: 'Cancelled'
  }[status] || titleCase(status)
}

async function registerActivity(activity) {
  if (saving.value) return
  saving.value = true
  try {
    const data = await request(`/student/activities/${encodeURIComponent(activity.id)}/register`, {
      method: 'POST',
      body: JSON.stringify({})
    })
    toast.success(data.message)
    await loadActivities()
  } catch (error) {
    toast.error(errorText(error, 'Activity registration failed.'))
  } finally {
    saving.value = false
  }
}

async function cancelActivity(activity) {
  const { confirmed } = await confirm({
    title: 'Cancel registration?',
    message: `You'll be removed from "${activity.title}". You can register again while registration is open.`,
    confirmLabel: 'Cancel registration',
    cancelLabel: 'Keep it',
    tone: 'danger'
  })
  if (!confirmed) return
  saving.value = true
  try {
    const data = await request(`/student/activities/${encodeURIComponent(activity.id)}/register`, {
      method: 'DELETE'
    })
    toast.success(data.message)
    await loadActivities()
  } catch (error) {
    toast.error(errorText(error, 'Activity registration could not be cancelled.'))
  } finally {
    saving.value = false
  }
}

async function loadHours() {
  const query = buildQuery(hoursFilters)
  hoursData.value = await request(`/student/service-hours${query ? `?${query}` : ''}`)
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function clearDocumentFile() {
  documentForm.file = null
  if (documentFileInput.value) documentFileInput.value.value = ''
}

function chooseDocumentFile(file) {
  if (!file) {
    clearDocumentFile()
    return
  }
  const typeAllowed = ACCEPTED_DOCUMENT_TYPES.includes(file.type) || /\.(pdf|jpe?g|png|webp)$/i.test(file.name)
  if (!typeAllowed) {
    toast.error('Choose a PDF, JPEG, PNG, or WebP file.')
    clearDocumentFile()
    return
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    toast.error('That file is larger than 5 MB.')
    clearDocumentFile()
    return
  }
  documentForm.file = file
}

function onFileDrop(event) {
  dragActive.value = false
  chooseDocumentFile(event.dataTransfer?.files?.[0] || null)
}

async function loadDocuments() {
  const data = await request('/student/documents')
  documents.value = data.documents
}

async function submitDocument() {
  if (saving.value || !documentForm.file) return
  saving.value = true
  try {
    const body = new FormData()
    body.append('document_type', documentForm.document_type)
    body.append('description', documentForm.description)
    body.append('file', documentForm.file)
    const result = await request('/student/documents', { method: 'POST', body })
    toast.success(result.message)
    documentForm.document_type = ''
    documentForm.description = ''
    clearDocumentFile()
    await loadDocuments()
  } catch (error) {
    toast.error(errorText(error, 'Document upload failed.'))
  } finally {
    saving.value = false
  }
}

async function downloadDocument(document) {
  try {
    const file = await request(`/student/documents/${encodeURIComponent(document.id)}/file`, {
      responseType: 'blob'
    })
    const url = URL.createObjectURL(file)
    const link = window.document.createElement('a')
    link.href = url
    link.download = document.document_name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    toast.error(errorText(error, 'Document could not be downloaded.'))
  }
}

async function deleteDocument(document) {
  const { confirmed } = await confirm({
    title: 'Delete document?',
    message: `"${document.document_name}" will be removed. This can't be undone.`,
    confirmLabel: 'Delete',
    tone: 'danger'
  })
  if (!confirmed) return
  saving.value = true
  try {
    const result = await request(`/student/documents/${encodeURIComponent(document.id)}`, { method: 'DELETE' })
    toast.success(result.message)
    await loadDocuments()
  } catch (error) {
    toast.error(errorText(error, 'Document could not be deleted.'))
  } finally {
    saving.value = false
  }
}

function prepareReplacement(document) {
  if (document.document_type) documentForm.document_type = document.document_type
  uploadCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  setTimeout(() => documentFileInput.value?.click(), 350)
}

async function loadAnnouncements() {
  const query = buildQuery({ search: announcementSearch.value.trim() })
  const data = await request(`/student/announcements${query ? `?${query}` : ''}`)
  announcements.value = data.announcements
}

async function loadNotifications() {
  const query = buildQuery({ filter: notificationFilter.value })
  const data = await request(`/student/notifications${query ? `?${query}` : ''}`)
  notifications.value = data.notifications
  unreadCount.value = data.unreadCount
}

function setNotificationFilter(value) {
  notificationFilter.value = value
  runFilter(loadNotifications)
}

function isActivityDoneNotice(notification) {
  return String(notification.title || '').startsWith('Activity done:')
}

function notificationIcon(title = '') {
  const text = title.toLowerCase()
  if (text.startsWith('activity done:')) return 'clipboard-check'
  if (text.includes('reject')) return 'x-circle'
  if (text.includes('approv')) return 'check-circle'
  if (text.includes('announce')) return 'megaphone'
  if (text.includes('assign')) return 'clipboard-list'
  if (text.includes('document')) return 'file-text'
  return 'bell'
}

function notificationTone(title = '') {
  const text = title.toLowerCase()
  if (text.includes('reject')) return 'tone-red'
  if (text.includes('approv')) return 'tone-green'
  if (text.includes('announce')) return 'tone-amber'
  return 'tone-blue'
}

async function markNotificationRead(notification) {
  try {
    await request(`/student/notifications/${encodeURIComponent(notification.id)}/read`, {
      method: 'PATCH',
      body: JSON.stringify({})
    })
    await loadNotifications()
  } catch (error) {
    toast.error(errorText(error, 'Notification could not be updated.'))
  }
}

async function markAllNotificationsRead() {
  saving.value = true
  try {
    await request('/student/notifications/read-all', {
      method: 'PATCH',
      body: JSON.stringify({})
    })
    toast.success('All notifications marked as read.')
    await loadNotifications()
  } catch (error) {
    toast.error(errorText(error, 'Notifications could not be updated.'))
  } finally {
    saving.value = false
  }
}

async function saveProfile() {
  saving.value = true
  try {
    const result = await request('/student/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileForm)
    })
    toast.success(result.message)
    const refreshed = await request('/student/profile')
    profile.value = refreshed.profile
    setProfileForm(refreshed.profile)
    if (dashboard.value) {
      dashboard.value.profile = { ...dashboard.value.profile, ...refreshed.profile }
    }
  } catch (error) {
    toast.error(errorText(error, 'Profile could not be updated.'))
  } finally {
    saving.value = false
  }
}

function resetProfileForm() {
  setProfileForm(profile.value)
}

async function changePassword() {
  if (passwordMismatch.value) return
  saving.value = true
  try {
    const result = await request('/student/change-password', {
      method: 'PATCH',
      body: JSON.stringify(passwordForm)
    })
    toast.success(result.message)
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    toast.error(errorText(error, 'Password could not be changed.'))
  } finally {
    saving.value = false
  }
}

function logout() {
  clearSession()
  router.replace('/login')
}

watch(activeModule, module => {
  if (!token.value) return
  window.scrollTo({ top: 0 })
  loadModule(module)
})

onMounted(() => {
  if (!getSession()) return
  loadModule(activeModule.value)
  // The name, unread count and student ID in the shell come from the dashboard summary.
  if (activeModule.value !== 'dashboard') loadSummary().catch(() => {})
})
</script>

<style scoped>
.page-alert { margin-bottom: 20px; align-items: center; }
.narrow-page { max-width: 860px; }
.dot { color: var(--text-4); }

/* Topbar bell */
.bell-button { position: relative; color: var(--text-2); }
.bell-count {
  position: absolute;
  top: 3px;
  right: 2px;
  min-width: 18px;
  padding: 0 5px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: var(--danger-solid);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 14px;
  text-align: center;
}

/* Hero */
.hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  overflow: hidden;
  padding: 28px 32px;
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at 85% 20%, rgba(96, 165, 250, 0.35), transparent 45%),
    linear-gradient(120deg, #0f2a55 0%, #1d4ed8 100%);
  color: #fff;
  box-shadow: var(--shadow-md);
}
.hero::after {
  content: "";
  position: absolute;
  right: -80px;
  bottom: -120px;
  width: 320px;
  height: 320px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  pointer-events: none;
}
.hero-main { position: relative; z-index: 1; min-width: 0; }
.hero-eyebrow { margin: 0; color: #bfdbfe; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.hero h2 { margin: 8px 0 6px; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
.hero-text { max-width: 560px; margin: 0; color: #dbeafe; font-size: 15px; line-height: 1.6; }
.hero-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #eff6ff;
  font-size: 13px;
  font-weight: 500;
}
.hero-actions { margin-top: 20px; }
.hero-primary { background: #fff; color: #1e3a8a; }
.hero-primary:hover { background: #eff6ff; }
.hero-secondary { border-color: rgba(255, 255, 255, 0.3); color: #fff; }
.hero-secondary:hover { background: rgba(255, 255, 255, 0.1); }

.hero-ring { position: relative; z-index: 1; flex: 0 0 auto; width: 168px; height: 168px; }
.hero-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-track { fill: none; stroke: rgba(255, 255, 255, 0.16); stroke-width: 10; }
.ring-fill { fill: none; stroke: #93c5fd; stroke-width: 10; stroke-linecap: round; transition: stroke-dashoffset .8s ease; }
.ring-label { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ring-label strong { font-size: 32px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
.ring-label span { margin-top: 2px; color: #bfdbfe; font-size: 12px; font-weight: 500; }

/* Lists */
.list-spaced { margin-top: 10px; }
.list-icon { display: grid; place-items: center; width: 38px; height: 38px; flex: 0 0 auto; border-radius: 10px; }

/* Attendance */
.photo-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 18px; }
.photo-pair { display: flex; gap: 8px; }
@media (max-width: 560px) {
  .photo-grid { grid-template-columns: 1fr; }
}
.submit-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin: 18px 0 14px; padding: 12px 14px; border-radius: var(--radius); background: var(--surface-2); }
.hours-preview { display: inline-flex; align-items: center; gap: 8px; color: var(--primary-text); font-size: 14px; }
.hours-preview strong { font-weight: 700; }
.hours-preview.empty { color: var(--text-3); }
.summary-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; background: var(--success-soft); color: var(--success); font-size: 13px; font-weight: 600; white-space: nowrap; }

/* Activities */
.search-bar { max-width: 640px; }
.activity-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.activity-card { display: flex; flex-direction: column; transition: box-shadow .15s ease, border-color .15s ease; }
.activity-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow-md); }
.activity-body { flex: 1; }
.activity-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 24px; }
.activity-top .eyebrow { color: var(--primary-text); }
.activity-card h3 { margin: 8px 0 6px; color: var(--text); font-size: 17px; font-weight: 650; letter-spacing: -0.01em; }
.activity-description { display: -webkit-box; overflow: hidden; margin: 0; color: var(--text-2); font-size: 14px; line-height: 1.6; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.meta-list { display: grid; gap: 8px; margin: 16px 0 0; padding: 0; list-style: none; }
.meta-list li { display: flex; align-items: flex-start; gap: 9px; color: var(--text-2); font-size: 13px; }
.meta-list li svg { margin-top: 1px; color: var(--text-4); }
.capacity { margin-top: 16px; }
.capacity-label { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 6px; color: var(--text-3); font-size: 12px; font-weight: 500; }
.progress-fill.full { background: var(--warning-solid); }
.registration-state { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
.open-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success-solid); box-shadow: 0 0 0 3px var(--success-soft); }
.approved-note { display: inline-flex; align-items: center; gap: 5px; color: var(--success); font-size: 14px; font-weight: 600; }

/* Dashboard stat row has three cards */
.stat-grid.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
@media (max-width: 560px) {
  .stat-grid.cols-3 { grid-template-columns: 1fr; }
}

/* Hours */
.hours-summary-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.hours-big { margin: 4px 0 0; color: var(--text-3); font-size: 15px; }
.hours-big strong { color: var(--text); font-size: 30px; font-weight: 700; letter-spacing: -0.02em; }
.hours-percent { color: var(--primary-text); font-size: 24px; font-weight: 700; }
.hours-split { display: flex; flex-wrap: wrap; gap: 8px 28px; margin-top: 14px; color: var(--text-3); font-size: 13px; }
.hours-split strong { margin-left: 4px; color: var(--text); }
.legend-dot { display: inline-block; width: 10px; height: 10px; margin-right: 7px; border-radius: 3px; vertical-align: -1px; }
.legend-dot.done { background: var(--primary); }
.legend-dot.left { background: var(--surface-3); box-shadow: inset 0 0 0 1px var(--border-strong); }
.counted { color: var(--success); font-weight: 600; }
.counted.zero { color: var(--text-4); font-weight: 400; }
.counted.negative { color: var(--danger); }

/* Documents */
.dropzone {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface-2);
  cursor: pointer;
  transition: border-color .15s ease, background-color .15s ease;
}
.dropzone:hover, .dropzone.dragging { border-color: var(--primary); background: var(--primary-soft); }
.dropzone:focus-within { border-color: var(--primary); box-shadow: var(--ring); }
.dropzone.chosen { border-style: solid; border-color: var(--primary-soft-2); background: var(--primary-soft); }
.dropzone-icon { display: grid; place-items: center; width: 44px; height: 44px; flex: 0 0 auto; border-radius: 12px; background: var(--surface); color: var(--primary); box-shadow: var(--shadow-xs); }
.dropzone-copy { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.dropzone-copy strong { overflow: hidden; color: var(--text); font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.dropzone-copy strong .muted { font-weight: 500; }
.dropzone-copy > span { color: var(--text-3); font-size: 13px; }
.form-actions-top { margin-top: 18px; }
.doc-cell { min-width: 240px; }
.review-remark { margin-top: 6px !important; line-height: 1.45; }
.doc-name { display: block; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-icon { display: grid; place-items: center; width: 36px; height: 36px; flex: 0 0 auto; border-radius: 9px; background: var(--primary-soft); color: var(--primary-text); }
.spaced-top { margin-top: 16px; }

/* Announcements */
.announcement-head { display: flex; align-items: center; gap: 10px; }
.announcement-head strong { display: block; color: var(--text); font-size: 13px; font-weight: 600; }
.announcement-head span:not(.avatar) { display: block; color: var(--text-3); font-size: 12px; }
.announcement-card h3 { margin: 14px 0 6px; color: var(--text); font-size: 17px; font-weight: 650; }
.announcement-content { margin: 0; color: var(--text-2); font-size: 14px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }

/* Notifications */
.notification-item { position: relative; }
.notice-action { margin-top: 10px; }
.notification-item.unread { background: #f7faff; }
.notification-item.unread::before { content: ""; position: absolute; top: 22px; left: 8px; width: 6px; height: 6px; border-radius: 50%; background: var(--primary); }
.notification-item:first-child { border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg); }
.notification-item:last-child { border-bottom-left-radius: var(--radius-lg); border-bottom-right-radius: var(--radius-lg); }
.notification-item:not(.unread) .list-item-title { color: var(--text-2); font-weight: 500; }

/* Profile */
.profile-layout { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 20px; align-items: start; }
.profile-summary .card-body { display: flex; flex-direction: column; align-items: center; text-align: center; }
.profile-summary h3 { margin: 14px 0 2px; color: var(--text); font-size: 18px; font-weight: 700; }
.profile-summary .card-body > p { margin: 0 0 12px; color: var(--text-3); font-size: 14px; overflow-wrap: anywhere; }
.profile-facts { margin: 0; padding: 4px 20px 12px; border-top: 1px solid var(--border); }
.profile-facts div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
.profile-facts div:last-child { border-bottom: 0; }
.profile-facts dt { color: var(--text-3); font-size: 13px; }
.profile-facts dd { margin: 0; color: var(--text); font-size: 13px; font-weight: 600; text-align: right; }

/* Settings */
.settings-grid { align-items: start; }
.stacked-form { display: flex; flex-direction: column; gap: 16px; }
.field-error { color: var(--danger); }
.detail-list.single { grid-template-columns: 1fr; }

@media (max-width: 960px) {
  .profile-layout { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .hero { flex-direction: column-reverse; align-items: flex-start; padding: 22px; }
  .hero h2 { font-size: 22px; }
  .hero-ring { width: 132px; height: 132px; }
  .ring-label strong { font-size: 26px; }
  .activity-grid { grid-template-columns: 1fr; }
  .submit-row .btn { width: 100%; }
}
</style>
