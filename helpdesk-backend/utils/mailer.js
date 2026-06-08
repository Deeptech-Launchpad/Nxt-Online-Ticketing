/**
 * Shared email transporter — used for OTP, ticket notifications, etc.
 *
 * Reads the same Gmail credentials that already power OTP emails:
 *   OTP_EMAIL_USER   — gmail address
 *   OTP_EMAIL_PASS   — gmail app password (with or without spaces)
 *
 * Email is treated as best-effort: send failures are logged but never thrown,
 * so a Gmail outage can never block a ticket from being created/resolved.
 *
 * Global kill switch (optional):
 *   EMAIL_NOTIFICATIONS=off   → sendMail() short-circuits without sending.
 *   Anything else (or unset)  → emails go out as normal.
 */

const nodemailer = require('nodemailer');

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  // Strip spaces from App Password (Gmail shows it with spaces but needs them removed)
  const pass = (process.env.OTP_EMAIL_PASS || '').replace(/\s/g, '');
  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.OTP_EMAIL_USER,
      pass: pass,
    },
    tls: { rejectUnauthorized: false },
  });
  return cachedTransporter;
}

function isConfigured() {
  const user = process.env.OTP_EMAIL_USER || '';
  const pass = process.env.OTP_EMAIL_PASS || '';
  if (!user || user === 'your-gmail@gmail.com') return false;
  if (!pass || pass === 'your-gmail-app-password') return false;
  return true;
}

function isEnabled() {
  return String(process.env.EMAIL_NOTIFICATIONS || 'on').toLowerCase() !== 'off';
}

/**
 * Send an email. Returns a Promise that resolves with { ok, error? }.
 * Never throws — callers can safely fire-and-forget.
 */
async function sendMail({ to, subject, html, text }) {
  if (!isEnabled()) {
    console.log(`[mail] skipped (EMAIL_NOTIFICATIONS=off) → ${to} | ${subject}`);
    return { ok: false, error: 'disabled' };
  }
  if (!isConfigured()) {
    console.warn(`[mail] skipped (OTP_EMAIL_* not configured) → ${to} | ${subject}`);
    return { ok: false, error: 'not configured' };
  }
  if (!to || !subject) {
    console.warn('[mail] skipped — missing to/subject:', { to, subject });
    return { ok: false, error: 'missing fields' };
  }
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"AltiusNxt IT Helpdesk" <${process.env.OTP_EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
    });
    console.log(`📧 Mail sent → ${to} | ${subject} | id=${info.messageId}`);
    return { ok: true };
  } catch (err) {
    console.error(`[mail] send failed → ${to} | ${subject} | ${err.message}`);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendMail, isConfigured, isEnabled };
