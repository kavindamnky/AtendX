// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/shared/Layout';

// Pages — public
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import EmployeeLoginPage from './pages/EmployeeLoginPage';
import EmployeeQRCheckPage from './pages/EmployeeQRCheckPage';

// Pages — onboarding
import OnboardingPage from './pages/OnboardingPage';

// Pages — employee/shared
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import LeavesPage from './pages/LeavesPage';
import MealsPage from './pages/MealsPage';
import ProfilePage from './pages/ProfilePage';
import AssetsPage from './pages/AssetsPage';
import PerformancePage from './pages/PerformancePage';
import LearningPage from './pages/LearningPage';

// Pages — admin
import AdminDashboard from './pages/admin/AdminDashboard';
import EmployeesPage from './pages/admin/EmployeesPage';
import SettingsPage from './pages/admin/SettingsPage';
import BillingPage from './pages/admin/BillingPage';
import AdminMealsPage from './pages/admin/AdminMealsPage';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import AdminPayrollPage from './pages/admin/AdminPayrollPage';
import AdminAssetsPage from './pages/admin/AdminAssetsPage';
import AdminPerformancePage from './pages/admin/AdminPerformancePage';
import AdminRecruitmentPage from './pages/admin/AdminRecruitmentPage';
import AdminLearningPage from './pages/admin/AdminLearningPage';
import PublicJobsPage from './pages/PublicJobsPage';

// ── Loading spinner ───────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo.png" className="w-12 h-12 rounded-2xl object-cover shadow-xl shadow-red-500/20 animate-pulse" alt="AtendX Logo" />
        <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    </div>
  );
}

// ── Guard: requires auth + completed company onboarding ───────────────────────
function PrivateRoute({ children }) {
  const { user, company, loading } = useApp();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!company?.is_onboarded) return <Navigate to="/onboarding" replace />;
  return <Layout>{children}</Layout>;
}

// ── Guard: requires auth but NO company yet (for onboarding) ──────────────────
function OnboardingRoute({ children }) {
  const { user, company, loading } = useApp();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (company?.is_onboarded) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ── Guard: requires admin/owner role ─────────────────────────────────────────
function AdminRoute({ children }) {
  const { user, company, isAdmin, loading } = useApp();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!company?.is_onboarded) return <Navigate to="/onboarding" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

// ── Guard: requires super admin role ─────────────────────────────────────────
function SuperAdminRoute({ children }) {
  const { user, isSuperAdmin, loading } = useApp();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

// ── Public route: redirect logged-in users away ───────────────────────────────
function PublicRoute({ children }) {
  const { user, company, loading } = useApp();
  if (loading) return <Spinner />;
  if (user) {
    if (!company?.is_onboarded) return <Navigate to="/onboarding" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

// ── Route tree ────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/jobs" element={<PublicJobsPage />} />

      {/* Company-specific employee login & QR scan redirect landing */}
      <Route path="/company/:slug/login" element={<EmployeeLoginPage />} />
      <Route path="/company/:slug/check" element={<EmployeeQRCheckPage />} />

      {/* Onboarding (auth required, no company yet) */}
      <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />

      {/* Employee / shared pages */}
      <Route path="/dashboard"  element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/attendance" element={<PrivateRoute><AttendancePage /></PrivateRoute>} />
      <Route path="/leaves"     element={<PrivateRoute><LeavesPage /></PrivateRoute>} />
      <Route path="/meals"      element={<PrivateRoute><MealsPage /></PrivateRoute>} />
      <Route path="/assets"     element={<PrivateRoute><AssetsPage /></PrivateRoute>} />
      <Route path="/performance" element={<PrivateRoute><PerformancePage /></PrivateRoute>} />
      <Route path="/learning"   element={<PrivateRoute><LearningPage /></PrivateRoute>} />
      <Route path="/profile"    element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

      {/* Admin only */}
      <Route path="/admin"              element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/employees"    element={<AdminRoute><EmployeesPage /></AdminRoute>} />
      <Route path="/admin/payroll"      element={<AdminRoute><AdminPayrollPage /></AdminRoute>} />
      <Route path="/admin/assets"       element={<AdminRoute><AdminAssetsPage /></AdminRoute>} />
      <Route path="/admin/performance"  element={<AdminRoute><AdminPerformancePage /></AdminRoute>} />
      <Route path="/admin/recruitment"  element={<AdminRoute><AdminRecruitmentPage /></AdminRoute>} />
      <Route path="/admin/learning"     element={<AdminRoute><AdminLearningPage /></AdminRoute>} />
      <Route path="/admin/meals"        element={<AdminRoute><AdminMealsPage /></AdminRoute>} />
      <Route path="/admin/settings"     element={<AdminRoute><SettingsPage /></AdminRoute>} />
      <Route path="/admin/billing"      element={<AdminRoute><BillingPage /></AdminRoute>} />

      {/* Super Admin */}
      <Route path="/super-admin"        element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
