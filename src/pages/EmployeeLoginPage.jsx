// src/pages/EmployeeLoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

export default function EmployeeLoginPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { signInWithEmail } = useApp();

  const [company, setCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyNotFound, setCompanyNotFound] = useState(false);

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompany();
  }, [slug]);

  async function fetchCompany() {
    setCompanyLoading(true);
    const { data, error: err } = await supabase
      .from('companies')
      .select('id, name, logo_url, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (err || !data) {
      setCompanyNotFound(true);
    } else {
      setCompany(data);
    }
    setCompanyLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    // Verify email exists in profiles for this company
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('company_id', company.id)
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (profileError || !profileData) {
      setError('No account found with this email. Contact your HR manager.');
      setSubmitting(false);
      return;
    }

    // Send sign-in link
    const nextParam = searchParams.get('next') || '';
    const redirectUrl = `/auth/callback?company=${slug}` + (nextParam ? `&next=${encodeURIComponent(nextParam)}` : '');
    const { error: signInError } = await signInWithEmail(
      email.trim().toLowerCase(),
      redirectUrl
    );

    if (signInError) {
      setError(signInError.message || 'Failed to send sign-in link. Please try again.');
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  }

  // Loading state
  if (companyLoading) {
    return (
      <div className="min-h-screen hero-bg flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Company not found
  if (companyNotFound) {
    return (
      <div className="min-h-screen hero-bg flex flex-col items-center justify-center px-4">
        <div className="hero-grid fixed inset-0 opacity-30 pointer-events-none" />
        <div className="glass rounded-3xl p-10 max-w-sm w-full text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-red-900/40 border border-red-800 flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Company Not Found</h1>
          <p className="text-gray-400 text-sm mb-6">
            The company <span className="font-mono text-red-400">"{slug}"</span> doesn't exist or the link is invalid.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-sm font-medium transition"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>
        <PoweredByFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-bg flex flex-col items-center justify-center px-4 py-12">
      <div className="hero-grid fixed inset-0 opacity-30 pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-8 transition group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to AtendX
        </Link>

        {/* Company branding card */}
        <div className="glass rounded-3xl p-8 mb-6 text-center">
          {/* Company logo / placeholder */}
          <div className="flex justify-center mb-4">
            {company.logo_url ? (
              <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-red-900/40 shadow-xl">
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center ring-4 ring-red-900/40 shadow-xl shadow-red-500/20">
                <Building2 size={36} className="text-white" />
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">{company.name}</h1>
          <p className="text-sm text-gray-400">Employee Portal</p>

          {/* Divider */}
          <div className="my-6 border-t border-gray-800" />

          {/* Form / Sent state */}
          {sent ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-green-900/30 border border-green-800 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                We've sent a sign-in link to<br />
                <span className="font-semibold text-gray-200">{email}</span>.<br />
                Click the link to log in.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="mt-6 text-sm text-red-400 hover:text-red-300 font-medium transition"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="text-left space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800/80 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-950/60 border border-red-800 text-red-400 text-sm">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !email}
                className="w-full py-3 btn-gradient text-white font-bold rounded-xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending link…
                  </>
                ) : (
                  'Send Sign-In Link'
                )}
              </button>

              <p className="text-xs text-gray-600 text-center leading-relaxed">
                Don't have an account?{' '}
                <span className="text-gray-500">Contact your HR manager to get access.</span>
              </p>
            </form>
          )}
        </div>

        <PoweredByFooter />
      </div>
    </div>
  );
}

function PoweredByFooter() {
  return (
    <div className="text-center mt-4">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition"
      >
        Powered by{' '}
        <span className="font-bold text-gray-500">AtendX</span>
      </Link>
    </div>
  );
}
