// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Clock, Calendar, UtensilsCrossed, TrendingUp, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

export default function DashboardPage() {
  const { profile, darkMode } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, totalDays: 0 });
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [weekData, setWeekData] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [recentMeals, setRecentMeals] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) loadDashboard();
  }, [profile]);

  async function loadDashboard() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [attRes, todayRes, balanceRes, mealsRes, annRes] = await Promise.all([
      supabase.from('attendance').select('*').eq('employee_id', profile.id)
        .gte('date', monthStart).lte('date', monthEnd),
      supabase.from('attendance').select('*').eq('employee_id', profile.id).eq('date', today).single(),
      supabase.from('leave_balance').select('*').eq('employee_id', profile.id)
        .eq('year', new Date().getFullYear()).single(),
      supabase.from('meal_orders').select('*').eq('employee_id', profile.id)
        .order('created_at', { ascending: false }).limit(3),
      supabase.from('announcements').select('*').eq('is_active', true)
        .order('created_at', { ascending: false }).limit(3),
    ]);

    const records = attRes.data || [];
    setStats({
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      totalDays: records.length,
    });
    setTodayAttendance(todayRes.data);
    setLeaveBalance(balanceRes.data);
    setRecentMeals(mealsRes.data || []);
    setAnnouncements(annRes.data || []);

    // Build weekly chart data
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    setWeekData(days.map((day, i) => ({
      day,
      hours: Math.random() * 4 + 5, // replace with real data
    })));

    setLoading(false);
  }

  const card = `rounded-2xl p-5 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`;

  const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
    <div className={card}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtext && <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{subtext}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );

  const pieData = [
    { name: 'Present', value: stats.present, color: '#22c55e' },
    { name: 'Late', value: stats.late, color: '#f59e0b' },
    { name: 'Absent', value: stats.absent, color: '#ef4444' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Today status banner */}
      <div className={`rounded-2xl p-5 flex items-center justify-between
        ${todayAttendance?.check_in && !todayAttendance?.check_out
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
        <div className="flex items-center gap-3">
          {todayAttendance?.check_in ? (
            <CheckCircle size={24} className="text-green-500" />
          ) : (
            <AlertCircle size={24} className="text-red-500" />
          )}
          <div>
            <div className="font-semibold text-sm">
              {todayAttendance?.check_in ? 'You are checked in' : "You haven't checked in yet"}
            </div>
            {todayAttendance?.check_in && (
              <div className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                In: {format(new Date(todayAttendance.check_in), 'hh:mm a')}
                {todayAttendance?.check_out && ` • Out: ${format(new Date(todayAttendance.check_out), 'hh:mm a')}`}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate('/attendance')}
          className={`flex items-center gap-1 text-sm font-medium px-4 py-2 rounded-xl transition
            ${todayAttendance?.check_in ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
        >
          {todayAttendance?.check_in && !todayAttendance?.check_out ? 'Check Out' : 'Check In'}
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle} label="Days Present" value={stats.present} color="bg-green-500" subtext="This month" />
        <StatCard icon={XCircle} label="Absences" value={stats.absent} color="bg-red-500" subtext="This month" />
        <StatCard icon={AlertCircle} label="Late Days" value={stats.late} color="bg-amber-500" subtext="This month" />
        <StatCard icon={Calendar} label="Leave Left" value={leaveBalance ? leaveBalance.annual_total - leaveBalance.annual_used : '—'} color="bg-blue-500" subtext="Annual days" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Work hours chart */}
        <div className={`${card} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Work Hours This Week</h2>
            <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>Weekly</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={weekData}>
              <defs>
                <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: darkMode ? '#9ca3af' : '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: darkMode ? '#9ca3af' : '#6b7280' }} axisLine={false} tickLine={false} domain={[0, 12]} />
              <Tooltip contentStyle={{ background: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="hours" stroke="#ef4444" strokeWidth={2} fill="url(#hoursGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance breakdown */}
        <div className={card}>
          <h2 className="font-semibold mb-4">Monthly Breakdown</h2>
          <div className="flex justify-center">
            <PieChart width={140} height={140}>
              <Pie data={pieData} cx={70} cy={70} innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-2 mt-3">
            {pieData.map(({ name, value, color }) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{name}</span>
                </div>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent meals */}
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Meal Orders</h2>
            <button onClick={() => navigate('/meals')} className="text-xs text-red-500 hover:text-red-600 font-medium">View all</button>
          </div>
          {recentMeals.length === 0 ? (
            <div className={`text-sm text-center py-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No recent orders</div>
          ) : (
            <div className="space-y-3">
              {recentMeals.map(m => (
                <div key={m.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <UtensilsCrossed size={14} className="text-orange-500" />
                    </div>
                    <div>
                      <div className="text-sm font-medium capitalize">{m.meal_type}</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{m.order_date}</div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize
                    ${m.status === 'delivered' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                      m.status === 'cancelled' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Announcements</h2>
            <TrendingUp size={16} className="text-red-500" />
          </div>
          {announcements.length === 0 ? (
            <div className={`text-sm text-center py-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No announcements</div>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="font-medium text-sm">{a.title}</div>
                  <div className={`text-xs mt-1 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{a.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
