<template>
  <div class="dashboard-layout">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-icon">R</div>
        <div>
          <h2>Return of Service</h2>
          <span>STUDENT PORTAL</span>
        </div>
      </div>

      <div class="profile">
        <div class="avatar">{{ initials }}</div>
        <div class="profile-copy">
          <strong>{{ displayName }}</strong>
          <small>Student Account</small>
        </div>
      </div>

      <nav class="navigation" aria-label="Student navigation">
        <p class="nav-label">MENU</p>
        <button
          v-for="item in modules"
          :key="item.id"
          type="button"
          class="nav-link"
          :class="{ active: activeModule === item.id }"
          :aria-current="activeModule === item.id ? 'page' : undefined"
          @click="selectModule(item.id)"
        >
          <span>{{ item.icon }}</span>
          {{ item.label }}
          <span v-if="item.id === 'notifications' && unreadCount" class="nav-count">
            {{ unreadCount }}
          </span>
        </button>
      </nav>

      <button class="logout-button" type="button" @click="logout">
        <span>↪</span> Sign Out
      </button>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div>
          <p class="eyebrow">RETURN OF SERVICE SYSTEM</p>
          <h1>{{ activeTitle }}</h1>
          <p>{{ activeDescription }}</p>
        </div>
        <div class="topbar-right">
          <button
            class="notification-button"
            type="button"
            aria-label="Open notifications"
            @click="selectModule('notifications')"
          >
            ♧
            <span v-if="unreadCount" class="notification-count">{{ unreadCount }}</span>
          </button>
          <div class="user-info">
            <div class="avatar small-avatar">{{ initials }}</div>
            <div>
              <strong>{{ displayName }}</strong>
              <small>{{ dashboard?.profile?.student_id || 'Student account' }}</small>
            </div>
          </div>
        </div>
      </header>

      <div v-if="pageError" class="notice notice-error" role="alert">
        <span>{{ pageError }}</span>
        <button type="button" aria-label="Dismiss error" @click="pageError = ''">×</button>
      </div>
      <div v-if="successMessage" class="notice notice-success" role="status">
        <span>{{ successMessage }}</span>
        <button type="button" aria-label="Dismiss message" @click="successMessage = ''">×</button>
      </div>

      <div v-if="loading" class="loading-panel" role="status">
        <span class="spinner"></span>
        <span>Loading your information…</span>
      </div>

      <template v-else>
        <section v-if="activeModule === 'dashboard'" class="page-content">
          <section class="welcome-banner">
            <div>
              <span class="welcome-label">RETURN OF SERVICE PROGRAM</span>
              <h2>Hello, {{ firstName }}!</h2>
              <p>Track your service hours, upcoming assignments, and important updates.</p>
              <p class="student-meta">
                {{ dashboard?.profile?.student_id || 'Student ID unavailable' }}
                <span>·</span>
                {{ dashboard?.profile?.course || 'Course unavailable' }}
                <span>·</span>
                Year {{ dashboard?.profile?.year_level || '—' }}
                <span>·</span>
                Section {{ dashboard?.profile?.section || '—' }}
              </p>
            </div>
            <div class="banner-decoration">340</div>
          </section>

          <div class="stats-grid">
            <article class="stat-card">
              <div class="stat-top"><span>Required hours</span><span class="stat-icon blue">◷</span></div>
              <strong>{{ dashboard?.progress?.requiredHours ?? 340 }}</strong>
              <small>Service-hour requirement</small>
            </article>
            <article class="stat-card">
              <div class="stat-top"><span>Completed hours</span><span class="stat-icon green">✓</span></div>
              <strong>{{ formatHours(dashboard?.progress?.completedHours) }}</strong>
              <small>Approved attendance and adjustments</small>
            </article>
            <article class="stat-card">
              <div class="stat-top"><span>Remaining hours</span><span class="stat-icon orange">⌛</span></div>
              <strong>{{ formatHours(dashboard?.progress?.remainingHours) }}</strong>
              <small>Hours left to complete</small>
            </article>
            <article class="stat-card">
              <div class="stat-top"><span>Completion</span><span class="stat-icon purple">%</span></div>
              <strong>{{ dashboard?.progress?.completionPercentage ?? 0 }}%</strong>
              <small>Progress toward 340 hours</small>
            </article>
          </div>

          <section class="content-card progress-card">
            <div class="card-heading">
              <div><h2>Overall progress</h2><p>Your approved service hours toward 340.</p></div>
              <strong>{{ dashboard?.progress?.completionPercentage ?? 0 }}%</strong>
            </div>
            <div
              class="progress-track"
              role="progressbar"
              :aria-valuenow="Math.min(100, dashboard?.progress?.completionPercentage || 0)"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div
                class="progress-fill"
                :style="{ width: `${Math.min(100, dashboard?.progress?.completionPercentage || 0)}%` }"
              ></div>
            </div>
            <div class="progress-footer">
              <span>{{ formatHours(dashboard?.progress?.completedHours) }} hours completed</span>
              <span>{{ formatHours(dashboard?.progress?.remainingHours) }} hours remaining</span>
            </div>
          </section>

          <div class="content-grid">
            <section class="content-card">
              <div class="card-heading">
                <div><h2>Recent attendance</h2><p>Your latest submissions and decisions.</p></div>
                <button class="text-button" type="button" @click="selectModule('attendance')">View all →</button>
              </div>
              <div v-if="!dashboard?.recentAttendance?.length" class="empty-state">No attendance records yet.</div>
              <div v-else class="table-wrapper">
                <table>
                  <thead><tr><th>Date</th><th>Time</th><th>Hours</th><th>Status</th></tr></thead>
                  <tbody>
                    <tr v-for="record in dashboard.recentAttendance" :key="record.id">
                      <td>{{ formatDate(record.attendance_date) }}</td>
                      <td>{{ record.time_in }}–{{ record.time_out || '—' }}</td>
                      <td>{{ formatHours(record.total_hours) }}</td>
                      <td><span class="status" :class="`status-${record.status}`">{{ titleCase(record.status) }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="content-card">
              <div class="card-heading">
                <div><h2>Upcoming assignments</h2><p>Cleaning areas assigned to you.</p></div>
                <button class="text-button" type="button" @click="selectModule('assignments')">View all →</button>
              </div>
              <div v-if="!dashboard?.upcomingAssignments?.length" class="empty-state">No upcoming assignments.</div>
              <article v-for="assignment in dashboard?.upcomingAssignments || []" :key="assignment.id" class="compact-item">
                <strong>{{ assignment.area_name }}</strong>
                <p>{{ formatDate(assignment.assigned_date) }} · {{ assignment.schedule_start || 'Time TBD' }}–{{ assignment.schedule_end || 'TBD' }}</p>
                <small>{{ assignment.location || assignment.description || 'No additional instructions.' }}</small>
              </article>
            </section>

            <section class="content-card">
              <div class="card-heading">
                <div><h2>Recent service activities</h2><p>Submitted service records.</p></div>
                <button class="text-button" type="button" @click="selectModule('activities')">View activities →</button>
              </div>
              <div v-if="!dashboard?.recentActivities?.length" class="empty-state">No service activity records.</div>
              <article v-for="activity in dashboard?.recentActivities || []" :key="activity.id" class="compact-item">
                <strong>{{ activity.activity_description }}</strong>
                <p>{{ formatDate(activity.service_date) }} · {{ formatHours(activity.total_hours) }} hours</p>
                <small>{{ activity.service_area || 'Service activity' }} · {{ titleCase(activity.status) }}</small>
              </article>
            </section>

            <section class="content-card">
              <div class="card-heading">
                <div><h2>Latest announcements</h2><p>Updates for your section.</p></div>
                <button class="text-button" type="button" @click="selectModule('announcements')">View all →</button>
              </div>
              <div v-if="!dashboard?.announcements?.length" class="empty-state">No announcements available.</div>
              <article v-for="announcement in dashboard?.announcements || []" :key="announcement.id" class="compact-item">
                <strong>{{ announcement.title }}</strong>
                <p>{{ announcement.content }}</p>
                <small>{{ formatDate(announcement.created_at) }} · {{ announcement.author || 'Administrator' }}</small>
              </article>
            </section>
          </div>
        </section>

        <section v-else-if="activeModule === 'attendance'" class="page-content">
          <div class="page-intro"><h2>My Attendance</h2><p>Submit each service day for administrator review and follow its status.</p></div>
          <section class="content-card form-card">
            <h3>Submit attendance</h3>
            <form class="form-grid" @submit.prevent="submitAttendance">
              <label><span>Attendance date</span><input v-model="attendanceForm.attendance_date" type="date" :max="today" required></label>
              <label><span>Time in</span><input v-model="attendanceForm.time_in" type="time" required></label>
              <label><span>Time out</span><input v-model="attendanceForm.time_out" type="time" required></label>
              <label>
                <span>Related service activity (optional)</span>
                <select v-model="attendanceForm.activity_id">
                  <option value="">General service</option>
                  <option
                    v-for="activity in approvedActivities"
                    :key="activity.id"
                    :value="activity.id"
                  >
                    {{ activity.title }}
                  </option>
                </select>
              </label>
              <div class="calculated-hours">
                Calculated hours <strong>{{ attendanceHoursPreview }}</strong>
              </div>
              <button class="primary-button" type="submit" :disabled="saving || !attendanceHoursPreview">
                {{ saving ? 'Submitting…' : 'Submit for review' }}
              </button>
            </form>
            <p class="form-note">Only approved attendance contributes to completed service hours. One record per date is allowed.</p>
          </section>
          <section class="content-card">
            <div class="card-heading"><div><h3>Attendance history</h3><p>Read any administrator remarks on reviewed records.</p></div></div>
            <div class="filter-row">
              <label><span>Status</span><select v-model="attendanceFilters.status"><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
              <label><span>From</span><input v-model="attendanceFilters.from" type="date"></label>
              <label><span>To</span><input v-model="attendanceFilters.to" type="date"></label>
              <label><span>Search</span><input v-model="attendanceFilters.search" type="search" placeholder="Date or remarks"></label>
              <button class="secondary-button" type="button" @click="loadAttendance">Apply filters</button>
            </div>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Date</th><th>Activity</th><th>Time in</th><th>Time out</th><th>Hours</th><th>Status</th><th>Admin remarks</th></tr></thead>
                <tbody>
                  <tr v-for="record in attendance" :key="record.id">
                    <td>{{ formatDate(record.attendance_date) }}</td><td>{{ record.activity_title || 'General service' }}</td>
                    <td>{{ record.time_in }}</td><td>{{ record.time_out || '—' }}</td><td>{{ formatHours(record.total_hours) }}</td>
                    <td><span class="status" :class="`status-${record.status}`">{{ titleCase(record.status) }}</span></td>
                    <td>{{ record.admin_remarks || '—' }}</td>
                  </tr>
                  <tr v-if="attendance.length === 0"><td colspan="7" class="empty-state">No attendance records match these filters.</td></tr>
                </tbody>
              </table>
            </div>
            <p class="list-summary">Approved attendance hours: <strong>{{ formatHours(approvedAttendanceHours) }}</strong></p>
          </section>
        </section>

        <section v-else-if="activeModule === 'activities'" class="page-content">
          <div class="page-intro"><h2>Service Activities</h2><p>Browse activities published by the administrator and manage your registration.</p></div>
          <div class="filter-row activity-search">
            <label><span>Search activities</span><input v-model="activitySearchInput" type="search" placeholder="Title, area, location"></label>
            <button class="secondary-button" type="button" @click="loadActivities">Search</button>
          </div>
          <div v-if="activities.length === 0" class="content-card empty-state">No published activities are available.</div>
          <div v-else class="activity-grid">
            <article v-for="activity in activities" :key="activity.id" class="content-card activity-card">
              <div class="activity-title-row">
                <div><p class="eyebrow">{{ activity.service_area }}</p><h3>{{ activity.title }}</h3></div>
                <span v-if="Number(activity.is_completed)" class="status status-approved">Completed</span>
              </div>
              <p class="activity-description">{{ activity.description }}</p>
              <dl class="activity-details">
                <div><dt>Location</dt><dd>{{ activity.location || activity.area_location || '—' }}</dd></div>
                <div><dt>Schedule</dt><dd>{{ formatDateTime(activity.scheduled_start) }} – {{ formatDateTime(activity.scheduled_end) }}</dd></div>
                <div><dt>Required hours</dt><dd>{{ formatHours(activity.required_hours) }}</dd></div>
                <div v-if="activity.capacity !== null"><dt>Available spaces</dt><dd>{{ Math.max(0, Number(activity.capacity) - Number(activity.registration_count)) }} of {{ activity.capacity }}</dd></div>
                <div v-if="activity.eligibility"><dt>Eligibility</dt><dd>{{ activity.eligibility }}</dd></div>
                <div><dt>Your registration</dt><dd>{{ titleCase(activity.registration_status || 'not registered') }}</dd></div>
              </dl>
              <div class="activity-actions">
                <button
                  v-if="!activity.registration_status || ['rejected', 'cancelled'].includes(activity.registration_status)"
                  class="primary-button"
                  type="button"
                  :disabled="saving || !Number(activity.registration_open) || !canRegister(activity)"
                  @click="registerActivity(activity)"
                >
                  Register
                </button>
                <button
                  v-else-if="activity.registration_status === 'pending'"
                  class="secondary-button"
                  type="button"
                  :disabled="saving"
                  @click="cancelActivity(activity)"
                >
                  Cancel registration
                </button>
                <span v-else-if="activity.registration_status === 'approved'" class="approved-note">Registration approved</span>
                <span v-else class="status status-rejected">{{ titleCase(activity.registration_status) }}</span>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="activeModule === 'assignments'" class="page-content">
          <div class="page-intro"><h2>My Assignments</h2><p>Service areas, schedules, and instructions assigned to your account.</p></div>
          <div v-if="assignments.length === 0" class="content-card empty-state">No assignments have been made for your account.</div>
          <div v-else class="table-wrapper content-card">
            <table>
              <thead><tr><th>Assigned date</th><th>Area</th><th>Schedule</th><th>Location</th><th>Instructions</th><th>Tracking</th></tr></thead>
              <tbody>
                <tr v-for="assignment in assignments" :key="assignment.id">
                  <td>{{ formatDate(assignment.assigned_date) }}</td><td>{{ assignment.area_name }}</td>
                  <td>{{ assignment.schedule_start || 'TBD' }}–{{ assignment.schedule_end || 'TBD' }}</td>
                  <td>{{ assignment.location || '—' }}</td><td>{{ assignment.description || '—' }}</td>
                  <td><span class="status status-pending">Assigned</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="assignments.length" class="form-note">The current database does not store assignment completion or cancellation status, so this page does not infer those states.</p>
        </section>

        <section v-else-if="activeModule === 'hours'" class="page-content">
          <div class="page-intro"><h2>My Service Hours</h2><p>Only approved attendance and administrator-recorded adjustments affect your total.</p></div>
          <div class="stats-grid hours-stats">
            <article class="stat-card"><div class="stat-top"><span>Required</span><span class="stat-icon blue">◷</span></div><strong>{{ hoursData?.progress?.requiredHours ?? 340 }}</strong></article>
            <article class="stat-card"><div class="stat-top"><span>Completed</span><span class="stat-icon green">✓</span></div><strong>{{ formatHours(hoursData?.progress?.completedHours) }}</strong></article>
            <article class="stat-card"><div class="stat-top"><span>Remaining</span><span class="stat-icon orange">⌛</span></div><strong>{{ formatHours(hoursData?.progress?.remainingHours) }}</strong></article>
            <article class="stat-card"><div class="stat-top"><span>Completion</span><span class="stat-icon purple">%</span></div><strong>{{ hoursData?.progress?.completionPercentage ?? 0 }}%</strong></article>
          </div>
          <section class="content-card">
            <div class="card-heading"><div><h3>Hour history</h3><p>Pending and rejected attendance do not count toward your total.</p></div></div>
            <div class="filter-row">
              <label><span>From</span><input v-model="hoursFilters.from" type="date"></label>
              <label><span>To</span><input v-model="hoursFilters.to" type="date"></label>
              <label><span>Status</span><select v-model="hoursFilters.status"><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
              <label><span>Search</span><input v-model="hoursFilters.search" type="search" placeholder="Activity, source, remarks"></label>
              <button class="secondary-button" type="button" @click="loadHours">Apply filters</button>
            </div>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Date</th><th>Activity / reason</th><th>Hours</th><th>Source</th><th>Status</th><th>Counted</th><th>Remarks</th></tr></thead>
                <tbody>
                  <tr v-for="entry in hoursData?.history || []" :key="`${entry.source}-${entry.id}`">
                    <td>{{ formatDate(entry.history_date) }}</td><td>{{ entry.activity || '—' }}</td>
                    <td>{{ formatHours(entry.hours) }}</td><td>{{ titleCase(entry.source.replace('_', ' ')) }}</td>
                    <td><span class="status" :class="`status-${entry.status}`">{{ titleCase(entry.status) }}</span></td>
                    <td>{{ formatHours(entry.counted_hours) }}</td><td>{{ entry.remarks || '—' }}</td>
                  </tr>
                  <tr v-if="!hoursData?.history?.length"><td colspan="7" class="empty-state">No service-hour history found.</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <section v-else-if="activeModule === 'documents'" class="page-content">
          <div class="page-intro"><h2>My Documents</h2><p>Upload PDF or image documents and follow administrator review.</p></div>
          <section class="content-card form-card">
            <h3>Submit a document</h3>
            <form class="form-grid document-form" @submit.prevent="submitDocument">
              <label><span>Document type</span><input v-model="documentForm.document_type" maxlength="100" required placeholder="e.g. Service agreement"></label>
              <label><span>Description (optional)</span><input v-model="documentForm.description" maxlength="1000" placeholder="Add a short description"></label>
              <label class="file-field"><span>File (PDF, JPEG, PNG, or WebP; up to 5 MB)</span><input ref="documentFileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" required @change="documentForm.file = $event.target.files?.[0] || null"></label>
              <button class="primary-button" type="submit" :disabled="saving || !documentForm.file">{{ saving ? 'Uploading…' : 'Upload document' }}</button>
            </form>
          </section>
          <section class="content-card">
            <div class="card-heading"><div><h3>Submitted documents</h3><p>Only you and authorized administrators can access your files.</p></div></div>
            <div v-if="documents.length === 0" class="empty-state">You have not submitted any documents.</div>
            <div v-else class="table-wrapper">
              <table>
                <thead><tr><th>Document</th><th>Type</th><th>Submitted</th><th>Status</th><th>Admin remarks</th><th>Actions</th></tr></thead>
                <tbody>
                  <tr v-for="document in documents" :key="document.id">
                    <td>{{ document.document_name }}</td><td>{{ document.document_type || '—' }}</td>
                    <td>{{ formatDate(document.submitted_at) }}</td>
                    <td><span class="status" :class="`status-${document.status}`">{{ titleCase(document.status) }}</span></td>
                    <td>{{ document.admin_remarks || '—' }}</td>
                    <td class="action-cell">
                      <button class="text-button" type="button" @click="downloadDocument(document)">View / download</button>
                      <button v-if="document.can_delete" class="danger-text-button" type="button" @click="deleteDocument(document)">Delete</button>
                      <button v-if="document.status === 'rejected'" class="text-button" type="button" @click="prepareReplacement">Submit replacement</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <section v-else-if="activeModule === 'announcements'" class="page-content">
          <div class="page-intro"><h2>Announcements</h2><p>Published updates for all students or your section.</p></div>
          <div class="filter-row">
            <label><span>Search announcements</span><input v-model="announcementSearch" type="search" placeholder="Search title or content"></label>
            <button class="secondary-button" type="button" @click="loadAnnouncements">Search</button>
          </div>
          <div v-if="announcements.length === 0" class="content-card empty-state">No announcements match your search.</div>
          <article v-for="announcement in announcements" :key="announcement.id" class="content-card announcement-card">
            <div class="announcement-header"><div><h3>{{ announcement.title }}</h3><small>{{ formatDate(announcement.created_at) }} · {{ announcement.author || 'Administrator' }}</small></div></div>
            <p>{{ announcement.content }}</p>
          </article>
          <p class="form-note">The existing announcement schema has no category, importance, publication, or per-student read fields. Records currently present in the table are shown as published.</p>
        </section>

        <section v-else-if="activeModule === 'notifications'" class="page-content">
          <div class="page-intro page-intro-actions">
            <div><h2>Notifications</h2><p>{{ unreadCount }} unread notifications.</p></div>
            <button class="secondary-button" type="button" :disabled="!unreadCount || saving" @click="markAllNotificationsRead">Mark all as read</button>
          </div>
          <div class="filter-row">
            <label><span>Show</span><select v-model="notificationFilter" @change="loadNotifications"><option value="">All notifications</option><option value="unread">Unread</option><option value="read">Read</option></select></label>
          </div>
          <div v-if="notifications.length === 0" class="content-card empty-state">No notifications to display.</div>
          <article v-for="notification in notifications" :key="notification.id" class="content-card notification-card" :class="{ unread: !Number(notification.is_read) }">
            <div class="notification-copy"><strong>{{ notification.title }}</strong><p>{{ notification.message }}</p><small>{{ formatDateTime(notification.created_at) }}</small></div>
            <button v-if="!Number(notification.is_read)" class="text-button" type="button" @click="markNotificationRead(notification)">Mark read</button>
            <span v-else class="read-label">Read</span>
          </article>
        </section>

        <section v-else-if="activeModule === 'profile'" class="page-content">
          <div class="page-intro"><h2>My Profile</h2><p>Update permitted personal details. Account and academic records are read-only.</p></div>
          <section v-if="profile" class="content-card profile-card">
            <form class="form-grid profile-form" @submit.prevent="saveProfile">
              <label><span>First name</span><input v-model="profileForm.first_name" maxlength="100" required></label>
              <label><span>Middle name</span><input v-model="profileForm.middle_name" maxlength="100"></label>
              <label><span>Last name</span><input v-model="profileForm.last_name" maxlength="100" required></label>
              <label><span>Contact number</span><input v-model="profileForm.contact_number" maxlength="100" autocomplete="tel"></label>
              <label><span>Email (verification is not configured)</span><input :value="profile.email" disabled></label>
              <label><span>Student ID</span><input :value="profile.student_id || '—'" disabled></label>
              <label><span>Course</span><input :value="profile.course || '—'" disabled></label>
              <label><span>Year level</span><input :value="profile.year_level || '—'" disabled></label>
              <label><span>Section</span><input :value="profile.section || '—'" disabled></label>
              <label><span>Account status</span><input :value="titleCase(profile.account_status)" disabled></label>
              <label><span>Registration date</span><input :value="formatDate(profile.registration_date)" disabled></label>
              <div class="button-row">
                <button class="primary-button" type="submit" :disabled="saving">Save changes</button>
                <button class="secondary-button" type="button" :disabled="saving" @click="resetProfileForm">Cancel</button>
              </div>
            </form>
          </section>
        </section>

        <section v-else-if="activeModule === 'settings'" class="page-content">
          <div class="page-intro"><h2>Settings</h2><p>Manage your password and review this browser session.</p></div>
          <section class="content-card form-card">
            <h3>Change password</h3>
            <form class="form-grid password-form" @submit.prevent="changePassword">
              <label><span>Current password</span><input v-model="passwordForm.currentPassword" type="password" autocomplete="current-password" required></label>
              <label><span>New password (at least 8 characters)</span><input v-model="passwordForm.newPassword" type="password" minlength="8" autocomplete="new-password" required></label>
              <label><span>Confirm new password</span><input v-model="passwordForm.confirmPassword" type="password" minlength="8" autocomplete="new-password" required></label>
              <button class="primary-button" type="submit" :disabled="saving">Change password</button>
            </form>
          </section>
          <section class="content-card account-card">
            <h3>Account and session</h3>
            <dl class="account-details">
              <div><dt>Status</dt><dd>{{ titleCase(profile?.account_status || dashboard?.profile?.account_status) }}</dd></div>
              <div><dt>Signed in as</dt><dd>{{ profile?.email || dashboard?.profile?.email || '—' }}</dd></div>
              <div><dt>Session storage</dt><dd>{{ sessionIsPersistent ? 'Remembered in this browser' : 'Temporary browser session' }}</dd></div>
            </dl>
            <button class="danger-button" type="button" @click="logout">Sign out</button>
          </section>
        </section>
      </template>

      <footer class="dashboard-footer">Return of Service System · Student Portal</footer>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const router = useRouter()
const modules = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'attendance', label: 'My Attendance', icon: '◷' },
  { id: 'activities', label: 'Service Activities', icon: '◈' },
  { id: 'assignments', label: 'My Assignments', icon: '⌂' },
  { id: 'hours', label: 'My Service Hours', icon: '◴' },
  { id: 'documents', label: 'My Documents', icon: '▤' },
  { id: 'announcements', label: 'Announcements', icon: '♧' },
  { id: 'notifications', label: 'Notifications', icon: '●' },
  { id: 'profile', label: 'My Profile', icon: '♙' },
  { id: 'settings', label: 'Settings', icon: '⚙' }
]

