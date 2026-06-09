// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);         // auth session
  const [profile, setProfile] = useState(null);   // profile row
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // persist dark mode
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // restore session
  useEffect(() => {
    async function initSession() {
      const demoEmail = localStorage.getItem('demo_user_email');
      if (demoEmail) {
        setUser({ email: demoEmail, isDemo: true });
        await fetchProfile(demoEmail);
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.email);
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
      } finally {
        setLoading(false);
      }
    }
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // If in demo mode, ignore standard auth state events unless it's a signout
      if (localStorage.getItem('demo_user_email') && !session) {
        localStorage.removeItem('demo_user_email');
        setUser(null);
        setProfile(null);
        setNotifications([]);
        return;
      }
      if (localStorage.getItem('demo_user_email')) return;

      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.email);
      } else {
        setProfile(null);
        setNotifications([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(email) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    if (data) {
      setProfile(data);
      fetchNotifications(data.id);
    }
  }

  async function fetchNotifications(employeeId) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data || []);
  }

  async function markNotificationRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  async function signOut() {
    localStorage.removeItem('demo_user_email');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setNotifications([]);
  }

  async function signInDemo(email) {
    localStorage.setItem('demo_user_email', email);
    setUser({ email, isDemo: true });
    await fetchProfile(email);
  }

  const value = {
    user, profile, setProfile, darkMode, setDarkMode,
    loading, notifications, markNotificationRead,
    signOut, fetchProfile, signInDemo,
    isAdmin: profile?.role === 'admin' || profile?.role === 'hr',
    isHR: profile?.role === 'hr',
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

