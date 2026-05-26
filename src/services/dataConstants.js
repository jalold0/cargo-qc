// ============================================================
// dataConstants.js — sozlamalar uchun default qiymatlar
// ------------------------------------------------------------
// localData.js fayli juda katta bo'lib ketgani sababli, faqat
// statik default qiymatlar shu yerga ko'chirildi. localData.js
// hali ham bularni qayta-export qiladi, shuning uchun mavjud
// kod o'zgarishsiz ishlashda davom etadi.
// ============================================================

export const DEFAULT_PROBLEM_TYPES = [
  { name: 'Status muammosi', minutes: 5 },
  { name: 'Xitoy ombori', minutes: 20 },
  { name: 'Toshkent ombori', minutes: 20 },
  { name: 'Kilo / gabarit xatolari', minutes: 15 },
  { name: "Noto'g'ri ID / trek biriktirish", minutes: 10 },
  { name: 'Tovar shikastlanishi', minutes: 30 },
  { name: 'Yetkazish kechikishi', minutes: 20 },
  { name: 'Filial yuklari yetib bormasligi', minutes: 25 },
  { name: "To'lov masalasi", minutes: 20 },
  { name: 'Integratsiya', minutes: 10 },
  { name: 'Adashgan yuk', minutes: 30 },
  { name: "Yo'qolgan yuk", minutes: 90 },
  { name: 'Vozvrat muammolari', minutes: 45 },
  { name: "Mijoz boshqa manzilga ko'chgan", minutes: 15 },
  { name: 'Qoplab berilgan', minutes: 40 },
  { name: 'NO CLIENT', minutes: 20 },
  { name: "Botda ko'rinmagan", minutes: 10 },
  { name: 'Sortirovka ID si chiqmagan', minutes: 10 },
  { name: 'Emu bazasiga tushmagan yuklar', minutes: 25 },
  { name: "BTS filialida noma'lum bo'lib turgan", minutes: 25 },
  { name: 'BTS filiallaridagi ostatkalar', minutes: 30 },
  { name: 'Yopilgan filial', minutes: 20 },
];

export const DEFAULT_DEPARTMENTS = [
  "IT bo'limi",
  'Xitoy ombori',
  'Toshkent ombori',
  'Logistika',
  'BTS',
  'EMU',
  'Kuryerka',
  "Sotuv bo'limi",
  "Moliya bo'limi",
];

export const DEFAULT_REQUEST_SOURCES = [
  'Telegram',
  'Call center',
  'Xitoy',
  'Toshkent ombori',
  'RS lar',
  'IPOST filiali',
  'Mijozlar',
  'EMU',
  'BTS',
];

export const DEFAULT_ROLES = ['admin', 'operator', 'supervisor'];

