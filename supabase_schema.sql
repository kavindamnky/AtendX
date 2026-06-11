-- =============================================
-- AtendX HR SaaS Platform — Fresh Multi-Tenant Schema
-- Run this in Supabase SQL Editor (fresh project)
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- STORAGE BUCKETS ----
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('company-assets', 'company-assets', TRUE, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-photos', 'profile-photos', TRUE, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ---- COMPANIES TABLE ----
-- Each business owner creates one company (their HR workspace)
CREATE TABLE companies (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,           -- used in /company/:slug/login URL
  owner_id         UUID NOT NULL,                  -- auth.users.id
  logo_url         TEXT,
  industry         TEXT,
  size             TEXT DEFAULT '1-10' CHECK (size IN ('1-10','11-25','26-100','101-500','500+')),
  plan             TEXT DEFAULT 'free' CHECK (plan IN ('free','starter','professional','enterprise')),
  plan_expires_at  TIMESTAMPTZ,
  payhere_order_id TEXT,                           -- last PayHere order reference
  is_onboarded     BOOLEAN DEFAULT FALSE,          -- set TRUE after wizard completes
  in_time          TIME DEFAULT '09:00:00',
  out_time         TIME DEFAULT '17:00:00',
  color_theme      TEXT DEFAULT 'red',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ---- PROFILES TABLE ----
-- Employees (and the owner) of each company
CREATE TABLE profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID REFERENCES companies(id) ON DELETE CASCADE,
  auth_user_id      UUID UNIQUE,                   -- links to auth.users (NULL for unregistered employees)
  mobile            TEXT,
  email             TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  national_id       TEXT,
  department        TEXT,
  role              TEXT DEFAULT 'employee' CHECK (role IN ('employee','admin','hr','owner')),
  profile_photo_url TEXT,
  employee_id       TEXT,
  join_date         DATE DEFAULT CURRENT_DATE,
  status            TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, email)
);

-- ---- DEPARTMENTS TABLE ----
CREATE TABLE departments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- ---- ATTENDANCE TABLE ----
CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in    TIMESTAMPTZ,
  check_out   TIMESTAMPTZ,
  status      TEXT DEFAULT 'present' CHECK (status IN ('present','absent','late','half_day')),
  work_hours  NUMERIC(4,2),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- ---- LEAVES TABLE ----
