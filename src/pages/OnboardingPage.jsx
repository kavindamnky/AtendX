import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  ExternalLink,
  Users,
  Zap,
  Star,
  ArrowRight,
  PartyPopper,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

// ─── PLAN CONFIG ──────────────────────────────────────────────────────────────
const PLAN_CONFIG = {
  free: {
    label: 'Free',
    price: 0,
    employees: 5,
    badge: 'bg-gray-800 text-gray-400',
    features: ['Up to 5 employees', 'QR Attendance', 'Basic Leave tracking', 'Email support'],
  },
  starter: {
    label: 'Starter',
    price: 1990,
    employees: 25,
    badge: 'bg-blue-900/40 text-blue-400',
    features: ['Up to 25 employees', 'QR + GPS Attendance', 'Full Leave management', 'Meal ordering', 'Analytics dashboard'],
  },
  professional: {
    label: 'Professional',
    price: 4990,
    employees: 100,
    badge: 'bg-red-900/40 text-red-400',
    features: ['Up to 100 employees', 'Everything in Starter', 'Custom branding', 'API access', 'Advanced analytics', 'Dedicated support'],
  },
  enterprise: {
    label: 'Enterprise',
    price: 9990,
    employees: Infinity,
    badge: 'bg-purple-900/40 text-purple-400',
    features: ['Unlimited employees', 'Everything in Professional', 'SLA guarantee', 'White-label', '24/7 phone support'],
  },
};

const INDUSTRIES = [
  'Technology', 'Retail', 'Healthcare', 'Education',
  'Finance', 'Manufacturing', 'Hospitality', 'Other',
];

const SIZES = ['1-10', '11-25', '26-100', '101-500', '500+'];

