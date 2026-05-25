// src/services/trackDatabase.js
// Trek master bazasi — trek raqami bo'yicha to'liq ma'lumotlarni qaytaradi.
// Hozircha mock generator + OTK records bilan integratsiya.

import { getAllOtkRecords } from './localData';

// ============================================================
// Yordamchi funksiyalar (deterministic mock)
// ============================================================
function hashCode(value) {
  const str = String(value || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

const FIRST_NAMES = ['Aziz', 'Madina', 'Jasur', 'Dilshod', 'Nargiza', 'Sevinch', 'Sherzod', 'Ulug\'bek', 'Zilola', 'Shahnoza', 'Bekzod', 'Komil'];
const LAST_NAMES = ['Yuldashov', 'Karimova', 'Mirzayev', 'Rasulova', 'Nazarov', 'Tursunova', 'Ahmedov', 'Saidova', 'Rashidov'];
const ROUTES = [
  { from: 'Guangzhou', to: 'Toshkent' },
  { from: 'Yiwu', to: 'Samarqand' },
  { from: 'Shenzhen', to: 'Buxoro' },
  { from: 'Istanbul', to: 'Andijon' },
  { from: 'Guangzhou', to: 'Farg\'ona' },
  { from: 'Shenzhen', to: 'Toshkent' },
];
const SERVICES = ['iPOST Filial', 'iPOST Express', 'iPOST Standart'];
const PACKAGINGS = ['Asl', 'Karton', 'Polietilen', 'Plastik'];
const ADDRESSES = [
  'Toshkent, Mirzo Ulug\'bek 15-uy',
  'Samarqand, Registon 4-uy',
  'Andijon, Mustaqillik 22-uy',
  'Buxoro, Ark 7-uy',
  'Toshkent, Yunusobod 12-mavze',
  'Toshkent, Chilonzor 19-uy',
];
const TIERS = ['Gold', 'Silver', 'Bronze'];
const CLASSES = ['A', 'B', 'C', 'D', 'E'];

// ============================================================
// Logistika eventlari (Xitoy → O'zbekiston route uchun)
// ============================================================
function buildLogisticsEvents(seed, createdAtIso) {
  const created = new Date(createdAtIso);
  const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

  const events = [
    {
      title: "Trek raqam qo'shildi.",
      description: 'Qabul qilinmagan.',
      at: created.toISOString(),
      actor: null,
    },
    {
      title: 'Xitoy omboriga keldi.',
      description: 'Xitoy omboriga keldi.',
      at: addDays(created, 2).toISOString(),
      actor: 'Tarozi6',
    },
    {
      title: 'Xitoy omboridan yuborildi.',
      description: 'Xitoy omboridan yuborildi.',
      at: addDays(created, 4).toISOString(),
      actor: null,
    },
    {
      title: 'Xitoy chegara punkti.',
      description: 'Yetib kelishiga 5 kun qoldi.',
      at: addDays(created, 8).toISOString(),
      actor: null,
    },
    {
      title: "O'zbekiston chegara punktiga yaqinlashdi.",
      description: 'Yetib kelishiga 3 kun qoldi.',
      at: addDays(created, 13).toISOString(),
      actor: null,
    },
    {
      title: 'Bojxona omboriga yetib keldi.',
      description: 'Saralash punktiga keldi.',
      at: addDays(created, 14).toISOString(),
      actor: null,
    },
    {
      title: 'Toshkent omborida saralanmoqda.',
      description: 'Saralanmoqda.',
      at: addDays(created, 15).toISOString(),
      actor: 'api-user',
    },
    {
      title: 'Yetkazib berish manziliga yuborildi.',
      description: 'Yetkazib berish manziliga yuborildi.',
      at: addDays(created, 18).toISOString(),
      actor: null,
    },
    {
      title: 'Qabul qilish punktida.',
      description: '',
      at: addDays(created, 23).toISOString(),
      actor: 'EMU',
    },
    {
      title: 'Yetkazib berildi.',
      description: 'Yetkazib berildi.',
      at: addDays(created, 27).toISOString(),
      actor: 'EMU',
    },
  ];

  // Variativlik uchun ba'zi treklarda eventlar kamroq bo'lsin
  const limit = 4 + (seed % 7);
  return events.slice(0, limit);
}

// ============================================================
// Asosiy: trek raqami bo'yicha to'liq ma'lumot
// ============================================================
export function getTrackInfo(trackCode) {
  if (!trackCode) return null;
  const code = String(trackCode).trim();
  if (!code) return null;

  const seed = hashCode(code);
  const firstName = pick(FIRST_NAMES, seed);
  const lastName = pick(LAST_NAMES, seed >> 3);
  const customerCode = String(10000 + (seed % 90000));
  const phone = `+998${88 + (seed % 12)}${String((seed >> 5) % 10000000).padStart(7, '0')}`;
  const route = pick(ROUTES, seed >> 7);
  const service = pick(SERVICES, seed >> 11);
  const packaging = pick(PACKAGINGS, seed >> 13);
  const address = pick(ADDRESSES, seed >> 17);
  const weight = +(0.3 + ((seed % 500) / 100)).toFixed(2); // 0.3 — 5.3 kg
  const cargoPrice = +((weight * 4.1) + ((seed % 27) / 10)).toFixed(2);
  const extraPrice = (seed % 5) === 0 ? +((seed % 13) / 10).toFixed(2) : 0;
  const totalUSD = +(cargoPrice + extraPrice).toFixed(2);

  // Yaratilgan sana — oxirgi 90 kun ichida
  const daysAgo = (seed % 90) + 1;
  const createdAt = new Date(Date.now() - daysAgo * 86400000);
  const paymentDate = (seed % 3) === 0
    ? null // to'lanmagan
    : new Date(createdAt.getTime() + ((seed % 20) + 5) * 86400000);

  const events = buildLogisticsEvents(seed, createdAt.toISOString());
  const lastEvent = events[events.length - 1];

  // Holatni so'nggi event bo'yicha aniqlash
  let status = "Yo'lda";
  let statusTone = 'sky';
  if (lastEvent.title.includes('Yetkazib berildi')) {
    status = 'Yetkazildi';
    statusTone = 'emerald';
  } else if (lastEvent.title.includes('Yo\'qol') || (seed % 31) === 0) {
    status = "Yo'qolgan";
    statusTone = 'red';
  } else if ((seed % 7) === 0) {
    status = 'Qayta ishlanmoqda';
    statusTone = 'amber';
  }

  return {
    trackCode: code,
    customer: `${firstName} ${lastName}`,
    customerCode,
    phone,
    createdAt: createdAt.toISOString(),
    weight,
    cargoPrice,
    extraPrice,
    totalUSD,
    paymentStatus: paymentDate ? "To'langan" : "Kutmoqda",
    paymentAmount: totalUSD,
    paymentDate: paymentDate ? paymentDate.toISOString() : null,
    paymentRef: paymentDate ? `${(30000000 + (seed % 80000000)).toString(16)}` : '',
    service,
    packaging,
    address,
    orderNumber: `I-${code}`,
    valuableNote: (seed % 9) === 0 ? 'Mo\'rt yuk' : 'Hech narsa',
    route,
    status,
    statusTone,
    events,
    lastEvent,
  };
}

// ============================================================
// Mijoz profili (kartochka uchun)
// ============================================================
export function getCustomerProfile(trackOrPhone) {
  const info = typeof trackOrPhone === 'object' && trackOrPhone !== null
    ? trackOrPhone
    : getTrackInfo(trackOrPhone);
  if (!info) return null;

  const seed = hashCode(info.phone || info.customer || '');
  const initials = info.customer
    .split(/\s+/)
    .map((part) => part[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const tier = pick(TIERS, seed >> 2);
  const klass = pick(CLASSES, seed >> 5);
  const isTop = klass === 'A' || klass === 'B';

  const joinedAt = new Date(Date.now() - (((seed % 800) + 60) * 86400000));
  const firstOrderAt = new Date(joinedAt.getTime() + ((seed % 30) + 5) * 86400000);

  const totalTracks = 20 + (seed % 80);
  const deliveredTracks = Math.floor(totalTracks * (0.75 + (seed % 20) / 100));
  const inTransitTracks = totalTracks - deliveredTracks;
  const thisMonthTracks = 5 + (seed % 18);
  const avtoTracks = Math.floor(totalTracks * 0.7);
  const aviaTracks = totalTracks - avtoTracks;
  const deliveryRate = +((deliveredTracks / totalTracks) * 100).toFixed(1);
  const totalKg = 100 + (seed % 1400);

  const avgOrder = 400000 + ((seed % 400) * 1000);
  const totalPaid = avgOrder * totalTracks;
  const points = Math.floor(totalPaid / 18000);
  const cashback = Math.floor(totalPaid * 0.03);
  const debt = (seed % 4) === 0 ? 400000 + ((seed % 90) * 10000) : 0;
  const debtDays = debt > 0 ? 5 + (seed % 30) : 0;

  const paymentOnTime = Math.floor(totalTracks * (0.65 + (seed % 25) / 100));
  const paymentLate = totalTracks - paymentOnTime;
  const paymentDiscipline = +((paymentOnTime / totalTracks) * 100).toFixed(0);

  const complaintsTotal = 2 + (seed % 20);
  const complaints102 = (seed % 7) === 0 ? 1 + (seed % 4) : 0;
  const complaintsCompetition = (seed % 11) === 0 ? 1 : 0;
  const complaintsDelay = Math.floor(complaintsTotal * 0.4);
  const complaintsStatus = Math.floor(complaintsTotal * 0.5);
  const complaintsOther = Math.max(0, complaintsTotal - complaintsDelay - complaintsStatus);

  const MANAGER_NAMES = ['Madina', 'Jaloldin', 'Ulug\'bek', 'Jasur', 'Abduvali', 'Shahnoza'];
  const manager = pick(MANAGER_NAMES, seed >> 6);

  return {
    trackCode: info.trackCode,
    customerCode: info.customerCode,
    fullName: info.customer,
    phone: info.phone,
    initials,
    tier, // Gold/Silver/Bronze
    klass, // A-E
    isTop,
    joinedAt: joinedAt.toISOString(),
    firstOrderAt: firstOrderAt.toISOString(),
    totalKg,

    tracks: {
      total: totalTracks,
      delivered: deliveredTracks,
      inTransit: inTransitTracks,
      thisMonth: thisMonthTracks,
      avto: avtoTracks,
      avia: aviaTracks,
      deliveryRate,
    },

    finance: {
      totalPaid,
      avgOrder,
      points,
      cashback,
      debt,
      debtDays,
      paymentOnTime,
      paymentLate,
      paymentDiscipline,
    },

    complaints: {
      total: complaintsTotal,
      code102: complaints102,
      competition: complaintsCompetition,
      delay: complaintsDelay,
      statusReq: complaintsStatus,
      other: complaintsOther,
    },

    manager: {
      name: manager,
      tier: 'Gold menejer',
      online: (seed % 3) === 0,
      lastContact: 'Bugun, 14:32',
      nextCall: new Date(Date.now() + 2 * 86400000).toLocaleDateString('uz-UZ'),
      note: debt > 0 ? 'Qarzdorlik haqida eslatish' : 'Faol mijoz',
      channels: 'Bot + SMS + Push',
    },

    flags: {
      active: true,
      repeat: deliveredTracks > 30,
      gold: tier === 'Gold',
      hasComplaints: complaintsTotal > 0,
      has102: complaints102 > 0,
    },
  };
}

// ============================================================
// OTK records bilan birlashtirish — trek bo'yicha murojaatlar
// ============================================================
export function getComplaintsByTrack(trackCode) {
  if (!trackCode) return [];
  const code = String(trackCode).trim().toLowerCase();
  return getAllOtkRecords().filter(
    (record) => String(record.trackCode || '').trim().toLowerCase() === code
  );
}

// ============================================================
// Trek qidirish (TrackingPage va auto-fill uchun)
// ============================================================
export function lookupTrack(trackCode) {
  const info = getTrackInfo(trackCode);
  if (!info) return null;
  const complaints = getComplaintsByTrack(trackCode);
  return { ...info, complaints };
}
