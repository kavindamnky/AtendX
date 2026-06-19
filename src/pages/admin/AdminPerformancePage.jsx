// src/pages/admin/AdminPerformancePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { 
  Award, TrendingUp, Plus, Search, Edit, Trash2, CheckCircle, 
  AlertTriangle, Star, Calendar, User, AlignLeft, Check, Loader2 
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminPerformancePage() {
  const { company, profile, darkMode } = useApp();
  
  const [activeTab, setActiveTab] = useState('kpis'); // kpis or reviews
  const [employees, setEmployees] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [reviews, setReviews] = useState([]);
  
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbNeedsUpdate, setDbNeedsUpdate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modals
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editTargetKpi, setEditTargetKpi] = useState(null);
  
  // KPI Form
  const blankKpiForm = { title: '', description: '', target_value: '', actual_value: '0', unit: '%', month: format(new Date(), 'yyyy-MM-dd') };
  const [kpiForm, setKpiForm] = useState(blankKpiForm);
  
  // Review Form
  const blankReviewForm = { review_period: 'Q2 2026', rating: '5.0', feedback: '', goals_next_period: '' };
  const [reviewForm, setReviewForm] = useState(blankReviewForm);

  const loadData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    setError('');
    
    try {
      // 1. Fetch employees
      const { data: emps, error: empErr } = await supabase
        .from('profiles')
        .select('id, full_name, employee_id, department')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('full_name');
      if (empErr) throw empErr;
      setEmployees(emps || []);
      
      // 2. Fetch KPIs
      const { data: kpiData, error: kpiErr } = await supabase
        .from('kpis')
        .select('*, profiles!employee_id(full_name, department)')
        .eq('company_id', company.id)
        .order('month', { ascending: false });
        
      if (kpiErr) {
        if (kpiErr.code === '42P01') {
          setDbNeedsUpdate(true);
          setLoading(false);
          return;
        }
        throw kpiErr;
      }
      setKpis(kpiData || []);
      
      // 3. Fetch Reviews
      const { data: revData, error: revErr } = await supabase
        .from('performance_reviews')
        .select('*, profiles!employee_id(full_name, department), reviewer:reviewer_id(full_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
        
      if (revErr) throw revErr;
      setReviews(revData || []);
      
    } catch (err) {
      console.error(err);
      setError('Failed to load performance data.');
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create or Update KPI
  const handleKpiSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmp || !kpiForm.title || !kpiForm.target_value) {
      setError('Please select an employee and fill all required fields.');
      return;
    }
    setSaving(true);
    setError('');
    
    try {
      const target = Number(kpiForm.target_value);
      const actual = Number(kpiForm.actual_value || 0);
      const status = actual >= target ? 'met' : (actual > 0 ? 'in_progress' : 'in_progress'); 
      const monthDate = `${selectedMonth}-01`;
      
      if (editTargetKpi) {
        const { error } = await supabase
          .from('kpis')
          .update({
            title: kpiForm.title,
            description: kpiForm.description,
            target_value: target,
            actual_value: actual,
            unit: kpiForm.unit,
            status: actual >= target ? 'met' : 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', editTargetKpi.id);
        if (error) throw error;
        setSuccess('KPI updated successfully.');
      } else {
        const { error } = await supabase
          .from('kpis')
          .insert({
            company_id: company.id,
            employee_id: selectedEmp,
            title: kpiForm.title,
            description: kpiForm.description,
            target_value: target,
            actual_value: actual,
            unit: kpiForm.unit,
            month: monthDate,
            status: status
          });
        if (error) throw error;
        setSuccess('KPI created successfully.');
      }
      
      setKpiForm(blankKpiForm);
      setEditTargetKpi(null);
      setShowKpiModal(false);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to save KPI.');
    } finally {
      setSaving(false);
    }
  };

  // Open Edit KPI Modal
  const openEditKpi = (kpi) => {
    setEditTargetKpi(kpi);
    setSelectedEmp(kpi.employee_id);
    setSelectedMonth(kpi.month.slice(0, 7)); // yyyy-MM
    setKpiForm({
      title: kpi.title,
      description: kpi.description || '',
      target_value: kpi.target_value,
      actual_value: kpi.actual_value,
      unit: kpi.unit
    });
    setShowKpiModal(true);
  };

  // Delete KPI
  const deleteKpi = async (id) => {
    if (!window.confirm('Delete this KPI?')) return;
    try {
      const { error } = await supabase.from('kpis').delete().eq('id', id);
      if (error) throw error;
      setSuccess('KPI deleted.');
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to delete KPI.');
    }
  };

  // Create Performance Review
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmp || !reviewForm.feedback) {
      setError('Please select an employee and write feedback.');
      return;
    }
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('performance_reviews')
        .insert({
          company_id: company.id,
          employee_id: selectedEmp,
          reviewer_id: profile.id, // Current admin/HR user profile
          review_period: reviewForm.review_period,
          rating: Number(reviewForm.rating),
          feedback: reviewForm.feedback,
          goals_next_period: reviewForm.goals_next_period
        });
        
      if (error) throw error;
      
      setSuccess('Performance Review submitted successfully.');
      setReviewForm(blankReviewForm);
      setShowReviewModal(false);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to submit performance review.');
    } finally {
      setSaving(false);
    }
  };

  if (dbNeedsUpdate) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center max-w-xl mx-auto my-12">
        <AlertTriangle className="mx-auto text-amber-500 w-12 h-12 mb-4" />
        <h3 className="text-lg font-bold text-amber-400 mb-2">Database Setup Required</h3>
        <p className="text-sm text-gray-400 mb-4">
          The Performance modules require new database tables. Please copy the SQL queries from the 
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
            <Award className="text-red-500" />
            Performance & Appraisals
          </h1>
          <p className="text-sm text-gray-400">
            Establish performance targets (KPIs) and record formal manager feedback ratings.
          </p>
        </div>
        
        {/* Tab Controls & Buttons */}
        <div className="flex gap-2">
          {activeTab === 'kpis' ? (
            <button
              onClick={() => { setEditTargetKpi(null); setSelectedEmp(''); setKpiForm(blankKpiForm); setShowKpiModal(true); }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition shadow-lg shadow-red-600/10"
            >
              <Plus size={16} />
              Set KPI
            </button>
          ) : (
            <button
              onClick={() => { setSelectedEmp(''); setReviewForm(blankReviewForm); setShowReviewModal(true); }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition shadow-lg shadow-red-600/10"
            >
              <Plus size={16} />
              Write Review
            </button>
          )}
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

      {/* Tabs Layout */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('kpis')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'kpis' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Key Performance Indicators (KPIs)
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'reviews' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Performance Reviews
        </button>
      </div>

      {activeTab === 'kpis' ? (
        /* KPIs Tab Content */
        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-red-500" />
            Active KPI Targets
          </h3>
          
          {kpis.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No employee KPIs set. Click "Set KPI" to start tracking.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="pb-3">Employee</th>
                    <th className="pb-3">KPI Goal</th>
                    <th className="pb-3">Month</th>
                    <th className="pb-3">Progress</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {kpis.map(kpi => {
                    const progress = kpi.target_value > 0 
                      ? Math.min(100, Math.round((kpi.actual_value / kpi.target_value) * 100))
                      : 0;
                      
                    return (
                      <tr key={kpi.id} className="hover:bg-gray-800/10">
                        <td className="py-4">
                          <div className="font-semibold text-white">{kpi.profiles?.full_name}</div>
                          <div className="text-xs text-gray-500">{kpi.profiles?.department}</div>
                        </td>
                        <td className="py-4">
                          <div className="font-medium text-gray-200">{kpi.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{kpi.description}</div>
                        </td>
                        <td className="py-4 font-mono text-xs text-gray-400">
                          {format(new Date(kpi.month), 'MMMM yyyy')}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2 max-w-xs">
                            <div className="flex-1 bg-gray-950 h-2 rounded-full overflow-hidden border border-gray-800">
                              <div 
                                className="bg-red-500 h-full rounded-full transition-all" 
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs text-white shrink-0">
                              {kpi.actual_value} / {kpi.target_value} {kpi.unit} ({progress}%)
                            </span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            kpi.actual_value >= kpi.target_value 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {kpi.actual_value >= kpi.target_value ? 'MET' : 'TRACKING'}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => openEditKpi(kpi)}
                              className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deleteKpi(kpi.id)}
                              className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Reviews Tab Content */
        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Award size={18} className="text-red-500" />
            Performance Evaluations
          </h3>
          
          {reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No performance reviews logged. Click "Write Review" to begin.
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(rev => (
                <div key={rev.id} className="bg-gray-950/40 border border-gray-800/80 rounded-2xl p-5 hover:border-gray-800 transition">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 pb-3 border-b border-gray-900">
                    <div>
                      <div className="font-bold text-white text-base">{rev.profiles?.full_name}</div>
                      <span className="text-xs text-gray-500 block">Period: {rev.review_period}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-xl">
                      <Star size={16} className="fill-red-500 text-red-500" />
                      <span className="font-bold text-white text-sm">{Number(rev.rating).toFixed(1)} / 5.0</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase">Review Feedback</span>
                      <p className="text-gray-300 mt-1 leading-relaxed whitespace-pre-wrap">{rev.feedback}</p>
                    </div>
                    {rev.goals_next_period && (
                      <div className="pt-2 border-t border-gray-900">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Future Milestones / Goals</span>
                        <p className="text-gray-400 mt-1 leading-relaxed whitespace-pre-wrap">{rev.goals_next_period}</p>
                      </div>
                    )}
                    <div className="pt-1.5 flex justify-end text-[10px] text-gray-500 font-mono">
                      Reviewed by: {rev.reviewer?.full_name || 'HR Team'} on {format(new Date(rev.created_at), 'yyyy-MM-dd')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KPI Setup Modal */}
      {showKpiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-red-500" />
                {editTargetKpi ? 'Edit Employee KPI' : 'Establish Employee KPI'}
              </h3>
              <button 
                onClick={() => { setShowKpiModal(false); setEditTargetKpi(null); }}
                className="text-gray-400 hover:text-white text-xl"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleKpiSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Select Employee</label>
                <select 
                  value={selectedEmp}
                  onChange={(e) => setSelectedEmp(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  disabled={!!editTargetKpi}
                  required
                >
                  <option value="">Choose Staff Profile...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Target Month</label>
                  <input 
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    disabled={!!editTargetKpi}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Measurement Unit</label>
                  <input 
                    type="text"
                    value={kpiForm.unit}
                    onChange={(e) => setKpiForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="e.g. %, tasks, LKR"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">KPI Title</label>
                <input 
                  type="text" 
                  value={kpiForm.title}
                  onChange={(e) => setKpiForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="e.g. Complete onboarding reviews"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Target Value</label>
                  <input 
                    type="number"
                    value={kpiForm.target_value}
                    onChange={(e) => setKpiForm(prev => ({ ...prev, target_value: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="e.g. 100"
                    required
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Actual Value</label>
                  <input 
                    type="number"
                    value={kpiForm.actual_value}
                    onChange={(e) => setKpiForm(prev => ({ ...prev, actual_value: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="e.g. 80"
                    required
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">KPI Details / Description</label>
                <textarea 
                  value={kpiForm.description}
                  onChange={(e) => setKpiForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 h-20 resize-none"
                  placeholder="Summarize the performance threshold or specifics..."
                />
              </div>
              
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowKpiModal(false); setEditTargetKpi(null); }}
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
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Award size={18} className="text-red-500" />
                Write Performance Appraisal
              </h3>
              <button 
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleReviewSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Staff Member</label>
                  <select 
                    value={selectedEmp}
                    onChange={(e) => setSelectedEmp(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    required
                  >
                    <option value="">Select Employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Review Period</label>
                  <input 
                    type="text" 
                    value={reviewForm.review_period}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, review_period: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="e.g. Q2 2026, Annual 2025"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Appraisal Score / Rating (1.0 - 5.0)</label>
                <select 
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, rating: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 font-bold"
                >
                  <option value="5.0">5.0 — Outstanding / Exceptional</option>
                  <option value="4.0">4.0 — Exceeds Expectations</option>
                  <option value="3.0">3.0 — Meets Expectations</option>
                  <option value="2.0">2.0 — Needs Improvement</option>
                  <option value="1.0">1.0 — Unsatisfactory</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Review Narrative / Feedback</label>
                <textarea 
                  value={reviewForm.feedback}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, feedback: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 h-28 resize-none"
                  placeholder="Detail employee strengths, achievements, and technical execution insights..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Goals for Next Period</label>
                <textarea 
                  value={reviewForm.goals_next_period}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, goals_next_period: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 h-20 resize-none"
                  placeholder="Outline milestones or specific metrics the employee should target in the next window..."
                />
              </div>
              
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
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
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
