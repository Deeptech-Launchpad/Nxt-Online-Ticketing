const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const pool    = require('./db');
require('dotenv').config();

const app = express();

// ── Ensure uploads/ folder exists ────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log('📁 Created uploads/ folder');
}

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: 'http://localhost:8090',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Serve uploaded files at /uploads/<filename>
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/assets',        require('./routes/assets'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/tickets',       require('./routes/tickets'));
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/notifications', require('./routes/notifications'));

// ── Health check ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '✅ AltiusNXT Helpdesk Backend is running' });
});

// ── Auto-create tables on startup ───────────────────────────
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id   SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL UNIQUE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS demo_users (
        id    SERIAL PRIMARY KEY,
        name  VARCHAR(100) NOT NULL,
        email VARCHAR(150),
        UNIQUE(name)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id       VARCHAR(20) PRIMARY KEY,
        name     VARCHAR(100) NOT NULL,
        division VARCHAR(150),
        dept     VARCHAR(100),
        avatar   VARCHAR(10),
        email    VARCHAR(150) UNIQUE,
        role     VARCHAR(50) DEFAULT 'employee'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id              VARCHAR(20) PRIMARY KEY,
        subject         VARCHAR(255) NOT NULL,
        category        VARCHAR(100),
        division        VARCHAR(150),
        dept            VARCHAR(100),
        employee_id     VARCHAR(20) REFERENCES users(id),
        employee_name   VARCHAR(100),
        priority        VARCHAR(50) DEFAULT 'Medium',
        status          VARCHAR(50) DEFAULT 'open',
        remote          VARCHAR(50) DEFAULT 'In Person',
        device          VARCHAR(100),
        description     TEXT,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        resolved_at     TIMESTAMP,
        in_progress_at  TIMESTAMP,
        assigned_to     VARCHAR(100),
        resolution_note TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id          SERIAL PRIMARY KEY,
        ticket_id   VARCHAR(20) REFERENCES tickets(id) ON DELETE CASCADE,
        sender_role VARCHAR(50),
        sender_name VARCHAR(100),
        message     TEXT NOT NULL,
        sent_at     TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_history (
        id           SERIAL PRIMARY KEY,
        ticket_id    VARCHAR(20) REFERENCES tickets(id) ON DELETE CASCADE,
        action_label VARCHAR(255) NOT NULL,
        action_time  TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id                     VARCHAR(20) PRIMARY KEY,
        name                   VARCHAR(200) NOT NULL,
        brand                  VARCHAR(100) NOT NULL,
        type                   VARCHAR(50)  NOT NULL DEFAULT 'Laptop',
        serial_number          VARCHAR(100) NOT NULL UNIQUE,
        division               VARCHAR(150),
        organization_id        INT REFERENCES organizations(id) ON DELETE SET NULL,
        ownership_type         VARCHAR(50),
        owned_by_division      VARCHAR(150),
        personal_owner_name    VARCHAR(100),
        personal_owner_contact VARCHAR(150),
        vendor_name            VARCHAR(150),
        vendor_contact         VARCHAR(150),
        rental_type            VARCHAR(50),
        rent_start_date        DATE,
        rent_end_date          DATE,
        quantity               INT NOT NULL DEFAULT 1,
        qty_in_use             INT NOT NULL DEFAULT 0,
        qty_repairing          INT NOT NULL DEFAULT 0,
        qty_scrap              INT NOT NULL DEFAULT 0,
        status                 VARCHAR(50) NOT NULL DEFAULT 'Spare',
        warranty_status        VARCHAR(50) DEFAULT 'Active',
        warranty_expiry        DATE,
        purchase_date          DATE,
        assigned_to            VARCHAR(100),
        created_at             TIMESTAMP DEFAULT NOW(),
        updated_at             TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS asset_allocations (
        id              SERIAL PRIMARY KEY,
        asset_id        VARCHAR(20) REFERENCES assets(id) ON DELETE CASCADE,
        user_name       VARCHAR(100) NOT NULL,
        user_email      VARCHAR(150),
        allocated_by    VARCHAR(100),
        allocated_at    TIMESTAMP DEFAULT NOW(),
        returned_at     TIMESTAMP,
        return_category VARCHAR(50),
        notes           TEXT
      );
    `);

    // Seed organizations
    await pool.query(`
      INSERT INTO organizations (name) VALUES
        ('Antlab'),('Accurate Document Service'),('White&Co'),
        ('Altius Technologies Pvt Ltd.,'),('AltiusNXT Technologies Pvt Ltd.,'),
        ('Deeptech'),('Yantra-Profimax digiconnect Pvt Ltd.,')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Demo users seed removed — real users are now created automatically
    // via OTP/Google login (see ensureUserRow in routes/auth.js).

    // Seed real users (only if users table is completely empty — i.e. fresh install)
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersResult.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO users (id, name, division, dept, avatar, email, role) VALUES
        ('EMP-2041', 'Arjun Kumar', 'RS Puram Coimbatore', 'Finance', 'AK', 'arjun@company.com', 'employee'),
        ('ADM-001', 'Suresh M.', 'All Divisions', 'IT Admin', 'SM', 'suresh@company.com', 'admin'),
        ('EMP-2099', 'Priya S.', 'Guntur -AndhraPradesh', 'Sales', 'PS', 'priya@company.com', 'employee'),
        ('EMP-3011', 'Meena R.', 'Thudiyalur-coimbatore', 'HR', 'MR', 'meena@company.com', 'employee')
        ON CONFLICT (id) DO NOTHING;
      `);

      // Seed initial tickets since we just created users
      await pool.query(`
        INSERT INTO tickets (id, subject, category, division, dept, employee_id, employee_name, priority, status, remote, device, description, created_at, updated_at, resolved_at, in_progress_at, assigned_to, resolution_note) VALUES
        ('TKT-0041', 'Network down – floor 2', 'Network', 'RS Puram Coimbatore', 'Operations', 'EMP-2041', 'Arjun Kumar', 'Very High', 'open', 'In Person', 'NET-CHN-02', 'Entire floor 2 is without network. Router seems unresponsive. Multiple users affected.', '2026-04-02 08:50:00', '2026-04-02 08:50:00', NULL, NULL, 'Suresh M.', ''),
        ('TKT-0040', 'Excel crashes on launch', 'Software', 'RS Puram Coimbatore', 'Finance', 'EMP-2041', 'Arjun Kumar', 'Medium', 'in-progress', 'AnyDesk', 'PC-CHN-045', 'Since this morning, Microsoft Excel crashes immediately after opening. Tried restarting PC but same issue persists. Blocking daily reporting.', '2026-04-02 09:14:00', '2026-04-02 10:05:00', NULL, '2026-04-02 10:05:00', 'Suresh M.', 'Connected via AnyDesk. Found corrupt Excel installation. Running repair via Control Panel.'),
        ('TKT-0039', 'VPN login failure', 'Network', 'Guntur -AndhraPradesh', 'Sales', 'EMP-2099', 'Priya S.', 'High', 'open', 'TeamViewer', 'PC-MDU-012', 'Cannot connect to VPN. Error: "Authentication failed". Tried resetting password but same issue.', '2026-04-01 14:15:00', '2026-04-01 14:15:00', NULL, NULL, '', ''),
        ('TKT-0038', 'Printer offline – HR', 'Hardware', 'Thudiyalur-coimbatore', 'HR', 'EMP-3011', 'Meena R.', 'Low', 'closed', 'In Person', 'PRN-CBE-01', 'Shared printer on floor 3 shows offline. Checked cables – all connected. Other PCs also unable to print.', '2026-03-31 11:00:00', '2026-03-31 11:50:00', '2026-03-31 11:50:00', '2026-03-31 11:20:00', 'Suresh M.', 'Restarted print spooler service on print server. Cleared stuck jobs.'),
        ('TKT-0037', 'VPN disconnects on login', 'Network', 'RS Puram Coimbatore', 'Finance', 'EMP-2041', 'Arjun Kumar', 'High', 'open', 'TeamViewer', 'PC-CHN-045', 'VPN disconnects immediately after connecting. Issue started after Windows Update yesterday.', '2026-03-30 15:40:00', '2026-03-30 15:40:00', NULL, NULL, '', ''),
        ('TKT-0031', 'Printer not found on network', 'Hardware', 'RS Puram Coimbatore', 'Finance', 'EMP-2041', 'Arjun Kumar', 'Low', 'resolved', 'In Person', 'PRN-CHN-02', 'HP LaserJet Pro not visible on network. Was working last week. Other users on same floor can print.', '2026-03-25 10:00:00', '2026-03-25 10:40:00', '2026-03-25 10:40:00', '2026-03-25 10:15:00', 'Suresh M.', 'Re-installed printer using static IP. Updated TCP/IP port settings.')
        ON CONFLICT (id) DO NOTHING;
      `);

      // Seed messages
      await pool.query(`
        INSERT INTO ticket_messages (ticket_id, sender_role, sender_name, message, sent_at) VALUES
        ('TKT-0040', 'admin', 'Suresh M.', 'I have taken up your ticket. Please open AnyDesk and share your ID so I can connect and investigate.', '2026-04-02 10:03:00'),
        ('TKT-0040', 'employee', 'Arjun Kumar', 'Sure, my AnyDesk ID is 123 456 789. Ready when you are.', '2026-04-02 10:06:00'),
        ('TKT-0038', 'admin', 'Suresh M.', 'Checked the print spooler. Restarted the service. Printer is back online now.', '2026-03-31 11:30:00'),
        ('TKT-0038', 'employee', 'Meena R.', 'Working perfectly now! Thank you.', '2026-03-31 11:45:00'),
        ('TKT-0031', 'admin', 'Suresh M.', 'Re-added the printer using IP address. Should be working now.', '2026-03-25 10:30:00'),
        ('TKT-0031', 'employee', 'Arjun Kumar', 'Yes, it is working now. Thank you!', '2026-03-25 10:45:00')
      `);

      // Seed history
      await pool.query(`
        INSERT INTO ticket_history (ticket_id, action_label, action_time) VALUES
        ('TKT-0041', 'Submitted', '2026-04-02 08:50:00'),
        ('TKT-0040', 'Submitted', '2026-04-02 09:14:00'),
        ('TKT-0040', 'Assigned to Suresh M.', '2026-04-02 09:30:00'),
        ('TKT-0040', 'In Progress', '2026-04-02 10:05:00'),
        ('TKT-0039', 'Submitted', '2026-04-01 14:15:00'),
        ('TKT-0038', 'Submitted', '2026-03-31 11:00:00'),
        ('TKT-0038', 'Assigned', '2026-03-31 11:15:00'),
        ('TKT-0038', 'In Progress', '2026-03-31 11:20:00'),
        ('TKT-0038', 'Resolved & Closed', '2026-03-31 11:50:00'),
        ('TKT-0037', 'Submitted', '2026-03-30 15:40:00'),
        ('TKT-0031', 'Submitted', '2026-03-25 10:00:00'),
        ('TKT-0031', 'Assigned', '2026-03-25 10:15:00'),
        ('TKT-0031', 'Resolved', '2026-03-25 10:40:00')
      `);
    }

    // Apply schema patches for longer employee IDs (emails)
    await pool.query(`
      ALTER TABLE users ALTER COLUMN id TYPE VARCHAR(150);
      ALTER TABLE tickets ALTER COLUMN employee_id TYPE VARCHAR(150);
      ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_employee_id_fkey;
    `);

    // ── Phase-2 schema additions ──────────────────────────────
    // Asset extra fields (My Assets page)
    await pool.query(`
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS condition        VARCHAR(20)  DEFAULT 'Good';
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS health_percent   INT          DEFAULT 100;
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS is_primary       BOOLEAN      DEFAULT FALSE;
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS specs            JSONB;
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_from    VARCHAR(150);
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_invoice VARCHAR(100);
    `);

    // Ticket extra fields (Raise Ticket Step 2 + Step 3)
    await pool.query(`
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS preferred_time VARCHAR(40);
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS device_notes   TEXT;
    `);

    // Employee profile extras (Admin → Employees page)
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS designation  VARCHAR(150);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone        VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS organization VARCHAR(150);
    `);

    // ── NxtPeople access gate: track WHERE a user record came from ──
    //   'manual'    = added by admin via Add Employee modal (bypasses NxtPeople)
    //   'nxtpeople' = auto-created on successful NxtPeople-approved login
    //   NULL        = legacy row (pre-gate). The UPDATE below marks all such
    //                 rows as 'manual' so existing users don't get locked out.
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS source VARCHAR(20);
    `);
    const sourceFix = await pool.query(`
      UPDATE users SET source = 'manual' WHERE source IS NULL RETURNING id
    `);
    if (sourceFix.rowCount > 0) {
      console.log(`✅ Marked ${sourceFix.rowCount} legacy user(s) as source='manual'`);
    }

    // Notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          SERIAL PRIMARY KEY,
        user_email  VARCHAR(150) NOT NULL,
        type        VARCHAR(20)  NOT NULL,
        severity    VARCHAR(20)  DEFAULT 'info',
        title       VARCHAR(255) NOT NULL,
        description TEXT,
        related_id  VARCHAR(50),
        is_read     BOOLEAN      DEFAULT FALSE,
        created_at  TIMESTAMP    DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_email, is_read);`);

    // Ticket attachments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_attachments (
        id          SERIAL PRIMARY KEY,
        ticket_id   VARCHAR(20) REFERENCES tickets(id) ON DELETE CASCADE,
        file_name   VARCHAR(255) NOT NULL,
        file_path   VARCHAR(500) NOT NULL,
        file_size   INT,
        mime_type   VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Backfill: ensure every ticket-author has a users row ──
    // Historical tickets raised before auto-onboarding existed leave their
    // requester invisible on the Employees page. This one-time scan creates
    // a minimal row for any employee_id present on tickets but missing from
    // users. Idempotent — re-running does nothing once everyone has a row.
    const adminList = (process.env.ADMIN_EMAILS || '')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const orphans = await pool.query(`
      SELECT DISTINCT t.employee_id, t.employee_name
      FROM tickets t
      WHERE t.employee_id IS NOT NULL
        AND t.employee_id NOT IN (SELECT id FROM users)
    `);
    for (const row of orphans.rows) {
      const id   = String(row.employee_id).trim();
      const name = (row.employee_name || id.split('@')[0] || 'User').trim();
      const avatar = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
      // If employee_id looks like an email, use it as email too; otherwise leave NULL.
      const isEmail = id.includes('@');
      const email   = isEmail ? id.toLowerCase() : null;
      const role    = email && adminList.includes(email) ? 'admin' : 'employee';
      try {
        await pool.query(`
          INSERT INTO users (id, name, email, role, avatar)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [id, name, email, role, avatar]);
      } catch (err) {
        console.error(`[backfill] Skipped ${id}:`, err.message);
      }
    }
    if (orphans.rows.length > 0) {
      console.log(`✅ Backfilled ${orphans.rows.length} ticket-author user row(s)`);
    }

    // ── Backfill: reconcile asset.qty_in_use from active allocations ──
    // Earlier versions of /return marked all allocations returned but only
    // decremented qty_in_use by 1, so bulk assets drifted out of sync. This
    // one-shot reconciliation rebuilds qty_in_use from the truth (allocations
    // table). Idempotent — safe to run on every startup.
    const assetSync = await pool.query(`
      WITH active_counts AS (
        SELECT a.id AS asset_id,
               COALESCE(c.cnt, 0) AS active_count
        FROM assets a
        LEFT JOIN (
          SELECT asset_id, COUNT(*)::int AS cnt
          FROM asset_allocations
          WHERE returned_at IS NULL
          GROUP BY asset_id
        ) c ON c.asset_id = a.id
        WHERE a.qty_in_use IS DISTINCT FROM COALESCE(c.cnt, 0)
      )
      UPDATE assets a
         SET qty_in_use = ac.active_count,
             status     = CASE WHEN ac.active_count = 0 THEN 'Spare' ELSE 'In Use' END,
             updated_at = NOW()
        FROM active_counts ac
       WHERE a.id = ac.asset_id
       RETURNING a.id
    `);
    if (assetSync.rowCount > 0) {
      console.log(`✅ Reconciled qty_in_use on ${assetSync.rowCount} asset(s)`);
    }

    // ── Backfill: fill in missing user_email on asset_allocations ──
    // Older allocations were saved with empty user_email because the
    // frontend dropdown only carried the user's name. Now we look each
    // one up by name and write the email back.
    const allocEmailFix = await pool.query(`
      UPDATE asset_allocations al
         SET user_email = u.email
        FROM users u
       WHERE (al.user_email IS NULL OR al.user_email = '')
         AND u.name = al.user_name
         AND u.email IS NOT NULL
      RETURNING al.id
    `);
    if (allocEmailFix.rowCount > 0) {
      console.log(`✅ Backfilled email on ${allocEmailFix.rowCount} allocation row(s)`);
    }

    console.log('✅ All tables created and seed data loaded');
  } catch (err) {
    console.error('❌ Database init failed:', err.message);
  }
}

// ── Start server ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Backend server running at http://localhost:${PORT}`);
  await initDatabase();
});
