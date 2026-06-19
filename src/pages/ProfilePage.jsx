// src/pages/ProfilePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, Download, Edit3, Save, QrCode, Hash, Phone, Mail,
  Building, User, Calendar, Shield, Copy, Check, Link2, ExternalLink,
  Coins, FileText, Printer, AlertTriangle, Loader2
} from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { uploadProfilePhoto, validateProfilePhoto } from '../lib/profilePhotos';
import { format } from 'date-fns';

const DEFAULT_DEPARTMENTS = [
  'SALON MOONLIGHT',
  'LUMEO CREATIONS',
  'MALSHAN HOLDINGS',
  'MALSHAN RENT A CAR',
  'NINDUWARA AUTO SERVICE',
  'ONE SEVEN RENT A CAR',
];

export default function ProfilePage() {
  const { profile, setProfile, company, darkMode, planConfig, plan } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef(null);

  const [payslips, setPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [payslipLoading, setPayslipLoading] = useState(true);
  const [dbUpdatesNeeded, setDbUpdatesNeeded] = useState(false);

  useEffect(() => {
    if (!profile?.id || !company?.id) return;
    setPayslipLoading(true);
    supabase
      .from('employee_payslips')
      .select('*, payroll_runs(payroll_month)')
      .eq('employee_id', profile.id)
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) {
          if (err.code === '42P01') {
            setDbUpdatesNeeded(true);
          }
          console.error(err);
        } else {
          setPayslips(data || []);
        }
        setPayslipLoading(false);
      });
  }, [profile?.id, company?.id]);

  const loginUrl = company
    ? `${window.location.origin}/company/${company.slug}/login`
    : '';

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        national_id: profile.national_id || '',
        mobile: profile.mobile || '',
        email: profile.email || '',
        department: profile.department || '',
      });
      generateQR();
    }

    // Load departments scoped to company
    if (company) {
      supabase
        .from('departments')
        .select('*')
        .eq('company_id', company.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setDepartments(data);
          } else {
            setDepartments(DEFAULT_DEPARTMENTS.map((name, index) => ({ id: index.toString(), name })));
          }
        });
    } else {
      supabase.from('departments').select('*').then(({ data }) => {
        if (data && data.length > 0) {
          setDepartments(data);
        } else {
          setDepartments(DEFAULT_DEPARTMENTS.map((name, index) => ({ id: index.toString(), name })));
        }
      });
    }
  }, [profile, company]);

  async function generateQR() {
    if (!profile) return;
    const data = JSON.stringify({
      employee_id: profile.id,
      name: profile.full_name,
      department: profile.department,
      employee_code: profile.employee_id,
    });
    try {
      const url = await QRCode.toDataURL(data, { width: 256, margin: 2, color: { dark: '#1a1a1a', light: '#ffffff' } });
      setQrDataUrl(url);
    } catch (err) { console.error(err); }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      let photoUrl = profile.profile_photo_url;

      if (photoFile) {
        photoUrl = await uploadProfilePhoto(photoFile, profile.id);
      }

      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ ...form, profile_photo_url: photoUrl })
        .eq('id', profile.id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (updated) setProfile(updated);
      setEditing(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Profile photo upload failed. Please try again.');
    }
    setSaving(false);
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const validationError = validateProfilePhoto(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  }

  function downloadQR() {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${profile.employee_id || 'employee'}-qr.png`;
    a.click();
  }

  async function copyLoginUrl() {
    if (!loginUrl) return;
    try {
      await navigator.clipboard.writeText(loginUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  const card = `rounded-2xl p-5 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`;
  const inputClass = `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition
    ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`;

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 py-3">
      <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
        <p className="text-sm font-medium truncate">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manage your account &amp; QR code</p>
        </div>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition
            ${editing ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20' : darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          {saving ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> :
            editing ? <><Save size={16} /> Save</> : <><Edit3 size={16} /> Edit</>}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Profile card */}
      <div className={card}>
        <div className="flex items-start gap-5">
          {/* Photo */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-red-100 dark:ring-red-900/30">
              {(photoPreview || profile?.profile_photo_url) ? (
                <img src={photoPreview || profile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-3xl font-bold">
                  {profile?.full_name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            {editing && (
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                <Camera size={14} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            )}
          </div>

          {/* Name & role */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                className={`${inputClass} text-lg font-bold mb-2`}
                placeholder="Full Name"
              />
            ) : (
              <h2 className="text-xl font-bold">{profile?.full_name}</h2>
            )}
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize
                ${profile?.role === 'admin' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                  profile?.role === 'hr' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                {profile?.role}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${profile?.status === 'active' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600'}`}>
                {profile?.status}
              </span>
              {/* Company plan badge */}
              {plan && planConfig && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${planConfig.badge}`}>
                  {planConfig.label}
                </span>
              )}
            </div>
            {/* Company name */}
            {company && (
              <p className={`text-xs mt-1 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                🏢 {company.name}
              </p>
            )}
            <p className={`text-sm mt-1 font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{profile?.employee_id}</p>
          </div>
        </div>

        {/* Divider */}
        <div className={`my-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`} />

        {/* Info rows */}
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mobile</label>
                <input value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} className={inputClass} placeholder="Mobile" />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>National ID</label>
                <input value={form.national_id} onChange={e => setForm(p => ({ ...p, national_id: e.target.value }))} className={inputClass} placeholder="National ID" />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Email Address</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputClass} placeholder="Email Address" />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Department</label>
              <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} className={`${inputClass} appearance-none`}>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <button onClick={() => { setEditing(false); setPhotoFile(null); setPhotoPreview(null); }}
              className={`w-full py-2 rounded-xl text-sm transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
              Cancel
            </button>
          </div>
        ) : (
          <div className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-50'}`}>
            <InfoRow icon={Mail} label="Email" value={profile?.email} />
            <InfoRow icon={Phone} label="Mobile" value={profile?.mobile} />
            <InfoRow icon={Hash} label="National ID" value={profile?.national_id} />
            <InfoRow icon={Building} label="Department" value={profile?.department} />
            <InfoRow icon={Calendar} label="Join Date" value={profile?.join_date} />
            <InfoRow icon={Shield} label="Role" value={profile?.role} />
          </div>
        )}
      </div>

      {/* Employee Login URL card */}
      {company && (
        <div className={card}>
          <h2 className="font-semibold mb-1 flex items-center gap-2">
            <Link2 size={16} className="text-red-500" />
            Employee Login Portal
          </h2>
          <p className={`text-xs mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Share this URL with employees to log in to {company.name}
          </p>
          <div className={`flex items-center gap-2 p-3 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`flex-1 text-xs font-mono truncate ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {loginUrl}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={copyLoginUrl}
                title="Copy URL"
                className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-400" />}
              </button>
              <a
                href={loginUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
                className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              >
                <ExternalLink size={14} className="text-gray-400" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* QR Code card */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <QrCode size={18} className="text-red-500" />
            My QR Code
          </h2>
          <button
            onClick={downloadQR}
            disabled={!qrDataUrl}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium transition"
          >
            <Download size={16} />
            Download
          </button>
        </div>
        <div className="flex flex-col items-center">
          {qrDataUrl ? (
            <div className="p-4 bg-white rounded-2xl shadow-inner">
              <img src={qrDataUrl} alt="Employee QR Code" className="w-48 h-48" />
            </div>
          ) : (
            <div className={`w-48 h-48 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
            </div>
          )}
          <p className={`text-xs mt-3 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            This is your personal attendance QR code.<br />Show it when checking in or out.
          </p>
          <div className={`mt-3 px-4 py-2 rounded-xl text-sm font-mono ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
            {profile?.employee_id}
          </div>
        </div>
      </div>

      {/* Payslips Card */}
      <div className={card}>
        <h2 className="font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-400">
          <Coins size={16} className="text-red-500" />
          My Payslips
        </h2>
        
        {dbUpdatesNeeded ? (
          <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center gap-1.5">
            <AlertTriangle size={14} />
            <span>Payslip database tables are pending setup.</span>
          </div>
        ) : payslipLoading ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
          </div>
        ) : payslips.length === 0 ? (
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            No payslips issued yet for your profile.
          </p>
        ) : (
          <div className="space-y-2">
            {payslips.map(slip => {
              const monthLabel = slip.payroll_runs?.payroll_month
                ? format(new Date(slip.payroll_runs.payroll_month), 'MMMM yyyy')
                : format(new Date(slip.created_at), 'MMMM yyyy');
                
              return (
                <div 
                  key={slip.id} 
                  className={`flex justify-between items-center p-3 rounded-xl border text-sm ${
                    darkMode ? 'bg-gray-950/40 border-gray-800' : 'bg-gray-50 border-gray-200 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-white">{monthLabel}</div>
                    <span className="text-xs text-gray-500 font-mono">Net: LKR {slip.net_pay.toLocaleString()}</span>
                  </div>
                  
                  <button
                    onClick={() => setSelectedPayslip(slip)}
                    className="text-red-500 hover:text-red-400 text-xs font-semibold flex items-center gap-0.5"
                  >
                    <FileText size={14} />
                    View Slip
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Payslip Detail Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-gray-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl p-8 relative print:p-0 print:shadow-none print:rounded-none">
            {/* Close button */}
            <button
              onClick={() => setSelectedPayslip(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 print:hidden text-2xl font-bold font-sans"
            >
              &times;
            </button>
            
            {/* Print action header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 print:hidden">
              <span className="text-sm font-semibold text-gray-500">My Payslip Preview</span>
              <button
                onClick={() => window.print()}
                className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow animate-pulse"
              >
                <Printer size={16} />
                Print Payslip
              </button>
            </div>
            
            {/* Details */}
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-red-600">{company?.name || 'AtendX'}</h2>
                  <p className="text-xs text-gray-500 mt-1">HR & Attendance Platform Workspace</p>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-gray-800">PAYSLIP</h3>
                  <p className="text-sm text-gray-600 font-medium mt-1">
                    Month: {selectedPayslip.payroll_runs?.payroll_month
                      ? format(new Date(selectedPayslip.payroll_runs.payroll_month), 'MMMM yyyy')
                      : format(new Date(selectedPayslip.created_at), 'MMMM yyyy')}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-4 text-sm">
                <div>
                  <div className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Employee Details</div>
                  <div className="font-bold text-gray-800 mt-1">{profile?.full_name}</div>
                  <div className="text-gray-600 text-xs mt-0.5">ID: {profile?.employee_id || 'N/A'}</div>
                  <div className="text-gray-600 text-xs">Department: {profile?.department || 'N/A'}</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Slip Reference</div>
                  <div className="text-gray-700 mt-1">Slip ID: {selectedPayslip.id.slice(0, 8).toUpperCase()}</div>
                  <div className="text-gray-600 text-xs mt-0.5">Issued: {format(new Date(selectedPayslip.created_at), 'yyyy-MM-dd')}</div>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                {/* Earnings */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-1.5 uppercase text-xs tracking-wider">Earnings</h4>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Basic Salary</span>
                    <span className="font-semibold text-gray-800 font-mono">LKR {selectedPayslip.basic_salary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Allowances</span>
                    <span className="font-semibold text-gray-800 font-mono">LKR {selectedPayslip.allowances.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 font-bold">
                    <span className="text-gray-800">Gross Earnings</span>
                    <span className="font-mono">LKR {(selectedPayslip.basic_salary + selectedPayslip.allowances).toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Deductions */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-1.5 uppercase text-xs tracking-wider">Deductions</h4>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">EPF Employee (8%)</span>
                    <span className="font-semibold text-red-600 font-mono">LKR {selectedPayslip.epf_employee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">APIT (PAYE Tax)</span>
                    <span className="font-semibold text-red-600 font-mono">LKR {selectedPayslip.apit_tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Other Deductions</span>
                    <span className="font-semibold text-red-600 font-mono">LKR {selectedPayslip.deductions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 font-bold">
                    <span className="text-gray-800">Total Deductions</span>
                    <span className="text-red-600 font-mono">
                      LKR {(selectedPayslip.epf_employee + selectedPayslip.apit_tax + selectedPayslip.deductions).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Pay Box */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center text-emerald-800">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-emerald-600">Net Take Home Pay</span>
                  <p className="text-[10px] text-emerald-500 mt-0.5">Direct Deposit to registered Bank Account</p>
                </div>
                <span className="text-2xl font-bold font-mono">LKR {selectedPayslip.net_pay.toLocaleString()}</span>
              </div>
              
              {/* Employer Contributions */}
              <div className="border-t border-gray-100 pt-4 space-y-2 text-xs text-gray-500">
                <div className="font-bold uppercase tracking-wider text-gray-400 mb-1">Employer Statutory Contributions (Not Deducted)</div>
                <div className="flex justify-between">
                  <span>EPF Employer (12%)</span>
                  <span className="font-mono">LKR {selectedPayslip.epf_employer.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>ETF Employer (3%)</span>
                  <span className="font-mono">LKR {selectedPayslip.etf_employer.toLocaleString()}</span>
                </div>
              </div>
              
              {/* Footer */}
              <div className="text-center text-[10px] text-gray-400 pt-8 border-t border-gray-100">
                This is a system generated document and does not require a physical signature. AtendX Payroll Management System.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
