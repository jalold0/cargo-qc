// src/store/authStore.js
// Foydalanuvchi autentifikatsiya holati — Zustand

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { getSystemUsers, publicUser } from '../services/localData';
import { isJaloldinMirzakbarovUser } from '../services/dataPredicates';
import { verifyPassword } from '../services/authHash';
import {
  findUserByUsernameRemote,
  isUsersRemoteEnabled,
} from '../services/usersRemote';

// Demo accounts FAQAT development rejimida ishlaydi.
// Production build'da bu obyekt bo'sh bo'ladi — vite tree-shake qiladi.
// Real account'lar uchun `getSystemUsers()` ishlatilsin.
const demoUsers = import.meta.env.DEV
  ? {
      jaloldin: {
        passwords: ['admin123', 'admin'],
        user: { id: 1, username: 'jaloldin.mirzakbarov', full_name: 'Jaloldin Mirzakbarov', role: 'admin' },
      },
      'jaloldin.mirzakbarov': {
        passwords: ['admin123', 'admin'],
        user: { id: 1, username: 'jaloldin.mirzakbarov', full_name: 'Jaloldin Mirzakbarov', role: 'admin' },
      },
      // Alternativ tartib — ko'pchilik foydalanuvchilar shu shaklda yozadi
      'mirzakbarov.jaloldin': {
        passwords: ['admin123', 'admin'],
        user: { id: 1, username: 'jaloldin.mirzakbarov', full_name: 'Jaloldin Mirzakbarov', role: 'admin' },
      },
      'mirzakbarov': {
        passwords: ['admin123', 'admin'],
        user: { id: 1, username: 'jaloldin.mirzakbarov', full_name: 'Jaloldin Mirzakbarov', role: 'admin' },
      },
      admin: {
        passwords: ['admin123', 'admin'],
        user: { id: 1, username: 'jaloldin.mirzakbarov', full_name: 'Jaloldin Mirzakbarov', role: 'admin' },
      },
      // Eslatma: operator1/supervisor1 demo'lari olib tashlandi.
      // Real hodimlar Sozlamalar → Foydalanuvchilar bo'limidan boshqariladi
      // va Supabase orqali kelgan ma'lumotlar bilan tizimga kiradi.
    }
  : {};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Tizimga kirish
      // ----------------------------------------------------------
      // 3-qatlamli auth strategy:
      //   1) Supabase users jadvali (agar env ulangan bo'lsa)
      //   2) localStorage system users
      //   3) Demo accounts (faqat DEV rejimida)
      // Birinchi muvaffaqiyatli darajada to'xtaydi.
      // ----------------------------------------------------------
      login: async (username, password) => {
        set({ isLoading: true });
        const normalizedUsername = username?.trim().toLowerCase();
        const normalizedPassword = password?.trim();

        // Fuzzy variantlarni yasash:
        // "muqimjonov.ulugbek" → ["muqimjonov.ulugbek", "ulugbek.muqimjonov"]
        // Foydalanuvchilar familiya.ism yoki ism.familiya tartibida yozishi mumkin.
        const buildUsernameVariants = (name) => {
          const variants = new Set([name]);
          // Nuqta yoki probel bilan ajratilgan qismlarni qaytaramiz
          ['.', '_', '-', ' '].forEach((sep) => {
            const parts = name.split(sep).map((p) => p.trim()).filter(Boolean);
            if (parts.length >= 2) {
              variants.add(parts.slice().reverse().join(sep));
              variants.add(parts.slice().reverse().join('.'));
              variants.add(parts.join('.'));
            }
          });
          return Array.from(variants);
        };

        // Bir necha username qiymati bilan parts sorted-key ham mos kelishi
        // mumkin: "muqimjonov.ulugbek" va "ulugbek.muqimjonov" bir xil key.
        const sortedKey = (name) =>
          name.split(/[._\- ]+/).map((p) => p.trim()).filter(Boolean).sort().join('|');
        const usernameVariants = buildUsernameVariants(normalizedUsername);
        const typedSortedKey = sortedKey(normalizedUsername);

        // ============================================================
        // QATLAM 1 — Supabase (agar ulangan bo'lsa)
        // ------------------------------------------------------------
        // 3 soniyali TIMEOUT — Supabase sekin yoki javob bermasa,
        // darrov localStorage qatlamiga o'tamiz. Login hech qachon
        // 3 soniyadan ko'p Supabase'da kutib turmaydi.
        // ============================================================
        let localUser = null;
        if (isUsersRemoteEnabled) {
          // Avval aniq match, keyin teskari variantlar
          for (const variant of usernameVariants) {
            try {
              // eslint-disable-next-line no-await-in-loop
              const remoteUser = await Promise.race([
                findUserByUsernameRemote(variant),
                new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
              ]);
              if (remoteUser && remoteUser.active !== false) {
                // eslint-disable-next-line no-await-in-loop
                const ok = await verifyPassword(normalizedPassword, remoteUser.password);
                if (ok) {
                  localUser = remoteUser;
                  break;
                }
              }
            } catch {
              // Network xato — keyingisini sinab ko'ramiz
            }
          }
        }

        // ============================================================
        // QATLAM 2 — localStorage system users (yoki Supabase fallback)
        // Sorted-key fuzzy: "muqimjonov.ulugbek" ↔ "ulugbek.muqimjonov"
        // ============================================================
        const users = getSystemUsers();
        if (!localUser) {
          for (const item of users) {
            if (item.active === false) continue;
            const itemName = item.username.trim().toLowerCase();
            const exact = itemName === normalizedUsername;
            const fuzzy = !exact && sortedKey(itemName) === typedSortedKey;
            if (!exact && !fuzzy) continue;
            // eslint-disable-next-line no-await-in-loop
            const ok = await verifyPassword(normalizedPassword, item.password);
            if (ok) { localUser = item; break; }
          }
        }

        // Fuzzy fallback: agar aniq mos kelmasa, Jaloldin'ning turli xil
        // imlolarini (mirzakbarov.jaloldin, jaloliddin, admin va h.k.) ham
        // qabul qilamiz. Production'da ham ishlaydi.
        if (!localUser) {
          const synthetic = { username: normalizedUsername, full_name: normalizedUsername };
          if (isJaloldinMirzakbarovUser(synthetic) || normalizedUsername === 'admin') {
            const jaloldinAccount = users.find(
              (u) => u.active !== false && isJaloldinMirzakbarovUser(u)
            );
            if (jaloldinAccount) {
              const ok = await verifyPassword(normalizedPassword, jaloldinAccount.password);
              if (ok) localUser = jaloldinAccount;
            }
          }
        }

        if (localUser) {
          const token = `local-token-${localUser.id}`;
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          set({
            user: publicUser(localUser),
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        }

        const normalizedDemoPassword = password?.trim().toLowerCase();
        const demoAccount = demoUsers[normalizedUsername];

        if (demoAccount && demoAccount.passwords.includes(normalizedDemoPassword)) {
          const token = `demo-token-${demoAccount.user.role}`;
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          set({
            user: demoAccount.user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        }

        try {
          const { data } = await api.post('/auth/login', {
            username: normalizedUsername,
            password,
          });
          const { user, token } = data.data;
          
          // Token ni API ga o'rnatish
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({ user, token, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.message || 'Kirish xatosi.';
          return { success: false, message };
        }
      },

      // Tizimdan chiqish
      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, isAuthenticated: false });
      },

      // Token yangilash
      setToken: (token) => {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ token });
      },

      // Foydalanuvchi ma'lumotlarini yangilash
      updateUser: (userData) => {
        set({ user: { ...get().user, ...userData } });
      },
    }),
    {
      name: 'cargo-qc-auth',
      // Faqat muhim ma'lumotlarni saqlash
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// =============================================
// Theme store
// =============================================
// src/store/themeStore.js
import { create as createTheme } from 'zustand';
import { persist as persistTheme } from 'zustand/middleware';

export const useThemeStore = createTheme(
  persistTheme(
    (set) => ({
      theme: 'light', // 'light' | 'dark' | 'graphite' | 'aurora'
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'cargo-qc-theme' }
  )
);

// =============================================
// Language store
// =============================================
export const useLanguageStore = createTheme(
  persistTheme(
    (set) => ({
      language: 'uz',
      setLanguage: (language) => set({ language }),
    }),
    { name: 'cargo-qc-language' }
  )
);
