# Vercel'ga Deploy — Cargo QC

Bu yo'riqnoma frontend'ni Vercel'ga ulashning **bir martalik qadamlarini** ko'rsatadi. Keyin har bir Git push avtomatik deploy bo'ladi.

## 📋 Talab qilinadi

- [ ] GitHub hisobi
- [ ] Loyiha GitHub'da push qilingan (xususiy yoki ochiq repo)
- [ ] Supabase URL va anon key (allaqachon `.env.local`'da)
- [ ] Vercel hisobi (bepul — `vercel.com`)

---

## 🚀 1-qadam — Loyihani GitHub'ga push qilish

Agar hali push qilmagan bo'lsangiz:

```bash
# Loyihada
git add .
git commit -m "Supabase backend + design system + production setup"
git push origin main
```

Repo allaqachon GitHub'da bo'lsa, oxirgi o'zgarishlarni push qiling.

---

## 🌐 2-qadam — Vercel hisobini ochish (3 daqiqa)

1. **[vercel.com](https://vercel.com)** ga kiring
2. **Sign Up** → **Continue with GitHub** (eng oson)
3. GitHub'ga autorize bering

Pul kartasi yoki to'lov **kerak emas** — bepul tier yetadi.

---

## 📦 3-qadam — Loyihani import qilish

1. Vercel Dashboard'da **Add New...** → **Project**
2. **Import Git Repository** — GitHub repo'laringiz ro'yxatga tushadi
3. **`cargo-qc`** ro'parasidagi **Import** tugmasini bosing

---

## ⚙️ 4-qadam — Configure Project (asosiy)

Vercel avtomatik aniqlaydi:
- **Framework:** Vite ✅
- **Build Command:** `npm run build` ✅
- **Output Directory:** `dist` ✅
- **Install Command:** `npm install` ✅

(`vercel.json` shu sozlamalarni majburiy qiladi)

### 🔑 Environment Variables (eng muhim!)

**"Environment Variables"** bo'limini oching va quyidagilarni qo'shing:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xmnzphecvophlyjjdbel.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_4KTBWpU-d0Tz3T3XMKtFiQ_UELyXLZ9` |

⚠️ **DIQQAT:** Faqat **publishable / anon** key'ni qo'ying. Hech qachon **service_role** key'ni Vercel'ga qo'ymang!

Bu qiymatlar `.env.local`'dan (sizning kompyuteringizda mavjud).

---

## 🎯 5-qadam — Deploy

**Deploy** tugmasini bosing. Vercel:
1. Loyihani klon qiladi
2. `npm install` yuritadi
3. `npm run build` yuritadi
4. `dist/` ni serverga yuklaydi
5. Sizga **doimiy URL** beradi: masalan `cargo-qc.vercel.app`

⏱️ 2-3 daqiqada tugaydi.

---

## ✅ 6-qadam — Tasdiqlash

1. **URL'ni ochish:** `https://cargo-qc.vercel.app` (yoki Vercel bergan URL)
2. **Login:** `jaloldin.mirzakbarov` / `admin123`
3. **Murojaatlar bo'limi** ochilishi va **19,303 ta yozuv** ko'rinishi kerak (Supabase'dan)

### Telefon orqali

1. Telefonda brauzer (Chrome/Safari)
2. URL: `cargo-qc.vercel.app`
3. Login — bir xil parol
4. Wi-Fi shart emas, internet bo'lsa kifoya

---

## 🔄 Keyingi deploy'lar — avtomatik

Endi har **GitHub push** Vercel'ni qayta deploy qiladi:

```bash
# Kodda biror narsa o'zgartiring
git add .
git commit -m "Yangi feature"
git push
```

Vercel **1-2 daqiqa**da yangi versiyani serverga chiqaradi. URL bir xil qoladi.

---

## 🌍 Custom domen (ixtiyoriy)

Agar `cargo.ipost.uz` kabi o'z domeningiz bo'lsa:

1. Vercel → Project → **Settings** → **Domains**
2. Domeningizni qo'shing
3. DNS provayderingizda Vercel ko'rsatgan **CNAME**'ni sozlang
4. ~30 daqiqada HTTPS bilan ishlay boshlaydi

---

## 🔒 Xavfsizlik eslatmalari

- ✅ `.env.local` Git'ga tushmaydi (`.gitignore`'da)
- ✅ Vercel env vars **encrypted** saqlanadi
- ✅ Anon key ochiq bo'lishi me'yor — RLS himoyalaydi
- ❌ Service role key'ni **HECH QACHON** frontend'ga qo'ymang
- ✅ Vercel HTTPS bepul beradi

---

## 🆘 Muammolar

### "Module not found" build paytida
Loyiha root'ida `package-lock.json` borligini tekshiring. Yo'q bo'lsa:
```bash
npm install
git add package-lock.json
git commit -m "Add lock file"
git push
```

### Sahifa ochiladi lekin oq oyna
Vercel deploy log'larini tekshiring (Dashboard → Project → Deployments → Latest). Build xato ko'rinadi.

### Login ishlamaydi
Vercel'da env vars to'g'ri qo'yilganini tekshiring (Settings → Environment Variables). Qo'yganingizdan keyin **Redeploy** kerak (avtomatik bo'lmaydi).

### Custom domen ulanmadi
DNS o'zgarishlari 5-30 daqiqa olishi mumkin. Vercel'da Domain'ning status'i **Valid Configuration** bo'lishi kerak.

---

## 📊 Free tier cheklov'lari

| Resurs | Vercel free tier |
|--------|-------------------|
| Bandwidth | 100 GB/oy |
| Build minutlari | 6000/oy |
| Serverless functions | 100K invocations/oy |
| Custom domens | Cheklanmagan |

Cargo QC kabi internal tool uchun bepul tier **5-10 baravar yetib oshadi**.

---

**Versiya:** v1.1.0  
**Oxirgi yangilanish:** 2026-05-25
