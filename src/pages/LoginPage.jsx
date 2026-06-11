import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
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

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // ── Google sign-in ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setError('');
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
      // Redirect handled by AuthCallbackPage
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setLoadingGoogle(false);
    }
  };

  // ── Magic link ──────────────────────────────────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();
    if (!trimmed) { setError('Please enter your email address.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) { setError('Please enter a valid email address.'); return; }

    setLoadingEmail(true);
    try {
      await signInWithEmail(trimmed, '/auth/callback');
      setEmailSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send magic link. Please try again.');
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-500/6 rounded-full blur-3xl" />
      </div>

      {/* Logo — top left */}
      <div className="relative z-10 p-6">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <img src="/logo.png" className="w-8 h-8 rounded-lg object-cover shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-shadow" alt="AtendX Logo" />
          <span className="text-white font-bold text-lg tracking-tight">AtendX</span>
        </Link>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">

          {/* Card */}
          <div className="glass rounded-2xl p-8 border border-white/8 shadow-2xl">

            {/* Header */}
            <div className="text-center mb-8">
              <img src="/logo.png" className="w-14 h-14 mx-auto mb-4 rounded-2xl object-cover shadow-xl shadow-red-500/20" alt="AtendX Logo" />
              <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
              <p className="text-sm text-gray-400">Sign in to your HR workspace</p>
            </div>

            {/* ── Email sent state ─────────────────────────────────────────── */}
            {emailSent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                  We've sent a magic link to{' '}
                  <span className="text-white font-medium">{email}</span>.
                  Click the link to sign in instantly.
                </p>
                <p className="text-xs text-gray-600 mb-6">
                  Didn't get it? Check your spam folder or try again.
                </p>
                <button
                  onClick={() => { setEmailSent(false); setEmail(''); }}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors underline underline-offset-4"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                {/* ── Google button ──────────────────────────────────────── */}
                <button
                  onClick={handleGoogle}
                  disabled={loadingGoogle || loadingEmail}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-sm px-4 py-3 rounded-xl transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mb-4"
                >
                  {loadingGoogle ? (
                    <Loader2 size={18} className="animate-spin text-gray-500" />
                  ) : (
                    <GoogleIcon size={18} />
                  )}
                  {loadingGoogle ? 'Connecting...' : 'Continue with Google'}
                </button>

                {/* ── Divider ────────────────────────────────────────────── */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-xs text-gray-600">or continue with email</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>

                {/* ── Error ──────────────────────────────────────────────── */}
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 mb-4">
                    <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                {/* ── Email form ─────────────────────────────────────────── */}
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      Email address
                    </label>
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

                  <button
                    type="submit"
                    disabled={loadingEmail || loadingGoogle}
                    className="w-full btn-gradient flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl text-sm shadow-lg shadow-red-500/15 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingEmail ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending magic link...
                      </>
                    ) : (
                      <>
                        Send Magic Link
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Footer links */}
          <div className="text-center mt-6 space-y-3">
            <p className="text-sm text-gray-600">
              New to AtendX?{' '}
              <Link to="/signup" className="text-red-400 hover:text-red-300 transition-colors font-medium">
                Start free →
              </Link>
            </p>
            <p className="text-xs text-gray-700">
              Employee?{' '}
              <Link to="/company/your-company/login" className="text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-4">
                Login here →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
