# Changelog

Bu fayl loyiha bo'yicha muhim release va revisionlarni qisqa qayd etish uchun yuritiladi.

Format:

- `Added` - yangi imkoniyatlar
- `Changed` - mavjud oqim o'zgartirildi
- `Fixed` - xatolar tuzatildi
- `Security` - xavfsizlik tuzatishlari
- `Removed` - olib tashlangan funksiyalar

## [1.1.0] - 2026-05-24 — Audit, security & performance

### Added

- 104 — Moliya yuqori bo'limi CRM dizayni (4 KPI + 5 status tab + filter)
- 104 — Topilgan yuklar fiksatsiyasi: card-based grid, block tizimi, chek yuklash
- 102 — OTK detail sahifa (`/module-102/:id`) — 15 ustunli tracks jadval
- 102 — Yangi murojaat modal va Trek qidirish modal
- 102 — Marshrut (audit log) modal
- 102 — `createComplaint`, `updateTrackInComplaint`, `appendAuditLog` servislari
- "Jarayondagi murojaatlar" sahifa (`/my-in-progress`) — barcha modullardan jamlangan ishxona
- "Olish (men olaman)" tugmasi orphan yuklar uchun
- TrackDetailModal'da "Topilgan yuk holati" bloki (104 Moliya)
- Trek master DB (`trackDatabase.js`) + Customer card (`CustomerCard.jsx`)
- 2-ustunli `TrackDetailModal` — Asosiy/Xarajat/Logistika + Murojaat/Mijoz tab
- Sotuv ma'lumotlari servisi (`salesData.js`) — kelajak backend uchun
- Oylik hisobot — kamaygan/ko'paygan muammolar uchun klikli modal
- Dashboard professional header (Gauge icon, gradient blob, live badge)
- ESLint + Prettier konfiguratsiyasi (`npm run lint`, `npm run format`)
- Logger servisi (`logger.js`) — external sink uchun tayyor
- `.env.example` — Supabase, API, CRM endpointlar uchun
- Migration tizimi: `alwaysRun` bayrog'i va orphan recovery

### Changed

