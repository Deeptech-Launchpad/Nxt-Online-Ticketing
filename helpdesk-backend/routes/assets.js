const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { createNotification } = require('./_notify');

// ── Helper: generate next asset ID ─────────────────────────
async function generateAssetId() {
  const result = await pool.query("SELECT id FROM assets ORDER BY id DESC LIMIT 1");
  if (result.rows.length === 0) return 'AST-1001';
  const last = result.rows[0].id;
  const num  = parseInt(last.replace('AST-', '')) + 1;
  return 'AST-' + String(num);
}

// ── GET all assets (with organization name joined) ──────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, o.name AS organization_name
      FROM assets a
      LEFT JOIN organizations o ON a.organization_id = o.id
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET ALL active asset allocations (admin: Employees page) ─
// Returns one row per active allocation with asset + user details.
// Used to render asset chips & assigned-asset table per employee.
// Must come BEFORE /:id route.
router.get('/all-allocations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id              AS asset_id,
        a.name            AS asset_name,
        a.brand           AS asset_brand,
        a.type            AS asset_type,
        a.warranty_status,
        a.warranty_expiry,
        a.condition,
        al.user_email,
        al.user_name,
        al.allocated_at,
        al.allocated_by
      FROM asset_allocations al
      INNER JOIN assets a ON a.id = al.asset_id
      WHERE al.returned_at IS NULL
      ORDER BY al.allocated_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET assets currently allocated to the calling user ──────
// Must come BEFORE /:id route or it'll be swallowed by the param route
router.get('/me', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'email query param required' });
  try {
    const result = await pool.query(`
      SELECT a.*, o.name AS organization_name,
             al.allocated_at, al.allocated_by, al.user_email
      FROM assets a
      INNER JOIN asset_allocations al ON a.id = al.asset_id
      LEFT JOIN organizations o ON a.organization_id = o.id
      WHERE al.user_email = $1 AND al.returned_at IS NULL
      ORDER BY al.allocated_at DESC
    `, [email]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single asset ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM assets WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST create new asset ───────────────────────────────────
router.post('/', async (req, res) => {
  const {
    name, brand, type, serial_number, division, organization_id,
    ownership_type, owned_by_division, personal_owner_name, personal_owner_contact,
    vendor_name, vendor_contact, rental_type, rent_start_date, rent_end_date,
    quantity, qty_in_use, qty_repairing, qty_scrap, status,
    warranty_status, warranty_expiry, purchase_date, assigned_to
  } = req.body;

  try {
    const id = await generateAssetId();
    const result = await pool.query(`
      INSERT INTO assets (
        id, name, brand, type, serial_number, division, organization_id,
        ownership_type, owned_by_division, personal_owner_name, personal_owner_contact,
        vendor_name, vendor_contact, rental_type, rent_start_date, rent_end_date,
        quantity, qty_in_use, qty_repairing, qty_scrap, status,
        warranty_status, warranty_expiry, purchase_date, assigned_to
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22,$23,$24,$25
      ) RETURNING *`,
      [
        id, name, brand, type, serial_number, division, organization_id || null,
        ownership_type, owned_by_division, personal_owner_name, personal_owner_contact,
        vendor_name, vendor_contact, rental_type,
        rent_start_date || null, rent_end_date || null,
        quantity || 1, qty_in_use || 0, qty_repairing || 0, qty_scrap || 0,
        status || 'Spare', warranty_status || 'Active',
        warranty_expiry || null, purchase_date || null, assigned_to || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update asset ────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const {
    name, brand, type, serial_number, division, organization_id,
    ownership_type, owned_by_division, personal_owner_name, personal_owner_contact,
    vendor_name, vendor_contact, rental_type, rent_start_date, rent_end_date,
    quantity, qty_in_use, qty_repairing, qty_scrap, status,
    warranty_status, warranty_expiry, purchase_date, assigned_to
  } = req.body;

  try {
    const result = await pool.query(`
      UPDATE assets SET
        name=$1, brand=$2, type=$3, serial_number=$4, division=$5, organization_id=$6,
        ownership_type=$7, owned_by_division=$8, personal_owner_name=$9, personal_owner_contact=$10,
        vendor_name=$11, vendor_contact=$12, rental_type=$13, rent_start_date=$14, rent_end_date=$15,
        quantity=$16, qty_in_use=$17, qty_repairing=$18, qty_scrap=$19, status=$20,
        warranty_status=$21, warranty_expiry=$22, purchase_date=$23, assigned_to=$24,
        updated_at=NOW()
      WHERE id=$25 RETURNING *`,
      [
        name, brand, type, serial_number, division, organization_id || null,
        ownership_type, owned_by_division, personal_owner_name, personal_owner_contact,
        vendor_name, vendor_contact, rental_type,
        rent_start_date || null, rent_end_date || null,
        quantity, qty_in_use, qty_repairing, qty_scrap, status,
        warranty_status, warranty_expiry || null, purchase_date || null, assigned_to || null,
        req.params.id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE asset ────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM assets WHERE id = $1', [req.params.id]);
    res.json({ message: 'Asset deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST allocate asset to user ─────────────────────────────
router.post('/:id/allocate', async (req, res) => {
  const { user_name, user_email, allocated_by } = req.body;
  const asset_id = req.params.id;

  try {
    // Check spare availability
    const assetResult = await pool.query('SELECT * FROM assets WHERE id = $1', [asset_id]);
    if (assetResult.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });

    const asset = assetResult.rows[0];
    const spare = asset.quantity - asset.qty_in_use - asset.qty_repairing - asset.qty_scrap;

    if (spare <= 0) {
      return res.status(400).json({ error: `No spare units available for ${asset.name}. Current spare: 0` });
    }

    // Resolve user_email: trust the body first; otherwise look it up by name.
    // Stops "No email provided" from happening when older frontend bundles
    // are cached and forget to send user_email.
    let resolvedEmail = (user_email || '').trim();
    if (!resolvedEmail && user_name) {
      try {
        const lookup = await pool.query(
          'SELECT email FROM users WHERE name = $1 AND email IS NOT NULL ORDER BY id LIMIT 1',
          [user_name]
        );
        resolvedEmail = lookup.rows[0]?.email || '';
      } catch (lookupErr) {
        console.warn('[allocate] email lookup failed:', lookupErr.message);
      }
    }

    // Update asset
    await pool.query(`
      UPDATE assets SET qty_in_use = qty_in_use + 1, assigned_to = $1, status = 'In Use', updated_at = NOW()
      WHERE id = $2`,
      [user_name, asset_id]
    );

    // Log allocation history
    await pool.query(`
      INSERT INTO asset_allocations (asset_id, user_name, user_email, allocated_by)
      VALUES ($1, $2, $3, $4)`,
      [asset_id, user_name, resolvedEmail, allocated_by || 'Admin']
    );

    // Notify the user who received the asset (use resolved email)
    if (resolvedEmail) {
      createNotification({
        user_email: resolvedEmail,
        type: 'asset',
        severity: 'info',
        title: `Asset Assigned: ${asset.name}`,
        description: `Admin has assigned ${asset.name} (${asset.id}) to you. Please acknowledge receipt in the portal.`,
        related_id: asset_id,
      });
    }

    res.json({ message: `Asset allocated to ${user_name} successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST return asset ───────────────────────────────────────
// Body: { return_category, returned_by, user_name?, allocation_id? }
//   - For bulk assets, pass user_name (or allocation_id) so we close ONE
//     specific allocation, not every active one.
//   - qty_in_use is reconciled from the actual active-allocation count
//     after the return, so it can never drift out of sync.
router.post('/:id/return', async (req, res) => {
  const { return_category, returned_by, user_name, allocation_id } = req.body;
  const asset_id = req.params.id;

  try {
    const assetResult = await pool.query('SELECT * FROM assets WHERE id = $1', [asset_id]);
    if (assetResult.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });

    // Step 1 — close exactly ONE allocation (most recent active match)
    let allocClosed;
    if (allocation_id) {
      allocClosed = await pool.query(`
        UPDATE asset_allocations
           SET returned_at = NOW(), return_category = $1
         WHERE id = $2 AND returned_at IS NULL
         RETURNING *`,
        [return_category, allocation_id]
      );
    } else if (user_name) {
      allocClosed = await pool.query(`
        UPDATE asset_allocations
           SET returned_at = NOW(), return_category = $1
         WHERE id = (
           SELECT id FROM asset_allocations
            WHERE asset_id = $2 AND user_name = $3 AND returned_at IS NULL
            ORDER BY allocated_at DESC LIMIT 1
         )
         RETURNING *`,
        [return_category, asset_id, user_name]
      );
    } else {
      // Backwards-compatible: close the most-recent active allocation for this asset
      allocClosed = await pool.query(`
        UPDATE asset_allocations
           SET returned_at = NOW(), return_category = $1
         WHERE id = (
           SELECT id FROM asset_allocations
            WHERE asset_id = $2 AND returned_at IS NULL
            ORDER BY allocated_at DESC LIMIT 1
         )
         RETURNING *`,
        [return_category, asset_id]
      );
    }

    // Step 2 — handle full-removal categories
    if (return_category === 'To Vendor' || return_category === 'To User') {
      await pool.query('DELETE FROM assets WHERE id = $1', [asset_id]);
      return res.json({ message: `Asset removed (${return_category}) successfully` });
    }

    // Step 3 — reconcile qty_in_use from the truth (allocations table)
    const activeCountRes = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM asset_allocations WHERE asset_id = $1 AND returned_at IS NULL`,
      [asset_id]
    );
    const activeCount = activeCountRes.rows[0].cnt;

    // Pick a sensible assigned_to: any remaining active user, or NULL
    const remainingUserRes = await pool.query(
      `SELECT user_name FROM asset_allocations
        WHERE asset_id = $1 AND returned_at IS NULL
        ORDER BY allocated_at DESC LIMIT 1`,
      [asset_id]
    );
    const remainingUser = remainingUserRes.rows[0]?.user_name || null;

    await pool.query(`
      UPDATE assets
         SET qty_in_use  = $1,
             assigned_to = $2,
             status      = CASE WHEN $1 = 0 THEN 'Spare' ELSE 'In Use' END,
             updated_at  = NOW()
       WHERE id = $3`,
      [activeCount, remainingUser, asset_id]
    );

    res.json({
      message: `Asset returned (${return_category}) successfully`,
      closed: allocClosed.rowCount,
      qty_in_use: activeCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET allocation history for an asset ────────────────────
router.get('/:id/history', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM asset_allocations
      WHERE asset_id = $1
      ORDER BY allocated_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
