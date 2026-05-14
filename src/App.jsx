// src/App.jsx
// Asosiy ilova — routing va global sozlamalar

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/authStore';
import { useEffect } from 'react';

// Layout
import DashboardLayout from './components/DashboardLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ComplaintsPage from './pages/ComplaintsPage';
import ComplaintDetailPage from './pages/ComplaintDetailPage';
import CreateComplaintPage from './pages/CreateComplaintPage';
import UsersPage from './pages/UsersPage';
import BranchesPage from './pages/BranchesPage';
import SettingsPage from './pages/SettingsPage';
import TrackingPage from './pages/TrackingPage';
import { canAccess } from './services/access';
import { runAppDataMigrations } from './services/localData';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,       // 30 soniya — qayta so'rov qilmasdan
      refetchOnWindowFocus: false,
    },
  },
});

// =============================================
// Protected Route — autentifikatsiya tekshiradi
// =============================================
const ProtectedRoute = ({ children, roles, accessKey }) => {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (accessKey && !canAccess(accessKey, user)) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  
  return children;
};

// =============================================
// Asosiy ilova
// =============================================
export default function App() {
  const { theme } = useThemeStore();

  // Dark mode ni HTML ga qo'shish
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    runAppDataMigrations();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — barcha rollar */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"   element={
              <ProtectedRoute accessKey="dashboard">
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="complaints"  element={
              <ProtectedRoute accessKey="complaints">
                <ComplaintsPage />
              </ProtectedRoute>
            } />
            <Route path="complaints/new"    element={
              <ProtectedRoute accessKey="complaints">
                <CreateComplaintPage />
              </ProtectedRoute>
            } />
            <Route path="complaints/:id"    element={
              <ProtectedRoute accessKey="complaints">
                <ComplaintDetailPage />
              </ProtectedRoute>
            } />
            <Route path="tracking"    element={
              <ProtectedRoute accessKey="tracking">
                <TrackingPage />
              </ProtectedRoute>
            } />
            <Route path="users"       element={
              <ProtectedRoute accessKey="users">
                <UsersPage />
              </ProtectedRoute>
            } />
            <Route path="branches"    element={
              <ProtectedRoute accessKey="branches">
                <BranchesPage />
              </ProtectedRoute>
            } />
            <Route path="settings"    element={
              <ProtectedRoute accessKey="settings">
                <SettingsPage />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      {/* Toast bildirishnomalar */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'dark:bg-gray-800 dark:text-white',
          duration: 4000,
          style: { borderRadius: '8px', fontSize: '14px' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