- ComplaintsPage: jadval → card grid (2/3/4 ustun responsive)
- Murojaatlar sahifasi filterlar: status/muammo/manba/bo'lim dropdownlari
- Trek kuzatuv: card grid, klik qilinadigan KPI chiplar, filter bar
- 104 — Moliya: yangi 4 KPI (Jami summa, To'langan, Kutmoqda, To'lov tezligi)
- Asosiy menyu: yangi icon va mantiqiy tartib
- "Qoplab berilgan yuklar" → "104 — Moliya"
- `subscribeToOtkData` — singleton hub (6+ duplicate listener'lar → 1 ta)
- DashboardPage header — kompakt, professional gradient
- CreateComplaint layout: textarea 4 qator, trek chiplari max 6 ta + window
- Module102Page: jadval qatorlari klikli — detail sahifasiga olib boradi

### Security

- **Parollar SHA-256 hash** bilan saqlanadi (`authHash.js`) — `verifyPassword` legacy plain text fallback bilan
- Demo accounts faqat DEV rejimida (`import.meta.env.DEV`)
- Production build'da DEMO_DATA, console.log/debug/info DROPPED
- localStorage quota guard (`QuotaExceededError` recovery + event)

### Removed

- `socket.io-client` (ishlatilmaydi) — bundle -50KB
- `tailwind-merge` (ishlatilmaydi)
- `UsersPage` default export (dead code)
- `DashboardPage.DEMO_DATA` productionda

### Fixed

- **CRITICAL:** `normalizeCompensatedRegistry` yangi maydonlarni (assignedTo, workflowComment, receiptFile) tushirib qoldirayotgani tuzatildi
- Module102 auto-sync interval cleanup — memory leak
- `dynamic import` warning (supabaseRest.js)
- Chunk size warning — manualChunks bilan vendor splitting
- Orphan recovery items: status='Jarayonda' lekin assignedTo bo'sh → 'Qabul qilindi'
- Inaktiv hodimlar (Isfandiyor/Abduvali) yuklari → 4 hodim orasida teng taqsimlash

### Performance

- Supabase Realtime ulanish (`DashboardLayout` orqali) — bo'limlararo sync
- Settings'dan inaktiv hodim nomlari (hardcoded emas)
- ESLint warnings minimallashtirish

### UX / DX yaxshilanishlari

- **ErrorBoundary** — `src/components/ErrorBoundary.jsx`. Har sahifa `<ErrorBoundary><Suspense>...</Suspense></ErrorBoundary>` (yangi `RouteFrame` helper) bilan o'raladi. Endi oq oyna o'rniga aniq xato'lik xabari + stack trace ko'rinadi, "Qayta urinish" va "Sahifani yangilash" tugmalari mavjud.
- **User profile menu** — sidebar pastidagi avatar+ism+rol+logout chip topbar'ning o'ng tarafiga ko'chirildi:
  - Avatar + ism + rol (chevron bilan)
  - Bosilganda dropdown menyu ochiladi: profil ma'lumotlari, "Profil va sozlamalar" tugmasi, "Chiqish" tugmasi
  - Footer'da app versiyasi (`v1.1.0`)
  - Sidebar pasti faqat versiya badge'i qoldi (kompakt)

### Versioning & Network

- **Versiya 1.0.0 → 1.1.0** (semver minor bump — yangi feature'lar, eski API buzilmagan)
- **`src/services/appVersion.js`** — `APP_VERSION` va `APP_BUILD_DATE` constantlari `vite.config.js` orqali package.json'dan inject qilinadi
- **Versiya ko'rinishlari:**
  - Sidebar pastida `v1.1.0` badge'i (yopiq holatda ham ko'rinadi)
  - LoginPage footer'ida `v1.1.0` (sana yonida)
  - Topbar'dagi user dropdown menyu footer'ida `v1.1.0`

### Design System (yangi)

- **`src/design/`** — markazlashgan dizayn tizimi yaratildi. Maqsad: barcha sahifalar yagona ko'rinishda bo'lishi, xalqaro standartga mos kelishi.
  - **`tokens.js`** (224 qator) — ranglar (brand, neutral, success/warning/danger/info), spacing, typography, radii, shadows, motion, z-index. `tailwind.config.js` shu yerdan import qiladi.
  - **Atomic komponentlar**:
    - `Button` — 5 variant × 3 size + loading + iconOnly + leftIcon/rightIcon
    - `Badge` — 6 variant × 3 tone (soft/solid/outline)
    - `Card` — Header/Body/Footer slots + interactive variant
    - `Input` / `Textarea` / `Select` — label, hint, error, required, leftIcon, rightAddon
  - **Layout komponentlari**: `PageLayout`, `PageHeader` (icon + actions), `Section` (sarlavhali bo'lim), `Toolbar` (filter satri)
  - **State komponentlari**: `EmptyState`, `LoadingState`, `ErrorState` — yagona ko'rinish
  - **Modal** — to'liq a11y (focus trap, ESC, role="dialog", scroll lock, slots)
  - **`README.md`** (185 qator) — har bir komponentga namuna va variants ro'yxati
- **LoginPage** birinchi sahifa sifatida ko'chirildi — inline Tailwind class'lar olib tashlandi, Button/Input/Select ishlatiladi

### Refactor

- DashboardPage 4329 → 3516 qator (-19%) — `src/pages/dashboard/` modul tarkibida bo'lindi:
  - `utils.js` — pure formatter va builder funksiyalar (formatDateLabel, formatMoneyShort, buildCompensatedOverview, buildCalendarDays, ...)
  - `cards.jsx` — 12 ta kichik prezentatsion kartochka (KpiMetricCard, EmployeeMetric, TrendBadge, SalesStatCard, ProblemRatioCard, ...)
  - `MonthlyReport.jsx` — Oylik hisobot bloki, KPI cardlari va trend modali
- localData.js 3424 → 3054 qator (-10.8%) — alohida modullarga bo'lindi (re-export bilan, mavjud importlar buzilmaydi):
  - `dataConstants.js` (194 qator) — DEFAULT_PROBLEM_TYPES, DEFAULT_DEPARTMENTS, DEFAULT_USERS va boshqa default qiymatlar
  - `dataHelpers.js` (77 qator) — pure funksiyalar: toDateKey, getWaitingDays, getPriorityByWaitingDays, parseTrackNumbers, publicUser, applyPriorityRules
  - `dataPredicates.js` (131 qator) — normalizeTrackCode, normalizePersonLabel, isLegacyAdminUser, isJaloldinMirzakbarovUser, isCompensatedProblemType, isDepartmentLeadRole, compareTrackEntryOrder, resolveEntryOrderTime, DEPARTMENT_ASSIGNMENT_NAME_ALIASES
  - `assistantAiNormalizer.js` (91 qator) — normalizeAssistantAiRequest, isAssistantAiSeedRecord, resolveAssistantAiFreshness, mergeAssistantAiRequests
  - `compensatedNormalizer.js` (148 qator) — normalizeCompensatedRegistry (Bug #51 fix), normalizeOptionalRegistryDate, normalizePaymentAmount, normalizeCompensatedPaymentStatus, normalizeCompensatedRecoveryStatus

### Testing & CI

- **Vitest** o'rnatildi va 4 ta yangi modul uchun **85 ta unit test** yozildi:
  - `dataHelpers.test.js` (17 ta test) — toDateKey, getWaitingDays, applyPriorityRules va boshqalar
  - `dataPredicates.test.js` (23 ta test) — barcha predicate/normalizer'lar
  - `assistantAiNormalizer.test.js` (20 ta test) — status mapping, merge logikasi
  - `compensatedNormalizer.test.js` (25 ta test) — **Bug #51 uchun maxsus regression test** (workflow maydonlari saqlanishi)
- Yangi skriptlar: `npm test` (CI rejim) va `npm run test:watch` (development)
- Barcha testlar 1.25 soniyada bajariladi (node muhitida)
- **GitHub Actions CI** (`.github/workflows/ci.yml`):
  - Har push va PR'da: lint → test → build ketma-ket bajariladi
  - dist/ artifact 7 kun saqlanadi
  - Bir vaqtning o'zida ortiqcha workflow'larni avtomatik bekor qiladi
  - README'da CI status badge qo'shildi

### Bug fixes (CI keltirgan kashfiyot)

- **`createAssistantAiRequest` va `updateAssistantAiRequest`** funksiyalari `getAuditLog()` chaqirardi, lekin bu funksiya mavjud emas (to'g'risi `getOtkAuditLogs()`). Har qachon Assistant AI murojaati yaratilganda yoki yangilanganda `ReferenceError` keltirib chiqarardi. **Lint xato'lik sifatida topdi va tuzatildi.**
- **`UsersPage.jsx`** yangi foydalanuvchi yaratishda `password: hashedPassword` deb yozilgan edi, lekin local o'zgaruvchi nomi `nextPassword`. Yangi foydalanuvchining paroli `undefined` bo'lar edi. **Lint xato'lik sifatida topdi va tuzatildi.**
- **`DepartmentOrderPage.jsx`** — `isAdminRole, isManagerRole` import qilinmagani sababli funksiya runtime'da uzilar edi. **Import qo'shildi.**

### Performance (bundling)

- **Route-based code splitting** — barcha sahifalar `React.lazy()` orqali yuklanadi
  - Initial bundle: 616 kB → **174 kB (gzip 146 kB → 53 kB)** — **-72%**
  - Har bir sahifa o'z chunk'iga ajraldi (DashboardPage 118 kB, SettingsPage 49 kB, ...)
  - `RouteFallback` spinner Suspense paytida ko'rinadi
  - Login sahifasi endi faqat o'zining minimal payload'ini yuklaydi
- **Supabase env guard** — env'lar bo'sh bo'lsa 208 kB `@supabase/supabase-js` chunk umuman yuklanmaydi
- **Sidebar hover prefetch** — sichqoncha link ustiga tushganda chunk fonda yuklab qo'yiladi; bosilganda Suspense fallback ko'rinmaydi

## [1.0.0] - 2026-05-14

### Added

- GitHub repo bilan ulash va birinchi release bazasi tayyorlandi
- Login, role/access, foydalanuvchilar va sozlamalar oqimi
- Murojaatlar, trek kuzatuv va arxiv oqimi
- Excel import va CEO uchun Excel export
- Oylik hisobot, KPI, notification va hodimlar samaradorligi bloklari
- UZ / RU / ENG til qo'llovi

### Changed

- Dashboard executive ko'rinishga yaqinlashtirildi
- Oylik hisobot yangi yillar uchun template bilan ishlaydigan qilindi
- Form selectlari premium ko'rinishga o'tkazildi

### Fixed

- Sync, pagination va katta data bilan ishlashdagi qotishlar yumshatildi
- Oylik hisobot sana parsing va foiz hisoblari to'g'rilandi
- Duplicate trek nazorati va xodimlarga biriktirish logikasi yaxshilandi
