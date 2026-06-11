import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  QrCode,
  CalendarCheck,
  UtensilsCrossed,
  ChevronRight,
  Check,
  Star,
  Users,
  Building2,
  Zap,
  ArrowRight,
  Menu,
  X,
  Clock,
  BarChart3,
  Shield,
  Sparkles,
  TrendingUp,
  Bell,
} from 'lucide-react';

// ─── PLAN CONFIG (mirrored from AppContext) ───────────────────────────────────
const PLAN_CONFIG = {
  free: {
    label: 'Free',
    price: 0,
    employees: 5,
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    features: ['Up to 5 employees', 'QR Attendance', 'Basic Leave tracking', 'Email support', '1 department'],
  },
  starter: {
    label: 'Starter',
    price: 1990,
    employees: 25,
    badge: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    features: ['Up to 25 employees', 'QR + GPS Attendance', 'Full Leave management', 'Meal ordering', 'Priority support', 'Analytics dashboard'],
  },
  professional: {
    label: 'Professional',
    price: 4990,
    employees: 100,
    badge: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    features: ['Up to 100 employees', 'Everything in Starter', 'Custom branding', 'API access', 'Advanced analytics', 'Dedicated support', 'Custom integrations'],
  },
  enterprise: {
    label: 'Enterprise',
    price: 9990,
    employees: Infinity,
    badge: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
    features: ['Unlimited employees', 'Everything in Professional', 'SLA guarantee', 'Custom contracts', 'On-premise option', 'White-label', '24/7 phone support'],
  },
};

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'backdrop-blur-xl bg-zinc-950/80 border-b border-white/5 shadow-xl shadow-black/20' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:shadow-red-500/50 transition-shadow">
              <span className="text-white font-black text-sm">A</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">AtendX</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How it Works</a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-gray-300 hover:text-white px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="btn-gradient text-sm text-white px-4 py-2 rounded-lg font-semibold"
            >
              Start Free
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-400 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-white/5 mt-2 pt-4 space-y-2">
            <a href="#features" className="block text-sm text-gray-400 hover:text-white py-2 transition-colors" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#pricing" className="block text-sm text-gray-400 hover:text-white py-2 transition-colors" onClick={() => setMobileOpen(false)}>Pricing</a>
            <a href="#how-it-works" className="block text-sm text-gray-400 hover:text-white py-2 transition-colors" onClick={() => setMobileOpen(false)}>How it Works</a>
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="flex-1 text-center text-sm text-gray-300 px-4 py-2 rounded-lg border border-white/10">Sign In</Link>
              <Link to="/signup" className="flex-1 text-center btn-gradient text-sm text-white px-4 py-2 rounded-lg font-semibold">Start Free</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── MOCK DASHBOARD CARD ─────────────────────────────────────────────────────
