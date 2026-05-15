const express = require('express');
const router  = express.Router();
const path    = require('path');
const multer  = require('multer');
const pool    = require('../db');
const { createNotification, getAdminEmails } = require('./_notify');

// ── Multer setup for attachment uploads ──────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },  // 10 MB max
});

// ── GET all tickets (with messages, history, attachments) ────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.*,
        (SELECT COALESCE(json_agg(row_to_json(m)), '[]') FROM (SELECT * FROM ticket_messages WHERE ticket_id = t.id ORDER BY sent_at ASC) m) as messages,
        (SELECT COALESCE(json_agg(row_to_json(h)), '[]') FROM (SELECT * FROM ticket_history WHERE ticket_id = t.id ORDER BY action_time ASC) h) as history,
        (SELECT COALESCE(json_agg(row_to_json(a)), '[]') FROM (SELECT id, file_name, file_path, file_size, mime_type, uploaded_at FROM ticket_attachments WHERE ticket_id = t.id ORDER BY uploaded_at ASC) a) as attachments
      FROM tickets t
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST create a ticket ────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    subject, category, division, dept, employee_id, employee_name,
    priority, remote, device, description,
    preferred_time, device_notes,
  } = req.body;

  try {
    // Generate ID TKT-0XXX
    const idResult = await pool.query("SELECT id FROM tickets ORDER BY id DESC LIMIT 1");
    let newId = 'TKT-0100';
    if (idResult.rows.length > 0) {
      const last = idResult.rows[0].id;
      const num = parseInt(last.replace('TKT-', '')) + 1;
      newId = 'TKT-' + String(num).padStart(4, '0');
    }

    const now = new Date();

    const result = await pool.query(`
      INSERT INTO tickets (
        id, subject, category, division, dept, employee_id, employee_name,
        priority, remote, device, description, preferred_time, device_notes,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      newId, subject, category || 'Other', division, dept, employee_id, employee_name,
      priority || 'Medium', remote || 'In Person', device, description,
      preferred_time || null, device_notes || null,
      now, now
    ]);

    // Insert history
    await pool.query(
      `INSERT INTO ticket_history (ticket_id, action_label, action_time) VALUES ($1, $2, $3)`,
      [newId, 'Submitted', now]
    );

    // Notify all admins about the new ticket
    try {
      const adminEmails = await getAdminEmails();
      for (const email of adminEmails) {
        createNotification({
          user_email: email,
          type: 'ticket',
          severity: priority === 'Very High' || priority === 'High' ? 'warning' : 'info',
          title: `New ticket ${newId} raised by ${employee_name || 'an employee'}`,
          description: subject,
          related_id: newId,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins:', notifyErr.message);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update ticket (status / priority / assignment / resolution) ──
router.put('/:id', async (req, res) => {
  const { status, priority, assigned_to, resolution_note } = req.body;
  const ticketId = req.params.id;
  const now = new Date();

  try {
    const currentRes = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    const current = currentRes.rows[0];

    let query = 'UPDATE tickets SET updated_at = $1';
    let values = [now];
    let counter = 2;

    if (status) {
      query += `, status = $${counter++}`;
      values.push(status);
      await pool.query(
        `INSERT INTO ticket_history (ticket_id, action_label, action_time) VALUES ($1, $2, $3)`,
        [ticketId, 'Status ' + status, now]
      );

      if (status === 'in-progress' && !current.in_progress_at) {
        query += `, in_progress_at = $${counter++}`;
        values.push(now);
      }
      if ((status === 'resolved' || status === 'closed') && !current.resolved_at) {
        query += `, resolved_at = $${counter++}`;
        values.push(now);
      }

      // Notify employee about status change
      const statusMsg =
        status === 'resolved' || status === 'closed' ? 'has been resolved' :
        status === 'in-progress' ? 'is now being worked on' :
        `is now ${status}`;
      createNotification({
        user_email: current.employee_id,
        type: 'ticket',
        severity: status === 'resolved' || status === 'closed' ? 'info' : 'info',
        title: `Your ticket ${ticketId} ${statusMsg}`,
        description: current.subject,
        related_id: ticketId,
      });
    }

    if (priority) {
      query += `, priority = $${counter++}`;
      values.push(priority);
      await pool.query(
        `INSERT INTO ticket_history (ticket_id, action_label, action_time) VALUES ($1, $2, $3)`,
        [ticketId, 'Priority set to ' + priority, now]
      );
    }

    if (assigned_to !== undefined) {
      query += `, assigned_to = $${counter++}`;
      values.push(assigned_to);
      await pool.query(
        `INSERT INTO ticket_history (ticket_id, action_label, action_time) VALUES ($1, $2, $3)`,
        [ticketId, 'Assigned to ' + assigned_to, now]
      );
    }

    if (resolution_note !== undefined) {
      query += `, resolution_note = $${counter++}`;
      values.push(resolution_note);
    }

    query += ` WHERE id = $${counter} RETURNING *`;
    values.push(ticketId);

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST add message ────────────────────────────────────────
router.post('/:id/messages', async (req, res) => {
  const { sender_role, sender_name, message } = req.body;
  const ticketId = req.params.id;
  const now = new Date();

  try {
    const result = await pool.query(`
      INSERT INTO ticket_messages (ticket_id, sender_role, sender_name, message, sent_at)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [ticketId, sender_role, sender_name, message, now]);

    await pool.query('UPDATE tickets SET updated_at = $1 WHERE id = $2', [now, ticketId]);

    // Notify employee when admin replies, or admin(s) when employee replies
    if (sender_role === 'admin') {
      const t = await pool.query('SELECT employee_id, subject FROM tickets WHERE id = $1', [ticketId]);
      if (t.rows[0]) {
        createNotification({
          user_email: t.rows[0].employee_id,
          type: 'ticket',
          severity: 'info',
          title: `Admin replied to ${ticketId}`,
          description: message.length > 120 ? message.slice(0, 120) + '...' : message,
          related_id: ticketId,
        });
      }
    } else if (sender_role === 'employee') {
      const t = await pool.query('SELECT subject, employee_name FROM tickets WHERE id = $1', [ticketId]);
      if (t.rows[0]) {
        const adminEmails = await getAdminEmails();
        for (const email of adminEmails) {
          createNotification({
            user_email: email,
            type: 'ticket',
            severity: 'info',
            title: `${t.rows[0].employee_name || 'Employee'} replied to ${ticketId}`,
            description: message.length > 120 ? message.slice(0, 120) + '...' : message,
            related_id: ticketId,
          });
        }
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST upload attachment ──────────────────────────────────
router.post('/:id/attachments', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const ticketId = req.params.id;
  try {
    const result = await pool.query(`
      INSERT INTO ticket_attachments (ticket_id, file_name, file_path, file_size, mime_type)
      VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [ticketId, req.file.originalname, req.file.filename, req.file.size, req.file.mimetype]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET all attachments for a ticket ────────────────────────
router.get('/:id/attachments', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, file_name, file_path, file_size, mime_type, uploaded_at FROM ticket_attachments WHERE ticket_id = $1 ORDER BY uploaded_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
