// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Shield, ChevronRight, Sun, Moon, Building2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';


export default function LoginPage() {
  const { darkMode, setDarkMode, fetchProfile, signInDemo } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // email | otp
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canBypass, setCanBypass] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    setCanBypass(false);
    setLoading(true);
    const targetEmail = email.trim().toLowerCase();

    try {
      // ── Step 1: Check if this email is registered in profiles ──
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

      // ── Step 2: Email is registered — send OTP ──
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: false, // never create new auth users from login
        },
      });

      if (otpError) {
        // If user not in auth yet, allow OTP with user creation this one time
        if (
          otpError.message?.toLowerCase().includes('user not found') ||
          otpError.message?.toLowerCase().includes('signups not allowed') ||
          otpError.status === 422
        ) {
          // Retry with shouldCreateUser: true — profile already verified above
          const { error: retryError } = await supabase.auth.signInWithOtp({
            email: targetEmail,
            options: { shouldCreateUser: true },
          });
          if (retryError) {
            setError(retryError.message || 'Failed to send OTP. Please try again.');
            setCanBypass(true);
            setLoading(false);
            return;
          }
        } else {
          setError(otpError.message || 'Failed to send OTP. Please try again.');
          setCanBypass(true);
          setLoading(false);
          return;
        }
      }

      setStep('otp');
      startResendCooldown();
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      setCanBypass(true);
    }

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

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const code = otp.join('');
    const targetEmail = email.trim().toLowerCase();

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: targetEmail,
      token: code,
      type: 'email',
    });

    if (verifyError) {
      setError(verifyError.message || 'Invalid OTP. Please try again.');
      setLoading(false);
      return;
    }

    // Fetch user profile and navigate
    await fetchProfile(targetEmail);
    navigate('/dashboard');
    setLoading(false);
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

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    const targetEmail = email.trim().toLowerCase();

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: { shouldCreateUser: false },
    });

    if (otpError) {
      // Retry allowing user creation (profile already verified on first attempt)
      const { error: retryError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: { shouldCreateUser: true },
      });
      if (retryError) {
        setError(retryError.message || 'Failed to resend OTP.');
      } else {
        startResendCooldown();
        setOtp(['', '', '', '', '', '']);
      }
    } else {
      startResendCooldown();
      setOtp(['', '', '', '', '', '']);
    }
    setLoading(false);
  }


  function handleOtpChange(index, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[index] = val;
    setOtp(next);
    if (val && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  }

  function handleOtpPaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      e.preventDefault();
    }
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
              {step === 'email' ? <Building2 size={40} className="text-white" /> : <Shield size={40} className="text-white" />}
            </div>
            <h1 className="text-2xl font-bold">
              {step === 'email' ? 'Welcome Back' : 'Check Your Email'}
            </h1>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {step === 'email'
                ? 'Sign in with your work email address'
                : `We sent a 6-digit code to ${email}`}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex-1 h-1 rounded-full bg-red-500" />
            <div className={`flex-1 h-1 rounded-full ${step === 'otp' ? 'bg-red-500' : darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800 flex flex-col items-start gap-2">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">⚠️</span>
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

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
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
                  : <><span>Send OTP</span><ChevronRight size={18} /></>
                }
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-4 text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Enter 6-digit OTP
                </label>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      autoFocus={i === 0}
                      className={`w-11 h-12 text-center text-lg font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition
                        ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.join('').length < 6}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-red-500/20"
              >
                {loading
                  ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  : 'Verify & Sign In'
                }
              </button>

              {/* Resend OTP */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className={`text-sm flex items-center gap-1 mx-auto transition ${
                    resendCooldown > 0 || loading
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-red-500 hover:text-red-600'
                  }`}
                >
                  <RefreshCw size={14} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError(''); }}
                className="w-full text-sm text-red-500 hover:text-red-600 transition"
              >
                ← Change email
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
