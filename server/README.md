# Cargo QC — Server / Backend

Cargo QC frontend hozir **3 rejimda** ishlay oladi:

1. **localStorage rejimi (default)** — env'lar to'ldirilmagan. Hammasi brauzer xotirasida.
2. **Supabase REST + Realtime** — `VITE_SUPABASE_URL` va `VITE_SUPABASE_ANON_KEY` env'larida to'ldirilgan. Mavjud kod: `src/services/supabaseRest.js`.
3. **Custom Node.js backend (kelajakda)** — Express + PostgreSQL bilan to'liq custom server.

## Schema — `schema.postgres.sql`

To'liq PostgreSQL schema. Supabase va o'z server uchun bir xil ishlatiladi.

**9 ta asosiy jadval:**
- `users` — foydalanuvchilar (custom auth, password_hash)
- `roles` — rollar lookup
- `app_settings` — global sozlamalar (JSONB payload)
- `complaints_entries` — OTK murojaatlari
- `compensated_loads_registry` — 104 Moliya yozuvlari
- `assistant_ai_requests` — Telegram bot murojaatlari
- `module_102_complaints` — OTK detail sahifa
- `audit_logs` — universal audit
- `import_batches` — Excel import tarixi

**Qo'shilgan:** indexlar, triggers, RLS policy'lari (anon role uchun), Realtime publication.

## 🚀 Supabase'ga ulash

To'liq qadama-qadam yo'riqnoma:

📖 **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** — schema qo'llash, env'lar, test ulanish

Qisqacha:

1. Supabase loyiha → SQL Editor → `schema.postgres.sql` qo'llash
2. Project Settings → API → URL va anon key'ni nusxalash
3. `.env.local` to'ldirish
4. `npm run dev` qayta ishga tushirish

## Custom backend uchun yo'l (kelajakda)

Agar Supabase o'rniga o'z server qurmoqchi bo'lsangiz:

1. PostgreSQL database yarating
2. `schema.postgres.sql`'ni `psql` orqali qo'llang (RLS qismini olib tashlang)
3. Node.js / Express server yozing — quyidagi endpointlar bilan:

```
POST   /auth/login                       — username + parol
POST   /auth/logout
GET    /users
POST   /users
PUT    /users/:id
DELETE /users/:id

GET    /complaints
GET    /complaints/:id
POST   /complaints
PUT    /complaints/:id
DELETE /complaints/:id

GET    /compensated/registry
POST   /compensated/registry             — bulk upsert
PATCH  /compensated/:id/workflow         — assigned_to, status

GET    /assistant-ai
POST   /assistant-ai                     — create
PUT    /assistant-ai/:id

GET    /module-102
GET    /module-102/:id
POST   /module-102                       — create
PATCH  /module-102/:id                   — update tracks, audit log

GET    /settings/:key                    — app_settings.payload
PUT    /settings/:key

POST   /imports/:profile                 — Excel batch import
GET    /audit?entity_type=X&entity_id=Y
```

4. Frontend'da `src/services/api.js`'dagi `VITE_API_URL` ni server'ga yo'naltiring

## Excel import xaritasi

`OTK_WORKPLACE.xlsx` import qilish — ustun pozitsiyalari:

| Ustun | Excel sarlavhasi | DB maydoni |
|------|-----|-----|
| 1 | Data | `event_date` |
| 2 | Track | `track_code` |
| 3 | Problem | `problem_type` |
| 4 | Ma'sul bo'lim | `department` |
| 5 | Name | `handled_by_name` |
| 6 | Status | `status` |
| 7 | Comment | `comment` |

**Fallback qoidalar:**
- bo'sh `department` → `Belgilanmagan`
- bo'sh `request_source` → `Belgilanmagan`
- `source_system` → `excel:OTK_WORKPLACE.xlsx`
