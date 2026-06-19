// src/pages/admin/AdminRecruitmentPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { 
  Briefcase, Plus, Search, CheckCircle, AlertTriangle, Link, 
  Trash2, Eye, User, FileText, ChevronRight, Mail, Phone, Edit, Loader2
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminRecruitmentPage() {
  const { company, darkMode } = useApp();
  
  const [activeTab, setActiveTab] = useState('candidates'); // job_postings or candidates
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [searchCandidates, setSearchCandidates] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbNeedsUpdate, setDbNeedsUpdate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Modals
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  
  // Job Form
  const blankJobForm = {
    title: '',
    department: 'Engineering',
    location: 'Colombo, Sri Lanka',
    employment_type: 'full-time',
    description: '',
    requirements: '',
    salary_range: 'LKR 150,000 - 250,000',
    status: 'active'
  };
  const [jobForm, setJobForm] = useState(blankJobForm);

  const loadData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    setError('');
    
    try {
      // 1. Fetch job postings
      const { data: jobData, error: jobErr } = await supabase
        .from('job_postings')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
        
      if (jobErr) {
        if (jobErr.code === '42P01') {
          setDbNeedsUpdate(true);
          setLoading(false);
          return;
        }
        throw jobErr;
      }
      setJobs(jobData || []);
      
      // 2. Fetch candidates
      const { data: candData, error: candErr } = await supabase
        .from('candidates')
        .select('*, job_postings!job_id(title, department)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
        
      if (candErr) throw candErr;
      setCandidates(candData || []);
      setFilteredCandidates(candData || []);
      
    } catch (err) {
      console.error(err);
      setError('Failed to load recruitment data.');
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Candidates filter logic
  useEffect(() => {
    const q = searchCandidates.toLowerCase();
    let result = candidates;
    
    if (selectedJobFilter) {
      result = result.filter(c => c.job_id === selectedJobFilter);
    }
    
    if (q) {
      result = result.filter(c => 
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.notes?.toLowerCase().includes(q)
      );
    }
    
    setFilteredCandidates(result);
  }, [searchCandidates, selectedJobFilter, candidates]);

  // Add Job
  const handleJobSubmit = async (e) => {
    e.preventDefault();
    if (!jobForm.title || !jobForm.description) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('job_postings')
        .insert({
          company_id: company.id,
          title: jobForm.title,
          department: jobForm.department,
          location: jobForm.location,
          employment_type: jobForm.employment_type,
          description: jobForm.description,
          requirements: jobForm.requirements,
          salary_range: jobForm.salary_range,
          status: jobForm.status
        });
        
      if (error) throw error;
      setSuccess('Job posting created successfully.');
      setJobForm(blankJobForm);
      setShowJobModal(false);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to create job posting.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle/Change Job Status
  const toggleJobStatus = async (job, newStatus) => {
    try {
      const { error } = await supabase
        .from('job_postings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', job.id);
      if (error) throw error;
      setSuccess(`Job status updated to ${newStatus}.`);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to update job status.');
    }
  };

  // Delete Job Posting
  const deleteJob = async (id) => {
    if (!window.confirm('Delete this job vacancy? This will also remove candidates who applied.')) return;
    try {
      const { error } = await supabase.from('job_postings').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Job posting deleted.');
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to delete job posting.');
    }
  };

  // Change Candidate Pipeline Status
  const updateCandidateStatus = async (candidate, newStatus) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', candidate.id);
      if (error) throw error;
      setSuccess(`${candidate.full_name}'s status updated to ${newStatus}.`);
      
      // Update local state to avoid refetching
      setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: newStatus } : c));
      if (selectedCandidate?.id === candidate.id) {
        setSelectedCandidate(prev => ({ ...prev, status: newStatus }));
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to update candidate status.');
    }
  };

  // Save Candidate Notes
  const saveCandidateNotes = async (candId, notesText) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ notes: notesText, updated_at: new Date().toISOString() })
        .eq('id', candId);
      if (error) throw error;
      setSuccess('Candidate notes updated.');
      setCandidates(prev => prev.map(c => c.id === candId ? { ...c, notes: notesText } : c));
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error(err);
      setError('Failed to update candidate notes.');
    }
  };

  // Copy public jobs link
  const copyPublicJobsLink = () => {
    const link = `${window.location.origin}/jobs?company=${company.slug}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Pipeline Status Stages
  const pipelineStages = ['applied', 'screening', 'interview', 'offered', 'hired', 'rejected'];

  if (dbNeedsUpdate) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center max-w-xl mx-auto my-12">
        <AlertTriangle className="mx-auto text-amber-500 w-12 h-12 mb-4" />
        <h3 className="text-lg font-bold text-amber-400 mb-2">Database Setup Required</h3>
        <p className="text-sm text-gray-400 mb-4">
          The Recruitment modules require new database tables. Please copy the SQL queries from the 
          <code className="bg-gray-900 px-2 py-1 rounded text-red-400 font-mono mx-1">supabase_updates.sql</code> 
          file in your project root, and execute them in your Supabase SQL Editor to enable this page.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="text-red-500" />
            Recruitment & Applicant Tracking (ATS)
          </h1>
          <p className="text-sm text-gray-400">
            Publish job openings and guide job applicants through your recruitment funnel.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={copyPublicJobsLink}
            className="border border-gray-800 hover:bg-gray-800 text-gray-300 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition"
          >
            <Link size={16} />
            {copiedLink ? 'Copied URL!' : 'Share Careers Page'}
          </button>
          
          <button
            onClick={() => { setJobForm(blankJobForm); setShowJobModal(true); }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition shadow-lg shadow-red-600/10"
          >
            <Plus size={16} />
            Post a Job
          </button>
        </div>
      </div>

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

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('candidates')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'candidates' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Applicants Pipeline ({candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('job_postings')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'job_postings' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Active Job Openings ({jobs.length})
        </button>
      </div>

      {activeTab === 'candidates' ? (
        /* Candidates View */
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
              <input 
                type="text"
                value={searchCandidates}
                onChange={(e) => setSearchCandidates(e.target.value)}
                placeholder="Search candidates by name, email..."
                className="w-full bg-gray-950/80 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            
            <div className="w-full md:max-w-xs">
              <select
                value={selectedJobFilter}
                onChange={(e) => setSelectedJobFilter(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="">All Job Postings</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Kanban / Stage list container */}
          {filteredCandidates.length === 0 ? (
            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl py-12 text-center text-gray-500 text-sm">
              No candidates matching filter settings.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {pipelineStages.map(stage => {
                const stageCandidates = filteredCandidates.filter(c => c.status === stage);
                
                return (
                  <div key={stage} className="bg-gray-900/10 border border-gray-800/80 rounded-2xl p-4 flex flex-col min-h-[400px]">
                    {/* Stage Header */}
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-800/40">
                      <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">{stage}</span>
                      <span className="bg-gray-800 text-[10px] text-gray-300 font-bold px-2 py-0.5 rounded-full font-mono">
                        {stageCandidates.length}
                      </span>
                    </div>
                    
                    {/* Candidate Cards in Stage */}
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {stageCandidates.map(cand => (
                        <div
                          key={cand.id}
                          onClick={() => { setSelectedCandidate(cand); setShowCandidateModal(true); }}
                          className="bg-gray-900/40 border border-gray-800 rounded-xl p-3.5 hover:border-red-500/40 cursor-pointer transition text-left"
                        >
                          <div className="font-bold text-sm text-white truncate">{cand.full_name}</div>
                          <div className="text-[10px] text-gray-400 font-semibold truncate mt-0.5">
                            {cand.job_postings?.title}
                          </div>
                          
                          <div className="text-[10px] text-gray-500 font-mono mt-2 pt-2 border-t border-gray-800/30 flex justify-between items-center">
                            <span>{format(new Date(cand.created_at), 'MMM dd')}</span>
                            <ChevronRight size={12} className="text-gray-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Job Vacancies View */
        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Briefcase size={18} className="text-red-500" />
            Active Job Openings
          </h3>
          
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No job postings created. Click "Post a Job" to list vacancies.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="pb-3">Job Title</th>
                    <th className="pb-3">Department</th>
                    <th className="pb-3">Type / Location</th>
                    <th className="pb-3">Salary Range</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {jobs.map(job => (
                    <tr key={job.id} className="hover:bg-gray-800/10">
                      <td className="py-4">
                        <div className="font-semibold text-white">{job.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{job.location}</div>
                      </td>
                      <td className="py-4 text-gray-200">{job.department}</td>
                      <td className="py-4">
                        <span className="text-xs text-gray-300 block capitalize">{job.employment_type}</span>
                      </td>
                      <td className="py-4 font-mono text-xs text-gray-400">{job.salary_range || '—'}</td>
                      <td className="py-4">
                        <select
                          value={job.status}
                          onChange={(e) => toggleJobStatus(job, e.target.value)}
                          className="bg-gray-950 border border-gray-800 text-xs rounded px-2 py-1 text-white"
                        >
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => deleteJob(job.id)}
                          className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Post a Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Briefcase size={18} className="text-red-500" />
                Publish Job Vacancy
              </h3>
              <button 
                onClick={() => setShowJobModal(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleJobSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Job Title</label>
                <input 
                  type="text" 
                  value={jobForm.title}
                  onChange={(e) => setForm = setJobForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="e.g. Senior Frontend Developer"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Department</label>
                  <input 
                    type="text"
                    value={jobForm.department}
                    onChange={(e) => setJobForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Location</label>
                  <input 
                    type="text"
                    value={jobForm.location}
                    onChange={(e) => setJobForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Employment Type</label>
                  <select
                    value={jobForm.employment_type}
                    onChange={(e) => setJobForm(prev => ({ ...prev, employment_type: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Salary Range</label>
                  <input 
                    type="text"
                    value={jobForm.salary_range}
                    onChange={(e) => setJobForm(prev => ({ ...prev, salary_range: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="e.g. LKR 150,000 - 250,000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Job Description</label>
                <textarea 
                  value={jobForm.description}
                  onChange={(e) => setJobForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 h-28 resize-none"
                  placeholder="Outline roles, responsibilities, and team expectations..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Requirements / Skills</label>
                <textarea 
                  value={jobForm.requirements}
                  onChange={(e) => setJobForm(prev => ({ ...prev, requirements: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 h-24 resize-none"
                  placeholder="Outline key required certifications, experience levels, etc..."
                />
              </div>
              
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
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
                  Publish Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Pipeline Detail Modal */}
      {showCandidateModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/20">
              <div>
                <h3 className="font-bold text-white text-base">{selectedCandidate.full_name}</h3>
                <span className="text-xs text-gray-500">Applicant ID: {selectedCandidate.id.slice(0,8).toUpperCase()}</span>
              </div>
              <button 
                onClick={() => { setSelectedCandidate(null); setShowCandidateModal(false); }}
                className="text-gray-400 hover:text-white text-xl font-bold"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Job role and pipeline status */}
              <div className="grid grid-cols-2 gap-4 bg-gray-950/40 p-4 rounded-xl border border-gray-800">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Applied Position</span>
                  <div className="font-semibold text-white text-sm mt-0.5">{selectedCandidate.job_postings?.title}</div>
                  <span className="text-xs text-gray-400 capitalize">{selectedCandidate.job_postings?.department}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Recruitment Stage</span>
                  <select
                    value={selectedCandidate.status}
                    onChange={(e) => updateCandidateStatus(selectedCandidate, e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg py-1 px-2 text-sm text-white font-semibold mt-1 focus:ring-1 focus:ring-red-500"
                  >
                    {pipelineStages.map(stage => (
                      <option key={stage} value={stage}>{stage.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Applicant contact info */}
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-red-500" />
                  <a href={`mailto:${selectedCandidate.email}`} className="hover:underline">{selectedCandidate.email}</a>
                </div>
                {selectedCandidate.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-red-500" />
                    <a href={`tel:${selectedCandidate.phone}`} className="hover:underline">{selectedCandidate.phone}</a>
                  </div>
                )}
                {selectedCandidate.resume_url && (
                  <div className="flex items-center gap-2 pt-1">
                    <FileText size={16} className="text-red-500" />
                    <a 
                      href={selectedCandidate.resume_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-red-400 hover:underline font-semibold"
                    >
                      Open Candidate Resume / CV
                    </a>
                  </div>
                )}
              </div>

              {/* Interview Notes Log */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase">Interview / Screening Notes</label>
                <textarea 
                  defaultValue={selectedCandidate.notes || ''}
                  onBlur={(e) => saveCandidateNotes(selectedCandidate.id, e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 h-28 resize-none"
                  placeholder="Record summary details from the interview screen... (Saves automatically on clicking away)"
                />
                <span className="text-[10px] text-gray-500 block text-right font-mono">Changes save automatically on focus loss (blur)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
