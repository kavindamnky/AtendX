// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Shield, ChevronRight, Sun, Moon, Building2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';


export default function LoginPage() {
  const { darkMode, setDarkMode, signInDemo } = useApp();
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState('email'); // email | admin
  const [step, setStep] = useState('email'); // email | linkSent
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canBypass, setCanBypass] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const ADMIN_CREDENTIALS = {
    admin: { email: 'admin@attendx.com', password: 'admin@123', label: 'Admin' },
    hradmin: { email: 'hradmin@attendx.com', password: 'hr@admin', label: 'HRadmin' },
  };

  function isEmailDeliveryError(error) {
    const message = error?.message?.toLowerCase() || '';
    return (
      message.includes('error sending confirmation email') ||
      message.includes('error sending magic link') ||
      message.includes('error sending email') ||
      error?.status === 500
    );
  }

  function getEmailRedirectTo() {
    return `${window.location.origin}/dashboard`;
  }

  async function handleSendSignInLink(e) {
    e.preventDefault();
    setError('');
    setCanBypass(false);
    setLoading(true);
    const targetEmail = email.trim().toLowerCase();

    try {
      // Step 1: Check if this email is registered in profiles
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', targetEmail)
        .maybeSingle();

      if (profileErr) {
        setError('Connection error. Please check your internet and try again.');
        setLoading(false);
        return;
      }

      if (!profile) {
        setError('No account found with this email. Please register first.');
        setLoading(false);
        return;
      }

      // Step 2: Email is registered - send Supabase sign-in link
      const { error: linkError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: getEmailRedirectTo(),
        },
      });

      if (linkError) {
        setError(
          isEmailDeliveryError(linkError)
            ? 'Supabase could not send the sign-in email. Check Auth email/SMTP settings in Supabase, then try again.'
            : linkError.message || 'Failed to send sign-in email. Please try again.'
        );
        setCanBypass(true);
        setLoading(false);
        return;
      }

      setEmail(targetEmail);
      setStep('linkSent');
      startResendCooldown();
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      setCanBypass(true);
    }

    setLoading(false);
  }

  async function handleAdminLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const requestedUsername = username.trim();
    const normalized = requestedUsername.toLowerCase();
    const adminConfig = ADMIN_CREDENTIALS[normalized];

    if (!adminConfig || password !== adminConfig.password) {
      setError('Invalid admin username or password.');
      setLoading(false);
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', adminConfig.email)
      .maybeSingle();

    if (profileErr) {
      setError('Unable to verify admin account. Please try again.');
      setLoading(false);
      return;
    }

    if (!profile) {
      setError('Admin profile not found. Seed the admin profiles in Supabase before logging in.');
      setLoading(false);
      return;
    }

    await signInDemo(adminConfig.email);
    navigate('/dashboard');
    setLoading(false);
  }

  async function handleDemoBypass() {
    setError('');
    setLoading(true);
    try {
      const targetEmail = email.trim().toLowerCase();
      // Verify email exists in profiles first
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', targetEmail)
        .maybeSingle();

      if (!profile) {
        setError('No registered account found with this email. Please register first.');
        setLoading(false);
        return;
      }

      await signInDemo(targetEmail);
      navigate('/dashboard');
    } catch (err) {
      setError('Demo login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function startResendCooldown() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResendSignInLink() {
    if (resendCooldown > 0) return;
    setError('');
    setCanBypass(false);
    setLoading(true);
    const targetEmail = email.trim().toLowerCase();

    const { error: linkError } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: getEmailRedirectTo(),
      },
    });

    if (linkError) {
      setError(
        isEmailDeliveryError(linkError)
          ? 'Supabase could not resend the sign-in email. Check Auth email/SMTP settings in Supabase, then try again.'
          : linkError.message || 'Failed to resend sign-in email.'
      );
      setCanBypass(true);
    } else {
      startResendCooldown();
    }
    setLoading(false);
  }

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">AttendX</span>
        </div>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-white text-gray-600 shadow-sm border border-gray-200'}`}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Main card */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className={`w-full max-w-md rounded-2xl shadow-2xl p-8 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'}`}>

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/30">
              {loginMode === 'admin' ? <Shield size={40} className="text-white" /> : step === 'email' ? <Building2 size={40} className="text-white" /> : <Shield size={40} className="text-white" />}
            </div>
            <h1 className="text-2xl font-bold">
              {loginMode === 'admin' ? 'Admin Login' : step === 'email' ? 'Welcome Back' : 'Check Your Email'}
            </h1>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {loginMode === 'email'
                ? 'Sign in with your work email address'
                : 'Use your admin username and password'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => { setLoginMode('email'); setError(''); setUsername(''); setPassword(''); }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${loginMode === 'email'
                ? 'bg-red-600 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >
              Email Login
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('admin'); setError(''); setEmail(''); }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${loginMode === 'admin'
                ? 'bg-red-600 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >
              Admin Login
            </button>
          </div>

          {loginMode === 'email' && (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-8">
                <div className="flex-1 h-1 rounded-full bg-red-500" />
                <div className={`flex-1 h-1 rounded-full ${step === 'linkSent' ? 'bg-red-500' : darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800 flex flex-col items-start gap-2">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">!</span>
                <span>{error}</span>
              </div>
              {canBypass && (
                <button
                  type="button"
                  onClick={handleDemoBypass}
                  className="mt-1.5 text-xs font-semibold underline text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 self-start"
                >
                  Bypass with Demo Mode (No Email Required)
                </button>
              )}
            </div>
          )}

          {loginMode === 'email' ? (
            step === 'email' ? (
              <form onSubmit={handleSendSignInLink} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="employee@company.com"
                      required
                      autoFocus
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition
                        ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || email.length < 5}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-red-500/20"
                >
                  {loading
                    ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    : <><span>Send Sign-In Link</span><ChevronRight size={18} /></>
                  }
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className={`rounded-xl p-4 text-sm text-center ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                  Open the email from Supabase and click the sign-in link to continue.
                </div>

                <button
                  type="button"
                  onClick={() => window.open('https://mail.google.com/', '_blank', 'noopener,noreferrer')}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-red-500/20"
                >
                  Open Email
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendSignInLink}
                    disabled={resendCooldown > 0 || loading}
                    className={`text-sm flex items-center gap-1 mx-auto transition ${
                      resendCooldown > 0 || loading
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-red-500 hover:text-red-600'
                    }`}
                  >
                    <RefreshCw size={14} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend sign-in link'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); setCanBypass(false); }}
                  className="w-full text-sm text-red-500 hover:text-red-600 transition"
                >
                  Change email
                </button>
              </div>
            )
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Admin Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Admin"
                    required
                    autoFocus
                    className={`w-full pl-4 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition
                      ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className={`w-full pl-4 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition
                      ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>
              </div>
              {/* <div className={`rounded-xl p-4 text-sm ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                Use the admin credentials:
                <div className="mt-2 text-xs space-y-1 text-left">
                  <div><strong>Admin:</strong> Admin / admin@123</div>
                  <div><strong>HRadmin:</strong> HRadmin / hr@admin</div>
                </div>
              </div> */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-red-500/20"
              >
                {loading
                  ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  : 'Sign In'
                }
              </button>
            </form>
          )}

          <div className={`mt-6 pt-6 border-t text-center text-sm ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
            New employee?{' '}
            <button onClick={() => navigate('/register')} className="text-red-500 hover:text-red-600 font-medium">
              Register here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
