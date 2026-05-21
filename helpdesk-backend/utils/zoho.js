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
 * Read a fetch response as JSON, but fall back to text if it isn't JSON —
 * so the caller sees a useful error message (often a Zoho HTML error page)
 * instead of "Unexpected token '<'".
 */
async function readResponse(res, label) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.slice(0, 200).replace(/\s+/g, ' ').trim();
    throw new Error(
      `${label} returned non-JSON (status ${res.status}). First 200 chars: ${snippet}`
    );
  }
}

/**
 * Exchange the long-lived refresh_token for a short-lived access_token.
 * Cached for 50 minutes so we don't hammer the auth endpoint.
 * Sends parameters in the body (form-urlencoded) which is what Zoho's
 * OAuth endpoint requires; some Zoho regions reject query-string params.
 */
async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpiry) return cachedToken;

  // Tolerate either form:
  //   ZOHO_AUTH_URL=https://accounts.zoho.in                  ← just the host
  //   ZOHO_AUTH_URL=https://accounts.zoho.in/oauth/v2/token   ← full path
  // Strip any trailing /oauth/... so we can always append it ourselves.
  const base = String(Z_AUTH || '')
    .replace(/\/+$/, '')
    .replace(/\/oauth\/.*$/, '');
  const url = `${base}/oauth/v2/token`;

  const body = new URLSearchParams({
    refresh_token: Z_REFR,
    client_id:     Z_ID,
    client_secret: Z_SECRET,
    grant_type:    'refresh_token',
  }).toString();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await readResponse(res, `Zoho token endpoint (${url})`);
  if (!data.access_token) {
    throw new Error(`Zoho token refresh failed: ${JSON.stringify(data)}`);
  }
  cachedToken = data.access_token;
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
  // Tolerate either form for ZOHO_API_DOMAIN — just host, or host + path
  const base = String(Z_API || '')
    .replace(/\/+$/, '')
    .replace(/\/people\/api\/.*$/, '')
    .replace(/\/people\/?$/, '');
  const PAGE = 200;
  const all = [];
  let sIndex = 1;

  while (true) {
    const url = `${base}/people/api/forms/employee/getRecords`
      + `?sIndex=${sIndex}&limit=${PAGE}`;
    const res = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const data = await readResponse(res, `Zoho employees endpoint (${url})`);

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
 * Decide if a Zoho employee record represents an *active* employee
 * (still working at the company). Tolerant to the various status field
 * names and values Zoho People accounts use.
 *
 * Treat as INACTIVE if any of these status fields contains a word like
 * "resigned", "terminated", "inactive", "exit", "left".
 * Anything else (including missing status) is treated as ACTIVE — we
 * prefer to keep a record than wrongly hide it.
 */
function isActiveEmployee(rec) {
  const status = (
    pick(rec, 'Employeestatus', 'EmployeeStatus', 'Employee_Status',
              'EmploymentStatus', 'Employment_Status', 'Status') || ''
  ).toLowerCase();
  if (!status) return true;
  const INACTIVE_TERMS = ['resigned', 'terminated', 'inactive', 'left', 'exit',
                          'separated', 'former', 'dismiss', 'fired'];
  return !INACTIVE_TERMS.some(t => status.includes(t));
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

  const cleanEmail = email.toLowerCase();
  const isActive = isActiveEmployee(rec);

  // ── Inactive (resigned / terminated) handling ──
  //   - Brand new + inactive → don't even insert
  //   - Existing 'zoho' row + now inactive → mark status='inactive' so
  //     they hide from the list and can't log in
  //   - Existing 'manual'/'nxtpeople' row → leave alone (HR/admin owns
  //     their lifecycle, not Zoho)
  if (!isActive) {
    const existing = await pool.query(
      "SELECT id, source FROM users WHERE LOWER(email) = $1 LIMIT 1",
      [cleanEmail]
    );
    if (existing.rows.length === 0) {
      return { skipped: true, reason: 'inactive in Zoho' };
    }
    const cur = existing.rows[0];
    if (cur.source === 'zoho') {
      await pool.query(
        "UPDATE users SET status = 'inactive', last_synced_at = NOW() WHERE id = $1",
        [cur.id]
      );
      return { touched: true, deactivated: true };
    }
    // manual/nxtpeople rows — don't auto-deactivate from Zoho
    await pool.query("UPDATE users SET last_synced_at = NOW() WHERE id = $1", [cur.id]);
    return { touched: true };
  }

  const name = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0];
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
    // Refresh data from Zoho — it's the source of truth for this row.
    // Also force status back to 'active' in case they were resigned then
    // re-hired (so they reappear in the directory).
    await pool.query(`
      UPDATE users
         SET name = $1, designation = $2, dept = $3, phone = $4,
             photo_url = $5, avatar = $6, status = 'active', last_synced_at = NOW()
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
    let inserted = 0, updated = 0, touched = 0, skipped = 0, deactivated = 0;
    for (const rec of records) {
      try {
        const r = await upsertEmployee(rec);
        if (r.inserted)         inserted++;
        else if (r.updated)     updated++;
        else if (r.touched)     touched++;
        else if (r.skipped)     skipped++;
        if (r.deactivated)      deactivated++;
      } catch (perRowErr) {
        skipped++;
        console.warn('[zoho] upsert failed for one record:', perRowErr.message);
      }
    }
    const summary = { ok: true, total: records.length, inserted, updated, touched, skipped, deactivated, at: new Date().toISOString() };
    console.log(`[zoho] sync done — fetched ${records.length}, new ${inserted}, updated ${updated}, touched ${touched}, skipped ${skipped}, deactivated ${deactivated}`);
    return summary;
  } catch (err) {
    console.error('[zoho] sync failed:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { isConfigured, syncZohoEmployees, fetchAllEmployees };
