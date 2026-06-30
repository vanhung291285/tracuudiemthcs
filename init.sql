-- SQL KHỞI TẠO HỆ THỐNG TRA CỨU ĐIỂM PTDTBT TH & THCS SUỐI LƯ
-- Chạy mã này trong SQL Editor của Supabase để cấu hình đầy đủ các bảng và chính sách bảo mật (RLS)

-- 1. BẢNG CẤU HÌNH CỔNG TRA CỨU (portal_settings)
CREATE TABLE IF NOT EXISTS portal_settings (
  id TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG HỌC SINH (students)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  student_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  gender TEXT NOT NULL,
  class_name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  subjects JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG DANH SÁCH LỚP HỌC (portal_classes)
CREATE TABLE IF NOT EXISTS portal_classes (
  id TEXT PRIMARY KEY,
  class_name TEXT UNIQUE NOT NULL,
  grade_level TEXT NOT NULL,
  advisor_name TEXT,
  room_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG THỐNG KÊ LƯỢT TRUY CẬP (visitor_stats & visitor_counts)
CREATE TABLE IF NOT EXISTS visitor_stats (
  id BIGSERIAL PRIMARY KEY,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visitor_counts (
  visit_date DATE PRIMARY KEY,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BẢNG NHẬT KÝ TÌM KIẾM (search_activity)
CREATE TABLE IF NOT EXISTS search_activity (
  id BIGSERIAL PRIMARY KEY,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  queried_at TIMESTAMPTZ DEFAULT NOW(),
  count INTEGER DEFAULT 1
);

-- =========================================================================
-- BẬT CHÍNH SÁCH BẢO MẬT ROW LEVEL SECURITY (RLS) & CHO PHÉP ĐỌC GHI CÔNG KHAI
-- =========================================================================

-- Kích hoạt bảo mật dòng cho các bảng
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_activity ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách cho phép ĐỌC & GHI công khai (không cần đăng nhập)
DROP POLICY IF EXISTS "Cho phép đọc công khai students" ON students;
CREATE POLICY "Cho phép đọc công khai students" ON students FOR SELECT USING (true);
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác students" ON students;
CREATE POLICY "Cho phép thực hiện mọi thao tác students" ON students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép đọc công khai portal_classes" ON portal_classes;
CREATE POLICY "Cho phép đọc công khai portal_classes" ON portal_classes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác portal_classes" ON portal_classes;
CREATE POLICY "Cho phép thực hiện mọi thao tác portal_classes" ON portal_classes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép đọc công khai portal_settings" ON portal_settings;
CREATE POLICY "Cho phép đọc công khai portal_settings" ON portal_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác portal_settings" ON portal_settings;
CREATE POLICY "Cho phép thực hiện mọi thao tác portal_settings" ON portal_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép đọc công khai visitor_stats" ON visitor_stats;
CREATE POLICY "Cho phép đọc công khai visitor_stats" ON visitor_stats FOR SELECT USING (true);
DROP POLICY IF EXISTS "Cho phép ghi công khai visitor_stats" ON visitor_stats;
CREATE POLICY "Cho phép ghi công khai visitor_stats" ON visitor_stats FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép đọc công khai visitor_counts" ON visitor_counts;
CREATE POLICY "Cho phép đọc công khai visitor_counts" ON visitor_counts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác visitor_counts" ON visitor_counts;
CREATE POLICY "Cho phép thực hiện mọi thao tác visitor_counts" ON visitor_counts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép đọc công khai search_activity" ON search_activity;
CREATE POLICY "Cho phép đọc công khai search_activity" ON search_activity FOR SELECT USING (true);
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác search_activity" ON search_activity;
CREATE POLICY "Cho phép thực hiện mọi thao tác search_activity" ON search_activity FOR ALL USING (true) WITH CHECK (true);

-- Thông báo dọn dẹp cache của hệ thống Supabase
NOTIFY pgrst, 'reload schema';
