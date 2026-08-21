
"use client";
import {NextPage} from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LoginForm from '@/components/login-form';
import AdminLoginForm from '@/components/admin-login-form';
import StaffLoginForm from '@/components/staff-login-form';
import { ZipSMALogo } from '@/components/zipsma-logo';
import { Users, Wallet, CalendarCheck, Send, ShieldCheck, BarChart3, BrainCircuit, MessageCircle, Bot, CheckCircle2, ArrowRight, Star, Shield, Zap, Globe, Menu, X } from 'lucide-react';
import { LoginSlideshow } from '@/components/login-slideshow';
import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const LoginPage: NextPage = () => {
  const [role, setRole] = useState("student");
  const [showLogin, setShowLogin] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const portalRoles = [
    { id: 'student', title: 'Family Portal', image: '/student_portal.png', description: 'Access student records, results & fees.' },
    { id: 'staff', title: 'Staff Portal', image: '/staff_portal.png', description: 'Manage classes, attendance & grades.' },
    { id: 'admin', title: 'Admin Portal', image: '/admin_portal.png', description: 'School administration & management.' },
    { id: 'gate', title: 'Gatekeeper Kiosk', image: '/gatekeeper_portal.png', description: 'Secure QR Check-In Scanner.' },
    { id: 'payment', title: 'Smart Payment Kiosk', image: '/smart_payment_ghana.png', description: 'Secure NFC/QR Payment System.' }
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
        icon: <Users className="w-6 h-6 text-emerald-600" />,
        title: "Student Management",
        description: "Comprehensive profiles with medical notes and academic tracking.",
        color: "bg-emerald-50"
    },
    {
        icon: <Wallet className="w-6 h-6 text-blue-600" />,
        title: "Financial Tracking",
        description: "Effortless management of fees, feeding, and transportation.",
        color: "bg-blue-50"
    },
    {
        icon: <BrainCircuit className="w-6 h-6 text-purple-600" />,
        title: "AI Teacher Assistant",
        description: "NaCCA-aligned lesson planning and automated report remarks.",
        color: "bg-purple-50"
    },
    {
        icon: <Bot className="w-6 h-6 text-orange-600" />,
        title: "AI Student Buddy",
        description: "Interactive learning companion for homework and exam prep.",
        color: "bg-orange-50"
    },
    {
        icon: <Send className="w-6 h-6 text-rose-600" />,
        title: "Smart Communication",
        description: "Automated SMS and real-time parent notifications.",
        color: "bg-rose-50"
    },
    {
        icon: <ShieldCheck className="w-6 h-6 text-indigo-600" />,
        title: "Role Security",
        description: "PIN-protected settings and granular staff access control.",
        color: "bg-indigo-50"
    }
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-primary/10 overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 transition-all duration-300 bg-primary border-b border-white/10 shadow-xl py-3">
        <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                <ZipSMALogo className="w-8 h-8 md:w-10 md:h-10 brightness-0 invert" />
                <span className="text-2xl md:text-3xl font-black tracking-tighter font-headline text-white">ZipSMA</span>
            </Link>
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-white/90">
                <a href="#features" className="hover:text-white transition-colors">Features</a>
                <a href="#portals" className="hover:text-white transition-colors">Portals</a>
                <Link href="/help-center" className="hover:text-white transition-colors">Help Center</Link>
                <a href="#about" className="hover:text-white transition-colors">About</a>
                <Button asChild className="rounded-full px-6 shadow-lg bg-white text-primary hover:bg-white/90 shadow-white/10">
                    <a href="#portals">Get Started</a>
                </Button>
            </div>
            {/* Mobile Hamburger */}
            <button
                className="md:hidden p-2 rounded-xl transition-colors hover:bg-white/10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
            >
                {mobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>
        </div>
        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
            {mobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="md:hidden border-t overflow-hidden bg-primary border-white/10"
                >
                    <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
                        <a href="#features" className="font-semibold py-2 border-b text-white/90 border-white/10 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Features</a>
                        <a href="#portals" className="font-semibold py-2 border-b text-white/90 border-white/10 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Portals</a>
                        <Link href="/help-center" className="font-semibold py-2 border-b text-white/90 border-white/10 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Help Center</Link>
                        <a href="#about" className="font-semibold py-2 border-b text-white/90 border-white/10 hover:text-white" onClick={() => setMobileMenuOpen(false)}>About</a>
                        <Button asChild className="rounded-full w-full bg-white text-primary hover:bg-white/90">
                            <a href="#portals" onClick={() => setMobileMenuOpen(false)}>Get Started</a>
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 md:pt-32 pb-16 md:pb-20 overflow-hidden bg-gradient-to-b from-blue-50/50 to-white">
        <div className="container mx-auto px-4 md:px-6 grid lg:grid-cols-2 gap-10 md:gap-12 items-center">
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6 md:space-y-8 text-center lg:text-left"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                    <Zap className="w-3 h-3" /> The Future of School Management
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold font-headline leading-[1.1] text-gray-900">
                    Your School, <span className="text-primary">Simplified.</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                    The all-in-one platform for modern Ghanaian schools. Manage students, finances, and AI-powered learning in one beautiful dashboard.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
                    <Button size="lg" className="rounded-full px-8 text-base md:text-lg shadow-xl shadow-primary/25 h-12 md:h-14" asChild>
                        <a href="#portals">Access Your Portal <ArrowRight className="ml-2 w-5 h-5" /></a>
                    </Button>
                    <Button size="lg" variant="outline" className="rounded-full px-8 text-base md:text-lg h-12 md:h-14 border-2" asChild>
                        <Link href="/register">Register School</Link>
                    </Button>
                </div>
                <div className="flex items-center gap-3 pt-2 justify-center lg:justify-start text-sm font-medium text-gray-500">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>Join our growing community of <span className="text-gray-900 font-bold">modern schools</span> across Ghana</span>
                </div>
            </motion.div>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
            >
                <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-4 md:border-8 border-white/50 backdrop-blur-sm">
                    <img 
                        src="/landing_hero.png" 
                        alt="ZipSMA Dashboard" 
                        className="w-full h-auto"
                    />
                </div>
                {/* Abstract Orbs — hidden on mobile to avoid overflow */}
                <div className="hidden md:block absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
                <div className="hidden md:block absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl" />
            </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-16 md:py-24 bg-[#160110]">
        <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16 space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold font-headline text-white">Engineered for Excellence</h2>
                <p className="text-base md:text-lg text-gray-300">
                    ZipSMA brings state-of-the-art technology to every department of your school, empowering staff and engaging families.
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {features.map((feature, idx) => (
                    <motion.div 
                        key={feature.title}
                        whileHover={{ y: -8 }}
                        className="p-6 md:p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/10 transition-all"
                    >
                        <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-5 md:mb-6", feature.color)}>
                            {feature.icon}
                        </div>
                        <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-white">{feature.title}</h3>
                        <p className="text-gray-400 leading-relaxed text-sm md:text-base">{feature.description}</p>
                    </motion.div>
                ))}
            </div>
        </div>
      </section>

      {/* Portal Access Section */}
      <section id="portals" className="py-20 md:py-32 bg-[#d9dadc]">
        <div className="w-full max-w-[1920px] mx-auto px-4 md:px-8">
            {/* Centered Header */}
            <div className="text-center max-w-4xl mx-auto mb-16 md:mb-24 space-y-6">
                <h2 className="text-4xl md:text-6xl font-bold font-headline">Secure Portal <span className="text-primary">Access Center</span></h2>
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
                    Access your dedicated dashboard by selecting your role below. Each portal is customized to provide the tools you need to succeed.
                </p>
                <div className="flex flex-wrap justify-center gap-6 pt-4">
                    {[
                        "End-to-end data encryption",
                        "99.9% Uptime guaranteed",
                        "Real-time data synchronization",
                        "Multi-device compatibility"
                    ].map(item => (
                        <div key={item} className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            {item}
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full">
                <AnimatePresence mode="wait">
                    {!showLogin ? (
                        <motion.div 
                            key="roles"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6 justify-center"
                        >
                            {portalRoles.map((r) => (
                                <motion.div
                                    key={r.id}
                                    whileHover={{ y: -15, scale: 1.02 }}
                                    onClick={() => {
                                        if (r.id === 'gate') {
                                            window.location.href = '/gate/login';
                                        } else if (r.id === 'payment') {
                                            window.location.href = '/smart-payment/login';
                                        } else {
                                            setRole(r.id);
                                            setShowLogin(true);
                                        }
                                    }}
                                    className="bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] cursor-pointer group flex flex-col aspect-[4/5] overflow-hidden"
                                >
                                    <div className="relative h-2/3 overflow-hidden">
                                        <img 
                                            src={r.image} 
                                            alt={r.title} 
                                            className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-700" 
                                        />
                                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    </div>
                                    <div className="p-6 md:p-8 flex flex-col justify-center flex-1">
                                        <h3 className="text-xl md:text-2xl font-bold group-hover:text-primary transition-colors">{r.title}</h3>
                                        <p className="text-sm text-gray-500 mt-2">{r.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="login"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="max-w-3xl mx-auto"
                        >
                            <Card className="rounded-none border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden bg-white">
                                <div className="p-8 md:p-16">
                                    <button 
                                        onClick={() => setShowLogin(false)}
                                        className="flex items-center gap-2 text-sm font-bold text-primary mb-10 hover:gap-3 transition-all"
                                    >
                                        <ArrowRight className="w-4 h-4 rotate-180" /> Back to Portals
                                    </button>
                                    
                                    <div className="mb-8 md:mb-10">
                                        <h3 className="text-3xl md:text-4xl font-bold mb-3 capitalize">{role === 'student' ? 'Family' : role} Login</h3>
                                        <p className="text-gray-500 text-base md:text-lg">Enter your credentials to access the {role} dashboard.</p>
                                    </div>
                                    {role === "student" && <LoginForm />}
                                    {role === "admin" && <AdminLoginForm />}
                                    {role === "staff" && <StaffLoginForm />}

                                    <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                                        <p className="text-gray-500 mb-6 text-sm">New to ZipSMA?</p>
                                        <Button className="rounded-full px-10 h-14 border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-white transition-all text-lg" asChild>
                                            <Link href="/register">Register Your School Now</Link>
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 md:py-24 bg-white border-t-2 border-b-2 border-gray-200">
        <div className="container mx-auto px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                        <Globe className="w-3 h-3" /> Our Mission
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold font-headline leading-tight">Empowering the Next Generation of West African Scholars</h2>
                    <p className="text-lg text-gray-600 leading-relaxed">
                        ZipSMA was founded with a single goal: to provide every school in Ghana with the same world-class management tools used by the global elite. 
                        We believe that administrative excellence is the foundation of educational success.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-6 pt-4">
                        <div className="space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Shield className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-gray-900">Secure & Reliable</h4>
                            <p className="text-sm text-gray-500">Industry-standard encryption for all student and financial records.</p>
                        </div>
                        <div className="space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                                <Zap className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-gray-900">NaCCA Aligned</h4>
                            <p className="text-sm text-gray-500">Our AI tools are built specifically for the Ghanaian curriculum.</p>
                        </div>
                    </div>
                </div>
                <div className="relative">
                    <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl bg-gray-100 border-8 border-white">
                        <img 
                            src="/about_mission.png" 
                            alt="Education Mission"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="absolute -bottom-6 -right-6 bg-primary text-white p-8 rounded-3xl shadow-2xl hidden md:block">
                        <div className="text-4xl font-bold font-headline mb-1">100%</div>
                        <div className="text-xs uppercase tracking-widest opacity-80 font-bold">Cloud-Based Solution</div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
            <div className="relative rounded-[2rem] md:rounded-[3rem] bg-primary overflow-hidden p-8 md:p-20 text-center text-white">
                <div className="relative z-10 max-w-3xl mx-auto space-y-6 md:space-y-8">
                    <h2 className="text-3xl md:text-6xl font-bold font-headline leading-tight">Ready to transform your school?</h2>
                    <p className="text-base md:text-xl text-blue-100">
                        Experience the most advanced management platform built specifically for the modern West African school. 
                        Start your journey today with a 30-day free trial.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button size="lg" className="bg-white text-primary hover:bg-blue-50 rounded-full px-8 md:px-10 h-12 md:h-14 text-base md:text-lg font-bold" asChild>
                            <Link href="/register">Get Started Free</Link>
                        </Button>
                        <Button size="lg" className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-primary rounded-full px-8 md:px-10 h-12 md:h-14 text-base md:text-lg font-bold transition-all" asChild>
                            <Link href="/help-center">Contact Sales</Link>
                        </Button>
                    </div>
                </div>
                {/* Decor elements */}
                <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-white/10 rounded-full -mr-32 md:-mr-48 -mt-32 md:-mt-48 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 md:w-96 h-64 md:h-96 bg-emerald-500/20 rounded-full -ml-32 md:-ml-48 -mb-32 md:-mb-48 blur-3xl" />
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-14 md:py-20">
        <div className="container mx-auto px-6 md:px-10">
            {/* Top row: Brand + Links */}
            <div className="border-b border-gray-800 pb-12 md:pb-16 space-y-10 md:space-y-0 md:grid md:grid-cols-4 md:gap-12">
                {/* Brand block — centered on mobile, left on desktop */}
                <div className="space-y-4 md:space-y-6 text-center md:text-left flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-2">
                        <ZipSMALogo className="w-8 h-8 filter brightness-200" />
                        <span className="text-2xl font-black tracking-tighter text-white font-headline">ZipSMA</span>
                    </div>
                    <p className="text-sm leading-relaxed max-w-xs">
                        The ultimate School Management Application designed for the modern educational landscape.
                    </p>
                    <div className="flex gap-4 justify-center md:justify-start">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer"><Globe className="w-4 h-4 text-white" /></div>
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer"><Shield className="w-4 h-4 text-white" /></div>
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer"><Star className="w-4 h-4 text-white" /></div>
                    </div>
                </div>

                {/* Link columns — centered on mobile, left on desktop */}
                <div className="grid grid-cols-3 gap-4 md:contents text-center md:text-left">
                    <div>
                        <h4 className="text-white font-bold mb-4 md:mb-6 text-sm md:text-base">Product</h4>
                        <ul className="space-y-3 md:space-y-4 text-xs md:text-sm">
                            <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                            <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Updates</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4 md:mb-6 text-sm md:text-base">Support</h4>
                        <ul className="space-y-3 md:space-y-4 text-xs md:text-sm">
                            <li><a href="#" className="hover:text-white transition-colors">Docs</a></li>
                            <li><Link href="/help-center" className="hover:text-white transition-colors">Help Center</Link></li>
                            <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4 md:mb-6 text-sm md:text-base">Legal</h4>
                        <ul className="space-y-3 md:space-y-4 text-xs md:text-sm">
                            <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link></li>
                            <li><Link href="/billing-policy" className="hover:text-white transition-colors">Billing</Link></li>
                            <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms</Link></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="pt-8 md:pt-12 text-center text-xs tracking-widest uppercase">
                &copy; {new Date().getFullYear()} ZipSMA. All rights reserved. Made for West Africa.
            </div>
        </div>
      </footer>
    </div>
  );
}

export default LoginPage;
