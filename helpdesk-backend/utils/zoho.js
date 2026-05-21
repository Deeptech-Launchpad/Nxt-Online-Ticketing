/**
 * Zoho People integration — directory sync.
 *
 * Pulls the full employee directory from Zoho People every hour so the
 * Admin → Employees page shows every employee in the company, not just
 * the ones who have logged in. Does NOT touch login control —
 * NxtPeople still gates who can sign in.
 *
 * Required env vars (helpdesk-backend/.env):
 *   ZOHO_CLIENT_ID
 *   ZOHO_CLIENT_SECRET
 *   ZOHO_REFRESH_TOKEN
 *   ZOHO_API_DOMAIN     e.g. https://people.zoho.in
 *   ZOHO_AUTH_URL       e.g. https://accounts.zoho.in
 *
 * All Zoho fetches are wrapped in try/catch — Zoho being down must
 * never crash this backend or block local users.
 */

const pool = require('../db');

const Z_ID     = process.env.ZOHO_CLIENT_ID;
const Z_SECRET = process.env.ZOHO_CLIENT_SECRET;
const Z_REFR   = process.env.ZOHO_REFRESH_TOKEN;
const Z_API    = process.env.ZOHO_API_DOMAIN;     // people host
const Z_AUTH   = process.env.ZOHO_AUTH_URL;       // accounts host

// ── In-memory access-token cache (Zoho tokens last 1 hour) ──
let cachedToken = null;
let cachedExpiry = 0;

function isConfigured() {
  return !!(Z_ID && Z_SECRET && Z_REFR && Z_API && Z_AUTH);
}

/**
 * Exchange the long-lived refresh_token for a short-lived access_token.
 * Cached for 50 minutes so we don't hammer the auth endpoint.
 */
