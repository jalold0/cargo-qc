# Supabase Setup — Cargo QC

Bu yo'riqnoma Cargo QC frontend'ini Supabase backend'ga ulash uchun **bir martalik o'rnatish** bosqichlarini ko'rsatadi.

## 📋 Talab qilinadi

- [ ] Supabase loyihasi (bepul tier yetadi)
- [ ] SQL Editor'ga kirish huquqi
- [ ] Project URL va anon key

---

## 🚀 1-qadam — Schema'ni qo'llash

### A) Eski jadvallarni saqlash (agar bor bo'lsa)

Agar loyihangizda eski `otk_entries` jadvali bor bo'lsa, uni saqlab qoling. Yangi schema ADDITIVE — eski jadvallar buzilmaydi.

Tavsiya: Eski data muhim bo'lsa, **avval backup oling**:

```sql
-- Eski jadvalni backup qiling (agar bor bo'lsa)
create table if not exists otk_entries_backup_2026 as
  select * from otk_entries;
```

### B) Yangi schema'ni qo'llang

1. Supabase Dashboard → **SQL Editor**
2. **New query** tugmasini bosing
3. `server/schema.postgres.sql` faylining **butun mazmunini** nusxalang
4. Editor'ga joylashtiring
5. **Run** tugmasini bosing (yoki `Ctrl+Enter`)

Natija: 9 ta yangi jadval, RLS policy'lari, triggerlar va seed admin foydalanuvchi yaratiladi.

### C) Tasdiqlash

SQL Editor'da quyidagini ishga tushiring:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'users', 'app_settings', 'complaints_entries',
    'compensated_loads_registry', 'assistant_ai_requests',
    'module_102_complaints', 'audit_logs', 'import_batches', 'roles'
  )
order by table_name;
```

9 ta qator chiqishi kerak.

---

## 🔑 2-qadam — Project URL va anon key olish

1. Supabase Dashboard → **Project Settings** → **API**
2. Ikkita qiymatni nusxalang:
   - **Project URL** — masalan: `https://abcdefghijk.supabase.co`
   - **anon public** key — uzun JWT string (eyJ... bilan boshlanadi)

⚠️ **DIQQAT:** `service_role` key'ni **HECH QACHON** frontend kodga qo'shmang. Faqat `anon public` key'ni ishlatamiz.

---

## ⚙️ 3-qadam — `.env.local` to'ldirish

Loyiha root'ida `.env.local` faylini oching (yo'q bo'lsa `.env.example`'dan nusxa oling):

```bash
cp .env.example .env.local
```

Quyidagi qiymatlarni to'ldiring:

```env
VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Boshqa `VITE_*` o'zgaruvchilarni hozircha bo'sh qoldirishingiz mumkin.

---

## ✅ 4-qadam — Dev serverni qayta ishga tushirish

```bash
# Eski dev serverni to'xtating: Ctrl+C
npm run dev
```

Browser'da brauzer console (F12) ochib quyidagi xabarlarni tekshiring:
- ❌ `Supabase is not configured.` — env'lar o'qilmagan, .env.local'ni qayta tekshiring
- ✅ Hech qanday error — sozlash to'g'ri

---

## 🧪 5-qadam — Ulanishni tekshirish

Brauzer console (F12 → Console)'da:

```js
// Manual test — Supabase REST'ga ulanish
await fetch(
  import.meta.env.VITE_SUPABASE_URL + '/rest/v1/users?select=username,role&limit=5',
  {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
  }
).then(r => r.json())
```

Natija: `[{ username: 'jaloldin.mirzakbarov', role: 'admin' }]`

Agar shu chiqsa, **schema va ulanish to'g'ri**. ✅

---

## 🔐 Auth — Qanday ishlaydi?

Bu loyiha **custom auth** ishlatadi (Supabase Auth emas):

1. Foydalanuvchi LoginPage'da username + parol kiritadi
2. Frontend `users` jadvaliga REST request yuboradi
3. `password_hash` ni `verifyPassword()` orqali tekshiradi
4. Mos kelsa — `localStorage`'da session saqlanadi

**Parol formati:** `'sha256:' + sha256(parol)` — `src/services/authHash.js`'da.

**Yangi foydalanuvchi qo'shish:**

1. Settings → Users (UI orqali) — eng oson
2. Yoki SQL orqali:
   ```sql
   insert into users (username, password_hash, full_name, role)
   values (
     'operator1',
     'sha256:' || encode(digest('parol123', 'sha256'), 'hex'),
     'Operator 1',
     'operator'
   );
   ```

---

## 🔄 Data migration — eski yozuvlar

Birinchi marta ulanganingizda Supabase jadvallari bo'sh bo'ladi. localStorage'da to'plangan eski yozuvlarni ko'chirish uchun:

1. UI'da **Settings → Sync** bo'limiga kiring (keyingi sessiyada qo'shamiz)
2. **"Sync all to Supabase"** tugmasini bosing
3. Frontend hamma yozuvlarni server'ga yuklaydi

⚠️ Bu **birinchi marta ulanganda** kerak. Keyin har bir yangi yozuv avtomatik sync bo'ladi.

---

## 🌐 Realtime — qanday ishlaydi?

Schema'da har bir jadval Supabase Realtime publication'ga qo'shilgan. Bir foydalanuvchi yangi yozuv qo'shganda, 1-2 soniya ichida boshqa hamma brauzerlarda avtomatik ko'rinadi.

**`src/components/DashboardLayout.jsx`** orqali ulanadi (env mavjud bo'lsa).

---

## 🛡️ Security (RLS)

Hozirgi RLS sozlamasi:
- **Anon role uchun TO'LIQ ochiq** (read/write/update/delete)
- Bu **internal tool** uchun yetarli

Kelajakda **production**'da:
1. Supabase Auth'ga o'tish
2. RLS policy'larni `auth.uid()`'ga bog'lash
3. Faqat o'z yozuvlarini ko'rish/o'zgartirish

Tafsilot: `server/schema.postgres.sql` — section 11 (RLS).

---

## 🔧 Troubleshooting

### "Network request failed"
- `.env.local`'da URL to'g'rimi?
- VITE_ prefix borligini tekshiring
- Browser cache: `Ctrl + Shift + R`

### "permission denied for table users"
- RLS policy'lari qo'llanmagan
- SQL Editor'da schema'ni qayta ishga tushiring (anon policies bo'limini)

### "duplicate key value"
- Mavjud yozuv bilan to'qnashuv
- ID generation logikasini tekshiring

### Realtime ishlamayapti
- Database → Replication bo'limida jadvallar yoqilganini tekshiring
- WebSocket ulanishi firewall tomonidan to'silmaganmi?

---

## 📚 Foydali manbalar

- [Supabase Docs](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)
- Lokal kod: `src/services/supabaseRest.js` — REST adapter

---

**Versiya:** Schema v1.1.0  
**Oxirgi yangilanish:** 2026-05-25
