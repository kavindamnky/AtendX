// src/pages/admin/AdminPayrollPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { 
  Calculator, User, Coins, Calendar, FileText, CheckCircle, 
  AlertTriangle, DollarSign, Download, Printer, Save, Loader2 
} from 'lucide-react';
import { format } from 'date-fns';

// Sri Lanka APIT/PAYE Tax Slabs (Monthly)
// Up to 100,000 is tax free
// Next 50,000 @ 6% (up to 150,000)
// Next 50,000 @ 12% (up to 200,000)
// Next 50,000 @ 18% (up to 250,000)
// Next 50,000 @ 24% (up to 300,000)
// Next 50,000 @ 30% (up to 350,000)
// Above 350,000 @ 36%
export function calculateSLTax(monthlyEarnings) {
  if (monthlyEarnings <= 100000) return 0;
  
  let taxable = monthlyEarnings - 100000;
  let tax = 0;
  
  // Slab 1: 100,000 to 150,000 (up to 50,000 @ 6%)
  if (taxable > 50000) {
    tax += 50000 * 0.06;
    taxable -= 50000;
  } else {
    return tax + taxable * 0.06;
  }
  
  // Slab 2: 150,000 to 200,000 (up to 50,000 @ 12%)
  if (taxable > 50000) {
    tax += 50000 * 0.12;
    taxable -= 50000;
  } else {
    return tax + taxable * 0.12;
  }
  
  // Slab 3: 200,000 to 250,000 (up to 50,000 @ 18%)
  if (taxable > 50000) {
    tax += 50000 * 0.18;
    taxable -= 50000;
  } else {
    return tax + taxable * 0.18;
  }
  
  // Slab 4: 250,000 to 300,000 (up to 50,000 @ 24%)
  if (taxable > 50000) {
    tax += 50000 * 0.24;
    taxable -= 50000;
  } else {
    return tax + taxable * 0.24;
  }
  
  // Slab 5: 300,000 to 350,000 (up to 50,000 @ 30%)
  if (taxable > 50000) {
    tax += 50000 * 0.30;
    taxable -= 50000;
  } else {
    return tax + taxable * 0.30;
  }
  
  // Remaining: Above 350,000 @ 36%
  tax += taxable * 0.36;
  return tax;
}

