<template>
  <AdminLayout :active="activeTab" :title="activeLabel" :subtitle="activeSubtitle">
    <template #actions>
      <button class="btn btn-ghost btn-icon" type="button" title="Refresh" aria-label="Refresh" :disabled="loading" @click="loadTab">
        <AppIcon name="refresh" />
      </button>
      <button v-if="activeTab === 'activities'" class="btn btn-primary btn-sm" type="button" @click="openActivityForm()">
        <AppIcon name="plus" :size="16" /> New activity
      </button>
      <button v-else-if="activeTab === 'areas'" class="btn btn-primary btn-sm" type="button" @click="openAreaForm()">
        <AppIcon name="plus" :size="16" /> Add area
      </button>
      <button v-else-if="activeTab === 'announcements'" class="btn btn-primary btn-sm" type="button" @click="openAnnouncementForm()">
        <AppIcon name="plus" :size="16" /> New announcement
      </button>
    </template>

    <div v-if="errorMessage" class="alert alert-error page-alert" role="alert">
      <AppIcon name="alert-circle" />
      <div class="alert-body">{{ errorMessage }}</div>
      <button class="btn btn-sm btn-secondary" type="button" @click="loadTab">Try again</button>
    </div>

    <div v-if="loading" class="loading-state" role="status">
      <span class="spinner"></span>
      <span>Loading records…</span>
    </div>

    <template v-else>
      <!-- ATTENDANCE -->
      <div v-if="activeTab === 'attendance'" class="page">
        <section class="card">
          <div class="card-body card-toolbar">
            <StatusFilter v-model="attendanceStatus" :options="reviewStatusOptions" @update:model-value="runFilter(loadAttendance)" />
            <span class="muted count">{{ attendance.length }} {{ attendance.length === 1 ? 'record' : 'records' }}</span>
          </div>
          <div class="table-wrap card-divider">
            <table class="table">
              <thead><tr><th>Student</th><th>Service day</th><th>Activity</th><th>Hours</th><th>Photos</th><th>Status</th><th class="cell-actions">Review</th></tr></thead>
              <tbody>
                <tr v-for="record in attendance" :key="record.id">
                  <td>
                    <div class="person">
                      <span class="avatar avatar-sm">{{ initialsOf(record.student_name) }}</span>
                      <div><span class="cell-strong">{{ record.student_name }}</span><span class="cell-sub">{{ record.student_number || '—' }}</span></div>
                    </div>
                  </td>
                  <td class="nowrap">{{ dateLabel(record.attendance_date) }}<span class="cell-sub">{{ formatTimeRange(record.time_in, record.time_out, '—') }}</span></td>
                  <td>{{ record.activity_title || 'General service' }}</td>
                  <td class="cell-num cell-strong">{{ hours(record.total_hours) }}</td>
                  <td class="nowrap">
                    <div v-if="Number(record.has_before_photo) || Number(record.has_after_photo)" class="photo-pair">
                      <template v-for="kind in ['before', 'after']" :key="kind">
                        <AuthPhoto
                          v-if="Number(record[`has_${kind}_photo`])"
                          :src="`${API_URL}/admin/attendance/${encodeURIComponent(record.id)}/photos/${kind}`"
                          :token="token"
                          :label="`${titleCase(kind)} photo`"
                          :caption="titleCase(kind)"
                          :subtitle="`${record.student_name} · ${record.activity_title || 'General service'} · ${dateLabel(record.attendance_date)}`"
                        />
                      </template>
                    </div>
                    <span v-else class="muted">No photos</span>
                  </td>
                  <td class="cell-wrap">
                    <span :class="badgeClass(record.status)">{{ titleCase(record.status) }}</span>
                    <span v-if="record.admin_remarks" class="cell-sub remark">{{ record.admin_remarks }}</span>
                  </td>
                  <td class="cell-actions">
                    <div v-if="record.status === 'pending'" class="button-row">
                      <button class="btn btn-success-soft btn-sm" type="button" :disabled="saving" @click="reviewAttendance(record, 'approve')"><AppIcon name="check" :size="15" /> Approve</button>
                      <button class="btn btn-danger-soft btn-sm" type="button" :disabled="saving" @click="reviewAttendance(record, 'reject')">Reject</button>
                    </div>
                    <span v-else class="muted">—</span>
                  </td>
                </tr>
                <tr v-if="attendance.length === 0" class="table-empty">
                  <td colspan="7">
                    <EmptyState icon="clipboard-check" :title="attendanceStatus === 'pending' ? 'No attendance waiting for review' : 'No attendance submissions'" text="Submissions from students will appear here." />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- DOCUMENTS -->
      <div v-else-if="activeTab === 'documents'" class="page">
        <section class="card">
          <div class="card-body card-toolbar">
            <StatusFilter v-model="documentStatus" :options="reviewStatusOptions" @update:model-value="runFilter(loadDocuments)" />
            <span class="muted count">{{ documents.length }} {{ documents.length === 1 ? 'document' : 'documents' }}</span>
          </div>
          <div class="table-wrap card-divider">
            <table class="table">
              <thead><tr><th>Document</th><th>Student</th><th>Submitted</th><th>Status</th><th class="cell-actions">Actions</th></tr></thead>
              <tbody>
                <tr v-for="document in documents" :key="document.id">
                  <td>
                    <div class="person">
                      <span class="file-icon"><AppIcon name="file-text" :size="18" /></span>
                      <div><span class="cell-strong doc-name" :title="document.document_name">{{ document.document_name }}</span><span class="cell-sub">{{ document.document_type || 'Document' }}</span></div>
                    </div>
                  </td>
                  <td>{{ document.student_name }}</td>
                  <td class="nowrap">{{ dateLabel(document.submitted_at) }}</td>
                  <td class="cell-wrap">
                    <span :class="badgeClass(document.status)">{{ titleCase(document.status) }}</span>
                    <span v-if="document.admin_remarks" class="cell-sub remark">{{ document.admin_remarks }}</span>
                  </td>
                  <td class="cell-actions">
                    <div class="button-row">
                      <button class="btn btn-ghost btn-sm" type="button" @click="downloadDocument(document)"><AppIcon name="download" :size="15" /> Open</button>
                      <template v-if="document.status === 'pending'">
                        <button class="btn btn-success-soft btn-sm" type="button" :disabled="saving" @click="reviewDocument(document, 'approve')"><AppIcon name="check" :size="15" /> Approve</button>
                        <button class="btn btn-danger-soft btn-sm" type="button" :disabled="saving" @click="reviewDocument(document, 'reject')">Reject</button>
                      </template>
                    </div>
                  </td>
                </tr>
                <tr v-if="documents.length === 0" class="table-empty">
                  <td colspan="5">
                    <EmptyState icon="file-text" :title="documentStatus === 'pending' ? 'No documents waiting for review' : 'No documents found'" text="Files students upload will appear here." />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- SERVICE HOURS -->
      <div v-else-if="activeTab === 'hours'" class="page">
        <section class="card">
          <div class="card-header">
            <div><h3>Record an adjustment</h3><p>Every adjustment needs a reason and is written to the activity log.</p></div>
          </div>
          <form class="card-body" @submit.prevent="createAdjustment">
            <div class="form-grid">
              <label class="field">
                <span class="field-label">Course</span>
                <select v-model="adjustmentPicker.filter.course">
                  <option value="">All courses</option>
                  <option v-for="course in adjustmentPicker.courses" :key="course" :value="course">{{ course }}</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">Year level</span>
                <select v-model="adjustmentPicker.filter.year_level">
                  <option value="">All year levels</option>
                  <option v-for="year in adjustmentPicker.yearLevels" :key="year" :value="year">Year {{ year }}</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">Section</span>
                <select v-model="adjustmentPicker.filter.section">
                  <option value="">All sections</option>
                  <option v-for="section in adjustmentPicker.sections" :key="section.value" :value="section.value">{{ section.label }}</option>
                </select>
              </label>
              <label class="field span-full">
                <span class="field-label">Student</span>
                <select v-model="adjustmentForm.student_id" required :disabled="adjustmentPicker.students.length === 0" @change="runFilter(loadSelectedProgress)">
                  <option value="">{{ adjustmentPicker.students.length ? 'Select a student' : 'No students match' }}</option>
                  <option v-for="student in adjustmentPicker.students" :key="student.id" :value="student.id">{{ student.full_name }} · {{ student.student_id }}</option>
                </select>
                <span v-if="adjustmentPicker.active" class="field-hint">{{ adjustmentPicker.students.length }} of {{ students.length }} students</span>
              </label>

              <div v-if="adjustmentForm.student_id && selectedProgress" class="span-full progress-strip">
                <div class="progress-strip-copy">
                  <span>Current progress</span>
                  <strong>{{ hours(selectedProgress.completedHours) }} of {{ selectedProgress.requiredHours }} hrs</strong>
                  <span class="muted">· {{ hours(selectedProgress.remainingHours) }} remaining</span>
                </div>
                <div class="progress"><div class="progress-fill" :style="{ width: `${Math.min(100, Number(selectedProgress.completionPercentage) || 0)}%` }"></div></div>
              </div>

              <div class="field">
                <span class="field-label">Type</span>
                <div class="segmented type-toggle" role="group" aria-label="Adjustment type">
                  <button type="button" :class="{ active: adjustmentForm.adjustment_type === 'add' }" :aria-pressed="adjustmentForm.adjustment_type === 'add'" @click="adjustmentForm.adjustment_type = 'add'"><AppIcon name="plus" :size="14" /> Add hours</button>
                  <button type="button" :class="{ active: adjustmentForm.adjustment_type === 'deduct' }" :aria-pressed="adjustmentForm.adjustment_type === 'deduct'" @click="adjustmentForm.adjustment_type = 'deduct'"><AppIcon name="minus" :size="14" /> Deduct hours</button>
                </div>
              </div>
              <label class="field">
                <span class="field-label">Hours</span>
                <input v-model.number="adjustmentForm.adjustment_amount" type="number" min="0.01" max="340" step="0.01" required placeholder="0.00">
              </label>
              <div></div>
              <label class="field span-full">
                <span class="field-label">Reason</span>
                <textarea v-model="adjustmentForm.reason" minlength="3" maxlength="500" rows="2" required placeholder="e.g. Carry-over from first semester"></textarea>
              </label>
            </div>
            <div class="form-actions form-actions-top">
              <button class="btn btn-primary" type="submit" :disabled="saving || !adjustmentForm.student_id">
                <span v-if="saving" class="spinner spinner-sm"></span>
                Save adjustment
              </button>
            </div>
          </form>
        </section>

        <section class="card">
          <div class="card-header">
            <div>
              <h3>Adjustment history</h3>
              <p>{{ historyFiltered ? `Showing ${filteredAdjustments.length} of ${adjustments.length} adjustments` : 'Every hour adjustment, newest first.' }}</p>
            </div>
            <button v-if="historyFiltered" class="btn btn-ghost btn-sm" type="button" @click="clearHistoryFilters">Clear filters</button>
          </div>
          <div v-if="adjustments.length" class="card-body">
            <div class="form-grid cols-4">
              <label class="field span-full">
                <span class="sr-only">Search adjustments</span>
                <span class="input-icon">
                  <AppIcon name="search" :size="16" />
                  <input v-model="historySearch" type="search" placeholder="Search by name, student ID or reason" autocomplete="off">
                </span>
              </label>
              <label class="field">
                <span class="field-label">Course</span>
                <select v-model="historyPicker.filter.course">
                  <option value="">All courses</option>
                  <option v-for="course in historyPicker.courses" :key="course" :value="course">{{ course }}</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">Year level</span>
                <select v-model="historyPicker.filter.year_level">
                  <option value="">All year levels</option>
                  <option v-for="year in historyPicker.yearLevels" :key="year" :value="year">Year {{ year }}</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">Section</span>
                <select v-model="historyPicker.filter.section">
                  <option value="">All sections</option>
                  <option v-for="section in historyPicker.sections" :key="section.value" :value="section.value">{{ section.label }}</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">Student</span>
                <select v-model="historyStudentId">
                  <option value="">All students</option>
                  <option v-for="student in historyPicker.students" :key="student.id" :value="student.id">{{ student.full_name }} · {{ student.student_id }}</option>
                </select>
              </label>
            </div>
          </div>
          <div class="table-wrap card-divider spaced">
            <table class="table">
              <thead><tr><th>Date</th><th>Student</th><th>Change</th><th>Reason</th></tr></thead>
              <tbody>
                <tr v-for="adjustment in pagedAdjustments" :key="adjustment.id">
                  <td class="nowrap cell-strong">{{ dateLabel(adjustment.created_at) }}</td>
                  <td>
                    <span class="cell-strong">{{ adjustment.student_name }}</span>
                    <span class="cell-sub">{{ adjustment.student_number }} · {{ studentPlacement(adjustment) }}</span>
                  </td>
                  <td class="nowrap">
                    <span class="delta" :class="adjustment.adjustment_type === 'deduct' ? 'minus' : 'plus'">
                      {{ adjustment.adjustment_type === 'deduct' ? '−' : '+' }}{{ hours(adjustment.adjustment_amount) }} hrs
                    </span>
                  </td>
                  <td class="cell-wrap">{{ adjustment.reason }}</td>
                </tr>
                <tr v-if="filteredAdjustments.length === 0" class="table-empty">
                  <td colspan="4">
                    <EmptyState icon="clock" :title="adjustments.length ? 'No matching adjustments' : 'No adjustments yet'" :text="adjustments.length ? 'Try a different search or filter.' : 'Adjustments you record will be listed here.'" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="filteredAdjustments.length > HISTORY_PAGE_SIZES[0]" class="card-footer">
            <div class="button-row">
              <label class="page-size">
                <span>Rows per page</span>
                <select v-model.number="historyPageSize" class="input">
                  <option v-for="size in HISTORY_PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
                </select>
              </label>
              <span>{{ historyRange.start }}–{{ historyRange.end }} of {{ historyRange.total }}</span>
            </div>
            <div class="button-row">
              <button class="btn btn-secondary btn-sm" type="button" :disabled="historyPage === 1" @click="historyPage--">Previous</button>
              <span>Page {{ historyPage }} of {{ historyPageCount }}</span>
              <button class="btn btn-secondary btn-sm" type="button" :disabled="historyPage === historyPageCount" @click="historyPage++">Next</button>
            </div>
          </div>
        </section>
      </div>

      <!-- ACTIVITIES -->
      <div v-else-if="activeTab === 'activities'" class="page">
        <div v-if="areas.length === 0" class="alert alert-info">
          <AppIcon name="info" />
          <div class="alert-body">You need at least one active service area before creating activities.</div>
          <button class="btn btn-sm btn-secondary" type="button" @click="selectTab('areas')">Add a service area</button>
        </div>

        <section class="card">
          <div class="card-header"><div><h3>Activities</h3><p>Published activities with open registration appear in the student portal. When an activity ends it shows as Done and registered students are notified to log their time. Archive it to move it to Completed activities.</p></div></div>
          <div class="table-wrap card-divider spaced">
            <table class="table">
              <thead><tr><th>Activity</th><th>Schedule</th><th>Registration</th><th>Status</th><th class="cell-actions">Actions</th></tr></thead>
              <tbody>
                <tr v-for="activity in activeActivities" :key="activity.id">
                  <td class="cell-wrap"><span class="cell-strong">{{ activity.title }}</span><span class="cell-sub">{{ activity.service_area }} · {{ hours(activity.required_hours) }} hrs</span></td>
                  <td class="schedule-cell">{{ formatSchedule(activity.scheduled_start, activity.scheduled_end) }}</td>
                  <td class="nowrap">
                    <span class="reg-state" :class="registrationState(activity).tone">{{ registrationState(activity).label }}</span>
                    <span class="cell-sub">{{ activity.registration_count }}{{ activity.capacity !== null && activity.capacity !== undefined ? ` / ${activity.capacity}` : '' }} registered</span>
                  </td>
                  <td class="status-cell">
                    <template v-if="isDone(activity)">
                      <span class="badge badge-completed">Done</span>
                      <span class="cell-sub">Ended {{ timeAgo(activity.scheduled_end) }}<template v-if="activity.ended_notified_at"> · students notified</template></span>
                    </template>
                    <span v-else :class="badgeClass(activity.status)">{{ titleCase(activity.status) }}</span>
                  </td>
                  <td class="cell-actions">
                    <div class="button-row">
                      <button v-if="activity.status !== 'draft'" class="btn btn-ghost btn-sm" type="button" @click="openParticipants(activity)"><AppIcon name="users" :size="15" /> Students</button>
                      <button class="btn btn-secondary btn-sm" type="button" @click="openActivityForm(activity)"><AppIcon name="edit" :size="15" /> Edit</button>
                      <button v-if="canArchive(activity)" class="btn btn-secondary btn-sm" type="button" :disabled="saving" @click="archiveActivity(activity)"><AppIcon name="check-check" :size="15" /> Archive</button>
                      <button v-if="activity.status === 'draft'" class="btn btn-danger-ghost btn-sm btn-icon" type="button" title="Delete draft" :aria-label="`Delete ${activity.title}`" @click="deleteActivity(activity)"><AppIcon name="trash" :size="16" /></button>
                    </div>
                  </td>
                </tr>
                <tr v-if="activeActivities.length === 0" class="table-empty">
                  <td colspan="5">
                    <EmptyState icon="calendar-check" :title="archivedActivities.length ? 'No active activities' : 'No activities yet'" text="Create an activity so students can register for it.">
                      <button class="btn btn-primary btn-sm" type="button" @click="openActivityForm()"><AppIcon name="plus" :size="16" /> New activity</button>
                    </EmptyState>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="archivedActivities.length" class="card">
          <div class="card-header"><div><h3>Completed activities</h3><p>Archived activities are hidden from students. Their student list and logged hours stay on record.</p></div></div>
          <div class="table-wrap card-divider spaced">
            <table class="table">
              <thead><tr><th>Activity</th><th>Schedule</th><th>Students</th><th>Archived</th><th class="cell-actions">Actions</th></tr></thead>
              <tbody>
                <tr v-for="activity in archivedActivities" :key="activity.id">
                  <td class="cell-wrap"><span class="cell-strong">{{ activity.title }}</span><span class="cell-sub">{{ activity.service_area }} · {{ hours(activity.required_hours) }} hrs</span></td>
                  <td class="schedule-cell">{{ formatSchedule(activity.scheduled_start, activity.scheduled_end) }}</td>
                  <td class="nowrap">
                    <span class="cell-strong">{{ activity.approved_count }} approved</span>
                    <span class="cell-sub">{{ hours(activity.approved_hours) }} hrs logged</span>
                  </td>
                  <td class="nowrap">{{ dateLabel(activity.archived_at) }}</td>
                  <td class="cell-actions">
                    <div class="button-row">
                      <button class="btn btn-secondary btn-sm" type="button" @click="openParticipants(activity)"><AppIcon name="users" :size="15" /> Students</button>
                      <button class="btn btn-ghost btn-sm" type="button" :disabled="saving" @click="restoreActivity(activity)"><AppIcon name="rotate-ccw" :size="15" /> Restore</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <div><h3>Service history</h3><p>Every day an activity took place, newest first. Open a day to see who served and their before and after photos.</p></div>
          </div>
          <div v-if="serviceDays.length" class="card-body card-toolbar">
            <div class="history-toolbar">
              <label class="input-icon history-search">
                <span class="sr-only">Search service history</span>
                <AppIcon name="search" :size="16" />
                <input v-model="serviceDaySearch" class="input" type="search" placeholder="Search by activity, area or student" autocomplete="off">
              </label>
              <label>
                <span class="sr-only">Month</span>
                <select v-model="serviceDayMonth" class="input history-month">
                  <option value="">All months</option>
                  <option v-for="month in serviceDayMonths" :key="month.value" :value="month.value">{{ month.label }}</option>
                </select>
              </label>
            </div>
            <span class="muted count">{{ filteredServiceDays.length }} {{ filteredServiceDays.length === 1 ? 'day' : 'days' }}</span>
          </div>
          <div class="table-wrap card-divider" :class="{ spaced: !serviceDays.length }">
            <table class="table">
              <thead><tr><th>Date</th><th>Activity</th><th>Time</th><th>Students</th><th>Photos</th><th class="cell-actions">Details</th></tr></thead>
              <tbody>
                <tr v-for="day in visibleServiceDays" :key="day.key">
                  <td class="nowrap">
                    <div class="person">
                      <div class="date-tile date-tile-sm"><span>{{ dateParts(day.date).month }}</span><strong>{{ dateParts(day.date).day }}</strong></div>
                      <div><span class="cell-strong">{{ weekdayLabel(day.date) }}</span><span class="cell-sub">{{ dateLabel(day.date) }}</span></div>
                    </div>
                  </td>
                  <td class="cell-wrap">
                    <span class="cell-strong">{{ day.activity.title }}</span>
                    <span class="cell-sub">{{ activityPlace(day.activity) }}</span>
                  </td>
                  <td class="nowrap">{{ activityTimes(day.activity) }}</td>
                  <td class="nowrap">
                    <template v-if="day.studentCount">
                      <span class="cell-strong">{{ day.studentCount }} {{ day.studentCount === 1 ? 'student' : 'students' }}</span>
                      <span class="cell-sub">{{ hours(day.approvedHours) }} hrs approved<template v-if="day.pendingCount"> · {{ day.pendingCount }} pending</template></span>
                    </template>
                    <span v-else class="muted">No time logged</span>
                  </td>
                  <td class="nowrap">
                    <span v-if="day.photoCount" class="photo-count"><AppIcon name="camera" :size="15" /> {{ day.photoCount }}</span>
                    <span v-else class="muted">—</span>
                  </td>
                  <td class="cell-actions">
                    <button class="btn btn-secondary btn-sm" type="button" @click="openServiceDay(day)"><AppIcon name="eye" :size="15" /> View day</button>
                  </td>
                </tr>
                <tr v-if="filteredServiceDays.length === 0" class="table-empty">
                  <td colspan="6">
                    <EmptyState
                      icon="calendar"
                      :title="serviceDays.length ? 'No matching days' : 'No service days yet'"
                      :text="serviceDays.length ? 'Try a different search or month.' : 'When an activity ends, the day it took place is listed here.'"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="filteredServiceDays.length > visibleServiceDays.length" class="card-footer">
            <span>Showing {{ visibleServiceDays.length }} of {{ filteredServiceDays.length }} days</span>
            <button class="btn btn-secondary btn-sm" type="button" @click="serviceDayLimit += SERVICE_DAY_STEP">Show more</button>
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <div><h3>Student registrations</h3><p>Approve or reject students who signed up for an activity.</p></div>
          </div>
          <div class="card-body card-toolbar">
            <StatusFilter v-model="registrationStatus" :options="registrationStatusOptions" @update:model-value="runFilter(loadRegistrations)" />
          </div>
          <div class="table-wrap card-divider">
            <table class="table">
              <thead><tr><th>Student</th><th>Activity</th><th>Registered</th><th>Status</th><th class="cell-actions">Review</th></tr></thead>
              <tbody>
                <tr v-for="registration in registrations" :key="registration.id">
                  <td>
                    <div class="person">
                      <span class="avatar avatar-sm">{{ initialsOf(registration.student_name) }}</span>
                      <div><span class="cell-strong">{{ registration.student_name }}</span><span class="cell-sub">{{ registration.student_number || '—' }}</span></div>
                    </div>
                  </td>
                  <td>{{ registration.activity_title }}</td>
                  <td class="nowrap">{{ dateLabel(registration.registered_at) }}</td>
                  <td class="cell-wrap">
                    <span :class="badgeClass(registration.status)">{{ titleCase(registration.status) }}</span>
                    <span v-if="registration.review_note" class="cell-sub remark">{{ registration.review_note }}</span>
                  </td>
                  <td class="cell-actions">
                    <div v-if="registration.status === 'pending'" class="button-row">
                      <button class="btn btn-success-soft btn-sm" type="button" :disabled="saving" @click="reviewRegistration(registration, 'approve')"><AppIcon name="check" :size="15" /> Approve</button>
                      <button class="btn btn-danger-soft btn-sm" type="button" :disabled="saving" @click="reviewRegistration(registration, 'reject')">Reject</button>
                    </div>
                    <span v-else class="muted">—</span>
                  </td>
                </tr>
                <tr v-if="registrations.length === 0" class="table-empty">
                  <td colspan="5"><EmptyState icon="users" title="No registrations found" text="Student sign-ups for activities will appear here." /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- AREAS -->
      <div v-else-if="activeTab === 'areas'" class="page">
        <section class="card">
          <div class="card-header"><div><h3>Service areas</h3><p>Inactive areas stay on existing records but can't be picked for new activities.</p></div></div>
          <div class="table-wrap card-divider spaced">
            <table class="table">
              <thead><tr><th>Area</th><th>Location</th><th>Description</th><th>Status</th><th class="cell-actions">Actions</th></tr></thead>
              <tbody>
                <tr v-for="area in allAreas" :key="area.id">
                  <td class="cell-strong">{{ area.area_name }}</td>
                  <td>{{ area.location || '—' }}</td>
                  <td class="cell-wrap muted">{{ area.description || '—' }}</td>
                  <td><span :class="badgeClass(area.status)">{{ titleCase(area.status) }}</span></td>
                  <td class="cell-actions"><button class="btn btn-secondary btn-sm" type="button" @click="openAreaForm(area)"><AppIcon name="edit" :size="15" /> Edit</button></td>
                </tr>
                <tr v-if="allAreas.length === 0" class="table-empty">
                  <td colspan="5">
                    <EmptyState icon="map-pin" title="No service areas yet" text="Add an area to start creating activities.">
                      <button class="btn btn-primary btn-sm" type="button" @click="openAreaForm()"><AppIcon name="plus" :size="16" /> Add area</button>
                    </EmptyState>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- ANNOUNCEMENTS -->
      <div v-else-if="activeTab === 'announcements'" class="page">
        <section class="card">
          <div class="card-header"><div><h3>Published announcements</h3><p>Announcements publish immediately and notify approved students in the audience.</p></div></div>
          <ul v-if="announcements.length" class="list spaced">
            <li v-for="announcement in announcements" :key="announcement.id" class="list-item">
              <span class="list-icon tone-amber"><AppIcon name="megaphone" :size="18" /></span>
              <div class="list-item-body">
                <p class="list-item-title">{{ announcement.title }}</p>
                <p class="list-item-text clamp-2">{{ announcement.content }}</p>
                <div class="list-item-meta">
                  <span class="badge badge-plain" :class="announcement.section_name ? 'badge-info' : 'badge-neutral'">{{ announcement.section_name || 'All students' }}</span>
                  <span>{{ dateLabel(announcement.created_at) }}</span>
                </div>
              </div>
              <div class="button-row">
                <button class="btn btn-secondary btn-sm" type="button" @click="openAnnouncementForm(announcement)"><AppIcon name="edit" :size="15" /> Edit</button>
                <button class="btn btn-danger-ghost btn-sm btn-icon" type="button" title="Delete" :aria-label="`Delete ${announcement.title}`" @click="deleteAnnouncement(announcement)"><AppIcon name="trash" :size="16" /></button>
              </div>
            </li>
          </ul>
          <EmptyState v-else icon="megaphone" title="No announcements yet" text="Share updates with all students or a single section.">
            <button class="btn btn-primary btn-sm" type="button" @click="openAnnouncementForm()"><AppIcon name="plus" :size="16" /> New announcement</button>
          </EmptyState>
        </section>
      </div>
    </template>

    <!-- ACTIVITY FORM -->
    <AppModal
      :open="activityModalOpen"
      size="lg"
      :eyebrow="activityForm.id ? 'Edit activity' : 'New activity'"
      :title="activityForm.id ? activityForm.title || 'Edit activity' : 'Create a service activity'"
      :close-on-backdrop="false"
      @close="closeActivityForm"
    >
      <form id="activity-form" class="form-grid cols-2" @submit.prevent="saveActivity">
        <label class="field span-full"><span class="field-label">Title</span><input v-model="activityForm.title" maxlength="160" required placeholder="e.g. Library Inventory Week"></label>
        <label class="field">
          <span class="field-label">Service area</span>
          <select v-model="activityForm.area_id" required>
            <option value="">Select an area</option>
            <option v-for="area in areas" :key="area.id" :value="area.id">{{ area.area_name }}</option>
          </select>
        </label>
        <label class="field"><span class="field-label">Location <span class="optional">(overrides the area's)</span></span><input v-model="activityForm.location" maxlength="250"></label>
        <label class="field span-full"><span class="field-label">Description</span><textarea v-model="activityForm.description" maxlength="4000" rows="3" required></textarea></label>
        <label class="field"><span class="field-label">Starts</span><input v-model="activityForm.scheduled_start" type="datetime-local" required></label>
        <label class="field"><span class="field-label">Ends</span><input v-model="activityForm.scheduled_end" type="datetime-local" required></label>
        <label class="field"><span class="field-label">Service hours</span><input v-model.number="activityForm.required_hours" type="number" min="0" step="0.25" required></label>
        <label class="field"><span class="field-label">Capacity <span class="optional">(blank = unlimited)</span></span><input v-model="activityForm.capacity" type="number" min="0" step="1"></label>
        <label class="field span-full"><span class="field-label">Eligibility <span class="optional">(optional)</span></span><input v-model="activityForm.eligibility" maxlength="1000" placeholder="e.g. 2nd year and above"></label>
        <label class="field">
          <span class="field-label">Status</span>
          <select v-model="activityForm.status">
            <option value="draft">Draft — hidden from students</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <div class="field">
          <span class="field-label">Registration</span>
          <label class="check-field"><input v-model="activityForm.registration_open" type="checkbox"> Students can register</label>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" type="button" :disabled="saving" @click="closeActivityForm">Cancel</button>
        <button class="btn btn-primary" type="submit" form="activity-form" :disabled="saving">
          <span v-if="saving" class="spinner spinner-sm"></span>
          {{ saving ? 'Saving…' : activityForm.id ? 'Save changes' : 'Create activity' }}
        </button>
      </template>
    </AppModal>

    <!-- ACTIVITY PARTICIPANTS -->
    <AppModal
      :open="participants.open"
      size="lg"
      eyebrow="Students"
      :title="participants.activity ? participants.activity.title : ''"
      :subtitle="participants.activity ? formatSchedule(participants.activity.scheduled_start, participants.activity.scheduled_end) : ''"
      @close="closeParticipants"
    >
      <div v-if="participants.loading" class="loading-state" role="status">
        <span class="spinner"></span>
        <span>Loading students…</span>
      </div>
      <EmptyState v-else-if="participants.rows.length === 0" icon="users" title="No students yet" text="Nobody registered for or logged hours on this activity." />
      <div v-else class="table-wrap">
        <table class="table">
          <thead><tr><th>Student</th><th>Registration</th><th>Hours logged</th></tr></thead>
          <tbody>
            <tr v-for="participant in participants.rows" :key="participant.student_id">
              <td>
                <div class="person">
                  <span class="avatar avatar-sm">{{ initialsOf(participant.student_name) }}</span>
                  <div><span class="cell-strong">{{ participant.student_name }}</span><span class="cell-sub">{{ participant.student_number || '—' }}</span></div>
                </div>
              </td>
              <td>
                <span v-if="participant.registration_status" :class="badgeClass(participant.registration_status)">{{ titleCase(participant.registration_status) }}</span>
                <span v-else class="cell-sub">Not registered</span>
              </td>
              <td class="nowrap">
                <span class="cell-strong">{{ hours(participant.approved_hours) }} hrs</span>
                <span v-if="Number(participant.pending_hours)" class="cell-sub">+ {{ hours(participant.pending_hours) }} hrs pending</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="closeParticipants">Close</button>
      </template>
    </AppModal>

    <!-- SERVICE DAY -->
    <AppModal
      :open="serviceDay.open"
      size="lg"
      :eyebrow="serviceDay.day ? `${weekdayLabel(serviceDay.day.date)}, ${dateLabel(serviceDay.day.date)}` : ''"
      :title="serviceDay.day ? serviceDay.day.activity.title : ''"
      :subtitle="serviceDay.day ? `${activityPlace(serviceDay.day.activity)} · ${activityTimes(serviceDay.day.activity)}` : ''"
      @close="closeServiceDay"
    >
      <template v-if="serviceDay.day">
        <EmptyState
          v-if="serviceDay.day.records.length === 0"
          icon="clipboard-check"
          title="No time logged for this day"
          text="Registered students are reminded to log their time once the activity ends."
        />
        <div v-else class="table-wrap">
          <table class="table">
            <thead><tr><th>Student</th><th>Time</th><th>Hours</th><th>Photos</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="record in serviceDay.day.records" :key="record.id">
                <td>
                  <div class="person">
                    <span class="avatar avatar-sm">{{ initialsOf(record.student_name) }}</span>
                    <div><span class="cell-strong">{{ record.student_name }}</span><span class="cell-sub">{{ record.student_number || '—' }}</span></div>
                  </div>
                </td>
                <td class="nowrap">{{ formatTimeRange(record.time_in, record.time_out, '—') }}</td>
                <td class="cell-num cell-strong">{{ hours(record.total_hours) }}</td>
                <td class="nowrap">
                  <div v-if="Number(record.has_before_photo) || Number(record.has_after_photo)" class="photo-pair">
                    <template v-for="kind in ['before', 'after']" :key="kind">
                      <AuthPhoto
                        v-if="Number(record[`has_${kind}_photo`])"
                        :src="`${API_URL}/admin/attendance/${encodeURIComponent(record.id)}/photos/${kind}`"
                        :token="token"
                        :label="`${titleCase(kind)} photo`"
                        :caption="titleCase(kind)"
                        :subtitle="`${record.student_name} · ${serviceDay.day.activity.title} · ${dateLabel(serviceDay.day.date)}`"
                      />
                    </template>
                  </div>
                  <span v-else class="muted">No photos</span>
                </td>
                <td><span :class="badgeClass(record.status)">{{ titleCase(record.status) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="closeServiceDay">Close</button>
      </template>
    </AppModal>

    <!-- AREA FORM -->
    <AppModal
      :open="areaModalOpen"
      :eyebrow="areaForm.id ? 'Edit service area' : 'New service area'"
      :title="areaForm.id ? areaForm.area_name || 'Edit service area' : 'Add a service area'"
      :close-on-backdrop="false"
      @close="closeAreaForm"
    >
      <form id="area-form" class="form-grid cols-2" @submit.prevent="saveArea">
        <label class="field span-full"><span class="field-label">Name</span><input v-model="areaForm.area_name" maxlength="100" required placeholder="e.g. Main Library"></label>
        <label class="field"><span class="field-label">Location <span class="optional">(optional)</span></span><input v-model="areaForm.location" maxlength="250"></label>
        <label class="field">
          <span class="field-label">Status</span>
          <select v-model="areaForm.status"><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </label>
        <label class="field span-full"><span class="field-label">Description <span class="optional">(optional)</span></span><textarea v-model="areaForm.description" maxlength="500" rows="2"></textarea></label>
      </form>
      <template #footer>
        <button class="btn btn-secondary" type="button" :disabled="saving" @click="closeAreaForm">Cancel</button>
        <button class="btn btn-primary" type="submit" form="area-form" :disabled="saving">
          <span v-if="saving" class="spinner spinner-sm"></span>
          {{ saving ? 'Saving…' : areaForm.id ? 'Save changes' : 'Add area' }}
        </button>
      </template>
    </AppModal>

    <!-- ANNOUNCEMENT FORM -->
    <AppModal
      :open="announcementModalOpen"
      size="lg"
      :eyebrow="announcementForm.id ? 'Edit announcement' : 'New announcement'"
      :title="announcementForm.id ? 'Edit announcement' : 'Publish an announcement'"
      :subtitle="announcementForm.id ? '' : 'Approved students in the audience get a notification right away.'"
      :close-on-backdrop="false"
      @close="closeAnnouncementForm"
    >
      <form id="announcement-form" class="form-grid cols-2" @submit.prevent="saveAnnouncement">
        <label class="field span-full"><span class="field-label">Title</span><input v-model="announcementForm.title" maxlength="200" required></label>
        <label class="field span-full">
          <span class="field-label">Audience</span>
          <select v-model="announcementForm.target_section_id">
            <option value="">All students</option>
            <option v-for="section in sections" :key="section.id" :value="section.id">{{ section.course }} · Year {{ section.year_level }} · {{ section.section_name }}</option>
          </select>
        </label>
        <label class="field span-full">
          <span class="field-label">Message</span>
          <textarea v-model="announcementForm.content" rows="7" maxlength="10000" required></textarea>
          <span class="field-hint">{{ announcementForm.content.length.toLocaleString() }} / 10,000 characters</span>
        </label>
      </form>
      <template #footer>
        <button class="btn btn-secondary" type="button" :disabled="saving" @click="closeAnnouncementForm">Cancel</button>
        <button class="btn btn-primary" type="submit" form="announcement-form" :disabled="saving">
          <span v-if="saving" class="spinner spinner-sm"></span>
          <AppIcon v-else-if="!announcementForm.id" name="megaphone" :size="16" />
          {{ saving ? 'Saving…' : announcementForm.id ? 'Save changes' : 'Publish' }}
        </button>
      </template>
    </AppModal>
  </AdminLayout>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import AuthPhoto from '@/components/AuthPhoto.vue'
import { confirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { parseApiDate } from '@/utils/dates'
import { badgeClass, dateParts, formatSchedule, formatTimeRange, timeAgo, titleCase } from '@/utils/format'
import { initialsOf, readSession } from '@/utils/session'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const route = useRoute()
const router = useRouter()
const toast = useToast()

const tabs = [
  { id: 'attendance', label: 'Attendance', subtitle: 'Review submitted service days — only approved hours count' },
  { id: 'documents', label: 'Documents', subtitle: 'Review files submitted by students' },
  { id: 'hours', label: 'Service Hours', subtitle: 'Add or deduct hours with a recorded reason' },
  { id: 'activities', label: 'Service Activities', subtitle: 'Create activities and review student registrations' },
  { id: 'areas', label: 'Service Areas', subtitle: 'Places where service activities happen' },
  { id: 'announcements', label: 'Announcements', subtitle: 'Publish updates to all students or a single section' }
]
const reviewStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' }
]
const registrationStatusOptions = [...reviewStatusOptions.slice(0, 3), { value: 'cancelled', label: 'Cancelled' }, { value: '', label: 'All' }]

const activeTab = computed(() => tabs.some(tab => tab.id === route.params.module) ? route.params.module : 'attendance')
const activeLabel = computed(() => tabs.find(tab => tab.id === activeTab.value)?.label || 'Attendance')
const activeSubtitle = computed(() => tabs.find(tab => tab.id === activeTab.value)?.subtitle || '')
const token = ref('')
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const attendance = ref([])
const activities = ref([])
const registrations = ref([])
const students = ref([])
const areas = ref([])
const adjustments = ref([])
const selectedProgress = ref(null)
const documents = ref([])
const announcements = ref([])
const sections = ref([])
const allAreas = ref([])
const attendanceStatus = ref('pending')
const registrationStatus = ref('pending')
const documentStatus = ref('pending')
const activityModalOpen = ref(false)
const areaModalOpen = ref(false)
const announcementModalOpen = ref(false)
const participants = reactive({ open: false, loading: false, activity: null, rows: [] })
const activeActivities = computed(() => activities.value.filter(activity => !activity.archived_at))
const archivedActivities = computed(() => activities.value.filter(activity => activity.archived_at))

// Service history: one row per day an activity took place. That is each date students
// logged time for it, or, when an activity ended and nobody has logged time yet, its
// scheduled date. Rejected attendance doesn't count as having served.
const activityAttendance = ref([])
const serviceDay = reactive({ open: false, day: null })
const serviceDays = computed(() => {
  const activityById = new Map(activities.value.map(activity => [activity.id, activity]))
  const days = new Map()
  const dayFor = (activity, date) => {
    const key = `${activity.id}|${date}`
    if (!days.has(key)) days.set(key, { key, date, activity, records: [] })
    return days.get(key)
  }
  for (const record of activityAttendance.value) {
    const activity = activityById.get(record.activity_id)
    if (!activity || record.status === 'rejected') continue
    dayFor(activity, String(record.attendance_date).slice(0, 10)).records.push(record)
  }
  const logged = new Set([...days.values()].map(day => day.activity.id))
  for (const activity of activities.value) {
    if (logged.has(activity.id) || !isDone(activity)) continue
    dayFor(activity, String(activity.scheduled_start).slice(0, 10))
  }
  return [...days.values()]
    .map(day => {
      const records = [...day.records].sort((a, b) =>
        String(a.time_in || '').localeCompare(String(b.time_in || '')) || byNaturalOrder(a.student_name, b.student_name))
      return {
        ...day,
        records,
        studentCount: new Set(records.map(record => record.student_id)).size,
        approvedHours: records.reduce((sum, record) => sum + (record.status === 'approved' ? Number(record.total_hours) || 0 : 0), 0),
        pendingCount: records.filter(record => record.status === 'pending').length,
        photoCount: records.reduce((sum, record) => sum + Number(record.has_before_photo || 0) + Number(record.has_after_photo || 0), 0)
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date) ||
      String(b.activity.scheduled_start).localeCompare(String(a.activity.scheduled_start)))
})

const serviceDaySearch = ref('')
const serviceDayMonth = ref('')
const monthFormat = new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' })
const serviceDayMonths = computed(() => [...new Set(serviceDays.value.map(day => day.date.slice(0, 7)))]
  .map(value => {
    const date = parseApiDate(`${value}-01`)
    return { value, label: date ? monthFormat.format(date) : value }
  }))
const filteredServiceDays = computed(() => {
  let rows = serviceDays.value
  if (serviceDayMonth.value) rows = rows.filter(day => day.date.startsWith(serviceDayMonth.value))
  const term = serviceDaySearch.value.trim().toLowerCase()
  if (term) {
    rows = rows.filter(day => [
      day.activity.title, day.activity.service_area, day.activity.location,
      ...day.records.flatMap(record => [record.student_name, record.student_number])
    ].some(value => String(value || '').toLowerCase().includes(term)))
  }
  return rows
})

// The list shows SERVICE_DAY_STEP days at a time; a new search or month starts over.
const SERVICE_DAY_STEP = 10
const serviceDayLimit = ref(SERVICE_DAY_STEP)
const visibleServiceDays = computed(() => filteredServiceDays.value.slice(0, serviceDayLimit.value))
watch([serviceDaySearch, serviceDayMonth], () => { serviceDayLimit.value = SERVICE_DAY_STEP })
watch(serviceDayMonths, months => {
  if (serviceDayMonth.value && !months.some(month => month.value === serviceDayMonth.value)) serviceDayMonth.value = ''
})

function openServiceDay(day) {
  Object.assign(serviceDay, { open: true, day })
}

function closeServiceDay() {
  serviceDay.open = false
}

const activityForm = reactive({
  id: '', title: '', area_id: '', description: '', location: '',
  scheduled_start: '', scheduled_end: '', required_hours: 0,
  capacity: '', eligibility: '', registration_open: true, status: 'draft'
})
const adjustmentForm = reactive({ student_id: '', adjustment_type: 'add', adjustment_amount: '', reason: '' })
const announcementForm = reactive({ id: '', title: '', content: '', target_section_id: '' })
const areaForm = reactive({ id: '', area_name: '', location: '', description: '', status: 'active' })
// Course, year level and section narrow a list of students, each one limiting the
// options of the next. Students with no section are grouped under NO_SECTION so they
// can still be found. The Service Hours form and its history table each get their own.
const NO_SECTION = '__none__'
const byNaturalOrder = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
const uniqueSorted = values => [...new Set(values.filter(Boolean))].sort(byNaturalOrder)

function createStudentFilter(source) {
  const filter = reactive({ course: '', year_level: '', section: '' })
  const inCourse = computed(() => filter.course
    ? source.value.filter(student => student.course === filter.course)
    : source.value)
  const inYear = computed(() => filter.year_level
    ? inCourse.value.filter(student => String(student.year_level) === String(filter.year_level))
    : inCourse.value)
  const view = reactive({
    filter,
    courses: computed(() => uniqueSorted(source.value.map(student => student.course))),
    yearLevels: computed(() => uniqueSorted(inCourse.value.map(student => student.year_level))),
    sections: computed(() => {
      const options = uniqueSorted(inYear.value.map(student => student.section)).map(name => ({ value: name, label: name }))
      if (inYear.value.some(student => !student.section)) options.push({ value: NO_SECTION, label: 'No section' })
      return options
    }),
    students: computed(() => {
      if (!filter.section) return inYear.value
      if (filter.section === NO_SECTION) return inYear.value.filter(student => !student.section)
      return inYear.value.filter(student => student.section === filter.section)
    }),
    active: computed(() => Boolean(filter.course || filter.year_level || filter.section))
  })
  // A choice that no longer fits the filters before it goes back to "All".
  watch(() => view.yearLevels, years => {
    if (filter.year_level && !years.some(year => String(year) === String(filter.year_level))) filter.year_level = ''
  })
  watch(() => view.sections, options => {
    if (filter.section && !options.some(option => option.value === filter.section)) filter.section = ''
  })
  return view
}

const adjustmentPicker = createStudentFilter(students)
watch(() => adjustmentPicker.students, list => {
  if (adjustmentForm.student_id && !list.some(student => student.id === adjustmentForm.student_id)) {
    adjustmentForm.student_id = ''
    selectedProgress.value = null
  }
})

// The history table filters by the students who have adjustments, taken from the rows.
const adjustedStudents = computed(() => {
  const byId = new Map()
  for (const row of adjustments.value) {
    if (byId.has(row.student_id)) continue
    byId.set(row.student_id, {
      id: row.student_id,
      full_name: row.student_name,
      student_id: row.student_number,
      course: row.course,
      year_level: row.year_level,
      section: row.section
    })
  }
  return [...byId.values()].sort((a, b) => byNaturalOrder(a.full_name, b.full_name))
})
const historyPicker = createStudentFilter(adjustedStudents)
const historyStudentId = ref('')
const historySearch = ref('')
const historyFiltered = computed(() => historyPicker.active || Boolean(historyStudentId.value) || Boolean(historySearch.value.trim()))
const filteredAdjustments = computed(() => {
  let rows = adjustments.value
  if (historyStudentId.value) rows = rows.filter(row => row.student_id === historyStudentId.value)
  else if (historyPicker.active) {
    const ids = new Set(historyPicker.students.map(student => student.id))
    rows = rows.filter(row => ids.has(row.student_id))
  }
  const term = historySearch.value.trim().toLowerCase()
  if (term) {
    rows = rows.filter(row => [row.student_name, row.student_number, row.reason]
      .some(value => String(value || '').toLowerCase().includes(term)))
  }
  return rows
})

// The history table shows historyPageSize rows at a time. Changing the search, a filter
// or the page size goes back to the first page.
const HISTORY_PAGE_SIZES = [10, 25, 50, 100]
const historyPageSize = ref(HISTORY_PAGE_SIZES[0])
const historyPage = ref(1)
const historyPageCount = computed(() => Math.max(1, Math.ceil(filteredAdjustments.value.length / historyPageSize.value)))
const pagedAdjustments = computed(() => {
  const start = (historyPage.value - 1) * historyPageSize.value
  return filteredAdjustments.value.slice(start, start + historyPageSize.value)
})
const historyRange = computed(() => {
  const total = filteredAdjustments.value.length
  return {
    start: total ? (historyPage.value - 1) * historyPageSize.value + 1 : 0,
    end: Math.min(total, historyPage.value * historyPageSize.value),
    total
  }
})
watch(
  () => [historyPicker.filter.course, historyPicker.filter.year_level, historyPicker.filter.section, historyStudentId.value, historySearch.value, historyPageSize.value],
  () => { historyPage.value = 1 }
)
watch(historyPageCount, count => {
  if (historyPage.value > count) historyPage.value = count
})
watch(() => historyPicker.students, list => {
  if (historyStudentId.value && !list.some(student => student.id === historyStudentId.value)) historyStudentId.value = ''
})

function clearHistoryFilters() {
  Object.assign(historyPicker.filter, { course: '', year_level: '', section: '' })
  historyStudentId.value = ''
  historySearch.value = ''
}

function studentPlacement(row) {
  return [row.course, row.year_level ? `Year ${row.year_level}` : '', row.section].filter(Boolean).join(' · ') || 'No course or section'
}

const StatusFilter = defineComponent({
  props: { modelValue: { type: String, default: '' }, options: { type: Array, required: true } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', { class: 'segmented', role: 'group', 'aria-label': 'Filter by status' },
      props.options.map(option => h('button', {
        type: 'button',
        class: { active: props.modelValue === option.value },
        'aria-pressed': props.modelValue === option.value,
        onClick: () => { if (props.modelValue !== option.value) emit('update:modelValue', option.value) }
      }, option.label))
    )
  }
})

const EmptyState = defineComponent({
  props: { icon: { type: String, default: 'inbox' }, title: { type: String, required: true }, text: { type: String, default: '' } },
  setup(props, { slots }) {
    return () => h('div', { class: 'empty-state compact' }, [
      h('span', { class: 'empty-state-icon' }, [h(AppIcon, { name: props.icon, size: 22 })]),
      h('h4', props.title),
      props.text ? h('p', props.text) : null,
      slots.default ? slots.default() : null
    ])
  }
})

function errorText(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

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
  const session = readSession('admin')
  if (!session) {
    router.replace('/login')
    return false
  }
  token.value = session.token
  return true
}

async function loadTab() {
  if (!token.value) return
  errorMessage.value = ''
  loading.value = true
  try {
    if (activeTab.value === 'attendance') await loadAttendance()
    else if (activeTab.value === 'activities') await Promise.all([loadActivities(), loadRegistrations(), loadAreas(), loadActivityAttendance()])
    else if (activeTab.value === 'areas') await loadAllAreas()
    else if (activeTab.value === 'hours') {
      await Promise.all([loadStudents(), loadAdjustmentHistory()])
      if (adjustmentForm.student_id) await loadSelectedProgress()
    } else if (activeTab.value === 'documents') await loadDocuments()
    else if (activeTab.value === 'announcements') await Promise.all([loadAnnouncements(), loadSections()])
  } catch (error) {
    errorMessage.value = errorText(error, 'Failed to load this admin module.')
  } finally {
    loading.value = false
  }
}

async function runFilter(loader) {
  try {
    await loader()
  } catch (error) {
    toast.error(errorText(error, 'The list could not be updated.'))
  }
}

function selectTab(tab) {
  router.push(`/admin/workflows/${tab}`)
}

function reviewPrompt({ approve, noun, subject, details, noteHint }) {
  return confirm({
    title: `${approve ? 'Approve' : 'Reject'} ${noun}`,
    message: subject,
    details,
    confirmLabel: approve ? 'Approve' : 'Reject',
    tone: approve ? 'primary' : 'danger',
    note: {
      label: approve ? 'Note to the student' : 'Reason',
      placeholder: approve ? 'Add an optional note' : 'Explain what needs to change',
      hint: noteHint
    }
  })
}

async function loadAttendance() {
  const query = attendanceStatus.value ? `?status=${encodeURIComponent(attendanceStatus.value)}` : ''
  attendance.value = (await request(`/admin/attendance${query}`)).attendance
}

async function reviewAttendance(record, decision) {
  const approve = decision === 'approve'
  const { confirmed, note } = await reviewPrompt({
    approve,
    noun: 'attendance',
    subject: `${approve ? 'Approve' : 'Reject'} ${hours(record.total_hours)} hours for ${record.student_name} on ${dateLabel(record.attendance_date)}?`,
    details: approve ? "The hours will count toward the student's progress." : 'The student can submit this date again.',
    noteHint: 'Included in the notification sent to the student.'
  })
  if (!confirmed) return
  saving.value = true
  try {
    const data = await request(`/admin/attendance/${encodeURIComponent(record.id)}/${decision}`, {
      method: 'PATCH', body: JSON.stringify({ reason: note || '' })
    })
    toast.success(data.message)
    await loadAttendance()
  } catch (error) {
    toast.error(errorText(error, 'Attendance review failed.'))
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

function openAreaForm(area) {
  if (area) {
    Object.assign(areaForm, {
      id: area.id,
      area_name: area.area_name,
      location: area.location || '',
      description: area.description || '',
      status: area.status === 'inactive' ? 'inactive' : 'active'
    })
  } else {
    resetAreaForm()
  }
  areaModalOpen.value = true
}

function closeAreaForm() {
  if (saving.value) return
  areaModalOpen.value = false
}

async function saveArea() {
  saving.value = true
  try {
    const { id, ...fields } = areaForm
    const path = id ? `/admin/service-areas/${encodeURIComponent(id)}` : '/admin/service-areas'
    const result = await request(path, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(fields) })
    toast.success(result.message)
    areaModalOpen.value = false
    resetAreaForm()
    await loadAllAreas()
  } catch (error) {
    toast.error(errorText(error, 'Service area could not be saved.'))
  } finally { saving.value = false }
}

async function loadActivities() {
  activities.value = (await request('/admin/activities')).activities
}

// Every attendance record, for the service history.
async function loadActivityAttendance() {
  activityAttendance.value = (await request('/admin/attendance')).attendance
}

async function loadRegistrations() {
  const query = registrationStatus.value ? `?status=${encodeURIComponent(registrationStatus.value)}` : ''
  registrations.value = (await request(`/admin/activity-registrations${query}`)).registrations
}

async function reviewRegistration(registration, decision) {
  const approve = decision === 'approve'
  const { confirmed, note } = await reviewPrompt({
    approve,
    noun: 'registration',
    subject: `${approve ? 'Approve' : 'Reject'} ${registration.student_name}'s registration for "${registration.activity_title}"?`,
    noteHint: approve ? 'Saved with the review.' : 'Included in the notification sent to the student.'
  })
  if (!confirmed) return
  saving.value = true
  try {
    const data = await request(`/admin/activity-registrations/${encodeURIComponent(registration.id)}/${decision}`, {
      method: 'PATCH', body: JSON.stringify({ reason: note || '' })
    })
    toast.success(data.message)
    await loadRegistrations()
  } catch (error) {
    toast.error(errorText(error, 'Registration review failed.'))
  } finally { saving.value = false }
}

function resetActivityForm() {
  Object.assign(activityForm, {
    id: '', title: '', area_id: '', description: '', location: '',
    scheduled_start: '', scheduled_end: '', required_hours: 0,
    capacity: '', eligibility: '', registration_open: true, status: 'draft'
  })
}

function openActivityForm(activity) {
  if (activity) {
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
  } else {
    resetActivityForm()
  }
  activityModalOpen.value = true
}

function closeActivityForm() {
  if (saving.value) return
  activityModalOpen.value = false
}

async function saveActivity() {
  const start = parseApiDate(activityForm.scheduled_start)
  const end = parseApiDate(activityForm.scheduled_end)
  if (start && end && end <= start) {
    toast.error('The end time must be after the start time.')
    return
  }
  saving.value = true
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
    toast.success(result.message)
    activityModalOpen.value = false
    resetActivityForm()
    await Promise.all([loadActivities(), loadRegistrations()])
  } catch (error) {
    toast.error(errorText(error, 'Activity could not be saved.'))
  } finally { saving.value = false }
}

async function deleteActivity(activity) {
  const { confirmed } = await confirm({
    title: 'Delete draft activity?',
    message: `"${activity.title}" will be permanently deleted.`,
    confirmLabel: 'Delete',
    tone: 'danger'
  })
  if (!confirmed) return
  try {
    const result = await request(`/admin/activities/${encodeURIComponent(activity.id)}`, { method: 'DELETE' })
    toast.success(result.message)
    await loadActivities()
  } catch (error) {
    toast.error(errorText(error, 'Activity could not be deleted.'))
  }
}

// A published activity is "Done" once its end time passes; the server then notifies
// its registered students to log their time.
function isDone(activity) {
  return activity.status === 'published' && registrationState(activity).tone === 'ended'
}

function canArchive(activity) {
  return activity.status === 'cancelled' || registrationState(activity).tone === 'ended'
}

async function archiveActivity(activity) {
  const { confirmed } = await confirm({
    title: 'Archive this activity?',
    message: `"${activity.title}" will move to Completed activities and be hidden from students.`,
    details: 'Its student list and logged hours are kept. You can restore it later.',
    confirmLabel: 'Archive',
    tone: 'primary'
  })
  if (!confirmed) return
  await setArchived(activity, 'archive', 'Activity could not be archived.')
}

async function restoreActivity(activity) {
  await setArchived(activity, 'restore', 'Activity could not be restored.')
}

async function setArchived(activity, action, fallback) {
  saving.value = true
  try {
    const result = await request(`/admin/activities/${encodeURIComponent(activity.id)}/${action}`, { method: 'PATCH' })
    toast.success(result.message)
    await loadActivities()
  } catch (error) {
    toast.error(errorText(error, fallback))
  } finally { saving.value = false }
}

async function openParticipants(activity) {
  Object.assign(participants, { open: true, loading: true, activity, rows: [] })
  try {
    const data = await request(`/admin/activities/${encodeURIComponent(activity.id)}/participants`)
    // Ignore a slow response for an activity the admin has already closed or switched away from.
    if (participants.activity?.id === activity.id) participants.rows = data.participants
  } catch (error) {
    toast.error(errorText(error, 'Students could not be loaded.'))
    if (participants.activity?.id === activity.id) participants.open = false
  } finally {
    if (participants.activity?.id === activity.id) participants.loading = false
  }
}

function closeParticipants() {
  participants.open = false
}

async function loadStudents() {
  students.value = (await request('/admin/students')).students
}

async function loadAdjustmentHistory() {
  adjustments.value = (await request('/admin/hour-adjustments')).adjustments
}

async function loadSelectedProgress() {
  const id = adjustmentForm.student_id
  if (!id) {
    selectedProgress.value = null
    return
  }
  // The progress summary is a convenience; the form still works without it.
  const detail = await request(`/admin/students/${encodeURIComponent(id)}`).catch(() => null)
  // Ignore a late reply if a different student was picked meanwhile.
  if (adjustmentForm.student_id === id) selectedProgress.value = detail?.progress || null
}

async function createAdjustment() {
  saving.value = true
  try {
    const result = await request(`/admin/students/${encodeURIComponent(adjustmentForm.student_id)}/hour-adjustments`, {
      method: 'POST',
      body: JSON.stringify({
        adjustment_type: adjustmentForm.adjustment_type,
        adjustment_amount: Number(adjustmentForm.adjustment_amount),
        reason: adjustmentForm.reason
      })
    })
    toast.success(result.message)
    adjustmentForm.adjustment_amount = ''
    adjustmentForm.reason = ''
    await Promise.all([loadAdjustmentHistory(), loadSelectedProgress()])
    historyPage.value = 1 // the new adjustment is the newest row, on the first page
  } catch (error) {
    toast.error(errorText(error, 'Adjustment could not be saved.'))
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
    toast.error(errorText(error, 'Document file could not be opened.'))
  }
}

async function reviewDocument(document, decision) {
  const approve = decision === 'approve'
  const { confirmed, note } = await reviewPrompt({
    approve,
    noun: 'document',
    subject: `${approve ? 'Approve' : 'Reject'} "${document.document_name}" from ${document.student_name}?`,
    details: approve ? '' : 'The student can upload a replacement.',
    noteHint: 'Shown to the student next to the document.'
  })
  if (!confirmed) return
  saving.value = true
  try {
    const result = await request(`/admin/documents/${encodeURIComponent(document.id)}/${decision}`, {
      method: 'PATCH', body: JSON.stringify({ reason: note || '' })
    })
    toast.success(result.message)
    await loadDocuments()
  } catch (error) {
    toast.error(errorText(error, 'Document review failed.'))
  } finally { saving.value = false }
}

async function loadAnnouncements() {
  announcements.value = (await request('/admin/announcements')).announcements
}

async function loadSections() {
  sections.value = (await request('/admin/sections')).sections
}

function resetAnnouncementForm() {
  Object.assign(announcementForm, { id: '', title: '', content: '', target_section_id: '' })
}

function openAnnouncementForm(announcement) {
  if (announcement) {
    Object.assign(announcementForm, {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      target_section_id: announcement.target_section_id || ''
    })
  } else {
    resetAnnouncementForm()
  }
  announcementModalOpen.value = true
}

function closeAnnouncementForm() {
  if (saving.value) return
  announcementModalOpen.value = false
}

async function saveAnnouncement() {
  saving.value = true
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
    toast.success(result.message)
    announcementModalOpen.value = false
    resetAnnouncementForm()
    await loadAnnouncements()
  } catch (error) {
    toast.error(errorText(error, 'Announcement could not be saved.'))
  } finally { saving.value = false }
}

async function deleteAnnouncement(announcement) {
  const { confirmed } = await confirm({
    title: 'Delete announcement?',
    message: `"${announcement.title}" will be removed for all students.`,
    confirmLabel: 'Delete',
    tone: 'danger'
  })
  if (!confirmed) return
  try {
    const result = await request(`/admin/announcements/${encodeURIComponent(announcement.id)}`, { method: 'DELETE' })
    toast.success(result.message)
    await loadAnnouncements()
  } catch (error) {
    toast.error(errorText(error, 'Announcement could not be deleted.'))
  }
}

function dateLabel(value) {
  if (!value) return '—'
  const date = parseApiDate(value)
  return date ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(date) : String(value)
}

function hours(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Number(number.toFixed(2)).toString() : '0'
}

const weekdayFormat = new Intl.DateTimeFormat('en-PH', { weekday: 'long' })
function weekdayLabel(value) {
  const date = parseApiDate(value)
  return date ? weekdayFormat.format(date) : ''
}

function activityPlace(activity) {
  return [activity.service_area, activity.location].filter(Boolean).join(' · ')
}

// The clock times of an activity's schedule ('YYYY-MM-DDTHH:MM' wall-clock values).
function activityTimes(activity) {
  return formatTimeRange(String(activity.scheduled_start || '').slice(11, 16), String(activity.scheduled_end || '').slice(11, 16))
}

// Ticks every 30s so an activity flips to "In progress" / "Ended" without a page reload.
const now = ref(Date.now())
let clockTimer = null

// Students can only register before the activity starts (the backend enforces this too),
// so the schedule outranks the admin's "Students can register" switch.
function registrationState(activity) {
  const start = parseApiDate(activity.scheduled_start)
  const end = parseApiDate(activity.scheduled_end)
  if (end && end.getTime() <= now.value) return { label: 'Ended', tone: 'ended' }
  if (start && start.getTime() <= now.value) return { label: 'In progress', tone: 'live' }
  if (!Number(activity.registration_open)) return { label: 'Closed', tone: '' }
  if (activity.capacity !== null && activity.capacity !== undefined &&
      Number(activity.registration_count) >= Number(activity.capacity)) {
    return { label: 'Full', tone: 'full' }
  }
  return { label: 'Open', tone: 'open' }
}

watch(activeTab, () => {
  activityModalOpen.value = false
  areaModalOpen.value = false
  announcementModalOpen.value = false
  participants.open = false
  serviceDay.open = false
  if (token.value) loadTab()
})
onMounted(() => {
  clockTimer = setInterval(() => { now.value = Date.now() }, 30000)
  if (authenticate()) loadTab()
})
onBeforeUnmount(() => {
  clearInterval(clockTimer)
})
</script>

<style scoped>
.page-alert { margin-bottom: 20px; align-items: center; }
.alert-info, .alert { align-items: center; }
.card-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-top: 16px; padding-bottom: 16px; }
.count { font-size: 13px; }
.spaced { margin-top: 14px; }
.page-size { display: inline-flex; align-items: center; gap: 8px; }
.page-size select { width: auto; min-height: 32px; padding: 4px 8px; font-size: 13px; }
.remark { margin-top: 6px !important; max-width: 260px; line-height: 1.45; }
.list-icon { display: grid; place-items: center; width: 38px; height: 38px; flex: 0 0 auto; border-radius: 10px; }
.file-icon { display: grid; place-items: center; width: 36px; height: 36px; flex: 0 0 auto; border-radius: 9px; background: var(--primary-soft); color: var(--primary-text); }
.doc-name { display: block; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.schedule-cell { min-width: 180px; font-size: 13px; }
.photo-pair { display: flex; gap: 8px; }
.history-toolbar { display: flex; align-items: center; gap: 10px; flex: 1 1 420px; flex-wrap: wrap; }
.history-search { flex: 1 1 240px; max-width: 420px; }
.history-month { width: auto; min-width: 170px; }
.date-tile-sm { width: 42px; height: 46px; }
.date-tile-sm strong { font-size: 16px; }
.photo-count { display: inline-flex; align-items: center; gap: 6px; color: var(--text-2); font-weight: 600; }
.photo-count svg { color: var(--text-4); }
.status-cell { min-width: 120px; }
.status-cell .badge { white-space: nowrap; }
.reg-state { display: inline-flex; align-items: center; gap: 6px; color: var(--text-3); font-weight: 600; }
.reg-state::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--text-4); }
.reg-state.open { color: var(--success); }
.reg-state.open::before { background: var(--success-solid); }
.reg-state.live { color: var(--primary-text); }
.reg-state.live::before { background: var(--primary); }
.reg-state.full { color: var(--warning); }
.reg-state.full::before { background: var(--warning-solid); }
.delta { font-weight: 700; font-variant-numeric: tabular-nums; }
.delta.plus { color: var(--success); }
.delta.minus { color: var(--danger); }
.form-actions-top { margin-top: 18px; }
.field-submit { justify-content: flex-end; padding-top: 25px; }
.type-toggle { display: flex; width: 100%; }
.type-toggle button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 34px; }
.progress-strip { padding: 12px 14px; border: 1px solid var(--primary-soft-2); border-radius: var(--radius); background: var(--primary-soft); }
.progress-strip-copy { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; color: var(--text-2); font-size: 13px; }
.progress-strip-copy strong { color: var(--text); font-size: 15px; }
.progress-strip .progress { background: #fff; }

@media (max-width: 1100px) {
  .field-submit { padding-top: 0; }
}
</style>
