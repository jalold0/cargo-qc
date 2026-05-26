// src/App.jsx
// Asosiy ilova — routing va global sozlamalar

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/authStore';
import { lazy, Suspense, useEffect } from 'react';

// Layout va Login eager (har doim ko'rinadi)
import DashboardLayout from './components/DashboardLayout';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';

// Pages — lazy load (route-based code splitting)
// Har bir sahifa o'z chunk'i sifatida yuklanadi, initial bundle yengillashadi.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ComplaintsPage = lazy(() => import('./pages/ComplaintsPage'));
const ComplaintDetailPage = lazy(() => import('./pages/ComplaintDetailPage'));
const CreateComplaintPage = lazy(() => import('./pages/CreateComplaintPage'));
const CompensatedLoadsPage = lazy(() => import('./pages/CompensatedLoadsPage'));
const MyInProgressPage = lazy(() => import('./pages/MyInProgressPage'));
const AssistantAiPage = lazy(() => import('./pages/AssistantAiPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const TrackingPage = lazy(() => import('./pages/TrackingPage'));
const DepartmentOrderPage = lazy(() => import('./pages/DepartmentOrderPage'));
const Module102Page = lazy(() => import('./pages/Module102Page'));
const Module102DetailPage = lazy(() => import('./pages/Module102DetailPage'));
const WarehousePage = lazy(() => import('./pages/WarehousePage'));

import { canAccess } from './services/access';
import { archiveClosedEntriesByDayEnd, getSystemUsers, publicUser, runAppDataMigrations } from './services/localData';

// =============================================
// Suspense fallback — sahifa yuklanayotgan paytdagi indikator
// =============================================
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Yuklanmoqda…
        </p>
      </div>
    </div>
  );
}

// Route'larni ErrorBoundary + Suspense bilan o'rash uchun helper —
// har sahifa crash bo'lsa oq oyna emas, tushuntirilgan xatolik chiqadi
function RouteFrame({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

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
  const { user, updateUser } = useAuthStore();

  // Dark mode ni HTML ga qo'shish
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    runAppDataMigrations();
  }, []);

  useEffect(() => {
    const syncClosedArchive = () => {
      archiveClosedEntriesByDayEnd();
    };

    syncClosedArchive();

    const intervalId = window.setInterval(syncClosedArchive, 5 * 60 * 1000);
    window.addEventListener('focus', syncClosedArchive);
    document.addEventListener('visibilitychange', syncClosedArchive);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncClosedArchive);
      document.removeEventListener('visibilitychange', syncClosedArchive);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const isLegacyAdminSession =
      String(user.username || '').trim().toLowerCase() === 'admin' ||
      String(user.full_name || '').trim().toLowerCase() === 'admin';

    if (!isLegacyAdminSession) return;

    const jaloldinAccount = getSystemUsers().find((item) => {
      const fullName = String(item.full_name || '').trim().toLowerCase();
      const username = String(item.username || '').trim().toLowerCase();
      return (
        item.role === 'admin' &&
        (fullName.includes('jaloldin') ||
          fullName.includes('jaloliddin') ||
          username.includes('jaloldin') ||
          username.includes('mirzakbarov'))
      );
    });

    if (jaloldinAccount) {
      updateUser(publicUser(jaloldinAccount));
    }
  }, [user, updateUser]);

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
                <RouteFrame><DashboardPage /></RouteFrame>
              </ProtectedRoute>
            } />
            <Route path="complaints"  element={
              <ProtectedRoute accessKey="complaints">
                <RouteFrame><ComplaintsPage /></RouteFrame>
              </ProtectedRoute>
            } />
            <Route path="complaints/new"    element={
              <ProtectedRoute accessKey="complaints">
                <RouteFrame><CreateComplaintPage /></RouteFrame>
              </ProtectedRoute>
            } />
            <Route path="complaints/:id"    element={
              <ProtectedRoute accessKey="complaints">
                <RouteFrame><ComplaintDetailPage /></RouteFrame>
              </ProtectedRoute>
            } />
            <Route path="tracking"    element={
              <ProtectedRoute accessKey="tracking">
                <RouteFrame><TrackingPage /></RouteFrame>
              </ProtectedRoute>
            } />
            <Route path="assistant-ai"    element={
              <ProtectedRoute accessKey="assistantAi">
                <RouteFrame><AssistantAiPage /></RouteFrame>
              </ProtectedRoute>
            } />
            <Route path="users"       element={
              <Navigate to="/settings" replace />
            } />
            <Route path="branches"    element={
              <Navigate to="/settings" replace />
            } />
            <Route path="compensated"    element={
              <ProtectedRoute accessKey="compensated">
                <RouteFrame><CompensatedLoadsPage /></RouteFrame>
              </ProtectedRoute>
            } />
            <Route path="my-in-progress"    element={
              <ProtectedRoute>
                <RouteFrame><MyInProgressPage /></RouteFrame>
              </ProtectedRoute>
            } />
            <Route path="module-102"    element={
              <ProtectedRoute accessKey="module102">
                <Suspense fallback={<RouteFallback />}><Module102Page /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="module-102/:id" element={
              <ProtectedRoute accessKey="module102">
                <Suspense fallback={<RouteFallback />}><Module102DetailPage /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="warehouse"    element={
              <ProtectedRoute>
                <Suspense fallback={<RouteFallback />}><WarehousePage /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="settings"    element={
              <ProtectedRoute accessKey="settings">
                <RouteFrame><SettingsPage /></RouteFrame>
              </ProtectedRoute>
            } />
            <Route path="department-order"    element={
              <ProtectedRoute accessKey="settings">
                <RouteFrame><DepartmentOrderPage /></RouteFrame>
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
