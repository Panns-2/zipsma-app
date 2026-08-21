'use client';

import { Button } from "@/components/ui/button";
import { Archive, Book, BookOpen, Calendar, Home, LogOut, Send, Settings, ShieldCheck, Users, Wallet, HelpCircle, QrCode, GraduationCap, FileText } from "lucide-react";
import Link from "next/link";
import { ZipSMALogo } from "./zipsma-logo";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { motion } from "framer-motion";

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleLogout: () => void;
  schoolName?: string;
  schoolId?: string;
  logoUrl?: string;
  isMobile?: boolean;
  feesActiveSubTab?: string;
  setFeesActiveSubTab?: (tab: string) => void;
  userRole?: 'admin' | 'accountant';
}

export function AdminSidebar({ 
    activeTab, 
    setActiveTab, 
    handleLogout, 
    schoolName, 
    schoolId, 
    logoUrl,
    isMobile = false,
    feesActiveSubTab,
    setFeesActiveSubTab,
    userRole = 'admin',
}: AdminSidebarProps) {
  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'promote-students', label: 'Class Promotions', icon: GraduationCap },
    { id: 'staff', label: 'Manage Staff', icon: ShieldCheck },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'academic-reports', label: 'Academic Reports', icon: Book },
    { id: 'lesson-plans', label: 'Lesson Plans', icon: BookOpen },
    { id: 'calendar', label: 'School Calendar', icon: Calendar },
    { id: 'communication', label: 'Announcements', icon: Send },
    { id: 'fees', label: 'Fees Management', icon: Wallet, subItems: [
        { id: 'main', label: 'Core School Fees' },
        { id: 'daily', label: 'Daily Recurring Fee' }
    ]},
    { id: 'admission-bills', label: 'Admission Bills', icon: FileText },
    { id: 'finances', label: 'Finances', icon: Wallet },
    { id: 'debtors', label: 'Debtors List', icon: Wallet },
    { id: 'qr-generation', label: 'QR IDs', icon: QrCode },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const menuItems = userRole === 'accountant' 
    ? allMenuItems.filter(item => ['dashboard', 'students', 'fees', 'finances'].includes(item.id))
    : allMenuItems;

  return (
    <aside className={`print:hidden w-[280px] flex-shrink-0 flex-col p-4 border-r border-[#00205c]/20 bg-[#00205c] text-primary-foreground ${isMobile ? 'flex h-full' : 'hidden lg:flex sticky top-0 h-screen'}`}>
        <div className="flex items-center gap-4 px-2 py-4 mb-6 relative">
            {logoUrl ? (
                <Avatar className="h-12 w-12 border-2 border-white/20 shadow-sm">
                    <AvatarImage src={logoUrl} alt={schoolName} />
                    <AvatarFallback className="bg-primary/50 text-white">{schoolName?.charAt(0)}</AvatarFallback>
                </Avatar>
            ) : (
                <div className="bg-white/10 p-2 rounded-xl border border-white/20 shadow-inner">
                    <ZipSMALogo />
                </div>
            )}
            <div className="flex flex-col overflow-hidden">
                <h1 className="text-heading-md text-white truncate drop-shadow-sm">{schoolName || 'Admin Dashboard'}</h1>
                {schoolId && <span className="text-[11px] font-medium text-white/70 uppercase tracking-widest">ID: {schoolId}</span>}
            </div>
        </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-1 scrollbar-hide pb-4">
        {menuItems.map((item: any) => {
          const isActive = activeTab === item.id;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          
          return (
            <div key={item.id} className="space-y-1">
                <div className="relative">
                    {isActive && (
                        <motion.div
                            layoutId="activeTabIndicator"
                            className="absolute inset-0 bg-white/15 rounded-xl border border-white/10 shadow-sm"
                            initial={false}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                    )}
                    <Button
                        variant="ghost"
                        className={`w-full relative justify-start gap-3 h-11 px-4 transition-all duration-200 rounded-xl ${
                            isActive 
                            ? "text-white font-semibold" 
                            : "text-white/70 hover:text-white hover:bg-white/5 font-medium"
                        }`}
                        onClick={() => setActiveTab(item.id)}
                    >
                        <item.icon className={`h-5 w-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-white/50'}`} />
                        <span className="truncate">{item.label}</span>
                    </Button>
                </div>
                
                {/* Render sub-items if parent is active */}
                {isActive && hasSubItems && (
                    <div className="pl-11 space-y-1 mt-1">
                        {item.subItems.map((sub: any) => {
                            const isSubActive = item.id === 'fees' && feesActiveSubTab === sub.id;
                            return (
                                <button
                                    key={sub.id}
                                    onClick={() => item.id === 'fees' && setFeesActiveSubTab?.(sub.id)}
                                    className={`w-full text-left text-[11px] py-1.5 px-3 rounded-lg transition-all ${
                                        isSubActive 
                                        ? "text-white font-bold bg-white/10" 
                                        : "text-white/60 hover:text-white hover:bg-white/5 font-medium"
                                    }`}
                                >
                                    {sub.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
          );
        })}
      </nav>
      
      <div className="mt-auto pt-4 border-t border-white/10">
        <Button 
            variant="ghost" 
            asChild
            className="w-full justify-start gap-3 h-11 px-4 text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200 rounded-xl mb-2" 
        >
          <Link href="/help-center">
            <HelpCircle className="h-5 w-5 text-white/50" />
            <span className="font-medium">Help Center</span>
          </Link>
        </Button>
        <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 h-11 px-4 text-white/70 hover:bg-destructive/20 hover:text-destructive-foreground transition-all duration-200 rounded-xl" 
            onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 text-white/50" />
          <span className="font-medium">Secure Logout</span>
        </Button>
      </div>
    </aside>
  );
}

