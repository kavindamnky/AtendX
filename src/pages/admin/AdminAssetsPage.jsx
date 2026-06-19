// src/pages/admin/AdminAssetsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { 
  Laptop, Plus, Search, CheckCircle, AlertTriangle, 
  Trash2, Edit, Calendar, User, Tag, ToggleLeft, Loader2
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAssetsPage() {
  const { company, darkMode } = useApp();
  
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbNeedsUpdate, setDbNeedsUpdate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetAsset, setTargetAsset] = useState(null);
  
  const categories = ['Laptop', 'Mobile Phone', 'Tablet', 'Monitor', 'Keyboard/Mouse', 'Chair', 'Desk', 'Other'];
  
  const blankForm = {
    name: '',
    serial_number: '',
    category: 'Laptop',
    assigned_to: '',
    assigned_date: '',
    status: 'available',
    value: '',
    notes: ''
  };
  const [form, setForm] = useState(blankForm);

  const loadData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    setError('');
    
    try {
      // 1. Fetch assets
      const { data: assetData, error: assetErr } = await supabase
        .from('assets')
        .select('*, profiles!assigned_to(full_name, employee_id)')
        .eq('company_id', company.id)
        .order('name');
        
      if (assetErr) {
        if (assetErr.code === '42P01') {
          setDbNeedsUpdate(true);
          setLoading(false);
          return;
        }
        throw assetErr;
      }
      setAssets(assetData || []);
      setFiltered(assetData || []);
      
      // 2. Fetch employee profiles for assignments
      const { data: empData, error: empErr } = await supabase
        .from('profiles')
        .select('id, full_name, employee_id')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('full_name');
        
      if (empErr) throw empErr;
      setEmployees(empData || []);
      
    } catch (err) {
      console.error(err);
      setError('Failed to load assets.');
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search filter
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q ? assets.filter(a => 
        a.name?.toLowerCase().includes(q) || 
        a.serial_number?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q) ||
        a.notes?.toLowerCase().includes(q) ||
        a.profiles?.full_name?.toLowerCase().includes(q)
      ) : assets
    );
  }, [search, assets]);

  // Add Asset
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    
    try {
      const payload = {
        company_id: company.id,
        name: form.name,
        serial_number: form.serial_number,
        category: form.category,
        assigned_to: form.assigned_to || null,
        assigned_date: form.assigned_to ? (form.assigned_date || format(new Date(), 'yyyy-MM-dd')) : null,
        status: form.assigned_to ? 'assigned' : form.status,
        value: form.value ? Number(form.value) : null,
        notes: form.notes
      };
      
      const { error } = await supabase
        .from('assets')
        .insert(payload);
        
      if (error) throw error;
      
      setSuccess('Asset added successfully.');
      setForm(blankForm);
      setShowAddModal(false);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to add asset.');
    } finally {
      setSaving(false);
    }
  };

  // Open edit modal
  const openEdit = (asset) => {
    setTargetAsset(asset);
    setForm({
      name: asset.name,
      serial_number: asset.serial_number || '',
      category: asset.category || 'Laptop',
      assigned_to: asset.assigned_to || '',
      assigned_date: asset.assigned_date || '',
      status: asset.status || 'available',
      value: asset.value || '',
      notes: asset.notes || ''
    });
    setShowEditModal(true);
  };

  // Update Asset
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!targetAsset) return;
    setSaving(true);
    
    try {
      const assigned = form.assigned_to || null;
      const statusVal = assigned ? 'assigned' : form.status;
      
      const { error } = await supabase
        .from('assets')
        .update({
          name: form.name,
          serial_number: form.serial_number,
          category: form.category,
          assigned_to: assigned,
          assigned_date: assigned ? (form.assigned_date || format(new Date(), 'yyyy-MM-dd')) : null,
          status: statusVal,
          value: form.value ? Number(form.value) : null,
          notes: form.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetAsset.id);
        
      if (error) throw error;
      
      setSuccess('Asset updated successfully.');
      setShowEditModal(false);
      setForm(blankForm);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to update asset.');
    } finally {
      setSaving(false);
    }
  };

  // Confirm delete asset
  const confirmDelete = (asset) => {
    setTargetAsset(asset);
    setShowDeleteModal(true);
  };

  // Delete Asset
  const handleDelete = async () => {
    if (!targetAsset) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', targetAsset.id);
      if (error) throw error;
      setSuccess('Asset deleted successfully.');
      setShowDeleteModal(false);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to delete asset.');
    } finally {
      setSaving(false);
    }
  };

  // Asset stats calculations
  const totalAssets = assets.length;
  const assignedCount = assets.filter(a => a.status === 'assigned').length;
  const availableCount = assets.filter(a => a.status === 'available').length;
  const maintenanceCount = assets.filter(a => a.status === 'maintenance').length;

  if (dbNeedsUpdate) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center max-w-xl mx-auto my-12">
        <AlertTriangle className="mx-auto text-amber-500 w-12 h-12 mb-4" />
        <h3 className="text-lg font-bold text-amber-400 mb-2">Database Setup Required</h3>
        <p className="text-sm text-gray-400 mb-4">
          The Assets modules require new database tables. Please copy the SQL queries from the 
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
            <Laptop className="text-red-500" />
            Assets Tracking
          </h1>
          <p className="text-sm text-gray-400">
            Allocate and monitor company hardware and assets assigned to employees.
          </p>
        </div>
        
        <button
          onClick={() => { setForm(blankForm); setShowAddModal(true); }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition shadow-lg shadow-red-600/10"
        >
          <Plus size={16} />
          Add Asset
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

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/30 border border-gray-800/80 rounded-2xl p-5">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Assets</span>
          <p className="text-3xl font-bold font-mono text-white mt-2">{totalAssets}</p>
        </div>
        <div className="bg-gray-900/30 border border-gray-800/80 rounded-2xl p-5">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider text-emerald-400">Assigned</span>
          <p className="text-3xl font-bold font-mono text-emerald-400 mt-2">{assignedCount}</p>
        </div>
        <div className="bg-gray-900/30 border border-gray-800/80 rounded-2xl p-5">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider text-blue-400">Available</span>
          <p className="text-3xl font-bold font-mono text-blue-400 mt-2">{availableCount}</p>
        </div>
        <div className="bg-gray-900/30 border border-gray-800/80 rounded-2xl p-5">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider text-amber-500">Maintenance</span>
          <p className="text-3xl font-bold font-mono text-amber-500 mt-2">{maintenanceCount}</p>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets, serials, categories, or assigned staff..."
            className="w-full bg-gray-950/80 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No assets found. Click "Add Asset" to populate.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="pb-3">Asset</th>
                  <th className="pb-3">Serial / ID</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Assigned To</th>
                  <th className="pb-3">Date Assigned</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {filtered.map(asset => (
                  <tr key={asset.id} className="hover:bg-gray-800/10">
                    <td className="py-4">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <Tag size={14} className="text-red-500" />
                        {asset.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{asset.category}</div>
                    </td>
                    <td className="py-4 font-mono text-xs">{asset.serial_number || '—'}</td>
                    <td className="py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        asset.status === 'assigned' ? 'bg-emerald-500/20 text-emerald-400' :
                        asset.status === 'maintenance' ? 'bg-amber-500/20 text-amber-500' :
                        asset.status === 'retired' ? 'bg-gray-800 text-gray-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {asset.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4">
                      {asset.profiles ? (
                        <div className="flex items-center gap-1.5">
                          <User size={14} className="text-gray-400" />
                          <div>
                            <span className="font-medium text-white">{asset.profiles.full_name}</span>
                            <span className="text-[10px] text-gray-500 block">ID: {asset.profiles.employee_id}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-4 text-xs font-mono text-gray-400">
                      {asset.assigned_date ? format(new Date(asset.assigned_date), 'yyyy-MM-dd') : '—'}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(asset)}
                          className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => confirmDelete(asset)}
                          className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-500 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Laptop size={18} className="text-red-500" />
                {showAddModal ? 'Add New Asset' : 'Edit Asset'}
              </h3>
              <button 
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                className="text-gray-400 hover:text-white text-xl"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={showAddModal ? handleAdd : handleUpdate} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Asset Name</label>
                  <input 
                    type="text" 
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="e.g. MacBook Pro M3"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Serial Number</label>
                  <input 
                    type="text" 
                    value={form.serial_number}
                    onChange={(e) => setForm(prev => ({ ...prev, serial_number: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="e.g. C02XG54J..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Category</label>
                  <select 
                    value={form.category}
                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Asset Value (LKR)</label>
                  <input 
                    type="number" 
                    value={form.value}
                    onChange={(e) => setForm(prev => ({ ...prev, value: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="e.g. 350000"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Status</label>
                  <select 
                    value={form.status}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    disabled={!!form.assigned_to}
                  >
                    <option value="available">Available (Unassigned)</option>
                    <option value="maintenance">Under Maintenance</option>
                    <option value="retired">Retired / Defunct</option>
                    {form.assigned_to && <option value="assigned">Assigned</option>}
                  </select>
                </div>
                
                <div className="col-span-2 border-t border-gray-800 pt-4 mt-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Employee Assignment</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1 mt-1">Assign to Staff</label>
                  <select 
                    value={form.assigned_to}
                    onChange={(e) => setForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="">Unassigned</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1 mt-1">Assignment Date</label>
                  <input 
                    type="date" 
                    value={form.assigned_date}
                    onChange={(e) => setForm(prev => ({ ...prev, assigned_date: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    disabled={!form.assigned_to}
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Notes / Description</label>
                  <textarea 
                    value={form.notes}
                    onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 h-20 resize-none"
                    placeholder="Write additional technical specs or condition observations..."
                  />
                </div>
              </div>
              
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
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
                  {showAddModal ? 'Add Asset' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && targetAsset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center">
            <AlertTriangle className="mx-auto text-red-500 w-12 h-12 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Delete Asset?</h3>
            <p className="text-sm text-gray-400 mb-6">
              Are you sure you want to delete <strong className="text-white">{targetAsset.name}</strong>? This action is irreversible.
            </p>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-gray-800 hover:bg-gray-800 rounded-xl py-2.5 text-sm font-semibold text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
