const express = require('express');
const cors    = require('cors');
const pool    = require('./db');
require('dotenv').config();

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: 'http://localhost:8090',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────
app.use('/api/assets',        require('./routes/assets'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/tickets',       require('./routes/tickets'));
app.use('/api/auth',          require('./routes/auth'));

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

    // Seed demo users
    await pool.query(`
      INSERT INTO demo_users (name, email) VALUES
        ('Sanjana','sanjana@altius.com'),('Rahul','rahul@altius.com'),
        ('Priya','priya@altius.com'),('Arun','arun@altius.com'),
        ('Deepika','deepika@altius.com'),('Karthik','karthik@altius.com'),
        ('Anjali','anjali@altius.com'),('Vijay','vijay@altius.com'),
        ('Shweta','shweta@altius.com'),('Mani','mani@altius.com')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Seed real users
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
