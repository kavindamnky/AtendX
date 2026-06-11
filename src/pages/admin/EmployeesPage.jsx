// src/pages/admin/EmployeesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, UserPlus, CheckCircle, XCircle, Edit, Trash2,
  QrCode, Download, X, AlertTriangle, Plus, Building2, Zap,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

const DEFAULT_DEPT_NAMES = [
  'Human Resources', 'Engineering', 'Sales',
  'Marketing', 'Finance', 'Operations',
];

const ROLES = ['employee', 'hr', 'admin'];

function genEmployeeId(deptName) {
  const prefix = (deptName || 'EMP')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
  const num = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}${num}`;
}

export default function EmployeesPage() {
  const { darkMode, company, planConfig } = useApp();

  const [employees,   setEmployees]   = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');

  // Modals
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editTarget,      setEditTarget]      = useState(null);
  const [deleteTarget,    setDeleteTarget]    = useState(null);

  // QR
  const [qrModal, setQrModal] = useState(null);
  const [qrUrl,   setQrUrl]   = useState('');

  // Add form
  const blankForm = { full_name: '', email: '', mobile: '', national_id: '', department: '', role: 'employee', employee_id: '' };
  const [form, setForm] = useState(blankForm);

  // Dept management
  const [newDeptName, setNewDeptName] = useState('');
  const [deptSaving,  setDeptSaving]  = useState(false);

  const empLimit = planConfig?.employees ?? 5;
  const atLimit  = employees.length >= empLimit;

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    const [empRes, deptRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('company_id', company.id).order('full_name'),
      supabase.from('departments').select('*').eq('company_id', company.id).order('name'),
    ]);
    const emps  = empRes.data  || [];
    const depts = deptRes.data || [];
    setEmployees(emps);
    setFiltered(emps);

    // Seed default departments if none exist
    if (depts.length === 0) {
      const seeds = DEFAULT_DEPT_NAMES.map(name => ({ company_id: company.id, name }));
      const { data: inserted } = await supabase.from('departments').insert(seeds).select();
      setDepartments(inserted || seeds.map((d, i) => ({ ...d, id: String(i) })));
    } else {
      setDepartments(depts);
    }
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Search filter ──────────────────────────────────────────────────────────
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? employees.filter(e =>
            e.full_name?.toLowerCase().includes(q) ||
            e.email?.toLowerCase().includes(q) ||
            e.mobile?.includes(q) ||
            e.employee_id?.toLowerCase().includes(q)
          )
        : employees
    );
  }, [search, employees]);

  // ── Add employee ──────────────────────────────────────────────────────────
  async function handleAdd(e) {
    e.preventDefault();
    if (!form.full_name || !form.email) { setError('Full name and email are required.'); return; }
    if (atLimit) { setError('Plan employee limit reached. Please upgrade.'); return; }
    setSaving(true); setError('');

    const empId = form.employee_id || genEmployeeId(form.department);
    const { data: newEmp, error: insertErr } = await supabase
      .from('profiles')
      .insert({
        company_id:  company.id,
        email:       form.email,
        full_name:   form.full_name,
        mobile:      form.mobile,
        national_id: form.national_id,
        department:  form.department,
        role:        form.role,
        employee_id: empId,
        status:      'active',
        // auth_user_id stays NULL until employee logs in
      })
      .select()
      .single();

    if (insertErr) { setError(insertErr.message); setSaving(false); return; }

    // Seed leave_balance for the new employee
    await supabase.from('leave_balance').insert({
      company_id:   company.id,
      employee_id:  newEmp.id,
      year:         new Date().getFullYear(),
      annual_total: 14,
      annual_used:  0,
      sick_total:   7,
      sick_used:    0,
    });

    setSuccess(`Employee ${form.full_name} added successfully.`);
    setForm(blankForm);
    setShowAddModal(false);
    loadData();
    setSaving(false);
    setTimeout(() => setSuccess(''), 4000);
  }

  // ── Edit employee ──────────────────────────────────────────────────────────
  function openEdit(emp) {
    setEditTarget({ ...emp });
    setShowEditModal(true);
    setError('');
  }

  async function handleEdit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        full_name:   editTarget.full_name,
        email:       editTarget.email,
        mobile:      editTarget.mobile,
        national_id: editTarget.national_id,
        department:  editTarget.department,
        role:        editTarget.role,
        employee_id: editTarget.employee_id,
      })
      .eq('id', editTarget.id)
      .eq('company_id', company.id);

    if (updateErr) { setError(updateErr.message); setSaving(false); return; }
    setSuccess('Employee updated.');
    setShowEditModal(false);
    loadData();
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  }

  // ── Toggle status ──────────────────────────────────────────────────────────
  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await supabase.from('profiles').update({ status: newStatus }).eq('id', id).eq('company_id', company.id);
    loadData();
  }

  // ── Delete employee ────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from('profiles').delete().eq('id', deleteTarget.id).eq('company_id', company.id);
    setDeleteTarget(null);
    setShowDeleteModal(false);
    loadData();
  }

  // ── QR ────────────────────────────────────────────────────────────────────
  async function showQR(emp) {
    setQrModal(emp);
    const data = JSON.stringify({
      employee_id: emp.id,
      name:        emp.full_name,
      department:  emp.department,
      code:        emp.employee_id,
    });
    const url = await QRCode.toDataURL(data, { width: 256, margin: 2 });
    setQrUrl(url);
  }

  function downloadQR() {
    if (!qrUrl || !qrModal) return;
    const a = document.createElement('a');
    a.href     = qrUrl;
    a.download = `${qrModal.employee_id || qrModal.full_name}-qr.png`;
    a.click();
  }

  // ── Department CRUD ────────────────────────────────────────────────────────
  async function addDept(e) {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setDeptSaving(true);
    await supabase.from('departments').insert({ company_id: company.id, name: newDeptName.trim() });
    setNewDeptName('');
    loadData();
    setDeptSaving(false);
  }

  async function deleteDept(id) {
    await supabase.from('departments').delete().eq('id', id).eq('company_id', company.id);
    loadData();
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const card        = `rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`;
  const inputClass  = `w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition
    ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 placeholder-gray-400'}`;
  const labelClass  = `block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`;
  const roleBadge   = role => ({
    admin:    'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    hr:       'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    employee: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }[role] || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {employees.length} / {empLimit === Infinity ? '∞' : empLimit} employees
          </p>
        </div>

        {atLimit ? (
          <Link
            to="/admin/billing"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition"
          >
            <Zap size={16} /> Upgrade to Add More
          </Link>
        ) : (
          <button
            onClick={() => { setForm(blankForm); setError(''); setShowAddModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition"
          >
            <UserPlus size={16} /> Add Employee
          </button>
        )}
      </div>

      {/* Toast */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Search */}
      <div className={`${card} p-4`}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, mobile, or employee ID…"
            className={inputClass.replace('w-full', 'w-full pl-9')}
          />
        </div>
      </div>

      {/* Employee Table */}
      <div className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-left text-xs font-semibold uppercase tracking-wider
                    ${darkMode ? 'text-gray-500 border-b border-gray-800' : 'text-gray-400 border-b border-gray-100'}`}>
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-50'}`}>
                  {filtered.map(emp => (
                    <tr key={emp.id} className={`transition ${darkMode ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50'}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {emp.profile_photo_url ? (
                            <img src={emp.profile_photo_url} alt={emp.full_name} className="w-9 h-9 rounded-xl object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-sm font-bold">
                              {emp.full_name?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{emp.full_name}</p>
                            <p className={`text-xs font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{emp.employee_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <div>{emp.email}</div>
                        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{emp.mobile}</div>
                      </td>
                      <td className="px-5 py-4 text-sm">{emp.department || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${roleBadge(emp.role)}`}>
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium
                          ${emp.status === 'active'
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => showQR(emp)} title="QR Code"
                            className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                            <QrCode size={15} />
                          </button>
                          <button onClick={() => openEdit(emp)} title="Edit"
                            className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                            <Edit size={15} />
                          </button>
                          <button onClick={() => toggleStatus(emp.id, emp.status)} title="Toggle Status"
                            className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                            {emp.status === 'active'
                              ? <XCircle size={15} className="text-red-500" />
                              : <CheckCircle size={15} className="text-green-500" />}
                          </button>
                          <button onClick={() => { setDeleteTarget(emp); setShowDeleteModal(true); }} title="Delete"
                            className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                            <Trash2 size={15} className="text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map(emp => (
                <div key={emp.id} className="flex items-center gap-3 p-4">
                  {emp.profile_photo_url ? (
                    <img src={emp.profile_photo_url} alt={emp.full_name} className="w-11 h-11 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold shrink-0">
                      {emp.full_name?.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{emp.full_name}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {emp.department} • {emp.email}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(emp)} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                      <Edit size={15} className="text-gray-400" />
                    </button>
                    <button onClick={() => showQR(emp)} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                      <QrCode size={15} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && !loading && (
              <div className={`text-center py-12 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                No employees found.
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Department Management ── */}
      <div className={`${card} p-5`}>
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Building2 size={16} className="text-red-500" /> Department Management
        </h2>
        <form onSubmit={addDept} className="flex gap-2 mb-4">
          <input
            value={newDeptName}
            onChange={e => setNewDeptName(e.target.value)}
            placeholder="New department name…"
            className={`${inputClass} flex-1`}
          />
          <button
            type="submit"
            disabled={deptSaving || !newDeptName.trim()}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <Plus size={15} /> Add
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {departments.map(d => (
            <div key={d.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm
                ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
              {d.name}
              <button onClick={() => deleteDept(d.id)}
                className="text-gray-400 hover:text-red-500 transition ml-1">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Add Employee Modal ── */}
      {showAddModal && (
        <Modal title="Add Employee" onClose={() => setShowAddModal(false)} darkMode={darkMode}>
          <form onSubmit={handleAdd} className="space-y-4">
            {error && <ErrorBanner msg={error} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className={inputClass} placeholder="Jane Doe" required />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="jane@example.com" required />
              </div>
              <div>
                <label className={labelClass}>Mobile</label>
                <input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} className={inputClass} placeholder="+94 77 123 4567" />
              </div>
              <div>
                <label className={labelClass}>National ID</label>
                <input value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} className={inputClass} placeholder="Optional" />
              </div>
              <div>
                <label className={labelClass}>Department</label>
                <select
                  value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value, employee_id: genEmployeeId(e.target.value) }))}
                  className={inputClass}
                >
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputClass}>
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Employee ID (auto-generated)</label>
                <input
                  value={form.employee_id}
                  onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. ENG1234"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60">
                {saving ? 'Adding…' : 'Add Employee'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Employee Modal ── */}
      {showEditModal && editTarget && (
        <Modal title="Edit Employee" onClose={() => setShowEditModal(false)} darkMode={darkMode}>
          <form onSubmit={handleEdit} className="space-y-4">
            {error && <ErrorBanner msg={error} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full Name</label>
                <input value={editTarget.full_name} onChange={e => setEditTarget(t => ({ ...t, full_name: e.target.value }))} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={editTarget.email || ''} onChange={e => setEditTarget(t => ({ ...t, email: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Mobile</label>
                <input value={editTarget.mobile || ''} onChange={e => setEditTarget(t => ({ ...t, mobile: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>National ID</label>
                <input value={editTarget.national_id || ''} onChange={e => setEditTarget(t => ({ ...t, national_id: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Department</label>
                <select value={editTarget.department || ''} onChange={e => setEditTarget(t => ({ ...t, department: e.target.value }))} className={inputClass}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <select value={editTarget.role} onChange={e => setEditTarget(t => ({ ...t, role: e.target.value }))} className={inputClass}>
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Employee ID</label>
                <input value={editTarget.employee_id || ''} onChange={e => setEditTarget(t => ({ ...t, employee_id: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowEditModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && deleteTarget && (
        <Modal title="Delete Employee" onClose={() => setShowDeleteModal(false)} darkMode={darkMode}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={20} className="text-red-500 shrink-0" />
              <p className="text-sm">
                Are you sure you want to delete <strong>{deleteTarget.full_name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
                Cancel
              </button>
              <button type="button" onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition">
                Yes, Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── QR Modal ── */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className={`w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}>
            <div className="bg-gradient-to-br from-red-500 to-red-700 px-6 py-5 text-center">
              <h3 className="text-lg font-bold text-white">{qrModal.full_name}</h3>
              <p className="text-white/70 text-sm">{qrModal.employee_id}</p>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              {qrUrl ? (
                <div className="p-3 bg-white rounded-2xl shadow-inner">
                  <img src={qrUrl} alt="QR" className="w-48 h-48" />
                </div>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
                </div>
              )}
              <div className="flex gap-3 w-full">
                <button onClick={() => { setQrModal(null); setQrUrl(''); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  Close
                </button>
                <button onClick={downloadQR}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition">
                  <Download size={15} /> Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared helper components ─────────────────────────────────────────────────
function Modal({ title, onClose, darkMode, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6 overflow-auto">
      <div className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <h2 className="font-bold text-base">{title}</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
      <AlertTriangle size={15} className="shrink-0" /> {msg}
    </div>
  );
}
