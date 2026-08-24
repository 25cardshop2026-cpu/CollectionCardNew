-- โครงฐานข้อมูลของ Collection Card บน Supabase
--
-- วิธีใช้: เปิด Supabase → SQL Editor → วางไฟล์นี้ทั้งไฟล์ → Run
-- รันซ้ำได้ ทุกคำสั่งเป็นแบบ "สร้างถ้ายังไม่มี"
--
-- หลักการที่ใช้ตลอดไฟล์นี้:
--
-- 1. เก็บเฉพาะ "ส่วนต่าง" จากแคตตาล็อกตั้งต้น เหมือนที่ overrides.json เคยทำ
--    รายชื่อการ์ดจากเว็บทางการยังอยู่ใน data/onepiece-catalog.json ซึ่งสร้างใหม่
--    ได้เสมอ ไม่ต้องเอามานอนในฐานข้อมูลให้ต้องคอยซิงก์กันสองที่
--
-- 2. ราคาเป็นตารางจริง ไม่ใช่ก้อน JSON เพราะเป็นข้อมูลชุดเดียวที่โตไม่หยุด
--    (บันทึกราคาทุกครั้ง = แถวใหม่เสมอ ไม่เขียนทับ)
--
-- 3. เปิด RLS ทุกตารางโดยไม่ประกาศ policy เลย = ไม่มีใครอ่านหรือเขียนได้ผ่าน
--    คีย์ฝั่งเบราว์เซอร์ แอปเข้าถึงด้วย service role key จากฝั่งเซิร์ฟเวอร์
--    เท่านั้น ซึ่งข้ามผ่าน RLS ได้ตามปกติ ตัวตนของผู้ใช้ตรวจในโค้ดแอปเอง

-- ---------------------------------------------------------------
-- แคตตาล็อก: ของที่แอดมินเพิ่มหรือแก้
-- ---------------------------------------------------------------

-- ชุดการ์ดที่สร้างเองในแดชบอร์ด (ชุดจากแคตตาล็อกตั้งต้นไม่ได้อยู่ที่นี่)
create table if not exists admin_sets (
  code          text primary key,
  game_slug     text not null,
  name_th       text not null,
  name_en       text not null,
  language      text not null check (language in ('JP', 'EN')),
  release_date  text not null,
  total_cards   integer not null default 0,
  created_at    timestamptz not null default now()
);

-- การ์ดที่สร้างเองในแดชบอร์ด
-- id คือ "เลขการ์ด:แบบพิมพ์" เช่น OP13-118:normal — การ์ดเลขเดียวกันคนละ
-- แบบพิมพ์คือของคนละชิ้น คนละราคา จึงเป็นคนละแถว
create table if not exists admin_cards (
  id            text primary key,
  slug          text not null unique,
  set_code      text not null,
  number        text not null,
  name_th       text not null,
  name_en       text not null,
  rarity        text not null,
  card_type     text not null,
  color         text not null,
  variant_type  text not null,
  created_at    timestamptz not null default now()
);

create table if not exists admin_variants (
  id            text primary key,
  card_id       text not null,
  variant_type  text not null,
  is_foil       boolean not null default false
);

