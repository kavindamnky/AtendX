// src/pages/LeavesPage.jsx
import React, { useState, useEffect } from 'react';
import { format, differenceInBusinessDays, parseISO } from 'date-fns';
import { Plus, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

const LEAVE_TYPES = ['annual', 'sick', 'emergency', 'maternity', 'paternity', 'unpaid'];
const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function LeavesPage() {
  const { profile, company, darkMode } = useApp();
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
    covering_person_id: '',
  });

  useEffect(() => {
    if (profile && company) loadData();
  }, [profile, company]);

  async function loadData() {
    const [leavesRes, balRes, empRes] = await Promise.all([
      supabase
        .from('leaves')
        .select('*')
        .eq('company_id', company.id)
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('leave_balance')
        .select('*')
        .eq('company_id', company.id)
        .eq('employee_id', profile.id)
        .eq('year', new Date().getFullYear())
        .single(),

      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('company_id', company.id)
        .eq('status', 'active'),
    ]);

    setLeaves(leavesRes.data || []);
    setBalance(balRes.data);
    // Exclude current logged-in user so they can't cover themselves
    setActiveEmployees((empRes.data || []).filter(e => e.id !== profile.id));
    setLoading(false);
  }

  function calcDays() {
    if (!form.start_date || !form.end_date) return 0;
    try {
      return Math.max(1, differenceInBusinessDays(parseISO(form.end_date), parseISO(form.start_date)) + 1);
    } catch { return 0; }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const days = calcDays();

    // Check balance
    if (form.leave_type === 'annual' && balance && (balance.annual_total - balance.annual_used) < days) {
      setError('Insufficient annual leave balance');
      setSubmitting(false);
      return;
    }

    const payload = {
      company_id: company.id,
      employee_id: profile.id,
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason,
      days_count: days,
    };

    if (form.covering_person_id) {
      payload.covering_person_id = form.covering_person_id;
    }

    const { error: err } = await supabase.from('leaves').insert(payload);

    if (err) {
      // Fallback if database doesn't have covering_person_id column yet
      if (err.code === '42703' || err.message?.toLowerCase().includes('covering_person_id') || err.message?.toLowerCase().includes('column')) {
        const coveringPersonObj = activeEmployees.find(e => e.id === form.covering_person_id);
        const fallbackReason = form.covering_person_id && coveringPersonObj
          ? `${form.reason} (Covering Person: ${coveringPersonObj.full_name})`
          : form.reason;

        const fallbackPayload = {
          company_id: company.id,
          employee_id: profile.id,
          leave_type: form.leave_type,
          start_date: form.start_date,
          end_date: form.end_date,
          reason: fallbackReason,
          days_count: days,
        };

        const { error: fallbackErr } = await supabase.from('leaves').insert(fallbackPayload);
        if (fallbackErr) {
          setError(fallbackErr.message);
        } else {
          setShowForm(false);
          setForm({ leave_type: 'annual', start_date: '', end_date: '', reason: '', covering_person_id: '' });
          loadData();
        }
      } else {
        setError(err.message);
      }
    } else {
      setShowForm(false);
      setForm({ leave_type: 'annual', start_date: '', end_date: '', reason: '', covering_person_id: '' });
      loadData();
    }
    setSubmitting(false);
  }

  async function cancelLeave(id) {
    await supabase.from('leaves').update({ status: 'cancelled' }).eq('id', id).eq('company_id', company.id);
    loadData();
  }

  const card = `rounded-2xl p-5 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`;
  const inputClass = `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition
    ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Requests</h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Apply and track your leaves</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-red-500/20"
        >
          <Plus size={18} />
          Apply Leave
        </button>
      </div>

      {/* Balance cards */}
      {balance && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <BalanceCard label="Annual" total={balance.annual_total} used={balance.annual_used} color="blue" darkMode={darkMode} />
          <BalanceCard label="Sick" total={balance.sick_total} used={balance.sick_used} color="amber" darkMode={darkMode} />
          <div className={`${card} col-span-2 lg:col-span-1 flex items-center gap-3`}>
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Calendar size={18} className="text-purple-500" />
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending</p>
              <p className="text-2xl font-bold">{leaves.filter(l => l.status === 'pending').length}</p>
            </div>
          </div>
          <div className={`${card} flex items-center gap-3`}>
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-500" />
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Approved</p>
              <p className="text-2xl font-bold">{leaves.filter(l => l.status === 'approved').length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Apply form */}
      {showForm && (
        <div className={card}>
          <h2 className="font-semibold mb-4">New Leave Request</h2>
          {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Leave Type</label>
                <select value={form.leave_type} onChange={e => setForm(p => ({ ...p, leave_type: e.target.value }))} className={`${inputClass} appearance-none`}>
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className={`p-3 rounded-xl text-sm text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Duration</p>
                <p className="text-2xl font-bold text-red-500">{calcDays()}</p>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>business days</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Start Date</label>
                <input type="date" value={form.start_date} min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required className={inputClass} />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>End Date</label>
                <input type="date" value={form.end_date} min={form.start_date || format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} required className={inputClass} />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Covering Person</label>
              <select
                value={form.covering_person_id}
                onChange={e => setForm(p => ({ ...p, covering_person_id: e.target.value }))}
                className={`${inputClass} appearance-none`}
              >
                <option value="">Select Covering Employee (Optional)</option>
                {activeEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Reason</label>
              <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                rows={3} placeholder="Briefly describe the reason for your leave…" required
                className={`${inputClass} resize-none`} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition">
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leave history */}
      <div className={card}>
        <h2 className="font-semibold mb-4">Leave History</h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" /></div>
        ) : leaves.length === 0 ? (
          <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No leave requests</div>
        ) : (
          <div className="space-y-3">
            {leaves.map(l => {
              const coveringPerson = activeEmployees.find(e => e.id === l.covering_person_id);
              return (
                <div key={l.id} className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm capitalize">{l.leave_type} Leave</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[l.status]}`}>{l.status}</span>
                      </div>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {format(parseISO(l.start_date), 'MMM d')} – {format(parseISO(l.end_date), 'MMM d, yyyy')} • {l.days_count} day{l.days_count !== 1 ? 's' : ''}
                      </p>
                      {coveringPerson && (
                        <p className="text-xs mt-1 font-semibold text-red-600 dark:text-red-400">
                          Covering: {coveringPerson.full_name}
                        </p>
                      )}
                      <p className={`text-xs mt-1.5 line-clamp-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{l.reason}</p>
                    </div>
                    {l.status === 'pending' && (
                      <button onClick={() => cancelLeave(l.id)} className="text-xs text-red-500 hover:text-red-600 font-medium shrink-0">Cancel</button>
                    )}
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

function BalanceCard({ label, total, used, color, darkMode }) {
  const remaining = total - used;
  const pct = total > 0 ? (used / total) * 100 : 0;
  const colorMap = {
    blue: { bar: 'bg-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-500' },
    amber: { bar: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-500' },
  };
  const c = colorMap[color];
  return (
    <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label} Leave</p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text} font-medium`}>{remaining} left</span>
      </div>
      <p className="text-2xl font-bold">{remaining}<span className={`text-sm font-normal ml-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>/ {total}</span></p>
      <div className={`h-1.5 rounded-full mt-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <div className={`h-1.5 rounded-full ${c.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