CREATE TABLE leaves (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id         UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type         TEXT NOT NULL CHECK (leave_type IN ('annual','sick','emergency','maternity','paternity','unpaid')),
  start_date         DATE NOT NULL,
  end_date           DATE NOT NULL,
  days_count         INTEGER NOT NULL,
  reason             TEXT NOT NULL,
  status             TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  covering_person_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by        UUID REFERENCES profiles(id),
  approved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ---- MEAL ORDERS TABLE ----
CREATE TABLE meal_orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  meal_type     TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  items         JSONB NOT NULL DEFAULT '[]',
  total_price   NUMERIC(8,2) NOT NULL DEFAULT 0,
  order_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT DEFAULT 'ordered' CHECK (status IN ('ordered','preparing','ready','delivered','cancelled')),
  special_notes TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- MEAL MENU TABLE (per company) ----
CREATE TABLE meal_menu (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  category     TEXT CHECK (category IN ('breakfast','lunch','dinner','all')),
  price        NUMERIC(6,2) NOT NULL,
  description  TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  image_url    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ---- LEAVE BALANCE TABLE ----
CREATE TABLE leave_balance (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  year         INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  annual_total INTEGER DEFAULT 21,
  annual_used  INTEGER DEFAULT 0,
  sick_total   INTEGER DEFAULT 14,
  sick_used    INTEGER DEFAULT 0,
  UNIQUE(employee_id, year)
);

-- ---- NOTIFICATIONS TABLE ----
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ---- ANNOUNCEMENTS TABLE ----
CREATE TABLE announcements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- INDEXES ----
CREATE INDEX idx_companies_owner      ON companies(owner_id);
CREATE INDEX idx_companies_slug       ON companies(slug);
CREATE INDEX idx_profiles_company     ON profiles(company_id);
CREATE INDEX idx_profiles_auth_user   ON profiles(auth_user_id);
CREATE INDEX idx_profiles_email       ON profiles(email);
CREATE INDEX idx_attendance_company   ON attendance(company_id);
CREATE INDEX idx_attendance_employee  ON attendance(employee_id);
CREATE INDEX idx_attendance_date      ON attendance(date);
CREATE INDEX idx_leaves_company       ON leaves(company_id);
CREATE INDEX idx_leaves_employee      ON leaves(employee_id);
CREATE INDEX idx_meal_orders_company  ON meal_orders(company_id);
CREATE INDEX idx_notifications_emp    ON notifications(employee_id);
CREATE INDEX idx_announcements_company ON announcements(company_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE companies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves        ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_menu     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Helper function: get company IDs accessible to the current user
CREATE OR REPLACE FUNCTION auth_company_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM companies WHERE owner_id = auth.uid()
  UNION
  SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()
$$;

-- ---- COMPANIES policies ----
CREATE POLICY "companies_owner_all"     ON companies FOR ALL    USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "companies_member_read"   ON companies FOR SELECT USING (id IN (SELECT auth_company_ids()));

-- ---- PROFILES policies ----
CREATE POLICY "profiles_company_read"   ON profiles FOR SELECT USING (company_id IN (SELECT auth_company_ids()));
CREATE POLICY "profiles_insert"         ON profiles FOR INSERT  WITH CHECK (true);
CREATE POLICY "profiles_update"         ON profiles FOR UPDATE  USING (auth_user_id = auth.uid() OR company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "profiles_delete_admin"   ON profiles FOR DELETE  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- ---- DEPARTMENTS policies ----
CREATE POLICY "departments_all"         ON departments FOR ALL  USING (company_id IN (SELECT auth_company_ids()));

-- ---- ATTENDANCE policies ----
CREATE POLICY "attendance_all"          ON attendance FOR ALL   USING (company_id IN (SELECT auth_company_ids()));

-- ---- LEAVES policies ----
CREATE POLICY "leaves_all"              ON leaves FOR ALL       USING (company_id IN (SELECT auth_company_ids()));

-- ---- MEAL ORDERS policies ----
CREATE POLICY "meal_orders_all"         ON meal_orders FOR ALL  USING (company_id IN (SELECT auth_company_ids()));

-- ---- MEAL MENU policies ----
CREATE POLICY "meal_menu_all"           ON meal_menu FOR ALL    USING (company_id IN (SELECT auth_company_ids()));

-- ---- LEAVE BALANCE policies ----
CREATE POLICY "leave_balance_all"       ON leave_balance FOR ALL USING (company_id IN (SELECT auth_company_ids()));

-- ---- NOTIFICATIONS policies ----
CREATE POLICY "notifications_all"       ON notifications FOR ALL USING (company_id IN (SELECT auth_company_ids()));

-- ---- ANNOUNCEMENTS policies ----
CREATE POLICY "announcements_all"       ON announcements FOR ALL USING (company_id IN (SELECT auth_company_ids()));

-- ---- STORAGE policies ----
CREATE POLICY "company_assets_all"      ON storage.objects FOR ALL USING (bucket_id = 'company-assets');
CREATE POLICY "profile_photos_all"      ON storage.objects FOR ALL USING (bucket_id = 'profile-photos');

-- =============================================
-- PLAN LIMITS FUNCTION (optional server-side check)
-- =============================================
CREATE OR REPLACE FUNCTION get_plan_employee_limit(p_plan TEXT)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_plan
    WHEN 'free'         THEN 5
    WHEN 'starter'      THEN 25
    WHEN 'professional' THEN 100
    WHEN 'enterprise'   THEN 2147483647
    ELSE 5
  END;
$$;
