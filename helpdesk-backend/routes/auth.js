const express    = require('express');
const router     = express.Router();
const nodemailer = require('nodemailer');
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
router.post('/verify-otp', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

  const record = otpStore[email.toLowerCase()];
  if (!record)              return res.status(400).json({ error: 'No OTP found for this email. Please request a new one.' });
  if (Date.now() > record.expiresAt) {
    delete otpStore[email.toLowerCase()];
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }
  if (record.code !== code.toString()) return res.status(400).json({ error: 'Invalid code. Please try again.' });

  // Valid — clear OTP and respond with role
  delete otpStore[email.toLowerCase()];
  const role = isAdmin(email) ? 'admin' : 'employee';
  res.json({ success: true, email, role });
});

// ── POST /api/auth/check-role ────────────────────────────────
// Used after Google OAuth to determine which dashboard to open
router.post('/check-role', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const role = isAdmin(email) ? 'admin' : 'employee';
  res.json({ role, email });
});

module.exports = router;
