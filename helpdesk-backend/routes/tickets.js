const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ── GET all tickets ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', m.id, 
                   'sender_role', m.sender_role, 
                   'sender_name', m.sender_name, 
                   'message', m.message, 
                   'sent_at', m.sent_at
                 ) ORDER BY m.sent_at ASC
               ) FILTER (WHERE m.id IS NOT NULL), '[]'
             ) as messages,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', h.id, 
                   'action_label', h.action_label, 
                   'action_time', h.action_time
                 ) ORDER BY h.action_time ASC
               ) FILTER (WHERE h.id IS NOT NULL), '[]'
             ) as history
      FROM tickets t
      LEFT JOIN ticket_messages m ON t.id = m.ticket_id
      LEFT JOIN ticket_history h ON t.id = h.ticket_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    
    // We need to parse json_agg which might duplicate rows if we join multiple tables without care
    // Actually, joining multiple one-to-many relationships in a single query with json_agg causes cartesian products.
    // It's better to fetch tickets, then messages, then history, or do it with subqueries.
    // Let's rewrite the query to use subqueries to avoid duplicates.
    
    const safeResult = await pool.query(`
      SELECT 
        t.*,
        (SELECT COALESCE(json_agg(row_to_json(m)), '[]') FROM (SELECT * FROM ticket_messages WHERE ticket_id = t.id ORDER BY sent_at ASC) m) as messages,
        (SELECT COALESCE(json_agg(row_to_json(h)), '[]') FROM (SELECT * FROM ticket_history WHERE ticket_id = t.id ORDER BY action_time ASC) h) as history
      FROM tickets t
      ORDER BY t.created_at DESC
    `);

    res.json(safeResult.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST create a ticket ────────────────────────────────────
router.post('/', async (req, res) => {
  const { subject, category, division, dept, employee_id, employee_name, priority, remote, device, description } = req.body;
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
      INSERT INTO tickets (id, subject, category, division, dept, employee_id, employee_name, priority, remote, device, description, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [newId, subject, category || 'Other', division, dept, employee_id, employee_name, priority || 'Medium', remote || 'In Person', device, description, now, now]);

    // Insert history
    await pool.query(`INSERT INTO ticket_history (ticket_id, action_label, action_time) VALUES ($1, $2, $3)`, [newId, 'Submitted', now]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update ticket ───────────────────────────────────────
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
      await pool.query(`INSERT INTO ticket_history (ticket_id, action_label, action_time) VALUES ($1, $2, $3)`, [ticketId, 'Status ' + status, now]);
      
      if (status === 'in-progress' && !current.in_progress_at) {
        query += `, in_progress_at = $${counter++}`;
        values.push(now);
      }
      if ((status === 'resolved' || status === 'closed') && !current.resolved_at) {
        query += `, resolved_at = $${counter++}`;
        values.push(now);
      }
    }

    if (priority) {
      query += `, priority = $${counter++}`;
      values.push(priority);
      await pool.query(`INSERT INTO ticket_history (ticket_id, action_label, action_time) VALUES ($1, $2, $3)`, [ticketId, 'Priority set to ' + priority, now]);
    }

    if (assigned_to !== undefined) {
      query += `, assigned_to = $${counter++}`;
      values.push(assigned_to);
      await pool.query(`INSERT INTO ticket_history (ticket_id, action_label, action_time) VALUES ($1, $2, $3)`, [ticketId, 'Assigned to ' + assigned_to, now]);
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

    // Also update ticket updated_at
    await pool.query('UPDATE tickets SET updated_at = $1 WHERE id = $2', [now, ticketId]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
