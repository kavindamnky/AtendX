// src/pages/admin/AdminLearningPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { 
  BookOpen, Plus, Search, CheckCircle, AlertTriangle, 
  Trash2, FileText, Link, Video, User, ChevronRight, Loader2
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminLearningPage() {
  const { company, darkMode } = useApp();
  
  const [activeTab, setActiveTab] = useState('materials'); // materials or progress
  const [materials, setMaterials] = useState([]);
  const [progressList, setProgressList] = useState([]); // employee progress aggregations
  const [employeeDetail, setEmployeeDetail] = useState(null); // target for detailed progress view
  const [detailProgress, setDetailProgress] = useState([]); // specific completion records for employee
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbNeedsUpdate, setDbNeedsUpdate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProgressDetail, setShowProgressDetail] = useState(false);
  
  // Form
  const blankForm = { title: '', description: '', content_type: 'document', url: '' };
  const [form, setForm] = useState(blankForm);

  const loadData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    setError('');
    
    try {
      // 1. Fetch materials
      const { data: mats, error: matErr } = await supabase
        .from('learning_materials')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
        
      if (matErr) {
        if (matErr.code === '42P01') {
          setDbNeedsUpdate(true);
          setLoading(false);
          return;
        }
        throw matErr;
      }
      setMaterials(mats || []);
      
      // 2. Fetch employee list and progress summary
      const { data: emps, error: empErr } = await supabase
        .from('profiles')
        .select('id, full_name, employee_id, department')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('full_name');
        
      if (empErr) throw empErr;
      
      // 3. Fetch progress counts
      const { data: prog, error: progErr } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'completed');
        
      if (progErr) throw progErr;
      
      // Map progress to employees
      const aggregated = emps.map(emp => {
        const completedCount = prog?.filter(p => p.employee_id === emp.id).length || 0;
        return {
          ...emp,
          completed: completedCount,
          total: mats?.length || 0
        };
      });
      setProgressList(aggregated);
      
    } catch (err) {
      console.error(err);
      setError('Failed to load learning library data.');
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load specific employee progress detail
  const loadEmployeeDetail = async (emp) => {
    setEmployeeDetail(emp);
    setShowProgressDetail(true);
    try {
      const { data, error } = await supabase
        .from('learning_progress')
        .select('*, learning_materials(title, content_type)')
        .eq('employee_id', emp.id)
        .eq('company_id', company.id);
      if (error) throw error;
      setDetailProgress(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load employee details.');
    }
  };

  // Add learning material
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.url) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('learning_materials')
        .insert({
          company_id: company.id,
          title: form.title,
          description: form.description,
          content_type: form.content_type,
          url: form.url
        });
        
      if (error) throw error;
      setSuccess('Learning material added successfully.');
      setForm(blankForm);
      setShowAddModal(false);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to add material.');
    } finally {
      setSaving(false);
    }
  };

  // Delete learning material
  const deleteMaterial = async (id) => {
    if (!window.confirm('Delete this learning material?')) return;
    try {
      const { error } = await supabase.from('learning_materials').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Material deleted.');
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to delete material.');
    }
  };

  if (dbNeedsUpdate) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center max-w-xl mx-auto my-12">
        <AlertTriangle className="mx-auto text-amber-500 w-12 h-12 mb-4" />
        <h3 className="text-lg font-bold text-amber-400 mb-2">Database Setup Required</h3>
        <p className="text-sm text-gray-400 mb-4">
          The Learning Library modules require new database tables. Please copy the SQL queries from the 
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
            <BookOpen className="text-red-500" />
            Learning Library
          </h1>
          <p className="text-sm text-gray-400">
            Publish training modules, onboarding resources, and track compliance metrics.
          </p>
        </div>
        
        <button
          onClick={() => { setForm(blankForm); setShowAddModal(true); }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition shadow-lg shadow-red-600/10"
        >
          <Plus size={16} />
          Add Resource
        </button>
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
          onClick={() => setActiveTab('materials')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'materials' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Learning Materials ({materials.length})
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'progress' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Employee Progress List
        </button>
      </div>

      {activeTab === 'materials' ? (
        /* Materials Table */
        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <BookOpen size={18} className="text-red-500" />
            Uploaded Learning Resources
          </h3>
          
          {materials.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No learning materials added yet. Click "Add Resource" to upload PDF/links.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.map(mat => (
                <div key={mat.id} className="bg-gray-950/40 border border-gray-800 rounded-2xl p-5 hover:border-gray-800 transition flex items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 shrink-0">
                        {mat.content_type === 'document' ? <FileText size={18} /> :
                         mat.content_type === 'video' ? <Video size={18} /> : <Link size={18} />}
                      </span>
                      <h4 className="font-semibold text-white text-sm truncate">{mat.title}</h4>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{mat.description}</p>
                    <a 
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-red-400 hover:underline font-semibold inline-block pt-1 truncate max-w-full"
                    >
                      {mat.url}
                    </a>
                  </div>
                  
                  <button
                    onClick={() => deleteMaterial(mat.id)}
                    className="p-1 hover:bg-gray-800 rounded text-gray-500 hover:text-red-500 transition shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Progress Summary List */
        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <User size={18} className="text-red-500" />
            Staff Compliance Status
          </h3>
          
          {progressList.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No active employees to track.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="pb-3">Employee</th>
                    <th className="pb-3">Department</th>
                    <th className="pb-3">Assigned / Completed</th>
                    <th className="pb-3">Progress</th>
                    <th className="pb-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {progressList.map(emp => {
                    const percent = emp.total > 0 ? Math.round((emp.completed / emp.total) * 100) : 0;
                    return (
                      <tr key={emp.id} className="hover:bg-gray-800/10">
                        <td className="py-4">
                          <div className="font-semibold text-white">{emp.full_name}</div>
                          <div className="text-xs text-gray-500">ID: {emp.employee_id}</div>
                        </td>
                        <td className="py-4 text-gray-300">{emp.department || '—'}</td>
                        <td className="py-4 font-semibold text-gray-200">
                          {emp.completed} / {emp.total} Completed
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2 max-w-xs">
                            <div className="flex-1 bg-gray-950 h-2 rounded-full overflow-hidden border border-gray-800">
                              <div 
                                className="bg-emerald-500 h-full rounded-full transition-all" 
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs text-emerald-400 shrink-0">{percent}%</span>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => loadEmployeeDetail(emp)}
                            className="bg-gray-800 hover:bg-gray-700 text-xs px-3 py-1.5 rounded-lg text-white font-semibold flex items-center gap-0.5 ml-auto"
                          >
                            View checklist
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Learning Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <BookOpen size={18} className="text-red-500" />
                Add Learning Material
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Content Title</label>
                <input 
                  type="text" 
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="e.g. Employee Handbook 2026"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Content Type</label>
                <select
                  value={form.content_type}
                  onChange={(e) => setForm(prev => ({ ...prev, content_type: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="document">Document / PDF</option>
                  <option value="link">Web link / URL</option>
                  <option value="video">Training Video</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">URL / Link Location</label>
                <input 
                  type="url" 
                  value={form.url}
                  onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="e.g. https://company.sharepoint.com/handbook"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Short Description</label>
                <textarea 
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 h-20 resize-none"
                  placeholder="Tell employees what this training cover is..."
                />
              </div>
              
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress Detail Modal */}
      {showProgressDetail && employeeDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/20">
              <div>
                <h3 className="font-bold text-white text-base">{employeeDetail.full_name}</h3>
                <span className="text-xs text-gray-500">Compliance Checklist</span>
              </div>
              <button 
                onClick={() => { setEmployeeDetail(null); setShowProgressDetail(false); }}
                className="text-gray-400 hover:text-white text-xl font-bold"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {detailProgress.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs">
                  No materials marked completed yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {detailProgress.map(p => (
                    <div key={p.id} className="bg-gray-950/40 border border-gray-800 rounded-xl p-3 flex justify-between items-center text-sm">
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate text-xs">{p.learning_materials?.title}</div>
                        <span className="text-[10px] text-gray-500 capitalize block mt-0.5">{p.learning_materials?.content_type}</span>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle size={14} />
                          Done
                        </span>
                        <span className="text-[9px] text-gray-500 font-mono block mt-0.5">
                          {p.completed_at ? format(new Date(p.completed_at), 'yyyy-MM-dd') : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
