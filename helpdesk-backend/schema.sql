-- ============================================================
--  AltiusNXT Helpdesk - Asset Master Database Schema
--  Run this file in pgAdmin or psql to create all tables
-- ============================================================

-- 1. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS organizations (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE
);

-- 2. DEMO USERS TABLE (temporary until HR module)
CREATE TABLE IF NOT EXISTS demo_users (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  email VARCHAR(150)
);

-- 3. ASSETS TABLE
CREATE TABLE IF NOT EXISTS assets (
  id                    VARCHAR(20) PRIMARY KEY,
  name                  VARCHAR(200) NOT NULL,
  brand                 VARCHAR(100) NOT NULL,
  type                  VARCHAR(50)  NOT NULL DEFAULT 'Laptop',
  serial_number         VARCHAR(100) NOT NULL UNIQUE,
  division              VARCHAR(150),
  organization_id       INT REFERENCES organizations(id) ON DELETE SET NULL,
  ownership_type        VARCHAR(50),
  owned_by_division     VARCHAR(150),
  personal_owner_name   VARCHAR(100),
  personal_owner_contact VARCHAR(150),
  vendor_name           VARCHAR(150),
  vendor_contact        VARCHAR(150),
  rental_type           VARCHAR(50),
  rent_start_date       DATE,
  rent_end_date         DATE,
  quantity              INT NOT NULL DEFAULT 1,
  qty_in_use            INT NOT NULL DEFAULT 0,
  qty_repairing         INT NOT NULL DEFAULT 0,
  qty_scrap             INT NOT NULL DEFAULT 0,
  status                VARCHAR(50) NOT NULL DEFAULT 'Spare',
  warranty_status       VARCHAR(50) DEFAULT 'Active',
  warranty_expiry       DATE,
  purchase_date         DATE,
  assigned_to           VARCHAR(100),
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- 4. ASSET ALLOCATIONS (History / Audit Log)
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

-- ============================================================
--  SEED DATA - Organizations
-- ============================================================
INSERT INTO organizations (name) VALUES
  ('Antlab'),
  ('Accurate Document Service'),
  ('White&Co'),
  ('Altius Technologies Pvt Ltd.,'),
  ('AltiusNXT Technologies Pvt Ltd.,'),
  ('Deeptech'),
  ('Yantra-Profimax digiconnect Pvt Ltd.,')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
--  SEED DATA - Demo Users
-- ============================================================
INSERT INTO demo_users (name, email) VALUES
  ('Sanjana',  'sanjana@altius.com'),
  ('Rahul',    'rahul@altius.com'),
  ('Priya',    'priya@altius.com'),
  ('Arun',     'arun@altius.com'),
  ('Deepika',  'deepika@altius.com'),
  ('Karthik',  'karthik@altius.com'),
  ('Anjali',   'anjali@altius.com'),
  ('Vijay',    'vijay@altius.com'),
  ('Shweta',   'shweta@altius.com'),
  ('Mani',     'mani@altius.com')
ON CONFLICT DO NOTHING;