const activeModule = ref('dashboard')
const token = ref('')
const sessionIsPersistent = ref(false)
const loading = ref(false)
const saving = ref(false)
const pageError = ref('')
const successMessage = ref('')
const dashboard = ref(null)
const attendance = ref([])
const approvedAttendanceHours = ref(0)
const activities = ref([])
const assignments = ref([])
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
  attendance_date: new Date().toISOString().slice(0, 10),
  time_in: '',
  time_out: '',
  activity_id: ''
})
const documentForm = reactive({ document_type: '', description: '', file: null })
const documentFileInput = ref(null)
const profileForm = reactive({ first_name: '', middle_name: '', last_name: '', contact_number: '' })
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })

const today = new Date().toISOString().slice(0, 10)
const displayName = computed(() => {
  const person = profile.value || dashboard.value?.profile
  return person
    ? [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(' ')
    : 'Student'
})
const firstName = computed(() => (profile.value || dashboard.value?.profile)?.first_name || 'Student')
const initials = computed(() => {
  const person = profile.value || dashboard.value?.profile
  return `${person?.first_name?.charAt(0) || 'S'}${person?.last_name?.charAt(0) || 'P'}`.toUpperCase()
})
const activeTitle = computed(() => modules.find(item => item.id === activeModule.value)?.label || 'Student Dashboard')
const activeDescription = computed(() => ({
  dashboard: 'Your Return of Service progress at a glance.',
  attendance: 'Submit service attendance and review its status.',
  activities: 'Browse published activities and manage registrations.',
  assignments: 'View your assigned service areas and schedules.',
  hours: 'Review approved hours and hour adjustments.',
  documents: 'Submit documents and check their review status.',
  announcements: 'Read updates for all students or your section.',
  notifications: 'Review and manage your account notifications.',
  profile: 'Maintain the personal details you are permitted to change.',
  settings: 'Change your password and manage this session.'
}[activeModule.value] || ''))
const approvedActivities = computed(() =>
  activities.value.filter(activity => activity.registration_status === 'approved' && !Number(activity.is_completed))
)
const attendanceHoursPreview = computed(() => {
  if (!attendanceForm.time_in || !attendanceForm.time_out) return ''
  const start = attendanceForm.time_in.split(':').map(Number)
  const end = attendanceForm.time_out.split(':').map(Number)
  const minutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1])
  return minutes > 0 ? `${(minutes / 60).toFixed(2)} hours` : ''
})

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
  const persistentToken = localStorage.getItem('rss_token')
  const sessionToken = sessionStorage.getItem('rss_token')
  const storedUser = localStorage.getItem('rss_user') || sessionStorage.getItem('rss_user')
  const activeToken = persistentToken || sessionToken

  if (!activeToken || !storedUser) {
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
  if (!user || user.role !== 'student') {
    router.replace('/login')
    return false
  }

  token.value = activeToken
  sessionIsPersistent.value = Boolean(persistentToken)
  return true
}

