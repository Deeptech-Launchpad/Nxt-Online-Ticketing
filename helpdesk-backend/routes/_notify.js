const pool = require('../db');

/**
 * Insert a notification row. Safe to call from any route — failures are logged
 * but never throw (notifications are non-critical).
 *
 * @param {object} opts
 * @param {string} opts.user_email   - recipient email
 * @param {'ticket'|'asset'|'system'} opts.type
 * @param {'info'|'warning'|'critical'} [opts.severity='info']
 * @param {string} opts.title
 * @param {string} [opts.description]
 * @param {string} [opts.related_id] - linked ticket id, asset id, etc.
 */
async function createNotification({ user_email, type, severity, title, description, related_id }) {
  if (!user_email || !type || !title) {
    console.warn('[notify] skipped — missing required field:', { user_email, type, title });
    return null;
  }
  const normalized = user_email.trim().toLowerCase();
  try {
    const res = await pool.query(`
      INSERT INTO notifications (user_email, type, severity, title, description, related_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [normalized, type, severity || 'info', title, description || null, related_id || null]
    );
    console.log(`🔔 Notification created → ${normalized} | ${type} | ${title}`);
    return res.rows[0];
  } catch (err) {
    console.error('[notify] Failed to create notification:', err.message);
    return null;
  }
}

/**
 * Return the full list of admin emails — derived from BOTH:
 *   (1) ADMIN_EMAILS env var (the source of truth used by auth.js)
 *   (2) users table where role='admin'
 * De-duplicated. Use this whenever you need to notify "all admins".
 */
async function getAdminEmails() {
  const fromEnv = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  let fromDb = [];
  try {
    const r = await pool.query("SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL");
    fromDb = r.rows.map(x => (x.email || '').trim().toLowerCase()).filter(Boolean);
  } catch (err) {
    console.error('Failed to query admin users:', err.message);
  }

  const all = Array.from(new Set([...fromEnv, ...fromDb]));
  console.log(`[notify] getAdminEmails → env=[${fromEnv.join(',')}] db=[${fromDb.join(',')}] all=[${all.join(',')}]`);
  return all;
}

module.exports = { createNotification, getAdminEmails };
