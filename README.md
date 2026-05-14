# Cargo QC

Ichki sifat nazorati va murojaatlar bilan ishlash uchun yaratilgan operatsion panel. Tizim murojaatlarni qabul qilish, treklarni kuzatish, hodimlar samaradorligini ko'rish, bo'lim va manbalar kesimida ishlash hamda rahbar uchun oylik hisobot tayyorlashga mo'ljallangan.

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
npm run dev
```

Build:

```bash
npm run build
```

Preview:

```bash
npm run preview
```

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