function setProfileForm(value) {
  profileForm.first_name = value?.first_name || ''
  profileForm.middle_name = value?.middle_name || ''
  profileForm.last_name = value?.last_name || ''
  profileForm.contact_number = value?.contact_number || ''
}

async function loadModule(module = activeModule.value) {
  pageError.value = ''
  loading.value = true
  try {
    if (module === 'dashboard') {
      dashboard.value = await request('/student/dashboard')
      unreadCount.value = dashboard.value.unreadNotificationCount
    } else if (module === 'attendance') {
      await Promise.all([loadAttendance(), loadActivities()])
    } else if (module === 'activities') {
      await loadActivities()
    } else if (module === 'assignments') {
      const data = await request('/student/assignments')
      assignments.value = data.assignments
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
    pageError.value = error instanceof Error ? error.message : 'Failed to load this section.'
  } finally {
    loading.value = false
  }
}

function selectModule(module) {
  activeModule.value = module
  successMessage.value = ''
  loadModule(module)
}

function buildQuery(filters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  return params.toString()
}

async function loadAttendance() {
  const query = buildQuery(attendanceFilters)
  const data = await request(`/student/attendance${query ? `?${query}` : ''}`)
  attendance.value = data.attendance
  approvedAttendanceHours.value = data.approvedHours
}

async function submitAttendance() {
  if (saving.value) return
  saving.value = true
  pageError.value = ''
  successMessage.value = ''
  try {
    const data = await request('/student/attendance', {
      method: 'POST',
      body: JSON.stringify({
        ...attendanceForm,
        activity_id: attendanceForm.activity_id || null
      })
    })
    successMessage.value = data.message
    attendanceForm.time_in = ''
    attendanceForm.time_out = ''
    attendanceForm.activity_id = ''
    await Promise.all([loadAttendance(), loadActivities()])
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Attendance could not be submitted.'
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
  const start = new Date(activity.scheduled_start)
  return activity.activity_status === 'published' &&
    Number(activity.registration_open) === 1 &&
    !Number.isNaN(start.getTime()) &&
    start > new Date()
}

async function registerActivity(activity) {
  if (saving.value) return
  saving.value = true
  pageError.value = ''
  successMessage.value = ''
  try {
    const data = await request(`/student/activities/${encodeURIComponent(activity.id)}/register`, {
      method: 'POST',
      body: JSON.stringify({})
    })
    successMessage.value = data.message
    await loadActivities()
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Activity registration failed.'
  } finally {
    saving.value = false
  }
}

async function cancelActivity(activity) {
  if (!window.confirm(`Cancel your registration for "${activity.title}"?`)) return
  saving.value = true
  pageError.value = ''
  successMessage.value = ''
  try {
    const data = await request(`/student/activities/${encodeURIComponent(activity.id)}/register`, {
      method: 'DELETE'
    })
    successMessage.value = data.message
    await loadActivities()
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Activity registration could not be cancelled.'
  } finally {
    saving.value = false
  }
}

async function loadHours() {
  const query = buildQuery(hoursFilters)
  hoursData.value = await request(`/student/service-hours${query ? `?${query}` : ''}`)
}

async function submitDocument() {
  if (saving.value || !documentForm.file) return
  saving.value = true
  pageError.value = ''
  successMessage.value = ''
  try {
    const body = new FormData()
    body.append('document_type', documentForm.document_type)
    body.append('description', documentForm.description)
    body.append('file', documentForm.file)
    const result = await request('/student/documents', { method: 'POST', body })
    successMessage.value = result.message
    documentForm.document_type = ''
    documentForm.description = ''
    documentForm.file = null
    if (documentFileInput.value) documentFileInput.value.value = ''
    await loadModule('documents')
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Document upload failed.'
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
    pageError.value = error instanceof Error ? error.message : 'Document could not be downloaded.'
  }
}

async function deleteDocument(document) {
  if (!window.confirm(`Delete the unreviewed document "${document.document_name}"?`)) return
  saving.value = true
  pageError.value = ''
  successMessage.value = ''
  try {
    const result = await request(`/student/documents/${encodeURIComponent(document.id)}`, { method: 'DELETE' })
    successMessage.value = result.message
    await loadModule('documents')
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Document could not be deleted.'
  } finally {
    saving.value = false
  }
}

function prepareReplacement() {
  documentFileInput.value?.focus()
  window.scrollTo({ top: 0, behavior: 'smooth' })
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

async function markNotificationRead(notification) {
  try {
    const result = await request(`/student/notifications/${encodeURIComponent(notification.id)}/read`, {
      method: 'PATCH',
      body: JSON.stringify({})
    })
    successMessage.value = result.message
    await loadNotifications()
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Notification could not be updated.'
  }
}

async function markAllNotificationsRead() {
  saving.value = true
  try {
    await request('/student/notifications/read-all', {
      method: 'PATCH',
      body: JSON.stringify({})
    })
    successMessage.value = 'All notifications marked as read.'
    await loadNotifications()
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Notifications could not be updated.'
  } finally {
    saving.value = false
  }
}

async function saveProfile() {
  saving.value = true
  pageError.value = ''
  successMessage.value = ''
  try {
    const result = await request('/student/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileForm)
    })
    successMessage.value = result.message
    const refreshed = await request('/student/profile')
    profile.value = refreshed.profile
    setProfileForm(refreshed.profile)
    if (dashboard.value) {
      dashboard.value.profile = { ...dashboard.value.profile, ...refreshed.profile }
    }
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Profile could not be updated.'
  } finally {
    saving.value = false
  }
}

function resetProfileForm() {
  setProfileForm(profile.value)
  pageError.value = ''
  successMessage.value = ''
}

async function changePassword() {
  saving.value = true
  pageError.value = ''
  successMessage.value = ''
  try {
    const result = await request('/student/change-password', {
      method: 'PATCH',
      body: JSON.stringify(passwordForm)
    })
    successMessage.value = result.message
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Password could not be changed.'
  } finally {
    saving.value = false
  }
}

function logout() {
  localStorage.removeItem('rss_token')
  localStorage.removeItem('rss_user')
  sessionStorage.removeItem('rss_token')
  sessionStorage.removeItem('rss_user')
  router.replace('/login')
}

function formatHours(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Number(number.toFixed(2)).toString() : '0'
}

function formatDate(value) {
  if (!value) return '—'
  const text = String(value)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T00:00:00`)
    : new Date(text)
  if (Number.isNaN(date.getTime())) return text
  return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(date)
}

function titleCase(value) {
  return value ? String(value).replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : '—'
}

onMounted(() => {
  if (getSession()) loadModule('dashboard')
})
</script>

<style scoped>
* { box-sizing: border-box; }
.dashboard-layout { min-height: 100vh; display: flex; background: #f5f7fb; color: #172033; font-family: Inter, Arial, sans-serif; }
.sidebar { width: 255px; min-width: 255px; min-height: 100vh; display: flex; flex-direction: column; padding: 24px 16px 18px; background: #14243b; color: #fff; }
.brand, .profile, .user-info { display: flex; align-items: center; gap: 12px; }
.brand { padding: 0 7px 25px; }
.brand-icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 12px; background: #3478f6; font-size: 22px; font-weight: 800; }
.brand h2 { margin: 0 0 5px; font-size: 14px; }
.brand span, .eyebrow { color: #9cacc1; font-size: 9px; letter-spacing: 1.4px; }
.profile { margin-bottom: 20px; padding: 14px 10px; border-radius: 10px; background: #203550; }
.avatar { width: 38px; height: 38px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 50%; background: #dce9ff; color: #245bb6; font-size: 12px; font-weight: 800; }
.profile-copy { min-width: 0; }
.profile strong, .user-info strong { display: block; overflow: hidden; color: inherit; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.profile small, .user-info small { display: block; margin-top: 5px; color: #a8b7ca; font-size: 9px; }
.navigation { display: flex; flex: 1; flex-direction: column; gap: 4px; overflow-y: auto; }
.nav-label { margin: 7px 10px 8px; color: #8294aa; font-size: 9px; letter-spacing: 1.4px; }
.nav-link { width: 100%; min-height: 39px; display: flex; align-items: center; gap: 11px; padding: 9px 11px; border: 0; border-radius: 8px; background: transparent; color: #b8c6d8; text-align: left; font-size: 11px; cursor: pointer; }
.nav-link > span:first-child { width: 18px; text-align: center; font-size: 15px; }
.nav-link:hover, .nav-link.active { background: #2d65b7; color: #fff; }
.nav-count { min-width: 18px; margin-left: auto; padding: 3px 5px; border-radius: 10px; background: #f4a647; color: #16253b; font-size: 9px; font-weight: 700; text-align: center; }
.logout-button { margin-top: 16px; padding: 12px; border: 1px solid #3a4c64; border-radius: 8px; background: transparent; color: #e4eaf2; text-align: left; font-size: 11px; cursor: pointer; }
.logout-button span { margin-right: 9px; }
.main-content { min-width: 0; flex: 1; display: flex; flex-direction: column; padding: 25px 32px 18px; }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
.topbar h1 { margin: 5px 0 6px; font-size: 23px; }
.topbar > div:first-child > p:last-child, .page-intro p { margin: 0; color: #8590a2; font-size: 11px; line-height: 1.5; }
.topbar .eyebrow { margin: 0; color: #8d99aa; }
.topbar-right { display: flex; align-items: center; gap: 14px; }
.notification-button { position: relative; width: 38px; height: 38px; border: 1px solid #e5e9f0; border-radius: 9px; background: #fff; color: #44546c; cursor: pointer; }
.notification-count { position: absolute; top: -6px; right: -6px; min-width: 17px; padding: 2px 4px; border-radius: 10px; background: #e3635d; color: white; font-size: 9px; }
.user-info { padding-left: 13px; border-left: 1px solid #e2e6ed; }
.user-info strong { color: #172033; }
.user-info small { color: #8994a4; }
.small-avatar { width: 34px; height: 34px; }
.page-content { width: 100%; max-width: 1500px; flex: 1; margin: 0 auto; }
.welcome-banner { display: flex; align-items: center; justify-content: space-between; gap: 16px; overflow: hidden; margin-bottom: 20px; padding: 25px 28px; border-radius: 14px; background: linear-gradient(110deg, #1c4380, #3478e5); color: #fff; }
.welcome-label { color: #c8dcff; font-size: 9px; letter-spacing: 1.5px; }
.welcome-banner h2 { margin: 8px 0; font-size: 22px; }
.welcome-banner p { max-width: 600px; margin: 0; color: #e0eaff; font-size: 11px; line-height: 1.6; }
.student-meta { margin-top: 10px !important; color: #c8dcff !important; }
.student-meta span { margin: 0 4px; }
.banner-decoration { color: rgba(255,255,255,.15); font-size: 65px; font-weight: 800; }
.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 13px; margin-bottom: 16px; }
.stat-card, .content-card { min-width: 0; padding: 17px; border: 1px solid #e9edf3; border-radius: 11px; background: #fff; box-shadow: 0 3px 12px rgba(20,40,70,.025); }
.stat-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #7d899a; font-size: 10px; }
.stat-icon { width: 31px; height: 31px; display: grid; place-items: center; border-radius: 9px; font-weight: 700; }
.blue { background: #e8f0ff; color: #3478e5; }
.green { background: #e4f7ed; color: #20a267; }
.orange { background: #fff2df; color: #df922a; }
.purple { background: #f0eaff; color: #8054d8; }
.stat-card > strong { display: block; margin: 12px 0 4px; color: #18263c; font-size: 24px; }
.stat-card small { color: #929cad; font-size: 9px; }
.progress-card { margin-bottom: 16px; }
.card-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 15px; }
.card-heading h2, .card-heading h3, .form-card h3, .account-card h3 { margin: 0 0 5px; color: #26364d; font-size: 13px; }
.card-heading p { margin: 0; color: #8590a2; font-size: 10px; }
.card-heading > strong { color: #3478e5; font-size: 18px; }
.progress-track { height: 9px; overflow: hidden; border-radius: 10px; background: #edf1f7; }
.progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #3478e5, #51a0fa); transition: width .3s ease; }
.progress-footer { display: flex; justify-content: space-between; gap: 10px; margin-top: 9px; color: #8792a3; font-size: 9px; }
.content-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px; }
.text-button, .danger-text-button { padding: 4px; border: 0; background: transparent; color: #3478e5; font-size: 10px; font-weight: 700; cursor: pointer; }
.danger-text-button { color: #b34141; }
.table-wrapper { width: 100%; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th { padding: 10px 8px; background: #f8f9fc; color: #8994a4; font-size: 9px; font-weight: 700; white-space: nowrap; }
td { padding: 11px 8px; border-bottom: 1px solid #edf0f5; color: #536075; font-size: 10px; vertical-align: top; }
.status { display: inline-flex; padding: 4px 7px; border-radius: 20px; font-size: 9px; font-weight: 700; white-space: nowrap; }
.status-approved { background: #e5f7ed; color: #19945c; }
.status-pending { background: #fff3dc; color: #c48622; }
.status-rejected { background: #ffeded; color: #b34141; }
.status-cancelled { background: #edf0f5; color: #637087; }
.empty-state { padding: 24px 12px; color: #8a95a5; font-size: 11px; text-align: center; }
.compact-item { padding: 11px 0; border-top: 1px solid #edf0f5; }
.compact-item:first-of-type { border-top: 0; }
.compact-item strong { color: #334258; font-size: 11px; }
.compact-item p { margin: 5px 0; color: #66758a; font-size: 10px; line-height: 1.5; }
.compact-item small { color: #8994a4; font-size: 9px; line-height: 1.5; }
.page-intro { margin: 0 0 17px; }
.page-intro h2 { margin: 0 0 6px; color: #1d2b42; font-size: 19px; }
.content-card + .content-card { margin-top: 15px; }
.form-card { margin-bottom: 15px; }
.form-card h3 { margin-bottom: 15px; }
.form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: end; gap: 13px; }
.form-grid label, .filter-row label { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.form-grid label > span, .filter-row label > span { color: #69788d; font-size: 10px; font-weight: 700; }
.form-grid input, .form-grid select, .filter-row input, .filter-row select { width: 100%; min-height: 37px; padding: 8px 10px; border: 1px solid #dfe5ed; border-radius: 7px; outline: none; background: white; color: #334258; font: inherit; font-size: 10px; }
.form-grid input:focus, .form-grid select:focus, .filter-row input:focus, .filter-row select:focus { border-color: #3478e5; box-shadow: 0 0 0 3px rgba(52,120,229,.1); }
.primary-button, .secondary-button, .danger-button { min-height: 36px; padding: 8px 13px; border: 1px solid transparent; border-radius: 7px; font-size: 10px; font-weight: 700; cursor: pointer; }
.primary-button { background: #3478e5; color: #fff; }
.secondary-button { border-color: #dfe5ed; background: #fff; color: #40536f; }
.danger-button { background: #c94d4d; color: #fff; }
button:disabled { cursor: not-allowed; opacity: .6; }
.calculated-hours { color: #718096; font-size: 10px; }
.calculated-hours strong { display: block; margin-top: 5px; color: #1f3d68; font-size: 14px; }
.form-note { margin: 10px 0 0; color: #8792a3; font-size: 9px; line-height: 1.6; }
.filter-row { display: flex; align-items: end; flex-wrap: wrap; gap: 10px; margin: 8px 0 13px; }
.filter-row label { min-width: 125px; flex: 1 1 135px; }
.list-summary { margin: 12px 0 0; color: #66758a; font-size: 10px; }
.activity-search { margin-bottom: 14px; }
.activity-search label { max-width: 380px; }
.activity-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.activity-card { display: flex; flex-direction: column; }
.activity-title-row, .announcement-header, .notification-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.activity-title-row h3, .announcement-card h3 { margin: 5px 0; color: #26364d; font-size: 14px; }
.activity-description, .announcement-card > p { margin: 8px 0; color: #59677b; font-size: 11px; line-height: 1.6; }
.activity-details, .account-details { margin: 9px 0; }
.activity-details div, .account-details div { display: grid; grid-template-columns: 105px minmax(0, 1fr); gap: 8px; padding: 6px 0; border-top: 1px solid #f0f2f6; }
.activity-details dt, .account-details dt { color: #8691a2; font-size: 9px; }
.activity-details dd, .account-details dd { margin: 0; color: #415169; font-size: 10px; overflow-wrap: anywhere; }
.activity-actions { margin-top: auto; padding-top: 10px; }
.approved-note { color: #168252; font-size: 10px; font-weight: 700; }
.hours-stats { margin-bottom: 15px; }
.document-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.file-field { grid-column: span 2; }
.file-field input { padding: 6px; }
.action-cell { min-width: 130px; }
.action-cell button { display: block; text-align: left; }
.announcement-card { margin-bottom: 12px; }
.announcement-header small, .notification-card small { color: #8994a4; font-size: 9px; }
.announcement-card > p { white-space: pre-wrap; }
.notification-card { align-items: center; margin-bottom: 10px; }
.notification-card.unread { border-left: 3px solid #3478e5; }
.notification-copy { min-width: 0; }
.notification-copy strong { color: #2d3e56; font-size: 11px; }
.notification-copy p { margin: 5px 0; color: #66758a; font-size: 10px; line-height: 1.5; }
.read-label { color: #8994a4; font-size: 9px; }
.profile-card { padding: 22px; }
.profile-form { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.profile-form input:disabled { background: #f5f7fa; color: #778398; }
.button-row { display: flex; gap: 8px; }
.password-form { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.account-card h3 { margin-bottom: 12px; }
.account-details { max-width: 600px; margin-bottom: 16px; }
.page-intro-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.notice { display: flex; justify-content: space-between; gap: 12px; margin: 0 0 13px; padding: 11px 13px; border-radius: 8px; font-size: 10px; line-height: 1.5; }
.notice button { border: 0; background: transparent; color: inherit; font-size: 17px; cursor: pointer; }
.notice-error { border: 1px solid #f4c9c9; background: #fff3f3; color: #a83b3b; }
.notice-success { border: 1px solid #bfe7d2; background: #effaf4; color: #18764d; }
.loading-panel { min-height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #758399; font-size: 11px; }
.spinner { width: 25px; height: 25px; border: 3px solid #dce7f8; border-top-color: #3478f6; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.dashboard-footer { margin-top: auto; padding: 24px 0 4px; color: #9ba5b3; font-size: 9px; text-align: center; }

@media (max-width: 1100px) {
  .sidebar { width: 225px; min-width: 225px; }
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .content-grid, .activity-grid { grid-template-columns: 1fr; }
  .form-grid, .profile-form, .password-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .dashboard-layout { display: block; }
  .sidebar { width: 100%; min-width: 0; min-height: auto; padding: 13px; }
  .brand { padding-bottom: 12px; }
  .profile, .logout-button { display: none; }
  .navigation { display: flex; flex-direction: row; overflow-x: auto; }
  .nav-label { display: none; }
  .nav-link { width: auto; flex: 0 0 auto; white-space: nowrap; }
  .main-content { padding: 18px 14px; }
  .topbar { align-items: flex-start; }
  .topbar h1 { font-size: 19px; }
  .user-info { display: none; }
  .welcome-banner { padding: 20px; }
  .banner-decoration { font-size: 40px; }
}
@media (max-width: 470px) {
  .stats-grid { gap: 8px; }
  .stat-card { padding: 12px; }
  .stat-card > strong { font-size: 20px; }
  .form-grid, .profile-form, .password-form, .document-form { grid-template-columns: 1fr; }
  .file-field { grid-column: auto; }
  .progress-footer { flex-direction: column; }
  .filter-row { align-items: stretch; }
  .filter-row label { flex-basis: 100%; }
  .page-intro-actions { align-items: flex-start; flex-direction: column; }
}
</style>
