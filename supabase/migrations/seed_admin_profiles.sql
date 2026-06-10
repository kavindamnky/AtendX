-- Seed admin and HR admin profiles for AttendX
-- These accounts are used by the special admin login flow.

INSERT INTO profiles (mobile, email, full_name, national_id, department, role, employee_id, status, join_date)
VALUES
  ('0771000001', 'admin@attendx.com', 'Admin', 'ADMIN0001', 'SALON MOONLIGHT', 'admin', 'ADMIN001', 'active', CURRENT_DATE),
  ('0771000002', 'hradmin@attendx.com', 'HRadmin', 'HRADMIN0001', 'SALON MOONLIGHT', 'hr', 'HRADMIN001', 'active', CURRENT_DATE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO leave_balance (employee_id, year, annual_total, annual_used, sick_total, sick_used)
SELECT id, EXTRACT(YEAR FROM NOW()), 21, 0, 14, 0
FROM profiles
WHERE email IN ('admin@attendx.com', 'hradmin@attendx.com')
ON CONFLICT (employee_id, year) DO NOTHING;