function MockDashboard() {
  return (
    <div className="relative w-full max-w-2xl mx-auto mt-12 fade-in-up-4">
      {/* Glow effect behind card */}
      <div className="absolute -inset-4 bg-red-500/10 rounded-3xl blur-2xl" />
      <div className="relative glass rounded-2xl p-5 border border-white/10 shadow-2xl">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Dashboard</div>
            <div className="text-white font-semibold">Good morning, Sarah 👋</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Present Today', value: '47', color: 'from-emerald-500/20 to-emerald-600/10', dot: 'bg-emerald-400', change: '+3' },
            { label: 'On Leave', value: '8', color: 'from-amber-500/20 to-amber-600/10', dot: 'bg-amber-400', change: '-1' },
            { label: 'Pending', value: '3', color: 'from-red-500/20 to-red-600/10', dot: 'bg-red-400', change: '+2' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl p-3 bg-gradient-to-br ${stat.color} border border-white/5`}>
              <div className={`w-1.5 h-1.5 rounded-full ${stat.dot} mb-2`} />
              <div className="text-xl font-bold text-white stat-number">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.change} today</div>
            </div>
          ))}
        </div>

        {/* Bar chart simulation */}
        <div className="bg-white/3 rounded-xl p-4 mb-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-300">Weekly Attendance</span>
            <span className="text-xs text-gray-500">Jun 2026</span>
          </div>
          <div className="flex items-end gap-2 h-16">
            {[72, 88, 95, 80, 91, 65, 47].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-sm bg-gradient-to-t from-red-600 to-red-400 opacity-80"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[9px] text-gray-600">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="space-y-2">
          {[
            { name: 'Alex Fernando', action: 'Checked in', time: '8:02 AM', color: 'bg-emerald-400' },
            { name: 'Priya Nair', action: 'Leave approved', time: '8:45 AM', color: 'bg-blue-400' },
            { name: 'Rohan Perera', action: 'Meal ordered', time: '9:10 AM', color: 'bg-amber-400' },
          ].map((item) => (
            <div key={item.name} className="flex items-center gap-3 py-1.5">
              <div className={`w-2 h-2 rounded-full ${item.color} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-white font-medium">{item.name}</span>
                <span className="text-xs text-gray-500 ml-1.5">{item.action}</span>
              </div>
              <span className="text-xs text-gray-600 flex-shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── HERO SECTION ─────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="hero-bg hero-grid min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 mb-6 fade-in-up">
        <Sparkles size={12} className="text-red-400" />
        <span className="text-xs font-medium text-red-400">HR automation for modern businesses</span>
      </div>

      {/* Headline */}
      <h1 className="fade-in-up-1 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.08] tracking-tight max-w-4xl mx-auto mb-6">
        The HR Platform
        <br />
        <span className="gradient-text">Your Business Deserves</span>
      </h1>

      {/* Subtitle */}
      <p className="fade-in-up-2 text-lg text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed">
        Manage attendance with QR codes, streamline leave approvals, and track meal orders — all in one beautiful dashboard built for teams of every size.
      </p>

      {/* CTA buttons */}
      <div className="fade-in-up-3 flex flex-col sm:flex-row items-center gap-4 mb-10">
        <Link
          to="/signup"
          className="btn-gradient group flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded-xl text-sm shadow-lg shadow-red-500/20"
        >
          Start Free — No Credit Card
          <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <a
          href="#pricing"
          className="flex items-center gap-2 text-sm text-gray-300 hover:text-white px-7 py-3.5 rounded-xl border border-white/10 hover:border-white/20 transition-all"
        >
          See Pricing <ChevronRight size={14} />
        </a>
      </div>

      {/* Trust badges */}
      <div className="fade-in-up-3 flex flex-col sm:flex-row items-center justify-center gap-6 mb-4">
        {[
          { icon: Building2, label: '500+ Companies' },
          { icon: Users, label: '10K+ Employees Tracked' },
          { icon: Zap, label: 'Free Plan Forever' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
              <Icon size={11} className="text-red-400" />
            </div>
            <span className="text-sm text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Mock dashboard */}
      <MockDashboard />
    </section>
  );
}

// ─── FEATURES SECTION ─────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: QrCode,
      title: 'QR Attendance',
      description: 'Employees scan a unique QR code to check in and out instantly. Real-time tracking with geolocation verification and automatic work-hour calculation.',
      gradient: 'from-red-500 to-rose-600',
      glow: 'shadow-red-500/20',
      stats: '< 2 sec check-in',
    },
    {
      icon: CalendarCheck,
      title: 'Leave Management',
      description: 'Streamline leave requests and approvals with automated workflows. Track annual, sick, and custom leave types with balance management.',
      gradient: 'from-blue-500 to-violet-600',
      glow: 'shadow-blue-500/20',
      stats: '50% less admin time',
    },
    {
      icon: UtensilsCrossed,
      title: 'Meal Tracking',
      description: 'Employees pre-order meals from curated menus. Reduce waste, simplify catering logistics, and keep your team energized and productive.',
      gradient: 'from-amber-500 to-orange-600',
      glow: 'shadow-amber-500/20',
      stats: '30% cost reduction',
    },
  ];

  return (
    <section id="features" className="py-24 px-4 bg-zinc-950">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
            <Zap size={12} className="text-red-400" />
            <span className="text-xs font-medium text-gray-400">Everything you need</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Powerful features,{' '}
            <span className="gradient-text">zero complexity</span>
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            Three core modules working seamlessly together to handle your entire HR workflow.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="glass rounded-2xl p-6 border border-white/8 hover:border-white/15 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg ${feature.glow} group-hover:scale-110 transition-transform`}>
                  <Icon size={22} className="text-white" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/8 mb-3">
                  <TrendingUp size={10} className="text-green-400" />
                  <span className="text-xs text-green-400 font-medium">{feature.stats}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Additional mini-features */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          {[
            { icon: Bell, label: 'Smart Notifications' },
            { icon: Shield, label: 'Enterprise Security' },
            { icon: BarChart3, label: 'Advanced Analytics' },
            { icon: Clock, label: 'Real-time Sync' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-xl bg-white/3 border border-white/5">
              <Icon size={16} className="text-red-400 flex-shrink-0" />
              <span className="text-sm text-gray-300 font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Sign Up',
      description: 'Create your free AtendX account in seconds. No credit card required, no lengthy forms.',
    },
    {
      number: '02',
      title: 'Configure',
      description: 'Set up your company profile, invite your team, and configure attendance rules and leave policies.',
    },
    {
      number: '03',
      title: 'Manage',
      description: 'Your team starts tracking attendance via QR, requesting leaves, and ordering meals — all from their phones.',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-4 bg-gradient-to-b from-zinc-950 to-black">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
            <Sparkles size={12} className="text-red-400" />
            <span className="text-xs font-medium text-gray-400">Simple setup</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Up and running in{' '}
            <span className="gradient-text">under 10 minutes</span>
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            We've made onboarding painless so you can focus on what matters — your people.
          </p>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative text-center group">
                {/* Number circle */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-xl shadow-red-500/25 group-hover:shadow-red-500/40 transition-shadow group-hover:scale-105 transform transition-transform">
                  <span className="text-2xl font-black text-white">{step.number}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <Link
            to="/signup"
            className="btn-gradient inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl text-sm"
          >
            Get started for free <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── PRICING ──────────────────────────────────────────────────────────────────
function Pricing() {
  const planOrder = ['free', 'starter', 'professional', 'enterprise'];
  const planColors = {
    free: { border: 'border-white/8', btn: 'bg-white/8 hover:bg-white/12 text-white' },
    starter: { border: 'border-blue-500/30', btn: 'bg-blue-600 hover:bg-blue-500 text-white' },
    professional: { border: 'border-red-500/50', btn: 'btn-gradient text-white' },
    enterprise: { border: 'border-purple-500/30', btn: 'bg-purple-600 hover:bg-purple-500 text-white' },
  };

  return (
    <section id="pricing" className="py-24 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
            <Star size={12} className="text-red-400" />
            <span className="text-xs font-medium text-gray-400">Transparent pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Plans for every team size
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            Start free and scale as you grow. No hidden fees, no surprises.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {planOrder.map((planKey) => {
            const plan = PLAN_CONFIG[planKey];
            const colors = planColors[planKey];
            const isFeatured = planKey === 'professional';

            return (
              <div
                key={planKey}
                className={`pricing-card ${isFeatured ? 'featured' : ''} relative rounded-2xl p-6 border ${colors.border} transition-all duration-300 hover:-translate-y-1 ${
                  isFeatured
                    ? 'bg-gradient-to-b from-red-950/40 to-zinc-900/80'
                    : 'bg-zinc-900/50'
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-xs font-bold text-white shadow-lg shadow-red-500/30">
                    Most Popular
                  </div>
                )}

                <div className="mb-4">
                  <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${plan.badge} mb-3`}>
                    {plan.label}
                  </span>
                  <div className="flex items-baseline gap-1">
                    {plan.price === 0 ? (
                      <span className="text-3xl font-black text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-sm text-gray-400 font-medium">LKR</span>
                        <span className="text-3xl font-black text-white stat-number">
                          {plan.price.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500">/mo</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Up to {plan.employees === Infinity ? 'unlimited' : plan.employees} employees
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isFeatured ? 'bg-red-500/20' : 'bg-white/8'
                      }`}>
                        <Check size={10} className={isFeatured ? 'text-red-400' : 'text-gray-400'} />
                      </div>
                      <span className="text-xs text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/signup"
                  className={`block w-full text-center text-sm font-semibold px-4 py-2.5 rounded-xl transition-all ${colors.btn}`}
                >
                  {plan.price === 0 ? 'Get started free' : 'Start free trial'}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
function Testimonials() {
  const testimonials = [
    {
      name: 'Amal Jayasinghe',
      role: 'CEO, TechFlow Lanka',
      avatar: 'AJ',
      color: 'from-red-500 to-rose-600',
      quote: 'AtendX completely transformed how we handle HR. Our team of 60 loves the QR check-in — it takes seconds and the data is perfect for payroll.',
      rating: 5,
    },
    {
      name: 'Priya Wijesekara',
      role: 'HR Manager, Retail Plus',
      avatar: 'PW',
      color: 'from-blue-500 to-violet-600',
      quote: 'The leave management system alone is worth it. Approvals that used to take days now take minutes. Our employees are happier and so am I.',
      rating: 5,
    },
    {
      name: 'Rohan Dissanayake',
      role: 'Operations Director, HospitalityPro',
      avatar: 'RD',
      color: 'from-amber-500 to-orange-600',
      quote: 'Meal ordering was the feature I didn\'t know I needed. We\'ve cut food waste by 40% and our canteen runs like clockwork now.',
      rating: 5,
    },
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-black to-zinc-950">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
            <Star size={12} className="text-red-400" />
            <span className="text-xs font-medium text-gray-400">Loved by teams</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            What our customers say
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            Hundreds of businesses trust AtendX with their HR operations every day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="glass rounded-2xl p-6 border border-white/8 hover:border-white/15 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-gray-300 leading-relaxed mb-5 italic">
                "{t.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-xs font-bold text-white">{t.avatar}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA SECTION ──────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-24 px-4 bg-zinc-950">
      <div className="max-w-3xl mx-auto text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-red-500/5 rounded-3xl blur-3xl" />
          <div className="relative glass rounded-3xl p-12 border border-white/8">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-xl shadow-red-500/30">
              <Zap size={28} className="text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
              Ready to Transform
              <br />
              <span className="gradient-text">Your HR?</span>
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
              Join 500+ companies already using AtendX. Setup takes less than 10 minutes. Start with our free plan — no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="btn-gradient group flex items-center gap-2 text-white font-bold px-8 py-4 rounded-xl text-sm shadow-xl shadow-red-500/25 glow-red-sm"
              >
                Start Free Today
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href="#features"
                className="text-sm text-gray-400 hover:text-white transition-colors underline underline-offset-4"
              >
                Learn more about features
              </a>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8">
              {['No credit card', 'Free forever plan', 'Cancel anytime'].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-xs text-gray-500">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer() {
  const links = {
    Product: ['Features', 'Pricing', 'How it Works', 'Roadmap'],
    Company: ['About', 'Blog', 'Careers', 'Press'],
    Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'],
  };

  return (
    <footer className="bg-black border-t border-white/5 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/30">
                <span className="text-white font-black text-sm">A</span>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">AtendX</span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              The modern HR platform for ambitious businesses. Attendance, leaves, and meals — all in one place.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-4">{category}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} AtendX. All rights reserved. Built with ❤️ in Sri Lanka.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Privacy</a>
            <a href="#" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Terms</a>
            <a href="#" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="bg-zinc-950 min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <CTASection />
      <Footer />
    </div>
  );
}
