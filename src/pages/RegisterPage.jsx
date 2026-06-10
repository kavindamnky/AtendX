// src/pages/RegisterPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Hash, Phone, Mail, Building, Camera, Upload, ArrowLeft, CheckCircle, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { uploadProfilePhoto, validateProfilePhoto } from '../lib/profilePhotos';

const DEFAULT_DEPARTMENTS = [
  'SALON MOONLIGHT',
  'LUMEO CREATIONS',
  'MALSHAN HOLDINGS',
  'MALSHAN RENT A CAR',
  'NINDUWARA AUTO SERVICE',
  'ONE SEVEN RENT A CAR'
];

export default function RegisterPage() {
  const { darkMode } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    full_name: '',
    national_id: '',
    mobile: '',
    email: '',
    department: '',
  });

  useEffect(() => {
    supabase.from('departments').select('*').then(({ data }) => {
      if (data && data.length > 0) {
        setDepartments(data);
      } else {
        setDepartments(DEFAULT_DEPARTMENTS.map((name, index) => ({ id: index.toString(), name })));
      }
    });
  }, []);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handlePhoto(e) {
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

  function generateEmployeeId() {
    const prefix = form.department.slice(0, 3).toUpperCase() || 'EMP';
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${num}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const mobile = form.mobile.replace(/\D/g, '');
    const email = form.email.trim().toLowerCase();
    const employeeId = generateEmployeeId();
    let photoUrl = null;

    try {
      // 1. Check for duplicate email in profiles
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        setError('An account with this email already exists. Please log in instead.');
        setLoading(false);
        return;
      }

      // 2. Upload profile photo if provided
      if (photoFile) {
        photoUrl = await uploadProfilePhoto(photoFile, `registration-${employeeId}`);
      }

      // 3. Insert profile into Supabase
      const { data: newRow, error: insertErr } = await supabase
        .from('profiles')
        .insert({
          full_name: form.full_name,
          national_id: form.national_id,
          mobile,
          email,
          department: form.department,
          role: 'employee',
          employee_id: employeeId,
          profile_photo_url: photoUrl,
          status: 'active',
          join_date: new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single();

      if (insertErr) {
        // Friendly error messages
        if (insertErr.code === '23505') {
          setError('An account with this email or National ID already exists.');
        } else if (insertErr.message?.includes('violates')) {
          setError('Please fill all required fields correctly.');
        } else {
          setError(insertErr.message || 'Registration failed. Please try again.');
        }
        setLoading(false);
        return;
      }

      // 4. Insert default leave balance
      if (newRow?.id) {
        await supabase.from('leave_balance').insert({
          employee_id: newRow.id,
          year: new Date().getFullYear(),
          annual_total: 21,
          annual_used: 0,
          sick_total: 14,
          sick_used: 0,
        });
      }

      setSuccess(true);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'A network error occurred. Please check your connection and try again.');
    }

    setLoading(false);
  }

  const inputClass = `w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition
    ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`;

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-6 ${darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className={`w-full max-w-md text-center p-8 rounded-2xl shadow-xl ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'}`}>
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircle size={42} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Registration Successful!</h2>
          <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Your account has been created. You can now sign in using your email address.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition shadow-lg shadow-red-500/20"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Registration form ───────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen py-8 px-6 ${darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate('/login')}
          className={`flex items-center gap-2 text-sm mb-6 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition`}
        >
          <ArrowLeft size={16} /> Back to Login
        </button>

        <div className={`rounded-2xl shadow-xl p-8 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'}`}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/30">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold">Create Account</h1>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fill in your details to register</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800 flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo Upload */}
            <div className="flex justify-center mb-6">
              <label className="relative cursor-pointer group">
                <div className={`w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed flex items-center justify-center transition
                  ${photoPreview ? 'border-red-500' : darkMode ? 'border-gray-600 hover:border-red-500' : 'border-gray-300 hover:border-red-400'}`}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Camera size={28} className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} mx-auto`} />
                      <span className={`text-xs mt-1 block ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Photo</span>
                    </div>
                  )}
                </div>
                {photoPreview && (
                  <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Upload size={20} className="text-white" />
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            </div>

            {/* Full Name */}
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" />
              <input name="full_name" type="text" placeholder="Full Name" value={form.full_name} onChange={handleChange} required className={inputClass} />
            </div>

            {/* National ID */}
            <div className="relative">
              <Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" />
              <input name="national_id" type="text" placeholder="National ID Number" value={form.national_id} onChange={handleChange} required className={inputClass} />
            </div>

            {/* Mobile */}
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" />
              <input name="mobile" type="tel" placeholder="Mobile Number (e.g. 0771234567)" value={form.mobile} onChange={handleChange} required className={inputClass} />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" />
              <input name="email" type="email" placeholder="Email Address" value={form.email} onChange={handleChange} required className={inputClass} />
            </div>

            {/* Department */}
            <div className="relative">
              <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" />
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                required
                className={`${inputClass} appearance-none`}
              >
                <option value="">Select Department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-red-500/20"
            >
              {loading
                ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                : 'Create Account'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
