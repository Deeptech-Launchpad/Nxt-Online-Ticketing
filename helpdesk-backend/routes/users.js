const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET all real users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET demo_users (for fallback if needed in old code)
router.get('/demo', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM demo_users ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
