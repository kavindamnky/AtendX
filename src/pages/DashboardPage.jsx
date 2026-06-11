// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, subDays, parseISO, startOfWeek, addDays } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  CheckCircle, XCircle, Clock, LogIn, LogOut, Download, FileSpreadsheet,
  Megaphone, UtensilsCrossed, TrendingUp, CalendarCheck, AlertTriangle,
  QrCode, X, Camera, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { downloadRows } from '../lib/download';
import { Html5Qrcode } from 'html5-qrcode';

const PIE_COLORS = { present: '#22c55e', late: '#f59e0b', absent: '#ff2b2b' };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardPage() {
  const { profile, company, darkMode } = useApp();

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [recentMeals, setRecentMeals] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  // QR scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scannerSuccess, setScannerSuccess] = useState(false);
  const [html5QrcodeInstance, setHtml5QrcodeInstance] = useState(null);

  // Stop scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrcodeInstance) {
        html5QrcodeInstance.stop().catch(() => {});
      }
    };
  }, [html5QrcodeInstance]);

  async function startScanner() {
    setShowScanner(true);
    setScannerError('');
    setScannerSuccess(false);

    setTimeout(async () => {
      try {
        const qrScanner = new Html5Qrcode('dashboard-qr-reader');
        setHtml5QrcodeInstance(qrScanner);
        await qrScanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            // Stop scanning immediately on match
            try {
              await qrScanner.stop();
            } catch {}
            
            // Validate the scanned URL path
            const expectedPath = `/company/${company.slug}/check`;
            if (decodedText.includes(expectedPath)) {
              setScannerSuccess(true);
              // Trigger check-in or check-out automatically!
              if (todayRecord?.check_in && !todayRecord?.check_out) {
                await handleCheckOut();
              } else if (!todayRecord?.check_in) {
                await handleCheckIn();
              }
              setTimeout(() => {
                setShowScanner(false);
                setScannerSuccess(false);
              }, 2000);
            } else {
              setScannerError('Invalid QR Code. Please scan your company\'s check-in QR code.');
            }
          },
          () => {}
        );
      } catch (err) {
        console.error('QR scanner error:', err);
        setScannerError('Failed to access camera. Please check permissions.');
      }
    }, 100);
  }

  async function stopScanner() {
    if (html5QrcodeInstance) {
      try {
        await html5QrcodeInstance.stop();
      } catch {}
      setHtml5QrcodeInstance(null);
    }
    setShowScanner(false);
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    if (!profile || !company) return;
    setLoading(true);

    const [attRes, leaveRes, mealsRes, announcementsRes] = await Promise.all([
      supabase
        .from('attendance')
        .select('*')
        .eq('company_id', company.id)
        .eq('employee_id', profile.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: false }),

      supabase
        .from('leave_balance')
        .select('*')
        .eq('company_id', company.id)
        .eq('employee_id', profile.id)
        .eq('year', new Date().getFullYear())
        .maybeSingle(),

      supabase
        .from('meal_orders')
        .select('*')
        .eq('company_id', company.id)
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(3),

      supabase
        .from('announcements')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    const records = attRes.data || [];
    setAttendanceRecords(records);
    setTodayRecord(records.find(r => r.date === today) || null);
    setLeaveBalance(leaveRes.data);
    setRecentMeals(mealsRes.data || []);
    setAnnouncements(announcementsRes.data || []);
    setLoading(false);
  }, [profile, company, today, monthStart, monthEnd]);

  useEffect(() => {
    if (profile && company) loadData();
  }, [profile, company, loadData]);

  // ── Check-in / Check-out ──────────────────────────────────────────────────
  async function handleCheckIn() {
    if (!profile || !company) return;
    setCheckingIn(true);
    const now = new Date().toISOString();
    const status = new Date().getHours() > 9 ? 'late' : 'present';

    if (todayRecord) {
      await supabase.from('attendance').update({ check_in: now, status }).eq('id', todayRecord.id);
    } else {
      await supabase.from('attendance').insert({
        company_id: company.id,
        employee_id: profile.id,
        date: today,
        check_in: now,
        status,
      });
    }
    await loadData();
    setCheckingIn(false);
  }

  async function handleCheckOut() {
    if (!todayRecord) return;
    setCheckingIn(true);
    const now = new Date().toISOString();
    const checkIn = todayRecord.check_in ? new Date(todayRecord.check_in) : null;
    const hours = checkIn ? parseFloat(((new Date() - checkIn) / (1000 * 60 * 60)).toFixed(2)) : null;
    await supabase.from('attendance').update({
      check_out: now,
      work_hours: hours,
    }).eq('id', todayRecord.id);
    await loadData();
    setCheckingIn(false);
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const daysPresent = attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length;
  const absences = attendanceRecords.filter(r => r.status === 'absent').length;
  const lateDays = attendanceRecords.filter(r => r.status === 'late').length;
  const leaveLeft = leaveBalance ? (leaveBalance.annual_total - leaveBalance.annual_used) : '—';

  // ── Weekly hours chart data ──────────────────────────────────────────────
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const dayStr = format(day, 'yyyy-MM-dd');
    const rec = attendanceRecords.find(r => r.date === dayStr);
    return {
      name: format(day, 'EEE'),
      hours: rec?.work_hours || 0,
    };
  });

  // ── Monthly pie data ─────────────────────────────────────────────────────
  const pieData = [
    { name: 'Present', value: daysPresent - lateDays },
    { name: 'Late', value: lateDays },
    { name: 'Absent', value: absences },
  ].filter(d => d.value > 0);

  // ── Download ─────────────────────────────────────────────────────────────
  function handleDownload(fmt) {
    const rows = [
      ['Date', 'Status', 'Check In', 'Check Out', 'Work Hours'],
      ...attendanceRecords.map(r => [
        r.date,
        r.status,
        r.check_in ? format(new Date(r.check_in), 'hh:mm a') : '',
        r.check_out ? format(new Date(r.check_out), 'hh:mm a') : '',
        r.work_hours ?? '',
      ]),
    ];
    downloadRows(rows, `attendance-${today}`, fmt);
  }

  // ── Style helpers ────────────────────────────────────────────────────────
  const card = `rounded-2xl p-5 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`;

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()},{' '}
            <span className="gradient-text">{firstName}</span> 👋
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')} &bull; {company?.name}
          </p>
        </div>
        {/* Download buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownload('csv')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={() => handleDownload('excel')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>
      </div>

      {/* Today Status Banner */}
      <div className={`rounded-2xl p-5 border ${
        todayRecord?.check_in && !todayRecord?.check_out
          ? 'bg-green-950/40 border-green-800'
          : todayRecord?.check_out
          ? 'bg-gray-900 border-gray-800'
          : darkMode
          ? 'bg-gray-900 border-gray-800'
          : 'bg-white border-gray-100 shadow-sm'
      }`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Status icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              todayRecord?.check_in && !todayRecord?.check_out
                ? 'bg-green-900/40'
                : todayRecord?.check_out
                ? 'bg-blue-900/30'
                : 'bg-gray-800'
            }`}>
              {todayRecord?.check_in && !todayRecord?.check_out ? (
                <CheckCircle size={24} className="text-green-400" />
              ) : todayRecord?.check_out ? (
                <LogOut size={24} className="text-blue-400" />
              ) : (
                <Clock size={24} className="text-gray-500" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">
                {todayRecord?.check_in && !todayRecord?.check_out
                  ? 'Currently Checked In'
                  : todayRecord?.check_out
                  ? 'Day Complete'
                  : 'Not Checked In Yet'}
              </p>
              <div className="flex items-center gap-3 mt-1">
                {todayRecord?.check_in && (
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    In: <span className="font-medium text-green-400">
                      {format(new Date(todayRecord.check_in), 'hh:mm a')}
                    </span>
                  </span>
                )}
                {todayRecord?.check_out && (
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Out: <span className="font-medium text-blue-400">
                      {format(new Date(todayRecord.check_out), 'hh:mm a')}
                    </span>
                  </span>
                )}
                {todayRecord?.work_hours && (
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    · <span className="font-medium">{todayRecord.work_hours}h</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Action button */}
          {!todayRecord?.check_out && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => startScanner()}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-md border ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200' 
                    : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-700 shadow-sm'
                }`}
              >
                <QrCode size={16} className="text-red-500" />
                Scan QR Code
              </button>
              <button
                onClick={todayRecord?.check_in ? handleCheckOut : handleCheckIn}
                disabled={checkingIn}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg disabled:opacity-50 ${
                  todayRecord?.check_in
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-500/20'
                }`}
              >
                {checkingIn ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : todayRecord?.check_in ? (
                  <><LogOut size={16} /> Check Out</>
                ) : (
                  <><LogIn size={16} /> Check In</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Days Present"
          value={daysPresent}
          icon={CalendarCheck}
          iconClass="text-green-500"
          iconBg="bg-green-100 dark:bg-green-900/30"
          darkMode={darkMode}
        />
        <StatCard
          label="Absences"
          value={absences}
          icon={XCircle}
          iconClass="text-red-500"
          iconBg="bg-red-100 dark:bg-red-900/30"
          darkMode={darkMode}
        />
        <StatCard
          label="Late Days"
          value={lateDays}
          icon={AlertTriangle}
          iconClass="text-amber-500"
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          darkMode={darkMode}
        />
        <StatCard
          label="Leave Left"
          value={leaveLeft}
          icon={TrendingUp}
          iconClass="text-blue-500"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          darkMode={darkMode}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly hours area chart */}
        <div className={`${card} lg:col-span-2`}>
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-red-500" />
            This Week's Work Hours
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff2b2b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff2b2b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1f2937' : '#f3f4f6'} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: darkMode ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: darkMode ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: darkMode ? '#111827' : '#fff',
                  border: darkMode ? '1px solid #1f2937' : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  color: darkMode ? '#f3f4f6' : '#111',
                  fontSize: 12,
                }}
                formatter={v => [`${v}h`, 'Work Hours']}
              />
              <Area type="monotone" dataKey="hours" stroke="#ff2b2b" strokeWidth={2} fill="url(#hoursGradient)" dot={{ r: 4, fill: '#ff2b2b', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly breakdown pie */}
        <div className={card}>
          <h2 className="font-semibold mb-4">Monthly Breakdown</h2>
          {pieData.length === 0 ? (
            <div className={`flex items-center justify-center h-48 text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              No data this month
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={PIE_COLORS[entry.name.toLowerCase()] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: darkMode ? '#111827' : '#fff',
                    border: darkMode ? '1px solid #1f2937' : '1px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom row: meals + announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Meal Orders */}
        <div className={card}>
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <UtensilsCrossed size={16} className="text-red-500" />
            Recent Meal Orders
          </h2>
          {recentMeals.length === 0 ? (
            <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              No meal orders yet
            </div>
          ) : (
            <div className="space-y-2">
              {recentMeals.map(order => (
                <div key={order.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div>
                    <p className="text-sm font-medium capitalize">{order.meal_type}</p>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{order.order_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-500">${order.total_price}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${mealStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className={card}>
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Megaphone size={16} className="text-red-500" />
            Announcements
          </h2>
          {announcements.length === 0 ? (
            <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              No announcements
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map(ann => (
                <div key={ann.id} className={`p-3 rounded-xl border-l-2 border-red-500 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <p className="text-sm font-semibold">{ann.title}</p>
                  <p className={`text-xs mt-1 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{ann.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
          <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Camera size={18} className="text-red-500 animate-pulse" />
                Scan Office QR Code
              </h3>
              <button
                onClick={stopScanner}
                className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {scannerSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-950/40 border border-green-800 rounded-full flex items-center justify-center mx-auto mb-4 pulse-badge">
                    <CheckCircle size={32} className="text-green-400" />
                  </div>
                  <h4 className="font-bold text-white text-lg">Check-in Verified!</h4>
                  <p className="text-xs text-gray-400 mt-1">Recording your attendance details…</p>
                </div>
              ) : (
                <>
                  <div id="dashboard-qr-reader" className="overflow-hidden rounded-2xl border border-gray-800 shadow-inner" />
                  <p className="text-xs text-center text-gray-500 leading-relaxed">
                    Point your camera at the printed AtendX Check-In QR code in your office to log your hours.
                  </p>
                </>
              )}

              {scannerError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-400 text-xs">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>{scannerError}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, iconClass, iconBg, darkMode }) {
  return (
    <div className={`rounded-2xl p-5 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon size={20} className={iconClass} />
        </div>
      </div>
      <p className={`text-xs font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
      <p className="text-3xl font-bold stat-number mt-1">{value}</p>
    </div>
  );
}

function mealStatusBadge(status) {
  const map = {
    ordered: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    preparing: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    ready: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
}