// ─── STEP PROGRESS BAR ────────────────────────────────────────────────────────
function StepProgress({ currentStep, totalSteps }) {
  const steps = ['Welcome', 'Company Details', 'Choose Plan', 'Done'];
  return (
    <div className="flex items-start justify-center gap-0 mb-10">
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div key={label} className="flex items-start">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isDone
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : isActive
                    ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-md shadow-red-500/30 scale-110'
                    : 'bg-white/8 text-gray-600 border border-white/10'
                }`}
              >
                {isDone ? <Check size={13} /> : stepNum}
              </div>
              <span
                className={`text-[10px] mt-1.5 font-medium whitespace-nowrap text-center ${
                  isActive ? 'text-red-400' : isDone ? 'text-emerald-400' : 'text-gray-600'
                }`}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 sm:w-16 h-px mt-4 mx-1 transition-all duration-300 ${
                  isDone ? 'bg-emerald-500/50' : 'bg-white/8'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── STEP 1: WELCOME / NAME + SLUG ────────────────────────────────────────────
function Step1({ name, setName, slug, setSlug, slugError, setSlugError }) {
  const generateSlug = (val) =>
    val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    const auto = generateSlug(val);
    setSlug(auto);
    validateSlug(auto);
  };

  const handleSlugChange = (e) => {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    setSlug(raw);
    validateSlug(raw);
  };

  const validateSlug = (val) => {
    if (!val) { setSlugError('Slug is required.'); return false; }
    if (val.length < 3) { setSlugError('Slug must be at least 3 characters.'); return false; }
    if (/^-|-$/.test(val)) { setSlugError('Slug cannot start or end with a hyphen.'); return false; }
    setSlugError('');
    return true;
  };

  const [copied, setCopied] = useState(false);
  const previewUrl = `attendx.app/company/${slug || 'your-company'}/login`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${previewUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-xl shadow-red-500/30">
          <Building2 size={24} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Let's set up your workspace</h2>
        <p className="text-sm text-gray-400 mt-1">Start with your company name</p>
      </div>

      {/* Company name */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Company name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="Acme Corporation"
          maxLength={80}
          className="w-full bg-white/5 border border-white/10 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none transition-all"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Company URL slug <span className="text-red-400">*</span>
          <span className="ml-1.5 text-gray-600 font-normal">(auto-generated, editable)</span>
        </label>
        <div className="flex items-center gap-0">
          <span className="flex-shrink-0 px-3 py-3 bg-white/3 border border-white/10 border-r-0 rounded-l-xl text-xs text-gray-500 whitespace-nowrap">
            attendx.app/company/
          </span>
          <input
            type="text"
            value={slug}
            onChange={handleSlugChange}
            placeholder="acme-corp"
            maxLength={40}
            className={`flex-1 bg-white/5 border ${
              slugError ? 'border-red-500/50' : 'border-white/10 focus:border-red-500/50'
            } focus:ring-1 focus:ring-red-500/30 rounded-r-xl px-3 py-3 text-sm text-white placeholder:text-gray-600 outline-none transition-all`}
          />
        </div>
        {slugError && (
          <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
            <AlertCircle size={11} /> {slugError}
          </p>
        )}
        <p className="text-xs text-gray-600 mt-1">Only lowercase letters, numbers, and hyphens allowed.</p>
      </div>

      {/* Preview URL */}
      {slug && !slugError && (
        <div className="flex items-center justify-between gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-0.5">Your employee login URL:</p>
            <p className="text-xs font-mono text-emerald-400 truncate">{previewUrl}</p>
          </div>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── STEP 2: COMPANY DETAILS ──────────────────────────────────────────────────
function Step2({ industry, setIndustry, size, setSize }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
          <Users size={24} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Tell us about your company</h2>
        <p className="text-sm text-gray-400 mt-1">Helps us tailor AtendX for your needs</p>
      </div>

      {/* Industry */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">
          Industry <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind}
              type="button"
              onClick={() => setIndustry(ind)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                industry === ind
                  ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                  : 'bg-white/5 border border-white/8 text-gray-400 hover:border-white/15 hover:text-gray-200'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Company size */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">
          Company size (employees) <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                size === s
                  ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                  : 'bg-white/5 border border-white/8 text-gray-400 hover:border-white/15 hover:text-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STEP 3: PLAN SELECTION ───────────────────────────────────────────────────
function Step3({ selectedPlan, setSelectedPlan }) {
  const planOrder = ['free', 'starter', 'professional', 'enterprise'];
  const planAccents = {
    free: { ring: 'ring-gray-500/40', glow: '' },
    starter: { ring: 'ring-blue-500/40', glow: 'shadow-blue-500/10' },
    professional: { ring: 'ring-red-500/60', glow: 'shadow-red-500/15' },
    enterprise: { ring: 'ring-purple-500/40', glow: 'shadow-purple-500/10' },
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/30">
          <Star size={24} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Choose your plan</h2>
        <p className="text-sm text-gray-400 mt-1">Start free, upgrade anytime. No credit card needed.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {planOrder.map((planKey) => {
          const plan = PLAN_CONFIG[planKey];
          const accent = planAccents[planKey];
          const isSelected = selectedPlan === planKey;
          const isFeatured = planKey === 'professional';

          return (
            <button
              key={planKey}
              type="button"
              onClick={() => setSelectedPlan(planKey)}
              className={`relative text-left p-4 rounded-2xl border transition-all duration-200 ${
                isSelected
                  ? `ring-2 ${accent.ring} bg-white/8 border-transparent shadow-lg ${accent.glow}`
                  : 'bg-white/3 border-white/8 hover:border-white/15 hover:bg-white/5'
              }`}
            >
              {isFeatured && (
                <div className="absolute -top-2 left-4 px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-[9px] font-bold text-white">
                  Popular
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1.5 ${plan.badge}`}>
                    {plan.label}
                  </span>
                  <div className="flex items-baseline gap-1">
                    {plan.price === 0 ? (
                      <span className="text-lg font-black text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-xs text-gray-500">LKR</span>
                        <span className="text-lg font-black text-white stat-number">
                          {plan.price.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-600">/mo</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {plan.employees === Infinity ? 'Unlimited' : `Up to ${plan.employees}`} employees
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected ? 'border-red-500 bg-red-500' : 'border-white/20'
                }`}>
                  {isSelected && <Check size={11} className="text-white" />}
                </div>
              </div>

              <ul className="space-y-1.5">
                {plan.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Check size={10} className={`flex-shrink-0 mt-0.5 ${isSelected ? 'text-red-400' : 'text-gray-600'}`} />
                    <span className="text-xs text-gray-400">{f}</span>
                  </li>
                ))}
                {plan.features.length > 4 && (
                  <li className="text-xs text-gray-600 pl-3.5">
                    +{plan.features.length - 4} more…
                  </li>
                )}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── STEP 4: DONE / CELEBRATION ───────────────────────────────────────────────
function Step4({ companyName, slug }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const loginUrl = `https://attendx.app/company/${slug}/login`;

  const handleCopy = () => {
    navigator.clipboard.writeText(loginUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Confetti dots
  const dots = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 8 + 4,
    color: ['bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-blue-400', 'bg-violet-400', 'bg-pink-400'][i % 6],
    delay: `${Math.random() * 2}s`,
    duration: `${Math.random() * 1.5 + 1}s`,
  }));

  return (
    <div className="text-center">
      {/* Confetti layer */}
      <div className="relative h-32 mb-4 overflow-hidden rounded-2xl bg-white/3 border border-white/8">
        {dots.map((dot) => (
          <div
            key={dot.id}
            className={`absolute rounded-full ${dot.color} opacity-70 animate-bounce`}
            style={{
              left: dot.left,
              top: dot.top,
              width: dot.size,
              height: dot.size,
              animationDelay: dot.delay,
              animationDuration: dot.duration,
            }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-2xl shadow-red-500/40">
            <PartyPopper size={28} className="text-white" />
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-black text-white mb-2">
        🎉 Your HR workspace is ready!
      </h2>
      <p className="text-sm text-gray-400 mb-2">
        <span className="text-white font-semibold">{companyName}</span> is all set on AtendX.
      </p>
      <p className="text-xs text-gray-500 mb-6">
        Share the employee login link below with your team so they can start checking in.
      </p>

      {/* Employee login URL */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-left">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 mb-0.5">Employee login URL</p>
          <p className="text-xs font-mono text-emerald-400 truncate">{loginUrl}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            title="Copy URL"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-gray-400" />}
          </button>
          <a
            href={loginUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            title="Open URL"
          >
            <ExternalLink size={13} className="text-gray-400" />
          </a>
        </div>
      </div>

      {/* Quick tips */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: Zap, label: 'QR codes ready', color: 'text-amber-400' },
          { icon: Users, label: 'Invite employees', color: 'text-blue-400' },
          { icon: Sparkles, label: 'Dashboard live', color: 'text-emerald-400' },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/3 border border-white/5">
            <Icon size={16} className={color} />
            <span className="text-xs text-gray-400 text-center leading-tight">{label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/dashboard')}
        className="w-full btn-gradient flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl text-sm shadow-xl shadow-red-500/20 glow-red-sm"
      >
        Go to Dashboard
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

// ─── MAIN ONBOARDING PAGE ─────────────────────────────────────────────────────
export default function OnboardingPage() {
  const { user, setCompany, setProfile } = useApp();
  const navigate = useNavigate();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;

  // Step 1
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugError, setSlugError] = useState('');

  // Step 2
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('');

  // Step 3
  const [selectedPlan, setSelectedPlan] = useState('free');

  // Final
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Track final created company name for done screen
  const [finalCompanyName, setFinalCompanyName] = useState('');
  const [finalSlug, setFinalSlug] = useState('');

  // ── Redirect if already onboarded ──────────────────────────────────────────
  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // ── Validation per step ─────────────────────────────────────────────────────
  const validateStep = () => {
    setError('');
    if (step === 1) {
      if (!name.trim()) { setError('Please enter your company name.'); return false; }
      if (!slug || slug.length < 3) { setError('Please enter a valid company slug (min. 3 characters).'); return false; }
      if (slugError) { setError(slugError); return false; }
      return true;
    }
    if (step === 2) {
      if (!industry) { setError('Please select your industry.'); return false; }
      if (!size) { setError('Please select your company size.'); return false; }
      return true;
    }
    if (step === 3) return true;
    return true;
  };

  // ── Check slug uniqueness ───────────────────────────────────────────────────
  const checkSlugAvailable = async (slugToCheck) => {
    const { data, error } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', slugToCheck)
      .maybeSingle();
    if (error) throw new Error('Could not verify slug availability. Please try again.');
    if (data) throw new Error(`The slug "${slugToCheck}" is already taken. Please choose a different one.`);
  };

  // ── Submit (Step 3 → Step 4) ────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      // Check slug uniqueness
      await checkSlugAvailable(slug);

      // Insert company
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: name.trim(),
          slug: slug.trim(),
          owner_id: user.id,
          industry,
          size,
          plan: selectedPlan,
          is_onboarded: true,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Insert owner profile
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          company_id: newCompany.id,
          auth_user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
          role: 'owner',
          status: 'active',
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Update context
      setCompany(newCompany);
      if (setProfile) setProfile(newProfile);

      // Save for done screen
      setFinalCompanyName(newCompany.name);
      setFinalSlug(newCompany.slug);

      // Move to done step
      setStep(4);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (!validateStep()) return;
    if (step === 3) {
      await handleSubmit();
    } else {
      setError('');
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/3 rounded-full blur-3xl" />
      </div>

      {/* Logo bar */}
      <div className="relative z-10 p-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" className="w-8 h-8 rounded-lg object-cover shadow-lg shadow-red-500/20" alt="AtendX Logo" />
          <span className="text-white font-bold text-lg tracking-tight">AtendX</span>
        </div>
        {step < 4 && (
          <span className="text-xs text-gray-600">
            Step {step} of {TOTAL_STEPS - 1}
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-lg">

          {/* Step progress */}
          <StepProgress currentStep={step} totalSteps={TOTAL_STEPS} />

          {/* Card */}
          <div className="glass rounded-2xl p-6 sm:p-8 border border-white/8 shadow-2xl">

            {/* Step content */}
            {step === 1 && (
              <Step1
                name={name}
                setName={setName}
                slug={slug}
                setSlug={setSlug}
                slugError={slugError}
                setSlugError={setSlugError}
              />
            )}
            {step === 2 && (
              <Step2
                industry={industry}
                setIndustry={setIndustry}
                size={size}
                setSize={setSize}
              />
            )}
            {step === 3 && (
              <Step3
                selectedPlan={selectedPlan}
                setSelectedPlan={setSelectedPlan}
              />
            )}
            {step === 4 && (
              <Step4
                companyName={finalCompanyName}
                slug={finalSlug}
              />
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 mt-5">
                <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Navigation buttons */}
            {step < 4 && (
              <div className="flex items-center gap-3 mt-6">
                {step > 1 && (
                  <button
                    onClick={handleBack}
                    disabled={submitting}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all disabled:opacity-50"
                  >
                    <ChevronLeft size={15} /> Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={submitting}
                  className="flex-1 btn-gradient flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl text-sm shadow-lg shadow-red-500/15 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating workspace…
                    </>
                  ) : step === 3 ? (
                    <>
                      <Sparkles size={15} />
                      Create My Workspace
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight size={15} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Safety note */}
          {step < 4 && (
            <p className="text-center text-xs text-gray-700 mt-4">
              🔒 Your data is encrypted and secure. You can change any settings later.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
