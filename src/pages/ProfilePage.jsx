// src/pages/ProfilePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Download, Edit3, Save, X, QrCode, Hash, Phone, Mail, Building, User, Calendar, Shield } from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

const DEFAULT_DEPARTMENTS = [
  'SALON MOONLIGHT',
  'LUMEO CREATIONS',
  'MALSHAN HOLDINGS',
  'MALSHAN RENT A CAR',
  'NINDUWARA AUTO SERVICE',
  'ONE SEVEN RENT A CAR'
];

export default function ProfilePage() {
  const { profile, setProfile, darkMode } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState([]);
  const qrCanvasRef = useRef(null);

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
    supabase.from('departments').select('*').then(({ data }) => {
      if (data && data.length > 0) {
        setDepartments(data);
      } else {
        setDepartments(DEFAULT_DEPARTMENTS.map((name, index) => ({ id: index.toString(), name })));
      }
    });
  }, [profile]);

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
    try {
      let photoUrl = profile.profile_photo_url;

      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const fileName = `profiles/${profile.id}.${ext}`;
        await supabase.storage.from('profile-photos').upload(fileName, photoFile, { upsert: true });
        const { data } = supabase.storage.from('profile-photos').getPublicUrl(fileName);
        photoUrl = data.publicUrl;
      }

      const { data: updated } = await supabase
        .from('profiles')
        .update({ ...form, profile_photo_url: photoUrl })
        .eq('id', profile.id)
        .select()
        .single();

      if (updated) setProfile(updated);
      setEditing(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) { console.error(err); }
    setSaving(false);
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
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
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manage your account & QR code</p>
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
            </div>
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
    </div>
  );
}
