// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AppContext = createContext(null);

// ── Plan configuration ──────────────────────────────────────────────────────
export const PLAN_CONFIG = {
  free: {
    label: 'Free',
    price: 0,
    employees: 5,
    color: 'text-gray-500',
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    features: ['Up to 5 employees', 'Basic attendance', 'Leave tracking'],
  },
  starter: {
    label: 'Starter',
    price: 1990,
    employees: 25,
    color: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    features: ['Up to 25 employees', 'QR attendance', 'Meal tracking', 'Reports', 'Email support'],
  },
  professional: {
    label: 'Professional',
    price: 4990,
    employees: 100,
    color: 'text-red-500',
    badge: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    features: ['Up to 100 employees', 'Advanced analytics', 'Multi-department', 'Priority support', 'Custom reports'],
  },
  enterprise: {
    label: 'Enterprise',
    price: 9990,
    employees: Infinity,
    color: 'text-purple-500',
    badge: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
    features: ['Unlimited employees', 'Custom branding', 'API access', 'Dedicated support', 'SLA guarantee'],
  },
};

// ── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [user, setUser] = useState(null);          // Supabase auth user
  const [company, setCompany] = useState(null);    // companies row
  const [profile, setProfile] = useState(null);    // profiles row
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') !== 'false');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Persist dark mode
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Restore session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserContext(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null); setCompany(null); setProfile(null); setNotifications([]);
          setLoading(false);
          return;
        }
        if (session?.user) {
          setUser(session.user);
          await loadUserContext(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Load company + profile for a logged-in user ──────────────────────────
  async function loadUserContext(authUser) {
    setLoading(true);
    try {
      // 1. Check if this user is a company owner
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', authUser.id)
        .maybeSingle();

      if (companyData) {
        setCompany(companyData);
        // Load owner's profile record
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .eq('company_id', companyData.id)
          .maybeSingle();
        if (profileData) {
          setProfile(profileData);
          fetchNotifications(profileData.id, companyData.id);
        }
        return;
      }

      // 2. Check if user is an employee of a company (already claimed)
      let { data: profileData } = await supabase
        .from('profiles')
        .select('*, companies(*)')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      // 3. First-time login: check if there's an unclaimed employee profile with this email
      if (!profileData && authUser.email) {
        let query = supabase
          .from('profiles')
          .select('*, companies(*)')
          .eq('email', authUser.email.trim().toLowerCase())
          .is('auth_user_id', null);

        // If company slug is in URL params, filter by it
        const params = new URLSearchParams(window.location.search);
        const companySlug = params.get('company');
        if (companySlug) {
          const { data: targetCompany } = await supabase
            .from('companies')
            .select('id')
            .eq('slug', companySlug)
            .maybeSingle();
          if (targetCompany) {
            query = query.eq('company_id', targetCompany.id);
          }
        }

        const { data: unclaimedProfile } = await query.maybeSingle();

        if (unclaimedProfile) {
          // Claim the profile! Link auth_user_id to user.id
          const { data: claimedProfile, error: claimErr } = await supabase
            .from('profiles')
            .update({ auth_user_id: authUser.id })
            .eq('id', unclaimedProfile.id)
            .select('*, companies(*)')
            .single();

          if (!claimErr && claimedProfile) {
            profileData = claimedProfile;
          }
        }
      }

      if (profileData) {
        setProfile(profileData);
        setCompany(profileData.companies);
        if (profileData.company_id) {
          fetchNotifications(profileData.id, profileData.company_id);
        }
      }
    } catch (err) {
      console.error('loadUserContext error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNotifications(employeeId, companyId) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('company_id', companyId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data || []);
  }

  async function markNotificationRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  // ── Auth methods ──────────────────────────────────────────────────────────
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }

  /** Send magic link. redirectPath can be '/auth/callback' or '/auth/callback?company=slug' */
  async function signInWithEmail(email, redirectPath = '/auth/callback') {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${redirectPath}` },
    });
    if (error) throw error;
  }

  /** Sign up with password (for owners who prefer password auth) */
  async function signUpWithPassword(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
    return data;
  }

  /** Sign in with password */
  async function signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setCompany(null); setProfile(null); setNotifications([]);
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const plan = company?.plan || 'free';
  const planConfig = PLAN_CONFIG[plan];
  const isOwner = !!user && company?.owner_id === user.id;
  const isAdmin = isOwner || ['admin', 'hr', 'owner'].includes(profile?.role);

  const value = {
    user,
    company, setCompany,
    profile, setProfile,
    darkMode, setDarkMode,
    loading,
    notifications, markNotificationRead,
    isOwner, isAdmin,
    plan, planConfig, PLAN_CONFIG,
    signInWithGoogle,
    signInWithEmail,
    signUpWithPassword,
    signInWithPassword,
    signOut,
    loadUserContext,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
