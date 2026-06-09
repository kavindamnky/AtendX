// src/pages/admin/EmployeesPage.jsx
import React, { useState, useEffect } from 'react';
import { Search, Filter, UserPlus, MoreVertical, CheckCircle, XCircle, Edit, Trash2, QrCode, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

const DEFAULT_DEPARTMENTS = [
  'SALON MOONLIGHT',
  'LUMEO CREATIONS',
  'MALSHAN HOLDINGS',
  'MALSHAN RENT A CAR',
  'NINDUWARA AUTO SERVICE',
  'ONE SEVEN RENT A CAR'
];

export default function EmployeesPage() {
  const { darkMode } = useApp();
  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [qrModal, setQrModal] = useState(null);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    let res = employees;
    if (search) res = res.filter(e => e.full_name.toLowerCase().includes(search.toLowerCase()) || e.mobile.includes(search) || e.email?.toLowerCase().includes(search.toLowerCase()) || e.employee_id?.includes(search));
    if (deptFilter) res = res.filter(e => e.department === deptFilter);
    setFiltered(res);
  }, [search, deptFilter, employees]);

  async function loadData() {
    const [empRes, deptRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('departments').select('*'),
    ]);
    setEmployees(empRes.data || []);
    setFiltered(empRes.data || []);
    
    if (deptRes.data && deptRes.data.length > 0) {
      setDepartments(deptRes.data);
    } else {
      setDepartments(DEFAULT_DEPARTMENTS.map((name, index) => ({ id: index.toString(), name })));
    }
    
    setLoading(false);
  }

  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await supabase.from('profiles').update({ status: newStatus }).eq('id', id);
    loadData();
  }

  async function showQR(employee) {
    setQrModal(employee);
    const data = JSON.stringify({ employee_id: employee.id, name: employee.full_name, department: employee.department, employee_code: employee.employee_id });
    const url = await QRCode.toDataURL(data, { width: 256, margin: 2 });
    setQrUrl(url);
  }

  function downloadQR(employee) {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `${employee.employee_id || employee.full_name}-qr.png`;
    a.click();
  }

  const card = `rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`;
  const roleBadge = role => ({
    admin: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    hr: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    employee: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }[role] || '');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{employees.length} total employees</p>
        </div>
      </div>

      {/* Filters */}
      <div className={`${card} p-4`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, mobile, or ID…"
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition
                ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 placeholder-gray-400'}`}
            />
          </div>
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className={`px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition appearance-none
              ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Employee table / cards */}
      <div className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" /></div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-500 border-b border-gray-800' : 'text-gray-400 border-b border-gray-100'}`}>
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-50'}`}>
                  {filtered.map(emp => (
                    <tr key={emp.id} className={`hover:${darkMode ? 'bg-gray-800' : 'bg-gray-50'} transition`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {emp.profile_photo_url ? (
                            <img src={emp.profile_photo_url} alt={emp.full_name} className="w-9 h-9 rounded-xl object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-sm font-bold">
                              {emp.full_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{emp.full_name}</p>
                            <p className={`text-xs font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{emp.employee_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm">{emp.department}</td>
                      <td className="px-5 py-4 text-sm">
                        <div className="font-medium">{emp.email}</div>
                        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{emp.mobile}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${roleBadge(emp.role)}`}>{emp.role}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium
                          ${emp.status === 'active' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => showQR(emp)} title="Show QR"
                            className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                            <QrCode size={15} />
                          </button>
                          <button onClick={() => toggleStatus(emp.id, emp.status)} title="Toggle status"
                            className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                            {emp.status === 'active' ? <XCircle size={15} className="text-red-500" /> : <CheckCircle size={15} className="text-green-500" />}
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
                      {emp.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{emp.full_name}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{emp.department} • {emp.email || emp.mobile}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => showQR(emp)} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                      <QrCode size={16} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className={`text-center py-10 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No employees found</div>
            )}
          </>
        )}
      </div>

      {/* QR Modal */}
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
                <button onClick={() => downloadQR(qrModal)}
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