async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpiry) return cachedToken;

  const url = `${Z_AUTH}/oauth/v2/token`
    + `?refresh_token=${encodeURIComponent(Z_REFR)}`
    + `&client_id=${encodeURIComponent(Z_ID)}`
    + `&client_secret=${encodeURIComponent(Z_SECRET)}`
    + `&grant_type=refresh_token`;

  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Zoho token refresh failed: ${JSON.stringify(data)}`);
  }
  cachedToken = data.access_token;
  // expires_in is seconds; cache for slightly less than that to be safe
  const ttlMs = ((data.expires_in || 3600) - 600) * 1000;
  cachedExpiry = now + ttlMs;
  return cachedToken;
}

/**
 * Page through Zoho People's employee form (200 records at a time).
 * Returns a flat array of plain employee objects with the fields we care
 * about, normalized to lowercase keys for predictability.
 */
async function fetchAllEmployees() {
  const token = await getAccessToken();
  const PAGE = 200;
  const all = [];
  let sIndex = 1;

  while (true) {
    const url = `${Z_API}/people/api/forms/employee/getRecords`
      + `?sIndex=${sIndex}&limit=${PAGE}`;
    const res = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const data = await res.json();

    // Zoho's response shape can vary. The most common shapes:
    //   { response: { result: [ { <recordId>: [ {...fields} ] }, ... ] } }
    //   { response: { result: [ {...fields}, ... ] } }
    //   { records: [ {...fields}, ... ] }
    const raw = data?.response?.result || data?.records || [];
    if (!Array.isArray(raw) || raw.length === 0) break;

    for (const entry of raw) {
      // Unwrap the { recordId: [obj] } shape
      let rec = entry;
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const firstKey = Object.keys(entry)[0];
        const v = entry[firstKey];
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
          rec = v[0];
        }
      }
      if (rec && typeof rec === 'object') all.push(rec);
    }

    if (raw.length < PAGE) break;      // last page
    sIndex += PAGE;
    if (sIndex > 5000) break;          // safety cap — adjust if needed
  }
  return all;
}

/**
 * Pull a value from a Zoho record trying multiple possible field names.
 * Different Zoho People accounts use slightly different field labels
 * (FirstName vs First_Name vs FName) so we check the most common ones.
 */
function pick(rec, ...keys) {
  for (const k of keys) {
    const v = rec[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

/**
 * Upsert one Zoho employee into the users table.
 *   - If no row exists for this email → INSERT with source='zoho'
 *   - If a row already exists with source='zoho' → UPDATE the safe fields
 *   - If a row exists with source='manual' or 'nxtpeople' → only refresh
 *     last_synced_at; preserve local/HR overrides
 */
async function upsertEmployee(rec) {
  const employeeId = pick(rec, 'EmployeeID', 'Employee_ID', 'Employee ID', 'EmpId');
  const email      = pick(rec, 'EmailID', 'Email', 'Email_ID', 'WorkEmail', 'Work_Email');
  const firstName  = pick(rec, 'FirstName', 'First_Name');
  const lastName   = pick(rec, 'LastName', 'Last_Name');
  const dept       = pick(rec, 'Department', 'Dept');
  const designation= pick(rec, 'Designation', 'JobTitle', 'Job_Title', 'Role');
  const phone      = pick(rec, 'WorkPhone', 'Work_Phone', 'Mobile', 'Phone');
  const photo      = pick(rec, 'Photo', 'PhotoURL', 'Photo_URL', 'PhotoLink');

  if (!employeeId || !email) {
    return { skipped: true, reason: 'missing EmployeeID or Email', rec };
  }

  const name = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0];
  const cleanEmail = email.toLowerCase();
  const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Find any existing row for this email (regardless of id)
  const existing = await pool.query(
    'SELECT id, source FROM users WHERE LOWER(email) = $1 LIMIT 1',
    [cleanEmail]
  );

  if (existing.rows.length === 0) {
    // Brand new — INSERT with source='zoho'
    try {
      await pool.query(`
        INSERT INTO users (id, name, email, role, avatar, source, designation, dept, phone, photo_url, status, last_synced_at)
        VALUES ($1, $2, $3, 'employee', $4, 'zoho', $5, $6, $7, $8, 'active', NOW())
      `, [employeeId, name, cleanEmail, initials, designation, dept, phone, photo]);
      return { inserted: true };
    } catch (err) {
      // Possible PK clash if another id collides — fall back to email-based update
      console.warn(`[zoho] insert conflict for ${cleanEmail}, attempting update:`, err.message);
    }
  }

  const cur = existing.rows[0];
  if (cur?.source === 'zoho') {
    // Refresh data from Zoho — it's the source of truth for this row
    await pool.query(`
      UPDATE users
         SET name = $1, designation = $2, dept = $3, phone = $4,
             photo_url = $5, avatar = $6, last_synced_at = NOW()
       WHERE id = $7
    `, [name, designation, dept, phone, photo, initials, cur.id]);
    return { updated: true };
  }

  // Manually-added or NxtPeople row — preserve overrides, just refresh sync time
  await pool.query(`UPDATE users SET last_synced_at = NOW() WHERE id = $1`, [cur.id]);
  return { touched: true };
}

/**
 * Pull every employee from Zoho and upsert them. Returns a summary.
 */
async function syncZohoEmployees() {
  if (!isConfigured()) {
    return { ok: false, error: 'ZOHO_* env vars not set — sync disabled' };
  }
  try {
    const records = await fetchAllEmployees();
    let inserted = 0, updated = 0, touched = 0, skipped = 0;
    for (const rec of records) {
      try {
        const r = await upsertEmployee(rec);
        if (r.inserted)      inserted++;
        else if (r.updated)  updated++;
        else if (r.touched)  touched++;
        else if (r.skipped)  skipped++;
      } catch (perRowErr) {
        skipped++;
        console.warn('[zoho] upsert failed for one record:', perRowErr.message);
      }
    }
    const summary = { ok: true, total: records.length, inserted, updated, touched, skipped, at: new Date().toISOString() };
    console.log(`[zoho] sync done — fetched ${records.length}, new ${inserted}, updated ${updated}, touched ${touched}, skipped ${skipped}`);
    return summary;
  } catch (err) {
    console.error('[zoho] sync failed:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { isConfigured, syncZohoEmployees, fetchAllEmployees };
