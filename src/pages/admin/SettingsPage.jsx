// src/pages/admin/SettingsPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Save, Upload, Copy, Check, Download, AlertTriangle,
  Globe, Building2, Trash2, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing',
  'Retail', 'Hospitality', 'Construction', 'Media', 'Legal', 'Other',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

export default function SettingsPage() {
  const { darkMode, company, setCompany, signOut } = useApp();
  const navigate = useNavigate();

  // Company form state
  const [name,     setName]     = useState(company?.name     || '');
  const [slug,     setSlug]     = useState(company?.slug     || '');
  const [industry, setIndustry] = useState(company?.industry || '');
  const [size,     setSize]     = useState(company?.size     || '');
  const [logoUrl,  setLogoUrl]  = useState(company?.logo_url || '');

  const [saving,       setSaving]       = useState(false);
  const [slugTaken,    setSlugTaken]    = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [saveError,    setSaveError]    = useState('');
  const [saveSuccess,  setSaveSuccess]  = useState(false);

  // Logo upload
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef(null);

  // URL copy
  const [copied, setCopied] = useState(false);

  // Delete company
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm,   setDeleteConfirm]   = useState('');
  const [deleting,        setDeleting]        = useState(false);

  const loginUrl = company?.slug
    ? `${window.location.origin}/company/${company.slug}/login`
    : '';

  const checkUrl = company?.slug
    ? `${window.location.origin}/company/${company.slug}/check`
    : '';

  // Check slug uniqueness (debounced)
  useEffect(() => {
    if (!slug || slug === company?.slug) { setSlugTaken(false); return; }
    setSlugChecking(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('companies')
        .select('id')
        .eq('slug', slug)
        .neq('id', company.id)
        .maybeSingle();
      setSlugTaken(!!data);
      setSlugChecking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [slug, company?.id, company?.slug]);

  // ── Logo upload ──────────────────────────────────────────────────────────
  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const path = `logos/${company.id}`;
    const { error: uploadErr } = await supabase.storage
      .from('company-assets')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) { setSaveError(uploadErr.message); setLogoUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage
      .from('company-assets')
      .getPublicUrl(path);

    setLogoUrl(publicUrl);
    setLogoUploading(false);
  }

  // ── Save company profile ──────────────────────────────────────────────────
  async function handleSave(e) {
    e.preventDefault();
    if (slugTaken) return;
    setSaving(true); setSaveError(''); setSaveSuccess(false);

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const { error } = await supabase
      .from('companies')
      .update({ name, slug: cleanSlug, industry, size, logo_url: logoUrl })
      .eq('id', company.id);

    if (error) { setSaveError(error.message); setSaving(false); return; }

    setCompany({ ...company, name, slug: cleanSlug, industry, size, logo_url: logoUrl });
    setSlug(cleanSlug);
    setSaveSuccess(true);
    setSaving(false);
    setTimeout(() => setSaveSuccess(false), 4000);
  }

  // ── Copy login URL ────────────────────────────────────────────────────────
  async function copyUrl() {
    await navigator.clipboard.writeText(loginUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Download QR ───────────────────────────────────────────────────────────
  function downloadQR() {
    const svg  = document.getElementById('company-qr-svg');
    if (!svg) return;
    const xml  = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${company.slug || 'company'}-attendance-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Delete company ────────────────────────────────────────────────────────
  async function handleDelete() {
    if (deleteConfirm !== company.name) return;
    setDeleting(true);
    await supabase.from('companies').delete().eq('id', company.id);
    await signOut();
    navigate('/');
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const card       = `rounded-2xl p-6 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`;
  const inputClass = `w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition
    ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 placeholder-gray-400'}`;
  const labelClass = `block text-xs font-semibold mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Manage your company profile and portal settings.
        </p>
      </div>

      {/* ── Company Profile ── */}
      <form onSubmit={handleSave}>
        <div className={card}>
          <h2 className="font-semibold text-base mb-5 flex items-center gap-2">
            <Building2 size={16} className="text-red-500" /> Company Profile
          </h2>

          {saveError && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertTriangle size={15} className="shrink-0" /> {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              ✓ Company profile saved successfully.
            </div>
          )}

          {/* Logo */}
          <div className="flex items-start gap-5 mb-6">
            <div className="shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-20 h-20 rounded-2xl object-cover border border-gray-200 dark:border-gray-700" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-3xl font-bold">
                  {name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Company Logo</p>
              <p className={`text-xs mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                PNG, JPG up to 2MB. Recommended: 128×128px.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-60
                  ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                <Upload size={15} />
                {logoUploading ? 'Uploading…' : 'Upload Logo'}
              </button>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className={labelClass}>Company Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputClass}
                placeholder="Acme Corp"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Company Slug</label>
              <div className="relative">
                <input
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  className={`${inputClass} ${slugTaken ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="acme-corp"
                  required
                />
                {slugChecking && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {slugTaken && (
                <p className="text-xs text-red-500 mt-1">This slug is already taken.</p>
              )}
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                Preview: <span className="font-mono text-red-500">{window.location.origin}/company/{slug || '…'}/login</span>
              </p>
            </div>

            <div>
              <label className={labelClass}>Industry</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)} className={inputClass}>
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Company Size</label>
              <select value={size} onChange={e => setSize(e.target.value)} className={inputClass}>
                <option value="">Select size</option>
                {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving || slugTaken || slugChecking}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
            >
              <Save size={15} />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

      {/* ── Employee Portal ── */}
      <div className={card}>
        <h2 className="font-semibold text-base mb-5 flex items-center gap-2">
          <Globe size={16} className="text-red-500" /> Employee Portal
        </h2>

        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Share this URL or QR code with your employees so they can log in.
        </p>

        {/* URL row */}
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 mb-6
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <span className="flex-1 text-sm font-mono truncate text-red-500">{loginUrl}</span>
          <button
            onClick={copyUrl}
            className={`shrink-0 p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
            title="Copy URL"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="p-4 bg-white rounded-2xl shadow-inner shrink-0">
            {checkUrl ? (
              <QRCodeSVG
                id="company-qr-svg"
                value={checkUrl}
                size={160}
                level="M"
                includeMargin={false}
              />
            ) : (
              <div className="w-40 h-40 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-xs">
                No URL
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-sm mb-1">Attendance Check-In QR Code</p>
            <p className={`text-xs mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Print this QR code and display it on a wall or screen. Employees scan it on their phones to check in and out instantly.
            </p>
            <button
              onClick={downloadQR}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition"
            >
              <Download size={15} /> Download QR (SVG)
            </button>
          </div>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className={`rounded-2xl p-6 border-2 border-red-500/30 ${darkMode ? 'bg-red-950/20' : 'bg-red-50'}`}>
        <h2 className="font-semibold text-base mb-2 text-red-500 flex items-center gap-2">
          <AlertTriangle size={16} /> Danger Zone
        </h2>
        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Deleting your company will permanently remove all data including employees, attendance records, leaves, and meal orders. This cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-red-500 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-500 hover:text-white transition"
        >
          <Trash2 size={15} /> Delete Company
        </button>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <h3 className="font-bold text-red-500">Delete Company</h3>
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}
                className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">
                  This will <strong>permanently delete</strong> your company and all associated data. You will be signed out immediately.
                </p>
              </div>
              <div>
                <label className={labelClass}>
                  Type <strong>{company?.name}</strong> to confirm:
                </label>
                <input
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  className={`${inputClass} ${deleteConfirm === company?.name ? 'border-red-500' : ''}`}
                  placeholder={company?.name}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteConfirm !== company?.name || deleting}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-40"
                >
                  {deleting ? 'Deleting…' : 'Delete Company'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
