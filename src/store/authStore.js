// src/store/authStore.js
// Foydalanuvchi autentifikatsiya holati — Zustand

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { getSystemUsers, publicUser } from '../services/localData';

const demoUsers = {
  admin: {
    passwords: ['admin123', 'admin'],
    user: { id: 1, username: 'admin', full_name: 'Admin', role: 'admin' },
  },
  operator: {
    passwords: ['operator', 'op123'],
    user: { id: 2, username: 'operator1', full_name: 'Operator', role: 'operator' },
  },
  operator1: {
    passwords: ['op123', 'operator'],
    user: { id: 2, username: 'operator1', full_name: 'Operator', role: 'operator' },
  },
  supervisor: {
    passwords: ['supervisor', 'sup123'],
    user: { id: 3, username: 'supervisor1', full_name: 'Supervisor', role: 'supervisor' },
  },
  supervisor1: {
    passwords: ['sup123', 'supervisor'],
    user: { id: 3, username: 'supervisor1', full_name: 'Supervisor', role: 'supervisor' },
  },
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Tizimga kirish
      login: async (username, password) => {
        set({ isLoading: true });
        const normalizedUsername = username?.trim().toLowerCase();
        const normalizedPassword = password?.trim();
        const users = getSystemUsers();
        const localUser = users.find(
          (item) => item.active !== false && item.username.trim().toLowerCase() === normalizedUsername && item.password === normalizedPassword
        );

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
      theme: 'light', // 'light' | 'dark'
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
