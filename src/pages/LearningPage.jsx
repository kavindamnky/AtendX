// src/pages/LearningPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { 
  BookOpen, FileText, Link as LinkIcon, Video, 
  CheckCircle, AlertTriangle, ExternalLink, Loader2 
} from 'lucide-react';
import { format } from 'date-fns';

export default function LearningPage() {
  const { company, profile, darkMode } = useApp();
  
  const [materials, setMaterials] = useState([]);
  const [progressMap, setProgressMap] = useState({}); // material_id -> progress row
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbNeedsUpdate, setDbNeedsUpdate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadLearningData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError('');
    
    try {
      // 1. Fetch all learning materials
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
      
      // 2. Fetch employee's progress records
      const { data: prog, error: progErr } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('employee_id', profile.id)
        .eq('company_id', company.id);
        
      if (progErr) throw progErr;
      
      const pMap = {};
      prog?.forEach(p => {
        pMap[p.material_id] = p;
      });
      setProgressMap(pMap);
      
    } catch (err) {
      console.error(err);
      setError('Failed to fetch learning materials.');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, company?.id]);

  useEffect(() => {
    loadLearningData();
  }, [loadLearningData]);

  // Mark a material as completed
  const handleMarkCompleted = async (materialId) => {
    setSaving(true);
    setError('');
    
    try {
      const existing = progressMap[materialId];
      if (existing) {
        // Already exists, just toggle/ensure it is completed
        const { error } = await supabase
          .from('learning_progress')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Insert new progress record
        const { error } = await supabase
          .from('learning_progress')
          .insert({
            company_id: company.id,
            employee_id: profile.id,
            material_id: materialId,
            status: 'completed',
            completed_at: new Date().toISOString()
          });
        if (error) throw error;
      }
      
      setSuccess('Marked as completed!');
      await loadLearningData();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error(err);
      setError('Failed to update progress.');
    } finally {
      setSaving(false);
    }
  };

  // Completion stats
  const totalCount = materials.length;
  const completedCount = Object.values(progressMap).filter(p => p.status === 'completed').length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (dbNeedsUpdate) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center max-w-xl mx-auto my-12">
        <AlertTriangle className="mx-auto text-amber-500 w-12 h-12 mb-4" />
        <h3 className="text-lg font-bold text-amber-400 mb-2">Database Setup Pending</h3>
        <p className="text-sm text-gray-400">
          The Learning Library is not yet fully configured in your database. Please ask your administrator to execute the 
          <code className="bg-gray-900 px-2 py-1 rounded text-red-400 font-mono mx-1">supabase_updates.sql</code> 
          SQL migration in the Supabase SQL editor.
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
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="text-red-500" />
          Learning Library
        </h1>
        <p className="text-sm text-gray-400">
          Access company training materials, guides, and onboarding checklists.
        </p>
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

      {/* Progress card */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-red-500/10 p-3.5 rounded-xl border border-red-500/20 text-red-500">
            <BookOpen size={24} />
          </div>
          <div>
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Your Progress</span>
            <p className="text-xl font-bold text-white mt-0.5">{completedCount} of {totalCount} Completed</p>
          </div>
        </div>

        {/* Progress Gauge */}
        <div className="w-full md:max-w-md space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-gray-400">
            <span>Overall Compliance</span>
            <span className="text-emerald-400">{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-950 h-3 rounded-full overflow-hidden border border-gray-800/80">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Learning items list */}
      {materials.length === 0 ? (
        <div className="bg-gray-900/10 border border-gray-800/80 rounded-2xl py-16 text-center text-gray-500 text-sm">
          No training materials assigned to your dashboard yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {materials.map(mat => {
            const prog = progressMap[mat.id];
            const isCompleted = prog?.status === 'completed';
            
            return (
              <div 
                key={mat.id} 
                className={`bg-gray-900/30 border rounded-2xl p-5 hover:border-gray-800 transition flex flex-col justify-between gap-4 ${
                  isCompleted ? 'border-emerald-500/20' : 'border-gray-800'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500">
                        {mat.content_type === 'document' ? <FileText size={18} /> :
                         mat.content_type === 'video' ? <Video size={18} /> : <LinkIcon size={18} />}
                      </span>
                      <h4 className="font-semibold text-white text-sm truncate">{mat.title}</h4>
                    </div>
                    
                    {isCompleted ? (
                      <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <CheckCircle size={10} />
                        COMPLETED
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                        PENDING
                      </span>
                    )}
                  </div>
                  
                  {mat.description && <p className="text-xs text-gray-400 leading-relaxed">{mat.description}</p>}
                </div>
                
                {/* Actions */}
                <div className="border-t border-gray-800/50 pt-3 flex items-center justify-between gap-4">
                  <a 
                    href={mat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-red-500 hover:text-red-400 font-semibold flex items-center gap-1 transition"
                  >
                    Open Resource
                    <ExternalLink size={12} />
                  </a>
                  
                  {!isCompleted && (
                    <button
                      onClick={() => handleMarkCompleted(mat.id)}
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white px-3 py-1.5 rounded-lg font-semibold transition"
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
