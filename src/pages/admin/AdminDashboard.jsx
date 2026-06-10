// src/pages/admin/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';
import { Users, UserCheck, Calendar, UtensilsCrossed, TrendingUp, AlertTriangle, CheckCircle, Download, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { downloadRows } from '../../lib/download';

export default function AdminDashboard() {
  const { darkMode } = useApp();
  const [stats, setStats] = useState({ totalEmp: 0, presentToday: 0, onLeave: 0, mealOrders: 0 });
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [leaveStats, setLeaveStats] = useState([]);
  const [mealStats, setMealStats] = useState([]);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAdminData(); }, []);

  async function loadAdminData() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [empRes, attTodayRes, leaveRes, mealTodayRes, attMonthRes, deptRes, leavePendingRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, department, status').eq('status', 'active'),
      supabase.from('attendance').select('id, status').eq('date', today),
      supabase.from('leaves').select('id, status').eq('status', 'approved').gte('start_date', today).lte('end_date', today),
      supabase.from('meal_orders').select('id').eq('order_date', today),
      supabase.from('attendance').select('date, status').gte('date', monthStart).lte('date', monthEnd),
      supabase.from('profiles').select('department').eq('status', 'active'),
      supabase.from('leaves').select('*, profiles!employee_id(full_name, department)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
    ]);

    setAllEmployees(empRes.data || []);

    setStats({
      totalEmp: empRes.data?.length || 0,
      presentToday: attTodayRes.data?.filter(a => ['present', 'late'].includes(a.status)).length || 0,
      onLeave: leaveRes.data?.length || 0,
      mealOrders: mealTodayRes.data?.length || 0,
    });

    // Attendance trend (last 14 days)
    const trend = [];
    for (let i = 13; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayRecs = (attMonthRes.data || []).filter(r => r.date === d);
      trend.push({
        date: format(subDays(new Date(), i), 'MMM d'),
        present: dayRecs.filter(r => r.status === 'present').length,
        late: dayRecs.filter(r => r.status === 'late').length,
        absent: dayRecs.filter(r => r.status === 'absent').length,
      });
    }
    setAttendanceTrend(trend);

    // Department breakdown
    const deptMap = {};
    (deptRes.data || []).forEach(e => {
      deptMap[e.department] = (deptMap[e.department] || 0) + 1;
    });
    setDeptData(Object.entries(deptMap).map(([name, value]) => ({ name, value })));

    // Leave type stats
    const leaveAll = await supabase.from('leaves').select('leave_type, status').gte('created_at', monthStart);
    const leaveMap = {};
    (leaveAll.data || []).forEach(l => { leaveMap[l.leave_type] = (leaveMap[l.leave_type] || 0) + 1; });
    setLeaveStats(Object.entries(leaveMap).map(([name, value]) => ({ name, value })));

    // Meal stats
    const mealAll = await supabase.from('meal_orders').select('meal_type').eq('order_date', today);
    const mealMap = { breakfast: 0, lunch: 0, dinner: 0 };
    (mealAll.data || []).forEach(m => { mealMap[m.meal_type] = (mealMap[m.meal_type] || 0) + 1; });
    setMealStats(Object.entries(mealMap).map(([name, value]) => ({ name, value })));

    setRecentLeaves(leavePendingRes.data || []);
    setLoading(false);
  }

  const card = `rounded-2xl p-5 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`;
  const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
  const tooltipStyle = { background: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: 12, fontSize: 12 };
  const axisStyle = { fontSize: 11, fill: darkMode ? '#6b7280' : '#9ca3af' };

  const StatCard = ({ icon: Icon, label, value, subtext, color }) => (
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

  function getSummaryRows() {
    return [
      ['Section', 'Name', 'Value'],
      ['KPI', 'Total Employees', stats.totalEmp],
      ['KPI', 'Present Today', stats.presentToday],
      ['KPI', 'On Leave Today', stats.onLeave],
      ['KPI', 'Meal Orders Today', stats.mealOrders],
      ...attendanceTrend.map(row => ['Attendance Trend', row.date, `Present: ${row.present}, Late: ${row.late}, Absent: ${row.absent}`]),
      ...deptData.map(row => ['Staff by Department', row.name, row.value]),
      ...leaveStats.map(row => ['Leave Types This Month', row.name, row.value]),
      ...mealStats.map(row => ['Meal Orders Today', row.name, row.value]),
      ...recentLeaves.map(row => [
        'Pending Leave',
        row.profiles?.full_name || 'Unknown',
        `${row.leave_type} leave, ${row.start_date} to ${row.end_date}, ${row.days_count} days`,
      ]),
    ];
  }

  function downloadSummary(formatType) {
    const rows = getSummaryRows();
    const fileDate = format(new Date(), 'yyyy-MM-dd');
    downloadRows(rows, `admin-summary-${fileDate}`, formatType);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{format(new Date(), 'EEEE, MMMM d yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => downloadSummary('csv')}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
              darkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Download size={16} />
            CSV
          </button>
          <button
            type="button"
            onClick={() => downloadSummary('excel')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Employees" value={stats.totalEmp} subtext="Active" color="bg-blue-500" />
        <StatCard icon={UserCheck} label="Present Today" value={stats.presentToday} subtext={`${Math.round((stats.presentToday / stats.totalEmp) * 100) || 0}% attendance`} color="bg-green-500" />
        <StatCard icon={Calendar} label="On Leave" value={stats.onLeave} subtext="Today" color="bg-amber-500" />
        <StatCard icon={UtensilsCrossed} label="Meal Orders" value={stats.mealOrders} subtext="Today" color="bg-red-500" />
      </div>

      {/* Attendance trend */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Attendance Trend (14 days)</h2>
          <TrendingUp size={16} className="text-red-500" />
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={attendanceTrend} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f3f4f6'} />
            <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="present" fill="#22c55e" radius={[4,4,0,0]} name="Present" />
            <Bar dataKey="late" fill="#f59e0b" radius={[4,4,0,0]} name="Late" />
            <Bar dataKey="absent" fill="#ef4444" radius={[4,4,0,0]} name="Absent" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Department distribution */}
        <div className={card}>
          <h2 className="font-semibold mb-4">Staff by Department</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={deptData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {deptData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leave breakdown */}
        <div className={card}>
          <h2 className="font-semibold mb-4">Leave Types (This Month)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={leaveStats} layout="vertical">
              <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={axisStyle} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#ef4444" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Meal orders today */}
        <div className={card}>
          <h2 className="font-semibold mb-4">Meal Orders Today</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={mealStats} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                <Cell fill="#f97316" />
                <Cell fill="#ef4444" />
                <Cell fill="#8b5cf6" />
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-around mt-2">
            {mealStats.map((m, i) => (
              <div key={m.name} className="text-center">
                <p className="text-lg font-bold">{m.value}</p>
                <p className={`text-xs capitalize ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{m.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending leaves */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Pending Leave Approvals
          </h2>
          <span className="text-xs text-red-500 font-medium">{recentLeaves.length} pending</span>
        </div>
        {recentLeaves.length === 0 ? (
          <div className={`text-center py-6 text-sm flex items-center justify-center gap-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <CheckCircle size={16} className="text-green-500" /> All caught up!
          </div>
        ) : (
          <div className="space-y-3">
            {recentLeaves.map(l => {
              const coveringPerson = l.covering_person_id ? allEmployees.find(e => e.id === l.covering_person_id) : null;
              return (
                <div key={l.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div>
                    <p className="font-medium text-sm">{l.profiles?.full_name}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {l.leave_type} • {l.start_date} – {l.end_date} • {l.days_count} days
                    </p>
                    {coveringPerson && (
                      <p className="text-xs text-red-500 dark:text-red-400 font-semibold mt-0.5">
                        Covering: {coveringPerson.full_name}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <LeaveAction id={l.id} action="approved" onDone={loadAdminData} darkMode={darkMode} />
                    <LeaveAction id={l.id} action="rejected" onDone={loadAdminData} darkMode={darkMode} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function LeaveAction({ id, action, onDone, darkMode }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    await supabase.from('leaves').update({ status: action, approved_at: new Date().toISOString() }).eq('id', id);
    onDone();
    setLoading(false);
  }
  return (
    <button onClick={handle} disabled={loading}
      className={`px-3 py-1 rounded-lg text-xs font-medium transition disabled:opacity-50
        ${action === 'approved' ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' :
          'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'}`}>
      {loading ? '…' : action === 'approved' ? 'Approve' : 'Reject'}
    </button>
  );
}
