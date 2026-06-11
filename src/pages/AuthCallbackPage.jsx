import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// ─── LOADING SPINNER ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="relative w-12 h-12">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-2 border-red-500/20" />
      {/* Spinning arc */}
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500 animate-spin" />
      {/* Inner dot */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-red-500/20 to-transparent" />
    </div>
  );
}

// ─── AUTH CALLBACK PAGE ───────────────────────────────────────────────────────
export default function AuthCallbackPage() {
  const { user, company, loading } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (company?.is_onboarded) {
        const next = searchParams.get('next') || '/dashboard';
        navigate(next);
      } else {
        navigate('/onboarding');
      }
    }
  }, [loading, user, company, navigate, searchParams]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-2xl shadow-red-500/30">
          <span className="text-3xl font-black text-white">A</span>
        </div>

        {/* Spinner */}
        <div className="mb-6">
          <Spinner />
        </div>

        {/* Text */}
        <h2 className="text-xl font-bold text-white mb-2">Signing you in…</h2>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
          Verifying your credentials and setting up your workspace. This will only take a moment.
        </p>

        {/* Animated dots */}
        <div className="flex items-center gap-1.5 mt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-red-500/60 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      {/* Brand bottom */}
      <div className="fixed bottom-6 left-0 right-0 flex items-center justify-center gap-2 opacity-30">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
          <span className="text-white font-black text-[10px]">A</span>
        </div>
        <span className="text-gray-400 text-xs font-medium">AtendX</span>
      </div>
    </div>
  );
}