export const DEFAULT_DEPARTMENT_ORDER_CONTENT = {
  subtitle:
    "Bu bo'lim sifat nazoratining asosiy vazifalari, kundalik amaliy ishlari va ichki ish tartibini bir joyda ko'rsatadi.",
  leaderResponsibilities: [
    {
      title: 'Ustuvorlik va kunlik nazorat',
      description: "Rahbar kunlik oqimni kuzatib, qaysi muammo va treklar birinchi navbatda ko'rib chiqilishini belgilaydi.",
    },
    {
      title: 'Yuklama va taqsimotni boshqarish',
      description: "Hodimlar o'rtasida vazifalarni teng taqsimlash, ortiqcha yuklamani kamaytirish va mas'ulni aniq belgilash rahbar nazoratida bo'ladi.",
    },
    {
      title: "Bo'limlararo eskalatsiya va qaror",
      description: "IT, ombor, logistika, moliya yoki filiallar bilan bog'liq murakkab holatlar bo'yicha tezkor qaror va eskalatsiya rahbar orqali yuritiladi.",
    },
    {
      title: 'Hisobot va natija javobgarligi',
      description: "KPI, oylik hisobot, kechikishlar va xizmat sifati ko'rsatkichlari rahbar tomonidan tekshirilib, rahbariyatga aniq ko'rinishda uzatiladi.",
    },
  ],
  core: [
    {
      title: 'Xitoy ombori jarayonlari nazorati',
      description: "Xitoy omboridagi jarayonlarni nazorat qilish va yuklar bilan bog'liq muammolarni kuzatib borish.",
    },
    {
      title: 'Toshkent ombori sifat nazorati',
      description: "Toshkent omborida yuklarni qabul qilish, saralash va tarqatish jarayonlaridagi kamchiliklarni aniqlash.",
    },
    {
      title: "IT bilan texnik nazorat",
      description: "IT bo'limi bilan birgalikda tizimdagi xatolar, texnik muammolar va foydalanuvchi murojaatlarini nazorat qilish.",
    },
    {
      title: 'Logistika jarayonlarini kuzatish',
      description: "Logistika jarayonlarini kuzatish, yetkazib berishdagi kechikishlar va muammolarni aniqlash.",
    },
    {
      title: 'Marketing sifati nazorati',
      description: "Marketing bo'limida reklama, aksiya va kontentlar bilan bog'liq sifat nazoratini olib borish.",
    },
    {
      title: 'Sotuv va call center monitoringi',
      description: "Sotuv va Call center operatorlari bilan ishlash, mijozlar murojaatlari va xizmat sifatini monitoring qilish.",
    },
    {
      title: 'Hamkorlar bilan ishlash nazorati',
      description: "Hamkor kompaniyalar faoliyatini kuzatish va ular bilan ishlashdagi muammolarni aniqlab, yechim berish.",
    },
    {
      title: 'Mijozlar shikoyati va takliflari tahlili',
      description: "Mijozlardan tushgan shikoyat va takliflarni tahlil qilish.",
    },
    {
      title: "Takror muammolarni kamaytirish bo'yicha tavsiyalar",
      description: "Takrorlanayotgan muammolarni kamaytirish uchun bo'limlarga tavsiyalar berish.",
    },
    {
      title: 'Xizmat sifatini yaxshilash nazorati',
      description: "Kompaniya xizmat sifatini yaxshilash bo'yicha nazorat va monitoring olib borish.",
    },
  ],
  actual: [
    {
      title: 'Treklarni qabul qilish va tekshirish',
      description:
        "Kiritilgan treklarni muammo turi, mas'ul bo'limi, manbasi va statusi bo'yicha tekshirib, tizimga to'g'ri joylashtirish.",
    },
    {
      title: 'Jarayondagi yuklarni kuzatish',
      description: "Muddatdan chiqayotgan, qoplab berilgan yoki qayta topilgan yuklar bo'yicha alohida nazorat yuritish.",
    },
    {
      title: 'Kompensatsiya va topilgan yuklar nazorati',
      description:
        "Mijozga pul to'lab berilgan yuklar keyin topilsa, ularni alohida qayd etish va mas'ullarga chiqarish.",
    },
    {
      title: "CEO va rahbar uchun ko'rinish tayyorlash",
      description:
        "Oylik hisobot, KPI, muammo turlari va manbalar bo'yicha rahbar ko'radigan aniq ko'rsatkichlarni ushlab borish.",
    },
  ],
  actualAssignments: [
    { task: "Murojaat 102 bo'yicha", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "O'ZBEKISTON RESPUBLIKASI RAQOBATNI RIVOJLANTIRISH VA ISTE'MOLCHILAR HUQUQLARINI HIMOYA QILISH QO'MITASI dan tushadigan zayavkalar", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "To'lovga o'tkazish", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "Rahbariyat tomonidan tushgan zaproslar", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "Ichki bo'limlardan tushadigan zaproslar", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "To'g'ridan to'g'ri mijozlardan tushgan zaproslar", responsible: 'Jaloldin Mirzakbarov', assistants: ['Shahnoza', 'Jasur', 'Shahnoza', ''] },
    { task: "Operatorlardan tushadigan muammolar.", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "Moliya bo'limidan tushadigan zayavkalar.", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "Telegramdan tushadigan mijozlar muammolari.", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "IPOST filiallari xodimlaridan tushadigan muammolar.", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "EMU filiallari xodimlari va EMU Control'dan tushadigan muammolar.", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "BTS filiallari va xodimlaridan tushadigan muammolar.", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "Viloyatlardagi sklad xodimlaridan tushadigan muammolar.", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', '', ''] },
    { task: "Toshkent omboridan tushadigan muammolar.", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "Xitoy omboridan tushadigan muammolar.", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "BTS va EMU bazasiga kirmagan yuklarni bazaga kiritish. (IT bo'limi muammolari)", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "Yopilgan filiallar yuklarini boshqa filialga yo'naltirish. (IT bo'limi muammolari)", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "Logistika bo'limidan tushadigan muammolar.", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "Sotuv bo'limidan tushadigan muammolar.", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "Adashgan yuklarga zayavka yaratish (BTS, EMU, IPOST)", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "Skladlar va RS lar bo'yicha inventarizatsiya", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "Xitoydan yuborilgan treklar nazorati", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', 'Shahnoza', ''] },
    { task: "Vozvrat muammolari (BTS, EMU, IPOST, RELOG)", responsible: 'Jaloldin Mirzakbarov', assistants: ['Saidali', 'Jasur', "Ulug'bek", 'Shahnoza'] },
    { task: "Operatorlarga ro'yxat shakllantirish (EMU, BTS, Fargo, Relog).", responsible: "Ulug'bek", assistants: ['', '', '', ''] },
    { task: "Operatorlar obrabotka qilingan ro'yxat bilan ishlash (EMU, BTS, Fargo, Relog).", responsible: "Ulug'bek", assistants: ['', '', '', ''] },
    { task: "Toshkent omboridagi muammoli yuklar (32057, 006, 62025 va boshqalar)", responsible: "Ulug'bek", assistants: ['', '', '', ''] },
    { task: "Musodara yuklar bilan ishlash", responsible: "Ulug'bek", assistants: ['', '', '', ''] },
  ],
  workflow: [
    "Murojaat keladi, trek tizimga kiritiladi va muammo turi bilan birga mas'ul bo'limga biriktiriladi.",
    "Jarayondagi yuklar eslatma, muhimlilik va bo'lim kesimida kuzatilib, kechikishlar alohida ajratiladi.",
    "Natija olingach status yangilanadi, kerak bo'lsa kompensatsiya, qayta topilish yoki arxivlash jarayoni yuritiladi.",
    "Yakuniy ma'lumotlar KPI, oylik hisobot va rahbar paneliga sinxron tarzda uzatiladi.",
  ],
  indicators: [
    "Treklar bo'yicha ma'lumot to'liq va xatosiz yuritilishi",
    "Jarayondagi yuklarga o'z vaqtida eslatma va choralar berilishi",
    "Bo'limlar bilan ishlashda kechikishlar kamayishi va yechim tezligi oshishi",
    "Rahbar ko'radigan hisobot va KPI ko'rsatkichlarining ishonchli yurishi",
  ],
};

export const STATUS_OPTIONS = ['Yopildi', 'Jarayonda', "Moliyaga yo'naltirildi"];

// Faqat bitta super-admin kod ichida saqlanadi — Supabase tarmoq xato'sida
// va birinchi marta boot vaqtida tizimga kirish imkonini beradi.
// Barcha qolgan hodimlar Sozlamalar → Foydalanuvchilar (Supabase) bo'limida
// boshqariladi va u yerdan sync qilinadi.
export const DEFAULT_USERS = [
  { id: 1, username: 'jaloldin.mirzakbarov', password: 'admin123', full_name: 'Jaloldin Mirzakbarov', role: 'admin', active: true, avatarUrl: '', workStart: '09:00', workEnd: '18:00' },
];
