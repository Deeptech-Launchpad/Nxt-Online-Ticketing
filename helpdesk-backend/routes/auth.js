const express    = require('express');
const router     = express.Router();
const nodemailer = require('nodemailer');
const pool       = require('../db');
const { checkAccess } = require('../utils/nxtpeople');
require('dotenv').config();

// In-memory OTP store: { email: { code, expiresAt } }
const otpStore = {};

// ── Helper: check if email is an admin ──────────────────────
function isAdmin(email) {
  const adminList = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase());
  return adminList.includes(email.trim().toLowerCase());
}

// ── Helper: derive a friendly display name from an email ────
//   "sanjana.v@altius.com" → "Sanjana V"
//   "purchase@yantra24x7.com" → "Purchase"
function nameFromEmail(email) {
  const local = String(email).split('@')[0] || 'User';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ') || 'User';
}

// ── Helper: derive 2-letter avatar initials ─────────────────
function initialsFrom(name) {
  return String(name || 'U')
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Ensure a row exists in `users` for this email — auto-onboarding.
 * Called after every successful authentication so the Admin → Employees
 * page can list everyone who has ever logged in. Existing rows are
 * left untouched so the admin's profile edits aren't overwritten.
 *
 * Uses email as both id and email (matches LoginPage.jsx convention
 * where currentUser.id === email for non-admin OTP/OAuth users).
 */
async function ensureUserRow(email, source = 'nxtpeople') {
  if (!email) return;
  const cleanEmail = email.trim().toLowerCase();
  const role = isAdmin(cleanEmail) ? 'admin' : 'employee';
  const name = nameFromEmail(cleanEmail);
  const avatar = initialsFrom(name);
  // Admin emails are essentially "manually approved" via env config, so
  // they get source='manual' to match the bypass rules in the gate.
  const effectiveSource = isAdmin(cleanEmail) ? 'manual' : source;

  try {
    await pool.query(`
      INSERT INTO users (id, name, email, role, avatar, source)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [cleanEmail, name, cleanEmail, role, avatar, effectiveSource]);
  } catch (err) {
    console.error('[auth] ensureUserRow failed:', err.message);
  }
}

/**
 * Central gate: decides if an email is allowed to log in.
 * Returns { allowed: true } or { allowed: false, reason: <code> }.
 *
 * Precedence (first match wins):
 *   1. Admin safety net — emails in ADMIN_EMAILS env always allowed
 *      (so admin can never be locked out by a NxtPeople outage)
 *   2. NxtPeople says yes → allowed
 *   3. NxtPeople says no BUT user exists with source='manual' → allowed
 *      (admin-added branch employees bypass NxtPeople)
 *   4. Otherwise → blocked with NOT_REGISTERED (friendly to user)
 *      unless NxtPeople returned a network/config error (returns that
 *      reason so the frontend shows "service temporarily unavailable").
 */
async function gateLoginAccess(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return { allowed: false, reason: 'NOT_REGISTERED' };

  // 0. Inactive override — admin can locally block any user (including
  //    NxtPeople users) by setting status='inactive'. Checked before all
  //    bypasses so even admin-list emails get blocked if explicitly
  //    deactivated… EXCEPT the admin protection happens in the PATCH
  //    endpoint, which refuses to deactivate ADMIN_EMAILS entries.
  try {
    const inactive = await pool.query(
      "SELECT 1 FROM users WHERE LOWER(email) = $1 AND status = 'inactive' LIMIT 1",
      [clean]
    );
    if (inactive.rows.length > 0) {
      return { allowed: false, reason: 'ACCOUNT_INACTIVE' };
    }
  } catch (err) {
    console.error('[auth] inactive lookup failed:', err.message);
  }

  // 1. Admin bypass
  if (isAdmin(clean)) {
    return { allowed: true, via: 'admin' };
  }

  // 2. NxtPeople
  const access = await checkAccess(clean);
  if (access.allowed) {
    return { allowed: true, via: 'nxtpeople', employee: access.employee };
  }

  // 3. Manual admin-added fallback
  try {
    const r = await pool.query(
      "SELECT 1 FROM users WHERE LOWER(email) = $1 AND source = 'manual' LIMIT 1",
      [clean]
    );
    if (r.rows.length > 0) {
      return { allowed: true, via: 'manual' };
    }
  } catch (err) {
    console.error('[auth] manual lookup failed:', err.message);
  }

  // 4. Block. Network/config issues bubble up their own reason so the
  //    user sees "service temporarily unavailable" instead of "not registered".
  if (['NETWORK_ERROR', 'CONFIG_MISSING', 'INVALID_KEY', 'RATE_LIMITED'].includes(access.reason)) {
    return { allowed: false, reason: access.reason };
  }
  return { allowed: false, reason: 'NOT_REGISTERED' };
}

// ── Helper: create mail transporter ─────────────────────────
function createTransporter() {
  // Strip spaces from App Password (Gmail shows it with spaces but needs them removed)
  const pass = (process.env.OTP_EMAIL_PASS || '').replace(/\s/g, '');
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.OTP_EMAIL_USER,
      pass: pass,
    },
    tls: { rejectUnauthorized: false },
  });
}

// ── POST /api/auth/send-otp ──────────────────────────────────
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const code      = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore[email.toLowerCase()] = { code, expiresAt };

  // If OTP email is not configured, use dev mode
  const emailUser = process.env.OTP_EMAIL_USER || '';
  const emailPass = process.env.OTP_EMAIL_PASS || '';
  if (!emailUser || emailUser === 'your-gmail@gmail.com' || !emailPass || emailPass === 'your-gmail-app-password') {
    console.log(`[DEV] OTP for ${email}: ${code}`);
    return res.json({ success: true, dev_code: code, message: 'Dev mode: OTP logged to console' });
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"AltiusNXT Helpdesk" <${emailUser}>`,
      to: email,
      subject: 'Your AltiusNXT Login Code',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #e2e8f0">
          <h2 style="color:#02172E;margin:0 0 8px">Your Login Code</h2>
          <p style="color:#64748b;margin:0 0 24px">Use this code to sign in to your IT Helpdesk account.</p>
          <div style="background:#f8fafc;border-radius:10px;padding:24px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#CC3A3A;border:2px dashed #fecaca">
            ${code}
          </div>
          <p style="color:#94a3b8;font-size:13px;margin-top:20px">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
      `,
    });
    console.log(`✅ OTP email sent to ${email}`);
    res.json({ success: true, message: `OTP sent to ${email}` });
  } catch (err) {
    console.error('❌ Email send error:', err.message);
    // Fallback: return code in response so login still works
    console.log(`[FALLBACK] OTP for ${email}: ${code}`);
    res.json({ success: true, dev_code: code, message: 'Email failed - code shown for testing', warning: err.message });
  }
});

// ── POST /api/auth/verify-otp ────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

  const record = otpStore[email.toLowerCase()];
  if (!record)              return res.status(400).json({ error: 'No OTP found for this email. Please request a new one.' });
  if (Date.now() > record.expiresAt) {
    delete otpStore[email.toLowerCase()];
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }
  if (record.code !== code.toString()) return res.status(400).json({ error: 'Invalid code. Please try again.' });

  // OTP valid → clear it before the access gate so it can't be replayed
  delete otpStore[email.toLowerCase()];

  // ── Login access gate ──
  // Admin bypass → NxtPeople → manual fallback → block
  const gate = await gateLoginAccess(email);
  if (!gate.allowed) {
    console.log(`[auth] verify-otp denied for ${email}: ${gate.reason}`);
    return res.status(403).json({
      error: 'Access denied',
      reason: gate.reason,
    });
  }
  console.log(`[auth] verify-otp allowed for ${email} via ${gate.via}`);

  // Access granted → onboard locally and respond.
  // Tag the new row with the source that admitted them (nxtpeople / manual / admin).
  const role = isAdmin(email) ? 'admin' : 'employee';
  await ensureUserRow(email, gate.via === 'nxtpeople' ? 'nxtpeople' : 'manual');
  res.json({ success: true, email, role, employee: gate.employee || null });
});

// ── POST /api/auth/check-role ────────────────────────────────
// Used after Google OAuth to determine which dashboard to open
router.post('/check-role', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Same gate logic as OTP: admin → NxtPeople → manual fallback → block
  const gate = await gateLoginAccess(email);
  if (!gate.allowed) {
    console.log(`[auth] check-role denied for ${email}: ${gate.reason}`);
    return res.status(403).json({
      error: 'Access denied',
      reason: gate.reason,
    });
  }
  console.log(`[auth] check-role allowed for ${email} via ${gate.via}`);

  const role = isAdmin(email) ? 'admin' : 'employee';
  await ensureUserRow(email, gate.via === 'nxtpeople' ? 'nxtpeople' : 'manual');
  res.json({ role, email, employee: gate.employee || null });
});

module.exports = router;
