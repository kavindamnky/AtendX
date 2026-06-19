-- ==========================================================
-- AtendX HR SaaS Platform — Database Schema Updates
-- Run this in Supabase SQL Editor to enable new modules
-- ==========================================================

-- ---- ASSET TRACKING ----
CREATE TABLE IF NOT EXISTS assets (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID REFERENCES companies(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  serial_number  TEXT,
  category       TEXT DEFAULT 'general', -- e.g. Laptop, Mobile, Chair, Keyboard
  assigned_to    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_date  DATE,
  status         TEXT DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
  value          NUMERIC(10,2),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---- KPIs (Key Performance Indicators) ----
CREATE TABLE IF NOT EXISTS kpis (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  target_value   NUMERIC(10,2) NOT NULL,
  actual_value   NUMERIC(10,2) DEFAULT 0,
  unit           TEXT DEFAULT '%', -- e.g. %, count, hours
  month          DATE NOT NULL, -- First day of the month e.g. '2026-06-01'
  status         TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'met', 'missed')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---- PERFORMANCE REVIEWS ----
CREATE TABLE IF NOT EXISTS performance_reviews (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_period  TEXT NOT NULL, -- e.g. 'Q1 2026', 'Annual 2025'
  rating         NUMERIC(3,2) CHECK (rating >= 1.0 AND rating <= 5.0), -- Rating scale 1-5
  feedback       TEXT NOT NULL,
  goals_next_period TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---- ATS / JOB POSTINGS ----
CREATE TABLE IF NOT EXISTS job_postings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID REFERENCES companies(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  department     TEXT,
  location       TEXT,
  employment_type TEXT DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship')),
  description    TEXT NOT NULL,
  requirements   TEXT,
  salary_range   TEXT,
  status         TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'closed')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---- ATS / CANDIDATES ----
CREATE TABLE IF NOT EXISTS candidates (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID REFERENCES companies(id) ON DELETE CASCADE,
  job_id         UUID REFERENCES job_postings(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  resume_url     TEXT,
  status         TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'screening', 'interview', 'offered', 'hired', 'rejected')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---- LEARNING LIBRARY ----
CREATE TABLE IF NOT EXISTS learning_materials (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID REFERENCES companies(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  content_type   TEXT NOT NULL CHECK (content_type IN ('document', 'link', 'video')),
  url            TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---- LEARNING PROGRESS ----
CREATE TABLE IF NOT EXISTS learning_progress (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  material_id    UUID REFERENCES learning_materials(id) ON DELETE CASCADE,
  status         TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, material_id)
);

-- ---- EMPLOYEE PAYROLL CONFIGURATION ----
CREATE TABLE IF NOT EXISTS employee_payroll_config (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id    UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  basic_salary   NUMERIC(10,2) NOT NULL DEFAULT 0,
  allowances     NUMERIC(10,2) NOT NULL DEFAULT 0,
  deductions     NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---- PAYROLL RUNS ----
CREATE TABLE IF NOT EXISTS payroll_runs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID REFERENCES companies(id) ON DELETE CASCADE,
  payroll_month  DATE NOT NULL, -- First day of month
  status         TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'paid')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, payroll_month)
);

-- ---- EMPLOYEE PAYSLIPS ----
CREATE TABLE IF NOT EXISTS employee_payslips (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID REFERENCES companies(id) ON DELETE CASCADE,
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  basic_salary   NUMERIC(10,2) NOT NULL,
  allowances     NUMERIC(10,2) NOT NULL,
  deductions     NUMERIC(10,2) NOT NULL,
  epf_employee   NUMERIC(10,2) NOT NULL, -- 8% in Sri Lanka
  epf_employer   NUMERIC(10,2) NOT NULL, -- 12% in Sri Lanka
  etf_employer   NUMERIC(10,2) NOT NULL, -- 3% in Sri Lanka
  apit_tax       NUMERIC(10,2) NOT NULL, -- Inland Revenue Department (PAYE)
  net_pay        NUMERIC(10,2) NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payroll_run_id, employee_id)
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE assets                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates                ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_materials        ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress         ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_payroll_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_payslips         ENABLE ROW LEVEL SECURITY;

-- We assume the auth_company_ids() helper function exists (from core schema)
-- If it doesn't, ensure it is created first.

CREATE POLICY "assets_tenant_all"                  ON assets FOR ALL USING (company_id IN (SELECT auth_company_ids()));
CREATE POLICY "kpis_tenant_all"                    ON kpis FOR ALL USING (company_id IN (SELECT auth_company_ids()));
CREATE POLICY "performance_reviews_tenant_all"     ON performance_reviews FOR ALL USING (company_id IN (SELECT auth_company_ids()));

-- Job postings are readable by public (for recruitment page), but modified by tenant
CREATE POLICY "job_postings_select_public"         ON job_postings FOR SELECT USING (true);
CREATE POLICY "job_postings_tenant_write"          ON job_postings FOR ALL USING (company_id IN (SELECT auth_company_ids()));

-- Candidates can be inserted by anyone (public apply form), read/write by tenant
CREATE POLICY "candidates_insert_public"           ON candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "candidates_tenant_all"              ON candidates FOR ALL USING (company_id IN (SELECT auth_company_ids()));

CREATE POLICY "learning_materials_tenant_all"      ON learning_materials FOR ALL USING (company_id IN (SELECT auth_company_ids()));
CREATE POLICY "learning_progress_tenant_all"       ON learning_progress FOR ALL USING (company_id IN (SELECT auth_company_ids()));
CREATE POLICY "employee_payroll_config_tenant_all" ON employee_payroll_config FOR ALL USING (company_id IN (SELECT auth_company_ids()));
CREATE POLICY "payroll_runs_tenant_all"            ON payroll_runs FOR ALL USING (company_id IN (SELECT auth_company_ids()));
CREATE POLICY "employee_payslips_tenant_all"       ON employee_payslips FOR ALL USING (company_id IN (SELECT auth_company_ids()));
