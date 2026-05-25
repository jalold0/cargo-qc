# Cargo QC

[![CI](https://github.com/jalold0/cargo-qc/actions/workflows/ci.yml/badge.svg)](https://github.com/jalold0/cargo-qc/actions/workflows/ci.yml)

Ichki sifat nazorati va murojaatlar bilan ishlash uchun yaratilgan operatsion panel.

## 🚀 Deploy

Frontend Vercel'ga deploy qilish — telefon va boshqa qurilmalardan internet orqali kirish uchun:

📖 **[DEPLOY.md](./DEPLOY.md)** — to'liq qadama-qadam yo'riqnoma (3 daqiqa)

## 🗄️ Backend (Supabase)

📖 **[server/SUPABASE_SETUP.md](./server/SUPABASE_SETUP.md)** — schema, RLS, env'lar bo'yicha yo'l-yo'riq Tizim murojaatlarni qabul qilish, treklarni kuzatish, hodimlar samaradorligini ko'rish, bo'lim va manbalar kesimida ishlash hamda rahbar uchun oylik hisobot tayyorlashga mo'ljallangan.

## Asosiy imkoniyatlar

- Login va rolga asoslangan kirish
- Murojaatlar yaratish, tahrirlash, yopish va arxivlash
- Trek kuzatuv va qidiruv
- Hodimlar samaradorligi statistikasi
- Bo'limlar va manbalar bo'yicha monitoring
- Oylik hisobot va CEO uchun Excel export
- Excel import preview va yuklash oqimi
- Notification, SLA va KPI bloklari
- Ko'p tilli interfeys: UZ / RU / ENG

## Texnologiyalar

- React 18
- Vite 5
- Tailwind CSS
- Zustand
- React Router
- Recharts
- XLSX

## Ishga tushirish

Talablar:

- Node.js 18+
- npm

Buyruqlar:

```bash
npm install
cp .env.example .env.local   # env'larni o'z qiymatlaringiz bilan to'ldiring
npm run dev
```

Boshqa scriptlar:

```bash
npm run build           # Production build
npm run preview         # Build natijasini ko'rish
npm run lint            # ESLint nazorat
npm run lint:fix        # Avto-tuzatish
npm run format          # Prettier bilan kodlarni formatlash
npm run format:check    # Format tekshirish
npm test                # Vitest unit testlari (CI rejim)
npm run test:watch      # Vitest watch rejimi (development)
```

## Environment

`.env.local` faylini `.env.example` asosida yarating. Asosiy o'zgaruvchilar:

- `VITE_SUPABASE_URL` — Supabase loyiha URL (Realtime sync uchun)
- `VITE_SUPABASE_ANON_KEY` — Supabase public anon key
- `VITE_API_URL` — Backend API URL (kelajakda)
- `VITE_SALES_API_URL` — Oylik sotuv ma'lumotlari endpoint

Hozircha loyiha **localStorage rejimida** ishlaydi. Supabase env to'ldirilsa, Realtime sinxron faollashadi.

## Loyiha tuzilmasi

```text
src/
  components/       Layout va umumiy UI bloklar
  pages/            Asosiy sahifalar
  services/         Data, import, export va hisob-kitob logikasi
  store/            Auth va local store
server/
  schema.postgres.sql
  README.md
```

## Data va import

Hozirgi versiya local rejimda ishlaydi. Asosiy data oqimi `src/services/localData.js` orqali boshqariladi.

Excel import:

- fayl nomi muhim emas
- ustunlar shablon bo'yicha o'qiladi
- preview bor
- qo'shib import yoki to'liq almashtirish variantlari mavjud

Backendga tayyor poydevor:

- [server/schema.postgres.sql](server/schema.postgres.sql)
- [server/README.md](server/README.md)

## Release / revision tartibi

Bu repo uchun tavsiya etilgan release tartibi:

- `main` - barqaror asosiy branch
- feature branch - `codex/<qisqa-nom>` yoki `feature/<qisqa-nom>`
- release tag - `vMAJOR.MINOR.PATCH`

Masalan:

- `v1.0.0` - birinchi barqaror release
- `v1.1.0` - yangi funksiyalar qo'shildi
- `v1.1.1` - xatolar tuzatildi

Versiya mantiqi:

- `MAJOR` - katta arxitektura yoki mos kelmaydigan o'zgarish
- `MINOR` - yangi feature, lekin eski oqim buzilmaydi
- `PATCH` - fix, polishing, kichik yaxshilashlar

Tavsiya:

- har sezilarli o'zgarishdan keyin `CHANGELOG.md` yangilanadi
- GitHub release ham shu versiya bilan chiqariladi

## Git oqimi

Oddiy ish tartibi:

```bash
git checkout -b codex/monthly-report-polish
git add .
git commit -m "Polish monthly report cards"
git push -u origin codex/monthly-report-polish
```

Stable release uchun:

```bash
git checkout main
git pull
git tag v1.0.0
git push origin v1.0.0
```

## Keyingi professional bosqich

CEO tasdiqidan keyin quyidagi bosqichga o'tish rejalashtirilgan:

1. PostgreSQL
2. Node.js / Express backend
3. Real-time sync
4. Server-side audit log
5. Import history va backup

## Muallif

- Jaloldin
