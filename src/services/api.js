// src/services/api.js
// Axios HTTP client — token va xato boshqaruvi

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — token qo'shish
api.interceptors.request.use(
  (config) => {
    // Token allaqachon default headerda bo'lsa uni ishlatish
    const token = localStorage.getItem('cargo-qc-auth');
    if (token) {
      try {
        const parsed = JSON.parse(token);
        if (parsed?.state?.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`;
        }
      } catch {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — xatolarni boshqarish
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token muddati tugagan — chiqarish
      localStorage.removeItem('cargo-qc-auth');
      window.location.href = '/login';
    }

    if (status === 403) {
      console.warn('Ruxsat yo\'q:', error.config?.url);
    }

    return Promise.reject(error);
  }
);

export default api;

// =============================================
// API helpers — barcha endpoint lar
// =============================================

// Murojaatlar
export const complaintsApi = {
  getAll:         (params) => api.get('/complaints', { params }),
  getById:        (id) => api.get(`/complaints/${id}`),
  create:         (data) => api.post('/complaints', data),
  updateStatus:   (id, data) => api.patch(`/complaints/${id}/status`, data),
  updateStage:    (id, data) => api.patch(`/complaints/${id}/stage`, data),
  update:         (id, data) => api.put(`/complaints/${id}`, data),
  delete:         (id) => api.delete(`/complaints/${id}`),
  export:         (params) => api.get('/complaints/export', { params, responseType: 'blob' }),
  uploadFile:     (id, formData) => api.post(`/complaints/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Statistika
export const statisticsApi = {
  dashboard: () => api.get('/statistics/dashboard'),
  monthly:   (params) => api.get('/statistics/monthly', { params }),
};

// Foydalanuvchilar
export const usersApi = {
  getAll:  () => api.get('/users'),
  create:  (data) => api.post('/users', data),
  update:  (id, data) => api.put(`/users/${id}`, data),
  delete:  (id) => api.delete(`/users/${id}`),
};

// Filiallar
export const branchesApi = {
  getAll: () => api.get('/branches'),
};

// Muammo turlari
export const typesApi = {
  getAll: () => api.get('/types'),
};