-- การแก้การ์ดทีละช่อง เก็บเป็น patch เบาบาง ไม่ใช่การ์ดทั้งใบ
-- เพราะการ์ดส่วนใหญ่มาจากแคตตาล็อกตั้งต้น เราเก็บแค่ช่องที่แอดมินแก้จริง
create table if not exists card_edits (
  card_id     text primary key,
  patch       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ชุดและการ์ดที่ถูกลบ — ลบแบบทำเครื่องหมาย ไม่ได้ลบของจริง
-- เพราะของตั้งต้นมาจากไฟล์แคตตาล็อกซึ่งลบแถวไม่ได้
create table if not exists deleted_sets (
  code        text primary key,
  deleted_at  timestamptz not null default now()
);

create table if not exists deleted_cards (
  card_id     text primary key,
  deleted_at  timestamptz not null default now()
);

-- การ์ดที่ปักหมุดบนหน้าแรก — position คุมลำดับที่โชว์
create table if not exists featured_cards (
  card_id   text primary key,
  position  integer not null
);

-- ---------------------------------------------------------------
-- ราคา
-- ---------------------------------------------------------------

-- ทุกครั้งที่บันทึกราคา = แถวใหม่ ไม่เคยเขียนทับของเดิม
-- ประวัติราคาคือสินทรัพย์ของโปรเจกต์นี้ (ดู docs/PLAN.md ข้อ 4)
--
-- price_thb เก็บเป็นฐาน NM เสมอ ราคาที่กรอกเป็นเกรดอื่นถูกถอดเบี้ยกลับมา
-- ตั้งแต่ก่อนบันทึก เพื่อให้ทุกแถวเทียบกันได้ตรง ๆ
create table if not exists price_points (
  id           bigserial primary key,
  variant_id   text not null,
  condition    text not null check (condition in ('PSA10','NM','LP','MP','HP','DMG')),
  price_thb    integer not null check (price_thb > 0),
  source       text not null default 'market' check (source in ('market','ebay','snkrdunk')),
  recorded_at  timestamptz not null default now()
);

-- ดัชนีตามลำดับที่อ่านจริง: ราคาล่าสุดของ variant หนึ่งในช่องทางหนึ่ง
create index if not exists price_points_lookup
  on price_points (variant_id, source, recorded_at desc);

-- ---------------------------------------------------------------
-- ผู้ใช้และพอร์ต
-- ---------------------------------------------------------------

-- ไม่ได้ใช้ Supabase Auth — รหัสผ่านแฮชด้วย PBKDF2 และเซสชันเป็นคุกกี้ที่เซ็น
-- HMAC ไว้ในแอป (ดู lib/auth.ts) ตารางนี้จึงเก็บแฮชเอง
-- สิทธิ์แอดมินไม่ได้อยู่ในตารางนี้โดยตั้งใจ — อ่านจาก ADMIN_EMAILS เท่านั้น
-- เพื่อไม่ให้ใครที่เขียนฐานข้อมูลได้ตั้งตัวเองเป็นแอดมิน
create table if not exists users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  display_name   text not null,
  password_hash  text not null,
  created_at     timestamptz not null default now()
);

-- การ์ดใบเดียวกันสภาพเดียวกันที่ซื้อมาคนละราคา = คนละแถว ไม่ยุบรวม
-- เพราะต้นทุนต่อใบคือสิ่งที่คนสะสมอยากเห็นแยกกันตอนคิดกำไรขาดทุน
create table if not exists portfolio_holdings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  card_id     text not null,
  condition   text not null check (condition in ('PSA10','NM','LP','MP','HP','DMG')),
  quantity    integer not null check (quantity between 1 and 9999),
  cost_thb    integer check (cost_thb >= 0),
  note        text,
  added_at    timestamptz not null default now()
);

create index if not exists portfolio_holdings_by_user
  on portfolio_holdings (user_id, added_at);

-- คำขอตั้งรหัสผ่านใหม่ที่ยังส่งไม่ถึงมือเจ้าตัว (ใช้ตอนยังไม่ได้ต่อระบบส่งอีเมล)
-- ตัวโทเคนเองไม่ได้พึ่งตารางนี้ — เป็นข้อความที่เซ็น HMAC ไว้ ตรวจได้ในตัวมันเอง
create table if not exists password_resets (
  email         text primary key,
  display_name  text not null,
  path          text not null,
  requested_at  timestamptz not null default now(),
  expires_at    timestamptz not null
);

-- ---------------------------------------------------------------
-- ปิดประตูทุกบานสำหรับคีย์ฝั่งเบราว์เซอร์
-- ---------------------------------------------------------------

alter table admin_sets          enable row level security;
alter table admin_cards         enable row level security;
alter table admin_variants      enable row level security;
alter table card_edits          enable row level security;
alter table deleted_sets        enable row level security;
alter table deleted_cards       enable row level security;
alter table featured_cards      enable row level security;
alter table price_points        enable row level security;
alter table users               enable row level security;
alter table portfolio_holdings  enable row level security;
alter table password_resets     enable row level security;

-- ---------------------------------------------------------------
-- ที่เก็บรูปการ์ด
-- ---------------------------------------------------------------

-- bucket แบบส่วนตัว รูปถูกเสิร์ฟผ่าน /api/card-image/[id] ของแอปเอง
-- ไม่ได้ลิงก์ตรงเข้า Supabase เพื่อให้ URL คงที่และตั้งแคชเองได้
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', false)
on conflict (id) do nothing;
