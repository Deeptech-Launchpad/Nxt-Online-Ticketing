const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ── Helper: derive 2-letter avatar initials from a name ─────
function initialsFrom(name) {
  if (!name) return 'U';
  return String(name)
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ── GET all real users ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET demo_users (legacy fallback) ───────────────────────
router.get('/demo', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM demo_users ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST create employee ───────────────────────────────────
// Body: { id, name, email, dept, division, organization, designation, phone }
// Required: id, name, email.
// Role is always 'employee' here — admin role is granted only via the
// ADMIN_EMAILS env var, not through this endpoint.
router.post('/', async (req, res) => {
  const {
    id, name, email,
    dept, division, organization, designation, phone,
  } = req.body;

  if (!id || !name || !email) {
    return res.status(400).json({ error: 'id, name and email are required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const avatar     = initialsFrom(name);

  try {
    const dup = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: `Email ${cleanEmail} is already registered` });
    }

    // source='manual' tells the NxtPeople login gate to allow this user
    // even if they aren't in NxtPeople (e.g. branch employees).
    const result = await pool.query(`
      INSERT INTO users (id, name, division, dept, avatar, email, role, designation, phone, organization, source)
      VALUES ($1, $2, $3, $4, $5, $6, 'employee', $7, $8, $9, 'manual')
      RETURNING *`,
      [
        id.trim(),
        name.trim(),
        division || null,
        dept || null,
        avatar,
        cleanEmail,
        designation || null,
        phone || null,
        organization || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Employee ID or email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update employee profile ────────────────────────────
// Body: { name?, phone?, designation?, dept?, division? }
// id, email, role and avatar are intentionally not editable here.
// (Avatar auto-rederives if the name changes.)
router.put('/:id', async (req, res) => {
  const { name, phone, designation, dept, division, organization } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cur = existing.rows[0];
    const newName   = (name && name.trim()) || cur.name;
    const newAvatar = (name && name.trim()) ? initialsFrom(newName) : cur.avatar;

    const result = await pool.query(`
      UPDATE users
         SET name         = $1,
             phone        = $2,
             designation  = $3,
             dept         = $4,
             division     = $5,
             organization = $6,
             avatar       = $7
       WHERE id = $8
       RETURNING *`,
      [
        newName,
        phone === undefined ? cur.phone : (phone || null),
        designation === undefined ? cur.designation : (designation || null),
        dept === undefined ? cur.dept : (dept || null),
        division === undefined ? cur.division : (division || null),
        organization === undefined ? cur.organization : (organization || null),
        newAvatar,
        req.params.id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH update account status (admin: deactivate / reactivate) ──
// Body: { status: 'active' | 'inactive' }
// Refuses to deactivate any email listed in ADMIN_EMAILS env var so the
// admin can never lock themselves out from the UI.
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: "status must be 'active' or 'inactive'" });
  }

  try {
    const existing = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const cur = existing.rows[0];

    // Admin protection — never let the UI deactivate a system admin
    const adminList = (process.env.ADMIN_EMAILS || '')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const targetEmail = (cur.email || '').trim().toLowerCase();
    if (status === 'inactive' && adminList.includes(targetEmail)) {
      return res.status(403).json({ error: 'Admin accounts cannot be deactivated from the UI.' });
    }

    const result = await pool.query(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
