import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Loader2, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

// ─── GOOGLE ICON ──────────────────────────────────────────────────────────────
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
function StepIndicator() {
  const steps = ['Sign up', 'Set up company', 'Manage team'];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              index === 0
                ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-md shadow-red-500/30'
                : 'bg-white/8 text-gray-600 border border-white/10'
            }`}>
              {index === 0 ? '1' : index + 1}
            </div>
            <span className={`text-[9px] mt-1 font-medium whitespace-nowrap ${
              index === 0 ? 'text-red-400' : 'text-gray-600'
            }`}>
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="w-10 h-px bg-white/8 mb-3 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── SIGNUP PAGE ──────────────────────────────────────────────────────────────
export default function SignUpPage() {
  const navigate = useNavigate();
  const { signInWithGoogle, signUpWithPassword } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [verifyState, setVerifyState] = useState(false);

  // Password strength
  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500'];

  // ── Google ──────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setError('');
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setLoadingGoogle(false);
    }
  };

  // ── Email / password ────────────────────────────────────────────────────────
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) { setError('Please enter your email address.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) { setError('Please enter a valid email address.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters long.'); return; }

    setLoadingEmail(true);
    try {
      const data = await signUpWithPassword(trimmedEmail, password);
      if (data?.session) {
        navigate('/onboarding');
      } else {
        setVerifyState(true);
      }
    } catch (err) {
      setError(err.message || 'Sign-up failed. Please try again.');
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-red-500/6 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/3 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative z-10 p-6">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <img src="/logo.png" className="w-8 h-8 rounded-lg object-cover shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-shadow" alt="AtendX Logo" />
          <span className="text-white font-bold text-lg tracking-tight">AtendX</span>
        </Link>
      </div>

      {/* Main */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">

          {/* Card */}
          <div className="glass rounded-2xl p-8 border border-white/8 shadow-2xl">

            {/* Header */}
            <div className="text-center mb-6">
              <img src="/logo.png" className="w-14 h-14 mx-auto mb-4 rounded-2xl object-cover shadow-xl shadow-red-500/20" alt="AtendX Logo" />
              <h1 className="text-2xl font-bold text-white mb-1">Create your HR workspace</h1>
              <p className="text-sm text-gray-400">Get your team running in minutes</p>
            </div>

            {/* Step indicator */}
            <StepIndicator />

            {/* ── Verify state ──────────────────────────────────────────────── */}
            {verifyState ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Verify your email</h2>
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                  We sent a confirmation email to{' '}
                  <span className="text-white font-medium">{email}</span>.
                  <br />Click the link to verify and access your workspace.
                </p>
                <p className="text-xs text-gray-600 mb-6">
                  Didn't receive it? Check spam or try again.
                </p>
                <button
                  onClick={() => { setVerifyState(false); setEmail(''); setPassword(''); }}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors underline underline-offset-4"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                {/* ── Google button (recommended) ──────────────────────────── */}
                <div className="relative mb-4">
                  <button
                    onClick={handleGoogle}
                    disabled={loadingGoogle || loadingEmail}
                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-sm px-4 py-3 rounded-xl transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingGoogle ? (
                      <Loader2 size={18} className="animate-spin text-gray-500" />
                    ) : (
                      <GoogleIcon size={18} />
                    )}
                    {loadingGoogle ? 'Connecting...' : 'Continue with Google'}
                  </button>
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                    <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wide">Recommended</span>
                  </div>
                </div>

                {/* ── Divider ──────────────────────────────────────────────── */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-xs text-gray-600">or sign up with email</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>

                {/* ── Error ────────────────────────────────────────────────── */}
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 mb-4">
                    <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                {/* ── Email form ───────────────────────────────────────────── */}
                <form onSubmit={handleEmailSignup} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Email address</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        autoComplete="email"
                        className="w-full bg-white/5 border border-white/10 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder:text-gray-600 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        className="w-full bg-white/5 border border-white/10 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-white placeholder:text-gray-600 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {/* Password strength */}
                    {password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1.5">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all ${
                                passwordStrength >= i ? strengthColor[passwordStrength] : 'bg-white/8'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">{strengthLabel[passwordStrength] || 'Too short'}</span>
                          <div className="flex gap-3">
                            {[
                              { label: '8+ chars', ok: passwordChecks.length },
                              { label: 'Uppercase', ok: passwordChecks.upper },
                              { label: 'Number', ok: passwordChecks.number },
                            ].map(({ label, ok }) => (
                              <div key={label} className="flex items-center gap-1">
                                <Check size={9} className={ok ? 'text-emerald-400' : 'text-gray-700'} />
                                <span className={`text-[9px] ${ok ? 'text-emerald-400' : 'text-gray-700'}`}>{label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loadingEmail || loadingGoogle}
                    className="w-full btn-gradient flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl text-sm shadow-lg shadow-red-500/15 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingEmail ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create workspace
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-600 text-center leading-relaxed">
                    By signing up you agree to our{' '}
                    <a href="#" className="text-gray-400 hover:text-gray-200 underline underline-offset-2">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-gray-400 hover:text-gray-200 underline underline-offset-2">Privacy Policy</a>.
                  </p>
                </form>
              </>
            )}
          </div>

          {/* Footer link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-red-400 hover:text-red-300 transition-colors font-medium">
                Sign in →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