export default function AdminPayrollPage() {
  const { company, darkMode } = useApp();
  
  const [employees, setEmployees] = useState([]);
  const [configs, setConfigs] = useState({}); // employee_id -> config row
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbNeedsUpdate, setDbNeedsUpdate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [configTarget, setConfigTarget] = useState(null); // Employee config modal target
  const [configForm, setConfigForm] = useState({ basic_salary: 0, allowances: 0, deductions: 0 });

  // Load employee lists & configs & payroll runs
  const loadData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    setError('');
    
    try {
      // 1. Fetch profiles
      const { data: emps, error: empErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('full_name');
        
      if (empErr) throw empErr;
      setEmployees(emps || []);
      
      // 2. Fetch employee_payroll_config
      const { data: payConfigs, error: configErr } = await supabase
        .from('employee_payroll_config')
        .select('*')
        .eq('company_id', company.id);
        
      if (configErr) {
        if (configErr.code === '42P01') { // Relation does not exist
          setDbNeedsUpdate(true);
          setLoading(false);
          return;
        }
        throw configErr;
      }
      
      const configMap = {};
      payConfigs?.forEach(c => {
        configMap[c.employee_id] = c;
      });
      setConfigs(configMap);
      
      // 3. Fetch payroll_runs
      const { data: runs, error: runsErr } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('company_id', company.id)
        .order('payroll_month', { ascending: false });
        
      if (runsErr) throw runsErr;
      setPayrollRuns(runs || []);
      
    } catch (err) {
      console.error('Payroll load error:', err);
      setError('Failed to load payroll data. Check console.');
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load payslips for selected run
  const loadPayslips = async (run) => {
    setSelectedRun(run);
    setSelectedPayslip(null);
    if (!run) {
      setPayslips([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('employee_payslips')
        .select('*, profiles!employee_id(full_name, employee_id, department, email)')
        .eq('payroll_run_id', run.id);
      if (error) throw error;
      setPayslips(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load payslips.');
    }
  };

  // Open config modal
  const openConfigModal = (emp) => {
    setConfigTarget(emp);
    const existing = configs[emp.id] || { basic_salary: 0, allowances: 0, deductions: 0 };
    setConfigForm({
      basic_salary: existing.basic_salary || 0,
      allowances: existing.allowances || 0,
      deductions: existing.deductions || 0
    });
  };

  // Save employee payroll config
  const saveConfig = async (e) => {
    e.preventDefault();
    if (!configTarget) return;
    setSaving(true);
    
    try {
      const existing = configs[configTarget.id];
      if (existing) {
        const { error } = await supabase
          .from('employee_payroll_config')
          .update({
            basic_salary: Number(configForm.basic_salary),
            allowances: Number(configForm.allowances),
            deductions: Number(configForm.deductions),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employee_payroll_config')
          .insert({
            company_id: company.id,
            employee_id: configTarget.id,
            basic_salary: Number(configForm.basic_salary),
            allowances: Number(configForm.allowances),
            deductions: Number(configForm.deductions)
          });
        if (error) throw error;
      }
      
      setSuccess(`Payroll settings for ${configTarget.full_name} saved.`);
      setConfigTarget(null);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // Process / Run payroll for the selected month
  const runPayroll = async () => {
    if (!selectedMonth) return;
    setSaving(true);
    setError('');
    
    try {
      const firstOfMonth = `${selectedMonth}-01`;
      
      // 1. Create or get the payroll run
      let { data: run, error: runErr } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('company_id', company.id)
        .eq('payroll_month', firstOfMonth)
        .maybeSingle();
        
      if (runErr) throw runErr;
      
      if (!run) {
        const { data: newRun, error: insRunErr } = await supabase
          .from('payroll_runs')
          .insert({
            company_id: company.id,
            payroll_month: firstOfMonth,
            status: 'draft'
          })
          .select()
          .single();
        if (insRunErr) throw insRunErr;
        run = newRun;
      } else if (run.status === 'paid') {
        throw new Error('Payroll for this month is already finalized/paid.');
      }
      
      // 2. Generate slips for all active employees with configuration
      const slipsToInsert = [];
      
      for (const emp of employees) {
        const config = configs[emp.id];
        if (!config || Number(config.basic_salary) <= 0) continue; // Skip employees with no set salary
        
        const basic = Number(config.basic_salary);
        const allowances = Number(config.allowances);
        const deductions = Number(config.deductions);
        
        // Sri Lanka EPF & ETF calculations
        const epf_employee = basic * 0.08;
        const epf_employer = basic * 0.12;
        const etf_employer = basic * 0.03;
        
        // APIT calculation (Basic + Allowances is subject to tax in SL)
        const grossForTax = basic + allowances;
        const apit_tax = calculateSLTax(grossForTax);
        
        // Net pay calculation
        const net_pay = grossForTax - deductions - epf_employee - apit_tax;
        
        slipsToInsert.push({
          company_id: company.id,
          payroll_run_id: run.id,
          employee_id: emp.id,
          basic_salary: basic,
          allowances: allowances,
          deductions: deductions,
          epf_employee: Number(epf_employee.toFixed(2)),
          epf_employer: Number(epf_employer.toFixed(2)),
          etf_employer: Number(etf_employer.toFixed(2)),
          apit_tax: Number(apit_tax.toFixed(2)),
          net_pay: Number(net_pay.toFixed(2))
        });
      }
      
      if (slipsToInsert.length === 0) {
        throw new Error('No employees have basic salary configurations set up.');
      }
      
      // Clean existing draft payslips
      await supabase
        .from('employee_payslips')
        .delete()
        .eq('payroll_run_id', run.id);
        
      // Insert new slips
      const { error: slipErr } = await supabase
        .from('employee_payslips')
        .insert(slipsToInsert);
        
      if (slipErr) throw slipErr;
      
      // Update run status to processed
      const { error: updErr } = await supabase
        .from('payroll_runs')
        .update({ status: 'processed', updated_at: new Date().toISOString() })
        .eq('id', run.id);
        
      if (updErr) throw updErr;
      
      setSuccess(`Payroll calculated successfully for ${selectedMonth}.`);
      await loadData();
      // Load current payslips
      const updatedRun = { ...run, status: 'processed' };
      await loadPayslips(updatedRun);
      
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error processing payroll.');
    } finally {
      setSaving(false);
    }
  };

  // Finalize / Mark payroll as paid
  const finalizePayroll = async () => {
    if (!selectedRun) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('payroll_runs')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', selectedRun.id);
      if (error) throw error;
      
      setSuccess('Payroll finalized and status updated to PAID.');
      await loadData();
      setSelectedRun(prev => ({ ...prev, status: 'paid' }));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to finalize payroll.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (dbNeedsUpdate) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center max-w-xl mx-auto my-12">
        <AlertTriangle className="mx-auto text-amber-500 w-12 h-12 mb-4" />
        <h3 className="text-lg font-bold text-amber-400 mb-2">Database Setup Required</h3>
        <p className="text-sm text-gray-400 mb-4">
          The Payroll modules require new database tables. Please copy the SQL queries from the 
          <code className="bg-gray-950 px-2 py-1 rounded text-red-400 font-mono mx-1">supabase_updates.sql</code> 
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="text-red-500" />
            Payroll & Tax Management
          </h1>
          <p className="text-sm text-gray-400">
            Configure employee compensation, calculate taxes, and generate Sri Lankan statutory reports.
          </p>
        </div>
        
        {/* Month selector and Calculate */}
        <div className="flex gap-2 items-center bg-gray-900/40 p-2 rounded-xl border border-gray-800">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sm border-0 focus:ring-0 text-white"
          />
          <button
            onClick={runPayroll}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator size={16} />}
            Calculate Payroll
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Employee compensation table or run details */}
        <div className="lg:col-span-2 space-y-6">
          
          {selectedRun ? (
            /* Selected Payroll Run Payslips List */
            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Calendar size={18} className="text-red-500" />
                    Payroll Batch: {format(new Date(selectedRun.payroll_month), 'MMMM yyyy')}
                  </h3>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded mt-1 ${
                    selectedRun.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {selectedRun.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedRun(null)}
                    className="border border-gray-800 hover:bg-gray-800 px-3 py-1.5 rounded-lg text-xs"
                  >
                    Back to Settings
                  </button>
                  {selectedRun.status === 'processed' && (
                    <button
                      onClick={finalizePayroll}
                      className="bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition"
                    >
                      Finalize & Pay
                    </button>
                  )}
                </div>
              </div>

              {payslips.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No payslips generated for this batch.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400">
                        <th className="pb-3">Employee</th>
                        <th className="pb-3">Basic</th>
                        <th className="pb-3">Allowances</th>
                        <th className="pb-3">EPF (8%)</th>
                        <th className="pb-3">APIT Tax</th>
                        <th className="pb-3">Net Pay</th>
                        <th className="pb-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {payslips.map(slip => (
                        <tr key={slip.id} className="hover:bg-gray-800/10">
                          <td className="py-3.5">
                            <div className="font-medium text-white">{slip.profiles?.full_name}</div>
                            <div className="text-xs text-gray-500">{slip.profiles?.department}</div>
                          </td>
                          <td className="py-3.5 font-mono">LKR {slip.basic_salary.toLocaleString()}</td>
                          <td className="py-3.5 font-mono">LKR {slip.allowances.toLocaleString()}</td>
                          <td className="py-3.5 text-red-400 font-mono">LKR {slip.epf_employee.toLocaleString()}</td>
                          <td className="py-3.5 text-red-400 font-mono">LKR {slip.apit_tax.toLocaleString()}</td>
                          <td className="py-3.5 font-bold text-emerald-400 font-mono">LKR {slip.net_pay.toLocaleString()}</td>
                          <td className="py-3.5">
                            <button
                              onClick={() => setSelectedPayslip(slip)}
                              className="text-red-500 hover:text-red-400 text-xs flex items-center gap-0.5"
                            >
                              <FileText size={14} />
                              View slip
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Default: Employee Salaries Configurations */
            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <User size={18} className="text-red-500" />
                Employee Salaries Config
              </h3>
              
              {employees.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No active employees found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400">
                        <th className="pb-3">Employee</th>
                        <th className="pb-3">Basic Salary</th>
                        <th className="pb-3">Allowances</th>
                        <th className="pb-3">Deductions</th>
                        <th className="pb-3">Estimated APIT</th>
                        <th className="pb-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {employees.map(emp => {
                        const config = configs[emp.id] || { basic_salary: 0, allowances: 0, deductions: 0 };
                        const estGross = Number(config.basic_salary) + Number(config.allowances);
                        const estTax = calculateSLTax(estGross);
                        
                        return (
                          <tr key={emp.id} className="hover:bg-gray-800/10">
                            <td className="py-3.5">
                              <div className="font-medium text-white">{emp.full_name}</div>
                              <div className="text-xs text-gray-500">{emp.department}</div>
                            </td>
                            <td className="py-3.5 font-mono">
                              LKR {Number(config.basic_salary || 0).toLocaleString()}
                            </td>
                            <td className="py-3.5 font-mono">
                              LKR {Number(config.allowances || 0).toLocaleString()}
                            </td>
                            <td className="py-3.5 font-mono">
                              LKR {Number(config.deductions || 0).toLocaleString()}
                            </td>
                            <td className="py-3.5 font-mono text-xs text-gray-400">
                              LKR {estTax.toLocaleString()}
                            </td>
                            <td className="py-3.5">
                              <button
                                onClick={() => openConfigModal(emp)}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1 rounded-lg text-xs font-semibold"
                              >
                                Edit Settings
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
        </div>

        {/* Right Col: Payroll runs summary */}
        <div className="space-y-6">
          <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-red-500" />
              Payroll History
            </h3>
            
            {payrollRuns.length === 0 ? (
              <div className="text-gray-500 text-sm py-4 text-center">
                No past payroll runs. Use "Calculate Payroll" to begin.
              </div>
            ) : (
              <div className="space-y-3">
                {payrollRuns.map(run => (
                  <button
                    key={run.id}
                    onClick={() => loadPayslips(run)}
                    className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between ${
                      selectedRun?.id === run.id
                        ? 'bg-red-500/10 border-red-500 text-white' 
                        : 'bg-gray-800/10 border-gray-800/50 hover:bg-gray-800/30 text-gray-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">
                        {format(new Date(run.payroll_month), 'MMMM yyyy')}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Run: {format(new Date(run.created_at), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      run.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {run.status.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Statutory EPF/ETF Reference card */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6 text-sm space-y-3">
            <h4 className="font-bold text-gray-200">Sri Lanka Statutory Info</h4>
            <ul className="space-y-2 text-xs text-gray-400 list-disc list-inside">
              <li>EPF Employee deduction: <strong className="text-red-400">8%</strong> of basic salary</li>
              <li>EPF Employer contribution: <strong className="text-white">12%</strong> of basic salary</li>
              <li>ETF Employer contribution: <strong className="text-white">3%</strong> of basic salary</li>
              <li>APIT/PAYE Tax free limit: <strong className="text-emerald-400">LKR 100,000</strong> per month</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Salary Config Modal */}
      {configTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Coins size={18} className="text-red-500" />
                Salary Config: {configTarget.full_name}
              </h3>
              <button 
                onClick={() => setConfigTarget(null)}
                className="text-gray-400 hover:text-white"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={saveConfig} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Basic Salary (LKR)</label>
                <input 
                  type="number" 
                  value={configForm.basic_salary}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, basic_salary: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="e.g. 120000"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Allowances (LKR)</label>
                <input 
                  type="number" 
                  value={configForm.allowances}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, allowances: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="e.g. 15000"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Deductions (LKR)</label>
                <input 
                  type="number" 
                  value={configForm.deductions}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, deductions: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="e.g. 2000"
                  min="0"
                />
              </div>
              
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfigTarget(null)}
                  className="flex-1 border border-gray-800 hover:bg-gray-800 rounded-xl py-2.5 text-sm font-semibold text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip View Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-gray-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl p-8 relative print:p-0 print:shadow-none print:rounded-none">
            {/* Close button for screen */}
            <button
              onClick={() => setSelectedPayslip(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 print:hidden text-2xl font-bold"
            >
              &times;
            </button>
            
            {/* Print action header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 print:hidden">
              <span className="text-sm font-semibold text-gray-500">Payslip Preview</span>
              <button
                onClick={handlePrint}
                className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow"
              >
                <Printer size={16} />
                Print Payslip
              </button>
            </div>
            
            {/* Payslip Details */}
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-red-600">{company?.name || 'AtendX'}</h2>
                  <p className="text-xs text-gray-500 mt-1">HR & Attendance Platform Workspace</p>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-gray-800">PAYSLIP</h3>
                  <p className="text-sm text-gray-600 font-medium mt-1">
                    Month: {selectedRun ? format(new Date(selectedRun.payroll_month), 'MMMM yyyy') : ''}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-4 text-sm">
                <div>
                  <div className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Employee Details</div>
                  <div className="font-bold text-gray-800 mt-1">{selectedPayslip.profiles?.full_name}</div>
                  <div className="text-gray-600 text-xs mt-0.5">ID: {selectedPayslip.profiles?.employee_id || 'N/A'}</div>
                  <div className="text-gray-600 text-xs">Department: {selectedPayslip.profiles?.department || 'N/A'}</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Slip Reference</div>
                  <div className="text-gray-700 mt-1">Slip ID: {selectedPayslip.id.slice(0, 8).toUpperCase()}</div>
                  <div className="text-gray-600 text-xs mt-0.5">Issued: {format(new Date(selectedPayslip.created_at), 'yyyy-MM-dd')}</div>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                {/* Earnings */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-1.5 uppercase text-xs tracking-wider">Earnings</h4>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Basic Salary</span>
                    <span className="font-semibold text-gray-800 font-mono">LKR {selectedPayslip.basic_salary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Allowances</span>
                    <span className="font-semibold text-gray-800 font-mono">LKR {selectedPayslip.allowances.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 font-bold">
                    <span className="text-gray-800">Gross Earnings</span>
                    <span className="font-mono">LKR {(selectedPayslip.basic_salary + selectedPayslip.allowances).toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Deductions */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-1.5 uppercase text-xs tracking-wider">Deductions</h4>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">EPF Employee (8%)</span>
                    <span className="font-semibold text-red-600 font-mono">LKR {selectedPayslip.epf_employee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">APIT (PAYE Tax)</span>
                    <span className="font-semibold text-red-600 font-mono">LKR {selectedPayslip.apit_tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Other Deductions</span>
                    <span className="font-semibold text-red-600 font-mono">LKR {selectedPayslip.deductions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 font-bold">
                    <span className="text-gray-800">Total Deductions</span>
                    <span className="text-red-600 font-mono">
                      LKR {(selectedPayslip.epf_employee + selectedPayslip.apit_tax + selectedPayslip.deductions).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Pay Box */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center text-emerald-800">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-emerald-600">Net Take Home Pay</span>
                  <p className="text-[10px] text-emerald-500 mt-0.5">Direct Deposit to registered Bank Account</p>
                </div>
                <span className="text-2xl font-bold font-mono">LKR {selectedPayslip.net_pay.toLocaleString()}</span>
              </div>
              
              {/* Employer Contributions */}
              <div className="border-t border-gray-100 pt-4 space-y-2 text-xs text-gray-500">
                <div className="font-bold uppercase tracking-wider text-gray-400 mb-1">Employer Statutory Contributions (Not Deducted)</div>
                <div className="flex justify-between">
                  <span>EPF Employer (12%)</span>
                  <span className="font-mono">LKR {selectedPayslip.epf_employer.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>ETF Employer (3%)</span>
                  <span className="font-mono">LKR {selectedPayslip.etf_employer.toLocaleString()}</span>
                </div>
              </div>
              
              {/* Footer */}
              <div className="text-center text-[10px] text-gray-400 pt-8 border-t border-gray-100">
                This is a system generated document and does not require a physical signature. AtendX Payroll Management System.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
