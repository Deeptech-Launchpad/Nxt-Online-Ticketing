const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ── GET /api/notifications/me?email=&unread=true ─────────────
router.get('/me', async (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  const onlyUnread = req.query.unread === 'true';
  if (!email) return res.status(400).json({ error: 'email query param required' });

  try {
    const sql = onlyUnread
      ? 'SELECT * FROM notifications WHERE LOWER(user_email) = $1 AND is_read = FALSE ORDER BY created_at DESC LIMIT 100'
      : 'SELECT * FROM notifications WHERE LOWER(user_email) = $1 ORDER BY created_at DESC LIMIT 100';
    const result = await pool.query(sql, [email]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/notifications/:id/read ────────────────────────
router.patch('/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/notifications/mark-all-read  body: {email} ─────
router.post('/mark-all-read', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE LOWER(user_email) = $1 AND is_read = FALSE',
      [email]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
