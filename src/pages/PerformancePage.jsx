// src/pages/PerformancePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { Award, TrendingUp, AlertTriangle, Star, Calendar, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function PerformancePage() {
  const { company, profile, darkMode } = useApp();
  
  const [activeTab, setActiveTab] = useState('kpis'); // kpis or reviews
  const [kpis, setKpis] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbNeedsUpdate, setDbNeedsUpdate] = useState(false);
  const [error, setError] = useState('');

  const loadPerformance = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError('');
    
    try {
      // 1. Fetch employee KPIs
      const { data: kpiData, error: kpiErr } = await supabase
        .from('kpis')
        .select('*')
        .eq('employee_id', profile.id)
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
      
      // 2. Fetch employee performance reviews
      const { data: revData, error: revErr } = await supabase
        .from('performance_reviews')
        .select('*, reviewer:reviewer_id(full_name)')
        .eq('employee_id', profile.id)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
        
      if (revErr) throw revErr;
      setReviews(revData || []);
      
    } catch (err) {
      console.error(err);
      setError('Failed to fetch performance reviews.');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, company?.id]);

  useEffect(() => {
    loadPerformance();
  }, [loadPerformance]);

  if (dbNeedsUpdate) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center max-w-xl mx-auto my-12">
        <AlertTriangle className="mx-auto text-amber-500 w-12 h-12 mb-4" />
        <h3 className="text-lg font-bold text-amber-400 mb-2">Database Setup Pending</h3>
        <p className="text-sm text-gray-400">
          The Performance module is not yet fully configured in your database. Please ask your administrator to execute the 
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
          <Award className="text-red-500" />
          My Performance
        </h1>
        <p className="text-sm text-gray-400">
          Monitor your active monthly KPI goals and review appraisal feedback logged by your manager.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('kpis')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'kpis' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          My KPI Targets ({kpis.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'reviews' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Performance Appraisals ({reviews.length})
        </button>
      </div>

      {activeTab === 'kpis' ? (
        /* KPIs list */
        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-red-500" />
            Monthly Goals & KPI Progress
          </h3>
          
          {kpis.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              You currently have no KPI targets assigned for active tracking.
            </div>
          ) : (
            <div className="space-y-6">
              {kpis.map(kpi => {
                const progress = kpi.target_value > 0 
                  ? Math.min(100, Math.round((kpi.actual_value / kpi.target_value) * 100))
                  : 0;
                  
                return (
                  <div key={kpi.id} className="bg-gray-950/30 border border-gray-800/60 rounded-2xl p-5 space-y-3.5">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-bold text-white text-sm">{kpi.title}</h4>
                        {kpi.description && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{kpi.description}</p>}
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono shrink-0">
                        Month: {format(new Date(kpi.month), 'MMMM yyyy')}
                      </span>
                    </div>

                    {/* Progress Gauge */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono text-gray-400">
                        <span>Progress Threshold</span>
                        <span>{kpi.actual_value} / {kpi.target_value} {kpi.unit} ({progress}%)</span>
                      </div>
                      
                      <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-800/80">
                        <div 
                          className="bg-red-500 h-full rounded-full transition-all" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-1 text-xs">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        kpi.actual_value >= kpi.target_value 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {kpi.actual_value >= kpi.target_value ? 'GOAL MET' : 'IN PROGRESS'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Performance reviews list */
        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Award size={18} className="text-red-500" />
            Performance Reviews & Feedback
          </h3>
          
          {reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No performance reviews have been logged for you yet.
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(rev => (
                <div key={rev.id} className="bg-gray-950/40 border border-gray-800/80 rounded-2xl p-5 space-y-4 text-left">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-900/60">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">Review Period</span>
                      <strong className="text-white text-base mt-0.5 inline-block">{rev.review_period}</strong>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-xl">
                      <Star size={16} className="fill-red-500 text-red-500" />
                      <span className="font-bold text-white text-sm">{Number(rev.rating).toFixed(1)} / 5.0</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3.5 text-sm text-gray-300">
                    <div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Narrative Feedback</span>
                      <p className="mt-1 leading-relaxed whitespace-pre-wrap">{rev.feedback}</p>
                    </div>
                    
                    {rev.goals_next_period && (
                      <div className="pt-2 border-t border-gray-900/60">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Next Period Goals</span>
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
    </div>
  );
}
