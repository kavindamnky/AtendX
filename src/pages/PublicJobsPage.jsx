// src/pages/PublicJobsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Briefcase, MapPin, Building, Calendar, FileText, CheckCircle, 
  AlertTriangle, Mail, Phone, User, Globe, ArrowRight, Loader2 
} from 'lucide-react';
import { format } from 'date-fns';

export default function PublicJobsPage() {
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbNeedsUpdate, setDbNeedsUpdate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [selectedJob, setSelectedJob] = useState(null); // for detail view & apply modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  
  // Apply Form State
  const blankApplyForm = { full_name: '', email: '', phone: '', resume_url: '', cover_notes: '' };
  const [applyForm, setApplyForm] = useState(blankApplyForm);

  // Extract query param
  const getQueryCompanySlug = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('company') || '';
  };

  const loadJobsData = useCallback(async () => {
    setLoading(true);
    setError('');
    const slug = getQueryCompanySlug();
    
    try {
      if (!slug) {
        // Fallback: If no company slug specified in query, fetch first company or show search
        const { data: cos } = await supabase.from('companies').select('*').limit(1);
        if (cos && cos.length > 0) {
          window.history.replaceState(null, '', `?company=${cos[0].slug}`);
          setCompany(cos[0]);
        } else {
          setLoading(false);
          return;
        }
      } else {
        const { data: co, error: coErr } = await supabase
          .from('companies')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
          
        if (coErr) throw coErr;
        if (!co) {
          setError(`Company with workspace slug "${slug}" not found.`);
          setLoading(false);
          return;
        }
        setCompany(co);
      }
    } catch (err) {
      console.error(err);
      setError('Error resolving company workspace details.');
      setLoading(false);
      return;
    }
  }, []);

  useEffect(() => {
    loadJobsData();
  }, [loadJobsData]);

  // Load jobs once company is set
  useEffect(() => {
    if (!company?.id) return;
    
    const fetchJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('job_postings')
          .select('*')
          .eq('company_id', company.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
          
        if (error) {
          if (error.code === '42P01') {
            setDbNeedsUpdate(true);
            setLoading(false);
            return;
          }
          throw error;
        }
        setJobs(data || []);
      } catch (err) {
        console.error(err);
        setError('Error loading job postings.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobs();
  }, [company?.id]);

  // Submit Application Form
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob || !applyForm.full_name || !applyForm.email) return;
    setSaving(true);
    setError('');
    
    try {
      const { error } = await supabase
        .from('candidates')
        .insert({
          company_id: company.id,
          job_id: selectedJob.id,
          full_name: applyForm.full_name,
          email: applyForm.email.trim().toLowerCase(),
          phone: applyForm.phone,
          resume_url: applyForm.resume_url,
          notes: applyForm.cover_notes,
          status: 'applied'
        });
        
      if (error) throw error;
      
      setSuccess('Application submitted successfully! Our HR team will review and contact you.');
      setApplyForm(blankApplyForm);
      setShowApplyModal(false);
      setSelectedJob(null);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setError('Failed to submit application. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (dbNeedsUpdate) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center max-w-xl mx-auto my-12 text-white">
        <AlertTriangle className="mx-auto text-amber-500 w-12 h-12 mb-4" />
        <h3 className="text-lg font-bold text-amber-400 mb-2">Careers Module Offline</h3>
        <p className="text-sm text-gray-400">
          The recruitment database tables are pending configuration. Please ask your workspace administrator to run the 
          <code className="bg-gray-900 px-2 py-1 rounded text-red-400 font-mono mx-1">supabase_updates.sql</code> 
          updates in Supabase SQL editor.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      
      {/* Banner / Header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 border-b border-gray-900 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <Building className="mx-auto text-red-500 w-12 h-12" />
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Careers at {company?.name || 'AtendX'}
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto text-sm sm:text-base">
            Explore exciting job vacancies and apply to join our growing team.
          </p>
          <div className="flex justify-center gap-1.5 text-xs text-gray-500 font-medium">
            <Globe size={14} />
            <span>Workspace: {company?.slug}.atendx.com</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        {/* Jobs List */}
        <div>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Briefcase className="text-red-500" />
            Open Vacancies ({jobs.length})
          </h2>
          
          {jobs.length === 0 ? (
            <div className="bg-gray-900/30 border border-gray-900 rounded-2xl py-12 text-center text-gray-500 text-sm">
              We currently have no active openings. Check back later!
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map(job => (
                <div 
                  key={job.id} 
                  className="bg-gray-900/30 border border-gray-900 rounded-2xl p-6 hover:border-gray-800 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">{job.title}</h3>
                    <div className="flex flex-wrap gap-y-1 gap-x-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Building size={12} />
                        {job.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1 capitalize">
                        <Calendar size={12} />
                        {job.employment_type}
                      </span>
                    </div>
                    {job.salary_range && (
                      <span className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded inline-block font-mono">
                        {job.salary_range}
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => { setSelectedJob(job); setShowApplyModal(true); }}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-1 shadow-lg shadow-red-600/10 shrink-0"
                  >
                    View &amp; Apply
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Apply Form & Details Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/20">
              <div>
                <h3 className="font-bold text-white text-lg">{selectedJob.title}</h3>
                <span className="text-xs text-gray-500 capitalize">{selectedJob.department} &bull; {selectedJob.location}</span>
              </div>
              <button 
                onClick={() => { setSelectedJob(null); setShowApplyModal(false); }}
                className="text-gray-400 hover:text-white text-xl font-bold"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* Job Details Section */}
              <div className="space-y-4 bg-gray-950/40 border border-gray-800/80 p-5 rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider">Job Description</h4>
                  <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap leading-relaxed">{selectedJob.description}</p>
                </div>
                {selectedJob.requirements && (
                  <div className="pt-3 border-t border-gray-900">
                    <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider">Requirements</h4>
                    <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap leading-relaxed">{selectedJob.requirements}</p>
                  </div>
                )}
              </div>

              {/* Form Section */}
              <form onSubmit={handleApplySubmit} className="space-y-4 border-t border-gray-800 pt-6">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Submit Application</h4>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      value={applyForm.full_name}
                      onChange={(e) => setApplyForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                      <input 
                        type="email" 
                        value={applyForm.email}
                        onChange={(e) => setApplyForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                        placeholder="yourname@gmail.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                      <input 
                        type="tel" 
                        value={applyForm.phone}
                        onChange={(e) => setApplyForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                        placeholder="e.g. +94 77 123 4567"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Link to Resume / CV (PDF URL)</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input 
                      type="url" 
                      value={applyForm.resume_url}
                      onChange={(e) => setApplyForm(prev => ({ ...prev, resume_url: e.target.value }))}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      placeholder="e.g. https://drive.google.com/your-cv-link"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-1">Please provide a public link to your CV hosted on Google Drive, Dropbox, or OneDrive.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Cover Note / Introduce Yourself</label>
                  <textarea 
                    value={applyForm.cover_notes}
                    onChange={(e) => setApplyForm(prev => ({ ...prev, cover_notes: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 h-24 resize-none"
                    placeholder="Briefly state why you're a great fit for this role..."
                  />
                </div>
                
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setSelectedJob(null); setShowApplyModal(false); }}
                    className="flex-1 border border-gray-800 hover:bg-gray-800 rounded-xl py-2.5 text-sm font-semibold text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    Submit Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
