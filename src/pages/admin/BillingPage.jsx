// src/pages/admin/BillingPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle, Zap, Users, Calendar, CreditCard,
  ArrowRight, Info, Star, Building2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';

// ── Plan features list ──────────────────────────────────────────────────────
const PLAN_FEATURES = {
  free: [
    'Up to 5 employees',
    'Attendance tracking (QR)',
    'Leave requests',
    'Basic dashboard',
    'Community support',
  ],
  starter: [
    'Up to 25 employees',
    'Everything in Free',
    'Meal order management',
    'CSV & Excel exports',
    'Email support',
  ],
  professional: [
    'Up to 100 employees',
    'Everything in Starter',
    'Advanced analytics',
    'Department management',
    'Priority support',
  ],
  enterprise: [
    'Unlimited employees',
    'Everything in Professional',
    'Custom integrations',
    'Dedicated account manager',
    'SLA guarantee',
  ],
};

// ── Demo payment history ────────────────────────────────────────────────────
const DEMO_HISTORY = [
  { id: 'INV-2026-003', date: '2026-06-01', plan: 'Professional', amount: 'LKR 4,990', status: 'Paid',   method: 'PayHere (Visa ···4242)' },
  { id: 'INV-2026-002', date: '2026-05-01', plan: 'Professional', amount: 'LKR 4,990', status: 'Paid',   method: 'PayHere (Visa ···4242)' },
  { id: 'INV-2026-001', date: '2026-04-01', plan: 'Starter',      amount: 'LKR 1,990', status: 'Paid',   method: 'PayHere (MC ···8888)'   },
];

const PLAN_ORDER = ['free', 'starter', 'professional', 'enterprise'];

