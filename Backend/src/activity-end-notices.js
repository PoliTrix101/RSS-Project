const { randomUUID } = require('crypto')
const db = require('./db')
const { nowInAppZone } = require('./app-time')

// Once an activity's end time passes, every student with an approved registration
// gets one notification asking them to log the time they started and finished.
// The admin's activity list shows the activity as "Done" from then on.

const SWEEP_INTERVAL_MS = 60 * 1000

// Activities that ended earlier than this are skipped, so switching the feature on
// (or restarting after a long outage) doesn't send students notices for old activities.
const LOOKBACK_MODIFIER = '-2 days'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// '2026-11-25T10:00' (local wall-clock time) → '10:00 AM on Nov 25, 2026'
function describeEnd(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(value))
  if (!match) return String(value)
  const [, year, month, day, hour, minute] = match
  const hours = Number(hour)
  return `${hours % 12 || 12}:${minute} ${hours >= 12 ? 'PM' : 'AM'} on ${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`
}

function noticeFor(activity) {
  return {
    title: `Activity done: ${activity.title}`,
    message: `"${activity.title}" ended at ${describeEnd(activity.scheduled_end)}. ` +
      'Log your attendance now: record the time you started and the time you finished, ' +
      'and upload a photo from before and after, so an administrator can review your hours.'
  }
}

async function notifyActivity(activity) {
  let transaction
  try {
    transaction = await db.transaction('write')

    // Claim the activity first so it is announced once, even if two servers run the sweep.
    const claim = await transaction.execute({
      sql: `
        UPDATE service_activities
        SET ended_notified_at = CURRENT_TIMESTAMP
        WHERE id = ? AND ended_notified_at IS NULL AND status = 'published'
      `,
      args: [activity.id]
    })
    if (Number(claim.rowsAffected) === 0) {
      await transaction.rollback()
      transaction = null
      return 0
    }

    // Students who already logged time for this activity don't need the reminder.
    const students = await transaction.execute({
      sql: `
        SELECT r.student_id
        FROM activity_registrations r
        JOIN users u ON u.id = r.student_id
        WHERE r.activity_id = ?
          AND r.status = 'approved'
          AND u.account_status = 'approved'
          AND NOT EXISTS (
            SELECT 1 FROM attendance t
            WHERE t.activity_id = r.activity_id
              AND t.student_id = r.student_id
              AND t.status IN ('pending', 'approved')
          )
      `,
      args: [activity.id]
    })

    const { title, message } = noticeFor(activity)
    for (const row of students.rows) {
      await transaction.execute({
        sql: `
          INSERT INTO notifications (id, user_id, title, message)
          VALUES (?, ?, ?, ?)
        `,
        args: [randomUUID(), row.student_id, title, message]
      })
    }

    await transaction.commit()
    transaction = null
    return students.rows.length
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback()
      } catch (rollbackError) {
        console.error('Failed to roll back activity end notice:', rollbackError)
      }
    }
    throw error
  }
}

// Announces every published activity that has ended since the last sweep.
// Returns how many student notifications were created.
async function notifyEndedActivities(now = nowInAppZone()) {
  const ended = await db.execute({
    sql: `
      SELECT id, title, scheduled_end
      FROM service_activities
      WHERE status = 'published'
        AND ended_notified_at IS NULL
        AND datetime(scheduled_end) <= datetime(?)
        AND datetime(scheduled_end) > datetime(?, '${LOOKBACK_MODIFIER}')
      ORDER BY scheduled_end
    `,
    args: [now, now]
  })

  let sent = 0
  for (const activity of ended.rows) {
    sent += await notifyActivity(activity)
  }
  return sent
}

function startActivityEndNotices() {
  let running = false
  let warnedMissingColumn = false

  async function sweep() {
    if (running) return
    running = true
    try {
      const sent = await notifyEndedActivities()
      if (sent > 0) console.log(`Sent ${sent} activity-done notification${sent === 1 ? '' : 's'}.`)
    } catch (error) {
      if (/no such column: ended_notified_at/i.test(String(error?.message))) {
        if (!warnedMissingColumn) {
          console.warn('Activity-done notifications are off until the database is migrated. Run "npm run db:migrate" in Backend.')
          warnedMissingColumn = true
        }
      } else {
        console.error('Activity-done notification error:', error)
      }
    } finally {
      running = false
    }
  }

  sweep()
  const timer = setInterval(sweep, SWEEP_INTERVAL_MS)
  timer.unref()
  return timer
}

module.exports = {
  describeEnd,
  notifyEndedActivities,
  startActivityEndNotices
}
