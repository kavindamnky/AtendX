// src/components/shared/Layout.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, QrCode, Calendar, UtensilsCrossed, User,
  LogOut, Sun, Moon, Bell, Menu, X,
  Building2, Users, BarChart3, Settings, CreditCard,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard,  label: 'Dashboard' },
  { to: '/attendance', icon: QrCode,            label: 'Attendance' },
  { to: '/leaves',     icon: Calendar,          label: 'Leave Requests' },
  { to: '/meals',      icon: UtensilsCrossed,   label: 'Meal Orders' },
  { to: '/profile',    icon: User,              label: 'My Profile' },
];

const adminItems = [
  { to: '/admin',           icon: BarChart3,   label: 'Admin Dashboard' },
  { to: '/admin/employees', icon: Users,        label: 'Employees' },
  { to: '/admin/meals',     icon: UtensilsCrossed, label: 'Meals Management' },
  { to: '/admin/settings',  icon: Settings,     label: 'Settings' },
  { to: '/admin/billing',   icon: CreditCard,   label: 'Billing & Plans' },
];

export default function Layout({ children }) {
  const {
    profile, company, darkMode, setDarkMode,
    signOut, notifications, markNotificationRead,
    isAdmin, plan, planConfig,
  } = useApp();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [notifOpen,   setNotifOpen]     = useState(false);
  const [empCount,    setEmpCount]      = useState(0);

  // Fetch active employee count for footer
  useEffect(() => {
    if (!company?.id) return;
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('status', 'active')
      .then(({ count }) => setEmpCount(count ?? 0));
  }, [company?.id]);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const empLimit = planConfig?.employees === Infinity ? '∞' : planConfig?.employees ?? '—';

  const sidebarBg   = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const activeClass = 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold';
  const inactiveClass = darkMode
    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50';

  const divider = `border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`;

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 border-r flex flex-col transform transition-transform duration-300
        ${sidebarBg} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>

        {/* Brand / Company */}
        <div className={`flex items-center justify-between px-5 py-5 ${divider}`}>
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo */}
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-red-500/20 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30 shrink-0 text-white font-bold text-base">
                {company?.name?.charAt(0)?.toUpperCase() || <Building2 size={18} />}
              </div>
            )}

            {/* Company name + plan badge */}
            <div className="min-w-0">
              <div className="font-bold text-sm leading-tight truncate">{company?.name || 'AtendX'}</div>
              <span
                className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5
                  ${planConfig?.badge ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}
                  ${plan === 'free' ? 'pulse-badge' : ''}`}
              >
                {planConfig?.label ?? 'Free'}
              </span>
            </div>
          </div>

          <button onClick={() => setSidebarOpen(false)} className="lg:hidden shrink-0 ml-2">
            <X size={20} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
          </button>
        </div>

        {/* Profile mini */}
        <div className={`px-4 py-4 ${divider}`}>
          <div className="flex items-center gap-3">
            {profile?.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt="Avatar" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                {profile?.full_name?.charAt(0) || '?'}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{profile?.full_name || 'Employee'}</div>
              <div className={`text-xs truncate ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {profile?.department || 'No Department'}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          {/* Employee section */}
          <div className={`text-xs font-semibold uppercase tracking-wider px-3 mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            Main
          </div>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isActive ? activeClass : inactiveClass}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className={`text-xs font-semibold uppercase tracking-wider px-3 mt-4 mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                Admin
              </div>
              {adminItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/admin'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isActive ? activeClass : inactiveClass}`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Bottom controls */}
        <div className={`px-3 py-3 ${divider} border-t border-b-0 space-y-1`}>
          {/* Employee count */}
          <div className={`px-3 py-2 text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            <span className="font-medium">{empCount}</span>
            {' / '}
            <span className="font-medium">{empLimit}</span>
            {' employees'}
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${inactiveClass}`}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className={`sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b backdrop-blur-md
          ${darkMode ? 'bg-gray-950/90 border-gray-800' : 'bg-white/90 border-gray-200'}`}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg">
            <Menu size={20} />
          </button>
          <div className="flex-1 lg:flex-none" />

          {/* Notifications */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative p-2 rounded-xl transition ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center leading-none">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-xl border overflow-hidden z-50
                  ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className={`px-4 py-3 font-semibold text-sm border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <div className={`px-4 py-6 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      No new notifications
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map(n => (
                        <button
                          key={n.id}
                          onClick={() => { markNotificationRead(n.id); }}
                          className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition
                            ${darkMode ? 'border-gray-800' : 'border-gray-50'}`}
                        >
                          <div className="font-medium text-sm">{n.title}</div>
                          <div className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{n.message}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