export default function BillingPage() {
  const { darkMode, company, setCompany, profile, plan, planConfig, PLAN_CONFIG } = useApp();
  const [searchParams] = useSearchParams();
  const [empCount,    setEmpCount]    = useState(0);
  const [upgrading,   setUpgrading]   = useState(null); // plan key being upgraded to
  const [toastMsg,    setToastMsg]    = useState('');
  const [toastType,   setToastType]   = useState('success');
  const payFormRef = useRef(null);

  const origin    = window.location.origin;
  const orderId   = `ATDX-${company?.id?.slice(0, 8)}-${Date.now()}`;

  // ── Load employee count ──────────────────────────────────────────────────
  useEffect(() => {
    if (!company?.id) return;
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('status', 'active')
      .then(({ count }) => setEmpCount(count ?? 0));
  }, [company?.id]);

  // ── Handle PayHere redirect callback ─────────────────────────────────────
  useEffect(() => {
    const payment = searchParams.get('payment');
    const toPlan  = searchParams.get('plan');

    if (payment === 'success' && toPlan && PLAN_CONFIG?.[toPlan]) {
      handlePaymentSuccess(toPlan);
    } else if (payment === 'cancelled') {
      showToast('Payment was cancelled. No charge was made.', 'error');
    }
  }, [searchParams]);

  async function handlePaymentSuccess(toPlan) {
    // Update company plan in Supabase
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { error } = await supabase
      .from('companies')
      .update({ plan: toPlan, plan_expires_at: expiresAt.toISOString() })
      .eq('id', company.id);

    if (!error) {
      setCompany({ ...company, plan: toPlan, plan_expires_at: expiresAt.toISOString() });
      showToast(`🎉 Successfully upgraded to ${PLAN_CONFIG[toPlan].label}!`, 'success');
    }
  }

  function showToast(msg, type = 'success') {
    setToastMsg(msg); setToastType(type);
    setTimeout(() => setToastMsg(''), 5000);
  }

  // ── Trigger PayHere checkout ─────────────────────────────────────────────
  function handleUpgrade(targetPlan) {
    if (targetPlan === plan) return;
    if (targetPlan === 'free') {
      handleDowngradeToFree();
      return;
    }
    setUpgrading(targetPlan);
    // Form submits via the hidden PayHere form
    setTimeout(() => {
      if (payFormRef.current) payFormRef.current.submit();
    }, 100);
  }

  async function handleDowngradeToFree() {
    const { error } = await supabase
      .from('companies')
      .update({ plan: 'free', plan_expires_at: null })
      .eq('id', company.id);
    if (!error) {
      setCompany({ ...company, plan: 'free', plan_expires_at: null });
      showToast('Downgraded to Free plan.', 'success');
    }
  }

  const isFree    = plan === 'free';
  const empLimit  = planConfig?.employees === Infinity ? Infinity : (planConfig?.employees ?? 5);
  const usagePct  = empLimit === Infinity ? 0 : Math.min(100, Math.round((empCount / empLimit) * 100));

  const targetPlanConfig = upgrading ? PLAN_CONFIG?.[upgrading] : null;

  const card        = `rounded-2xl p-6 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`;
  const subTextCls  = darkMode ? 'text-gray-400' : 'text-gray-500';

  // Name parts for PayHere
  const nameParts = profile?.full_name?.split(' ') || ['', ''];
  const firstName = nameParts[0] || 'User';
  const lastName  = nameParts.slice(1).join(' ') || '-';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast */}
      {toastMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
          ${toastType === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {toastType === 'success' ? <CheckCircle size={16} /> : <Info size={16} />}
          {toastMsg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Billing & Plans</h1>
        <p className={`text-sm mt-1 ${subTextCls}`}>Manage your subscription and usage.</p>
      </div>

      {/* ── Current Plan Card ── */}
      <div className={`${card} relative overflow-hidden`}>
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 relative">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${subTextCls}`}>Current Plan</p>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{planConfig?.label ?? 'Free'}</h2>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planConfig?.badge}`}>
                {planConfig?.label}
              </span>
            </div>

            {!isFree && company?.plan_expires_at && (
              <p className={`text-xs mt-1 ${subTextCls}`}>
                Renews {format(new Date(company.plan_expires_at), 'MMMM d, yyyy')}
              </p>
            )}
          </div>

          <div className="text-right shrink-0">
            <p className="text-3xl font-bold">
              {planConfig?.price === 0 ? 'Free' : `LKR ${(planConfig?.price ?? 0).toLocaleString()}`}
              {planConfig?.price > 0 && <span className={`text-base font-normal ${subTextCls}`}>/mo</span>}
            </p>
          </div>
        </div>

        {/* Usage */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs ${subTextCls}`}>Employee Usage</span>
            <span className={`text-xs font-semibold ${subTextCls}`}>
              {empCount} / {empLimit === Infinity ? '∞' : empLimit}
            </span>
          </div>
          {empLimit !== Infinity && (
            <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          )}
          {usagePct >= 80 && empLimit !== Infinity && (
            <p className="text-xs text-amber-500 mt-1">
              ⚠ You're using {usagePct}% of your employee limit. Consider upgrading.
            </p>
          )}
        </div>
      </div>

      {/* ── Plan Cards ── */}
      <div>
        <h2 className="font-semibold text-base mb-4">Choose a Plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_ORDER.map(key => {
            const cfg       = PLAN_CONFIG?.[key];
            if (!cfg) return null;
            const isCurrent = key === plan;
            const isUpgrade = PLAN_ORDER.indexOf(key) > PLAN_ORDER.indexOf(plan);
            const isPro     = key === 'professional';

            return (
              <div
                key={key}
                className={`relative rounded-2xl p-5 flex flex-col gap-4 border-2 transition
                  ${isCurrent
                    ? 'border-red-500 ' + (darkMode ? 'bg-red-950/20' : 'bg-red-50')
                    : darkMode
                      ? 'bg-gray-900 border-gray-800 hover:border-gray-700'
                      : 'bg-white border-gray-100 shadow-sm hover:border-gray-300'}`}
              >
                {isPro && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                      Most Popular
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    {isCurrent && <CheckCircle size={14} className="text-red-500" />}
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {cfg.price === 0 ? 'Free' : `LKR ${cfg.price.toLocaleString()}`}
                    {cfg.price > 0 && <span className={`text-xs font-normal ${subTextCls}`}>/mo</span>}
                  </p>
                  <p className={`text-xs ${subTextCls} mt-0.5`}>
                    {cfg.employees === Infinity ? 'Unlimited' : `Up to ${cfg.employees}`} employees
                  </p>
                </div>

                <ul className="flex-1 space-y-2">
                  {PLAN_FEATURES[key]?.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs">
                      <CheckCircle size={12} className="text-green-500 shrink-0 mt-0.5" />
                      <span className={subTextCls}>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className={`text-center text-xs font-semibold py-2 rounded-xl ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'}`}>
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(key)}
                    disabled={!!upgrading}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-60
                      ${isUpgrade
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : darkMode
                          ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    {upgrading === key ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {isUpgrade ? <Zap size={14} /> : <ArrowRight size={14} />}
                        {isUpgrade ? 'Upgrade' : 'Downgrade'}
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PayHere Integration Note ── */}
      <div className={`flex items-start gap-3 p-4 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-blue-50 border border-blue-200'}`}>
        <Info size={16} className={`shrink-0 mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-blue-700'}`}>
          <strong>PayHere integration</strong> requires configuring{' '}
          <code className="font-mono bg-black/10 dark:bg-white/10 px-1 rounded">VITE_PAYHERE_MERCHANT_ID</code>{' '}
          in your <code className="font-mono bg-black/10 dark:bg-white/10 px-1 rounded">.env</code> file and setting up a webhook
          endpoint at <code className="font-mono bg-black/10 dark:bg-white/10 px-1 rounded">/api/payhere/notify</code> for production payment verification.
          Currently running in sandbox mode.
        </p>
      </div>

      {/* ── Hidden PayHere Form ── */}
      {upgrading && targetPlanConfig && (
        <form
          ref={payFormRef}
          method="POST"
          action="https://sandbox.payhere.lk/pay/checkout"
          className="hidden"
        >
          <input type="hidden" name="merchant_id"  value={import.meta.env.VITE_PAYHERE_MERCHANT_ID || 'YOUR_PAYHERE_MERCHANT_ID'} />
          <input type="hidden" name="return_url"   value={`${origin}/admin/billing?payment=success&plan=${upgrading}`} />
          <input type="hidden" name="cancel_url"   value={`${origin}/admin/billing?payment=cancelled`} />
          <input type="hidden" name="notify_url"   value={`${origin}/api/payhere/notify`} />
          <input type="hidden" name="order_id"     value={`ATDX-${company?.id?.slice(0, 8)}-${Date.now()}`} />
          <input type="hidden" name="items"        value={`AtendX ${targetPlanConfig.label} Plan - Monthly`} />
          <input type="hidden" name="currency"     value="LKR" />
          <input type="hidden" name="amount"       value={targetPlanConfig.price} />
          <input type="hidden" name="first_name"   value={firstName} />
          <input type="hidden" name="last_name"    value={lastName} />
          <input type="hidden" name="email"        value={profile?.email || ''} />
          <input type="hidden" name="phone"        value={profile?.mobile || '0000000000'} />
          <input type="hidden" name="address"      value="N/A" />
          <input type="hidden" name="city"         value="Colombo" />
          <input type="hidden" name="country"      value="Sri Lanka" />
        </form>
      )}

      {/* ── Payment History ── */}
      <div className={card}>
        <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
          <CreditCard size={16} className="text-red-500" /> Payment History
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-left text-xs font-semibold uppercase tracking-wider
                ${darkMode ? 'text-gray-500 border-b border-gray-800' : 'text-gray-400 border-b border-gray-100'}`}>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-50'} text-sm`}>
              {DEMO_HISTORY.map(row => (
                <tr key={row.id} className={`transition ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-red-500">{row.id}</td>
                  <td className="px-4 py-3 text-xs">{row.date}</td>
                  <td className="px-4 py-3">{row.plan}</td>
                  <td className="px-4 py-3 font-semibold">{row.amount}</td>
                  <td className={`px-4 py-3 text-xs ${subTextCls}`}>{row.method}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={`text-xs text-center mt-3 ${subTextCls}`}>
            (Demo data — real invoices will appear here after live payments)
          </p>
        </div>
      </div>
    </div>
  );
}
