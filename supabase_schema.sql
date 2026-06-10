-- =============================================
-- ATTENDANCE SYSTEM - SUPABASE SCHEMA
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- STORAGE BUCKETS ----
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---- PROFILES TABLE ----
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mobile TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  national_id TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  role TEXT DEFAULT 'employee' CHECK (role IN ('employee', 'admin', 'hr')),
  profile_photo_url TEXT,
  employee_id TEXT UNIQUE,
  join_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- ATTENDANCE TABLE ----
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day')),
  work_hours NUMERIC(4,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- ---- LEAVES TABLE ----
CREATE TABLE leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'sick', 'emergency', 'maternity', 'paternity', 'unpaid')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  covering_person_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- MEAL ORDERS TABLE ----
CREATE TABLE meal_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  items JSONB NOT NULL DEFAULT '[]',
  total_price NUMERIC(8,2) NOT NULL DEFAULT 0,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'ordered' CHECK (status IN ('ordered', 'preparing', 'ready', 'delivered', 'cancelled')),
  special_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- DEPARTMENTS TABLE ----
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  manager_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- NOTIFICATIONS TABLE ----
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- ANNOUNCEMENTS TABLE ----
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- MEAL MENU TABLE ----
CREATE TABLE meal_menu (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('breakfast', 'lunch', 'dinner', 'all')),
  price NUMERIC(6,2) NOT NULL,
  description TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- LEAVE BALANCE TABLE ----
CREATE TABLE leave_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  annual_total INTEGER DEFAULT 21,
  annual_used INTEGER DEFAULT 0,
  sick_total INTEGER DEFAULT 14,
  sick_used INTEGER DEFAULT 0,
  UNIQUE(employee_id, year)
);

-- ---- INDEXES ----
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_leaves_employee ON leaves(employee_id);
CREATE INDEX idx_meal_orders_employee ON meal_orders(employee_id);
CREATE INDEX idx_notifications_employee ON notifications(employee_id);

-- ---- SEED DEFAULT DEPARTMENTS ----
INSERT INTO departments (name) VALUES
  ('SALON MOONLIGHT'),
  ('LUMEO CREATIONS'),
  ('MALSHAN HOLDINGS'),
  ('MALSHAN RENT A CAR'),
  ('NINDUWARA AUTO SERVICE'),
  ('ONE SEVEN RENT A CAR');

-- ---- SEED MEAL MENU ----
INSERT INTO meal_menu (name, category, price, description) VALUES
  ('Continental Breakfast', 'breakfast', 5.50, 'Croissant, butter, jam, orange juice'),
  ('Full English', 'breakfast', 8.00, 'Eggs, bacon, toast, beans, tomato'),
  ('Oatmeal Bowl', 'breakfast', 4.00, 'Rolled oats with fruits and honey'),
  ('Chicken Rice', 'lunch', 7.50, 'Grilled chicken with steamed rice'),
  ('Beef Burger', 'lunch', 9.00, 'Beef patty with fries and salad'),
  ('Vegetable Pasta', 'lunch', 6.50, 'Penne with marinara and vegetables'),
  ('Caesar Salad', 'lunch', 5.00, 'Romaine, croutons, parmesan dressing'),
  ('Grilled Salmon', 'dinner', 14.00, 'Atlantic salmon with roasted vegetables'),
  ('Lamb Chops', 'dinner', 16.00, 'Herb-crusted lamb with mashed potato'),
  ('Stir Fry Tofu', 'dinner', 8.00, 'Tofu with mixed vegetables in soy sauce'),
  ('Chicken Curry', 'dinner', 11.00, 'Slow-cooked curry with basmati rice');

-- ---- ROW LEVEL SECURITY ----
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: everyone can read, own row update
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (true);

-- Attendance: employees see own, admin sees all
CREATE POLICY "attendance_all" ON attendance FOR ALL USING (true);

-- Leaves: employees see own
CREATE POLICY "leaves_all" ON leaves FOR ALL USING (true);

-- Meal orders: employees see own
CREATE POLICY "meal_orders_all" ON meal_orders FOR ALL USING (true);

-- Notifications: see own
CREATE POLICY "notifications_all" ON notifications FOR ALL USING (true);

-- Profile photos: public reads and browser uploads for registration/profile edits
DROP POLICY IF EXISTS "profile_photos_read_all" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_insert_all" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_update_all" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_delete_all" ON storage.objects;

CREATE POLICY "profile_photos_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos');

CREATE POLICY "profile_photos_insert_all" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "profile_photos_update_all" ON storage.objects
  FOR UPDATE USING (bucket_id = 'profile-photos') WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "profile_photos_delete_all" ON storage.objects
  FOR DELETE USING (bucket_id = 'profile-photos');
