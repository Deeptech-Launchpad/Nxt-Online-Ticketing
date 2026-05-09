const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET all organizations
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM organizations ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add new organization
router.post('/', async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO organizations (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE organization
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM organizations WHERE id = $1', [req.params.id]);
    res.json({ message: 'Organization deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
