// src/pages/EmployeeQRCheckPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, CheckCircle, ArrowLeft, LogIn, LogOut, Loader2, Building2, User, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';

export default function EmployeeQRCheckPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, profile, company: appCompany, loading: appLoading } = useApp();

  const [company, setCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyNotFound, setCompanyNotFound] = useState(false);

  const [todayRecord, setTodayRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successState, setSuccessState] = useState(null); // 'in' | 'out' | null
  const [time, setTime] = useState(new Date());

  const today = format(new Date(), 'yyyy-MM-dd');

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch company details
  useEffect(() => {
    fetchCompany();
  }, [slug]);

  // Load attendance record if logged in and profile is available
  useEffect(() => {
    if (user && profile && company && profile.company_id === company.id) {
      loadTodayRecord();
    } else {
      setLoadingRecord(false);
    }
  }, [user, profile, company]);

  async function fetchCompany() {
    setCompanyLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, logo_url, slug, is_onboarded')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) {
      setCompanyNotFound(true);
    } else {
      setCompany(data);
    }
    setCompanyLoading(false);
  }

  async function loadTodayRecord() {
    setLoadingRecord(true);
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('company_id', company.id)
      .eq('employee_id', profile.id)
      .eq('date', today)
      .maybeSingle();

    setTodayRecord(data);
    setLoadingRecord(false);
  }

  // Handle Check In/Out
  async function handleCheckAction(actionType) {
    if (!profile || !company) return;
    setActionLoading(true);
    const now = new Date().toISOString();

    if (actionType === 'in') {
      const isLate = new Date().getHours() > 9;
      const status = isLate ? 'late' : 'present';

      let err;
      if (todayRecord) {
        const { error } = await supabase
          .from('attendance')
          .update({ check_in: now, status })
          .eq('id', todayRecord.id);
        err = error;
      } else {
        const { error } = await supabase
          .from('attendance')
          .insert({
            company_id: company.id,
            employee_id: profile.id,
            date: today,
            check_in: now,
            status,
          });
        err = error;
      }

      if (!err) {
        setSuccessState('in');
        await loadTodayRecord();
      }
    } else {
      // Check Out
      if (!todayRecord) return;
      const checkInTime = todayRecord.check_in ? new Date(todayRecord.check_in) : null;
      const hours = checkInTime ? parseFloat(((new Date() - checkInTime) / (1000 * 60 * 60)).toFixed(2)) : null;

      const { error } = await supabase
        .from('attendance')
        .update({
          check_out: now,
          work_hours: hours,
        })
        .eq('id', todayRecord.id);

      if (!error) {
        setSuccessState('out');
        await loadTodayRecord();
      }
    }
    setActionLoading(false);
    // Reset success animation state after 4 seconds
    setTimeout(() => setSuccessState(null), 4000);
  }

  // Render spinner when initial app loading or company details loading
  if (appLoading || companyLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-red-500 w-10 h-10 mb-4" />
        <span className="text-gray-400 text-sm">Verifying QR location…</span>
      </div>
    );
  }

  // 1. Company not found
  if (companyNotFound) {
    return (
      <div className="min-h-screen hero-bg flex flex-col items-center justify-center px-4">
        <div className="hero-grid fixed inset-0 opacity-20 pointer-events-none" />
        <div className="glass rounded-3xl p-10 max-w-sm w-full text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-red-900/40 border border-red-800 flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Invalid QR Code</h1>
          <p className="text-gray-400 text-sm mb-6">
            This QR code does not match any registered business workspace on AtendX.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-sm font-medium transition">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // 2. Not logged in -> Redirect to login page with callback param
  if (!user) {
    const nextUrl = `/company/${slug}/check`;
    return (
      <div className="min-h-screen hero-bg flex flex-col items-center justify-center px-4">
        <div className="hero-grid fixed inset-0 opacity-20 pointer-events-none" />
        <div className="glass rounded-3xl p-8 max-w-sm w-full text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <Building2 size={32} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">{company.name}</h1>
          <p className="text-gray-400 text-sm mb-6">
            Welcome to the attendance portal. Please sign in to verify your identity before checking in/out.
          </p>
          <button
            onClick={() => navigate(`/company/${slug}/login?next=${encodeURIComponent(nextUrl)}`)}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
          >
            Sign In to Check In/Out
          </button>
        </div>
      </div>
    );
  }

  // 3. User logged in but does not belong to this company
  if (profile && profile.company_id !== company.id) {
    return (
      <div className="min-h-screen hero-bg flex flex-col items-center justify-center px-4">
        <div className="hero-grid fixed inset-0 opacity-20 pointer-events-none" />
        <div className="glass rounded-3xl p-8 max-w-sm w-full text-center relative z-10 border border-red-900/40">
          <div className="w-16 h-16 rounded-2xl bg-red-900/40 border border-red-800 flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 text-sm mb-6">
            Your profile is registered with <strong className="text-gray-200">{appCompany?.name || 'another company'}</strong>. You cannot record attendance for <strong>{company.name}</strong>.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-xl text-sm transition"
          >
            Go to My Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 3b. Profile not found
  if (!profile) {
    return (
      <div className="min-h-screen hero-bg flex flex-col items-center justify-center px-4">
        <div className="hero-grid fixed inset-0 opacity-20 pointer-events-none" />
        <div className="glass rounded-3xl p-8 max-w-sm w-full text-center relative z-10 border border-red-900/40">
          <div className="w-16 h-16 rounded-2xl bg-red-900/40 border border-red-800 flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Profile Not Found</h1>
          <p className="text-gray-400 text-sm mb-6">
            No employee profile was found matching your account email ({user.email}). Please contact your HR manager.
          </p>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate(`/company/${slug}/login`); }}
            className="w-full py-3 bg-red-650 hover:bg-red-750 text-white font-bold rounded-xl text-sm transition"
          >
            Sign Out & Try Again
          </button>
        </div>
      </div>
    );
  }

  // 4. Checking in/out loading state
  if (loadingRecord) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-red-500 w-10 h-10 mb-4" />
        <span className="text-gray-400 text-sm">Loading today's status…</span>
      </div>
    );
  }

  const isCheckedIn = todayRecord?.check_in && !todayRecord?.check_out;
  const isCheckedOut = !!todayRecord?.check_out;

  return (
    <div className="min-h-screen hero-bg flex flex-col items-center justify-center px-4 py-8 relative">
      <div className="hero-grid fixed inset-0 opacity-30 pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Company Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex justify-center mb-4">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-16 h-16 rounded-2xl object-cover ring-4 ring-red-950/40 shadow-xl"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center ring-4 ring-red-950/40 shadow-xl shadow-red-500/20">
                <Building2 size={28} className="text-white" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">{company.name}</h1>
          <p className="text-sm text-red-400 mt-1 font-medium tracking-wide">QR Check-In Station</p>
        </div>

        {/* Success animation card overlay */}
        {successState ? (
          <div className="glass rounded-3xl p-8 text-center border border-green-500/30 shadow-2xl shadow-green-500/10">
            <div className="w-20 h-20 bg-green-950/40 border border-green-800 rounded-full flex items-center justify-center mx-auto mb-6 pulse-badge">
              <CheckCircle size={40} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">
              {successState === 'in' ? 'Check In Success!' : 'Check Out Success!'}
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Hi <strong>{profile?.full_name}</strong>, your attendance has been recorded successfully.
            </p>
            <div className="py-3 px-4 rounded-xl bg-gray-800/80 border border-gray-700 text-sm font-semibold text-gray-200 inline-block">
              {format(new Date(), 'hh:mm:ss a')}
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full mt-8 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-xl text-sm transition"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          /* Main Action Card */
          <div className="glass rounded-3xl p-8 relative overflow-hidden">
            {/* Live Clock Header */}
            <div className="text-center mb-6">
              <div className="text-sm font-semibold text-gray-500 tracking-wider uppercase">Live Office Time</div>
              <div className="text-4xl font-black text-white mt-1 font-mono tracking-tight">
                {format(time, 'hh:mm:ss')}
                <span className="text-lg font-bold text-red-500 ml-1.5">{format(time, 'a')}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">{format(time, 'EEEE, MMMM d, yyyy')}</div>
            </div>

            <div className="border-t border-gray-800 my-6" />

            {/* Profile greeting */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-900/60 border border-gray-800 mb-6">
              {profile?.profile_photo_url ? (
                <img src={profile.profile_photo_url} alt="Avatar" className="w-12 h-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shrink-0 text-white font-bold text-lg">
                  {profile?.full_name?.charAt(0) || '?'}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-xs text-gray-500">Logged in as</span>
                <div className="font-bold text-sm text-white truncate">{profile?.full_name}</div>
                <div className="text-xs text-gray-400 truncate">{profile?.department || 'Staff'}</div>
              </div>
            </div>

            {/* Status Info */}
            <div className="grid grid-cols-2 gap-3 mb-8 text-center">
              <div className="p-3 rounded-xl bg-gray-900/40 border border-gray-800/80">
                <span className="text-xs text-gray-500 block mb-0.5">Check-In</span>
                <span className="font-semibold text-sm text-green-400">
                  {todayRecord?.check_in ? format(new Date(todayRecord.check_in), 'hh:mm a') : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-900/40 border border-gray-800/80">
                <span className="text-xs text-gray-500 block mb-0.5">Check-Out</span>
                <span className="font-semibold text-sm text-blue-400">
                  {todayRecord?.check_out ? format(new Date(todayRecord.check_out), 'hh:mm a') : '—'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {isCheckedOut ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={24} className="text-gray-500" />
                </div>
                <h3 className="font-bold text-white">Shift Completed Today</h3>
                <p className="text-xs text-gray-500 mt-1">
                  You have already checked in and out for today. Today's hours: <strong>{todayRecord.work_hours}h</strong>
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full mt-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-xl text-sm transition"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {!isCheckedIn ? (
                  <button
                    onClick={() => handleCheckAction('in')}
                    disabled={actionLoading}
                    className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-2xl transition shadow-lg shadow-green-500/10 flex items-center justify-center gap-2 group text-base"
                  >
                    {actionLoading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <LogIn size={18} className="group-hover:translate-x-0.5 transition-transform" />
                        Check In Now
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckAction('out')}
                    disabled={actionLoading}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-2xl transition shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 group text-base"
                  >
                    {actionLoading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
                        Check Out Now
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-300 font-medium transition text-center"
                >
                  Cancel and open app dashboard
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer Brand */}
        <div className="text-center mt-8 text-xs text-gray-600">
          Powered by <strong className="text-gray-500">AtendX HR SaaS</strong>
        </div>
      </div>
    </div>
  );
}
