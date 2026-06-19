// src/pages/AssetsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { Laptop, Calendar, AlertTriangle, Shield, Clipboard, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AssetsPage() {
  const { company, profile, darkMode } = useApp();
  
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbNeedsUpdate, setDbNeedsUpdate] = useState(false);
  const [error, setError] = useState('');

  const loadAssets = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('assigned_to', profile.id)
        .eq('company_id', company.id);
        
      if (error) {
        if (error.code === '42P01') {
          setDbNeedsUpdate(true);
          setLoading(false);
          return;
        }
        throw error;
      }
      setAssets(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch assigned assets.');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, company?.id]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  if (dbNeedsUpdate) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center max-w-xl mx-auto my-12">
        <AlertTriangle className="mx-auto text-amber-500 w-12 h-12 mb-4" />
        <h3 className="text-lg font-bold text-amber-400 mb-2">Database Setup Pending</h3>
        <p className="text-sm text-gray-400">
          The Assets Tracking module is not yet fully configured in your database. Please ask your administrator to execute the 
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
          <Laptop className="text-red-500" />
          My Assets
        </h1>
        <p className="text-sm text-gray-400">
          List of company devices and assets assigned to you for work purposes.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Summary card */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
        <div className="bg-red-500/10 p-3.5 rounded-xl border border-red-500/20 text-red-500">
          <Laptop size={24} />
        </div>
        <div>
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Assigned Equipment</span>
          <p className="text-2xl font-bold text-white font-mono mt-0.5">{assets.length} Assets</p>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="bg-gray-900/10 border border-gray-800/80 rounded-2xl py-16 text-center text-gray-500 text-sm max-w-xl mx-auto space-y-2">
          <Shield className="w-12 h-12 text-gray-700 mx-auto" />
          <h4 className="font-bold text-gray-400">No Assets Allocated</h4>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            You currently have no company laptops, mobile devices, or office gear registered under your profile.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map(asset => (
            <div 
              key={asset.id} 
              className="bg-gray-900/30 border border-gray-800 rounded-2xl p-5 hover:border-gray-800/80 transition flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-bold text-base text-white">{asset.name}</h3>
                    <span className="inline-block text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 font-semibold px-2 py-0.5 rounded mt-1">
                      {asset.category}
                    </span>
                  </div>
                  
                  {asset.value && (
                    <span className="text-xs font-mono text-gray-500">
                      Valued: LKR {Number(asset.value).toLocaleString()}
                    </span>
                  )}
                </div>
                
                {asset.notes && (
                  <p className="text-xs text-gray-400 leading-relaxed bg-gray-950/30 border border-gray-800/40 p-3 rounded-xl">
                    {asset.notes}
                  </p>
                )}
              </div>
              
              <div className="border-t border-gray-800/50 pt-3 flex flex-col sm:flex-row justify-between text-xs text-gray-500 gap-2">
                <div className="flex items-center gap-1">
                  <Clipboard size={14} className="text-gray-600" />
                  <span>Serial: <strong className="text-gray-300 font-mono">{asset.serial_number || 'N/A'}</strong></span>
                </div>
                
                {asset.assigned_date && (
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-gray-600" />
                    <span>Allocated: <strong className="text-gray-300 font-mono">{format(new Date(asset.assigned_date), 'yyyy-MM-dd')}</strong></span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Notice panel */}
      <div className="bg-gray-900/10 border border-gray-800/50 rounded-2xl p-5 text-xs text-gray-500 leading-relaxed">
        <strong className="text-gray-300 block mb-1">Asset Allocation Terms</strong>
        Please handle all allocated equipment with care. Report any issues, defects, or losses immediately to the Operations or IT support team. Equipment must be returned upon company offboarding.
      </div>
    </div>
  );
}
