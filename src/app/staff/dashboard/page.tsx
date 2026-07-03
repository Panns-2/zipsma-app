
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { StaffId, getStudents, Student, getSchoolDetails } from '@/lib/data-store';
import { useFirebase, useAuth } from '@/firebase/client-provider';
import { Loader2, LogOut, ChevronRight, GraduationCap, LayoutDashboard, BrainCircuit, AlertCircle, Calendar, Clock, User, Bell, HelpCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ZipSMALogo } from '@/components/zipsma-logo';
import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { doc, getDoc } from 'firebase/firestore';
import AccountantDashboardContent from '@/components/accountant-dashboard-content';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

export default function StaffDashboard() {
  const router = useRouter();
  const { db, auth } = useFirebase();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [staffMember, setStaffMember] = useState<StaffId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState('Welcome');
  const [currentDate, setCurrentDate] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [presentCount, setPresentCount] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('en-GB', options));
  }, []);

  useEffect(() => {
    if (authLoading || !db) return;

    if (!user) {
      router.replace('/staff/login');
      return;
    }

    const fetchStaffData = async () => {
      try {
        const staffDocRef = doc(db, 'staff', user.uid);
        const staffSnap = await getDoc(staffDocRef);

        if (staffSnap.exists()) {
          const data = staffSnap.data();
          const schoolData = await getSchoolDetails(db, data.schoolId);
          if (schoolData?.isLocked) {
            toast({ title: 'Access Denied', description: "This school's account is currently locked. Please contact support.", variant: 'destructive' });
            router.replace('/staff/login');
            return;
          }

          const member = {
            ...data,
            id: staffSnap.id,
            dateAdded: data.dateAdded?.toDate ? data.dateAdded.toDate() : new Date(),
          } as StaffId;

          if (member.isArchived) {
            toast({ title: 'Access Denied', description: 'This staff account has been archived.', variant: 'destructive' });
            router.replace('/staff/login');
            return;
          }
          setStaffMember(member);
          sessionStorage.setItem('staffId', user.uid);
          sessionStorage.setItem('schoolId', member.schoolId);
          if (member.className) {
            sessionStorage.setItem('staffClassName', member.className);
          }

          // Fetch students and calculate attendance
          const allStudents = await getStudents(db, member.schoolId);
          setStudents(allStudents);
          
          const today = new Date().toISOString().split('T')[0];
          const count = allStudents.filter(s => 
            s.attendance?.some(a => a.date === today && a.attended)
          ).length;
          setPresentCount(count);
        } else {
          toast({ title: 'Login Failed', description: 'No staff profile associated with this account.', variant: 'destructive' });
          router.replace('/staff/login');
        }
      } catch (error) {
        console.error('Failed to fetch staff data:', error);
        toast({ title: 'Error', description: 'Could not fetch your data. Please try again.', variant: 'destructive' });
        router.replace('/staff/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaffData();
  }, [db, user, authLoading, router, toast]);

  const attendanceBreakdown = useMemo(() => {
      const breakdown: Record<string, { present: number, total: number }> = {};
      
      students.forEach(student => {
          const className = student.className || 'Unassigned';
          if (!breakdown[className]) {
              breakdown[className] = { present: 0, total: 0 };
          }
          breakdown[className].total++;
          
          const isPresent = student.attendance?.some(a => 
              a.date === new Date().toISOString().split('T')[0] && a.attended
          );
          if (isPresent) {
              breakdown[className].present++;
          }
      });
      
      return breakdown;
  }, [students]);

  const handleLogout = () => {
    sessionStorage.clear();
    if (auth) {
      auth.signOut();
    }
    router.push('/staff/login');
    toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse"></div>
            <Loader2 className="w-12 h-12 animate-spin text-primary relative z-10" />
          </div>
          <p className="text-lg font-medium text-gray-600 animate-pulse">Preparing your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!staffMember) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full text-center shadow-xl border-0 ring-1 ring-gray-900/5">
          <CardHeader>
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <CardTitle className="text-destructive text-2xl font-headline">Access Denied</CardTitle>
            <CardDescription className="text-base">We could not verify your credentials. Please return to the login page and try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/staff/login')} size="lg" className="w-full h-12 text-lg">Return to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (staffMember.role === 'Accountant') {
    return (
      <AccountantDashboardContent 
        staffMember={staffMember}
        handleLogout={handleLogout}
        currentDate={currentDate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans selection:bg-primary/20">
      {/* Top Navigation */}
      <header className="bg-white/70 backdrop-blur-xl sticky top-0 z-40 border-b border-gray-200/60 supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ZipSMALogo />
            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-2"></div>
            <h1 className="text-lg font-semibold text-gray-800 font-headline hidden sm:block">Staff Portal</h1>
            <nav className="hidden md:flex ml-6 items-center gap-4 border-l pl-6">
                <Link href="/help-center" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Help Center
                </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 mr-2">
              <Calendar className="w-4 h-4" />
              <span>{currentDate}</span>
            </div>
            <Button onClick={handleLogout} variant="ghost" size="sm" className="text-gray-600 hover:text-destructive hover:bg-destructive/10 rounded-full px-4">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-16">
        {/* Animated Hero Section */}
        <section className="relative overflow-hidden bg-white pt-16 pb-24 md:pt-20 md:pb-32 px-4 lg:px-8 border-b border-gray-100">
          {/* Abstract Background Shapes */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[100%] rounded-full bg-gradient-to-br from-primary/10 to-blue-400/5 blur-3xl" />
            <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[80%] rounded-full bg-gradient-to-tr from-indigo-500/10 to-purple-400/5 blur-3xl" />
            {/* Grid Pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          </div>

          <div className="container mx-auto relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="max-w-3xl flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6 border border-primary/20 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Active Session
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline tracking-tight text-gray-900 mb-6 leading-tight">
                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600 block sm:inline">{staffMember.name.split(' ')[0]}</span>
              </h2>
              <p className="text-lg md:text-xl text-gray-600 font-medium max-w-xl leading-relaxed">
                Everything you need to manage your classroom and enhance your teaching, organized in one place.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.6, delay: 0.2 }} 
              className="hidden md:block flex-shrink-0 relative"
            >
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full"></div>
              <Image 
                src="/staff_hero.png" 
                alt="Education abstract illustration" 
                width={360} 
                height={360} 
                className="relative z-10 drop-shadow-2xl animate-float"
                priority
              />
            </motion.div>
          </div>
        </section>

        {/* Dashboard Content */}
        <div className="container mx-auto px-4 lg:px-8 -mt-12 relative z-20">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-6 md:gap-8 grid-cols-1 lg:grid-cols-12"
          >
            {/* Primary Class Card */}
            <motion.div variants={itemVariants} className="lg:col-span-8">
              {staffMember.className ? (
                <Link href={`/staff/class/${encodeURIComponent(staffMember.className)}?schoolId=${staffMember.schoolId}`} passHref>
                  <Card className="h-full border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 cursor-pointer bg-white/80 backdrop-blur-xl group overflow-hidden relative ring-1 ring-gray-200/50">
                    {/* Card Background Decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -mr-20 -mt-20 transition-transform duration-700 group-hover:scale-150"></div>
                    <div className="absolute bottom-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-500">
                      <GraduationCap className="w-48 h-48" />
                    </div>

                    <div className="p-8 md:p-10 relative z-10 flex flex-col h-full justify-between gap-8">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary/80 uppercase tracking-wider mb-3">
                            <LayoutDashboard className="w-4 h-4" /> Your Classroom
                          </div>
                          <CardTitle className="text-4xl md:text-5xl font-headline text-gray-900 group-hover:text-primary transition-colors duration-300">
                            {staffMember.className}
                          </CardTitle>
                          <CardDescription className="text-lg mt-3 text-gray-600 max-w-md">
                            Manage attendance, view student profiles, and update term records.
                          </CardDescription>
                        </div>
                        <div className="hidden md:flex p-5 bg-white shadow-sm rounded-2xl border border-gray-100 group-hover:border-primary/20 group-hover:shadow-md transition-all duration-300">
                          <GraduationCap className="h-10 w-10 text-primary" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-gray-100/80">
                        <div className="flex items-center gap-3">
                          <Button variant="default" className="rounded-full shadow-md group-hover:shadow-lg transition-all duration-300 px-6 h-12">
                            Open Dashboard
                          </Button>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                          <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-primary translate-x-0 group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ) : (
                <Card className="h-full border border-dashed border-gray-300 shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden text-center py-16 px-6 rounded-3xl">
                  <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-12 h-12 text-yellow-500" />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl font-headline text-gray-800">No Class Assigned</CardTitle>
                    <CardDescription className="text-lg text-gray-500 max-w-md mx-auto">
                      You are not currently assigned to a specific class. Please contact your school administrator to update your profile.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </motion.div>

            {/* Quick Actions & Tools */}
            <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-6">
              {/* Attendance Summary Card */}
              <Card className="border-0 shadow-lg bg-white overflow-hidden rounded-3xl ring-1 ring-gray-100">
                <div className="p-6 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-50 rounded-2xl">
                      <Users className="w-6 h-6 text-emerald-600" />
                    </div>
                    <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-100 font-bold">Live Count</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      {staffMember.className ? `${staffMember.className} Attendance` : 'School Attendance'}
                    </p>
                    <h3 className="text-4xl font-bold text-gray-900 font-headline">
                      {staffMember.className ? (
                        <>
                          {students.filter(s => s.className === staffMember.className).filter(s => 
                            s.attendance?.some(a => a.date === new Date().toISOString().split('T')[0] && a.attended)
                          ).length} 
                          <span className="text-lg text-gray-400 font-medium"> / {students.filter(s => s.className === staffMember.className).length}</span>
                        </>
                      ) : (
                        <>
                          {presentCount} <span className="text-lg text-gray-400 font-medium">/ {students.length}</span>
                        </>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      Students present {staffMember.className ? 'in your class' : 'in school'} today
                    </p>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-6 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ 
                        width: staffMember.className 
                          ? `${students.filter(s => s.className === staffMember.className).length > 0 
                              ? (students.filter(s => s.className === staffMember.className).filter(s => 
                                  s.attendance?.some(a => a.date === new Date().toISOString().split('T')[0] && a.attended)
                                ).length / students.filter(s => s.className === staffMember.className).length) * 100 
                              : 0}%`
                          : `${students.length > 0 ? (presentCount / students.length) * 100 : 0}%`
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>
              </Card>

              <h3 className="text-lg font-semibold text-gray-800 px-1 hidden lg:block">Quick Tools</h3>
              
              <Link href={`/teachers-corner?schoolId=${staffMember.schoolId}&staffId=${staffMember.id}`} passHref className="flex-1">
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-indigo-600 to-purple-700 group relative overflow-hidden rounded-3xl">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-10 -mb-10"></div>
                  
                  <div className="p-6 md:p-8 relative z-10 flex flex-col h-full">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20 shadow-inner">
                      <BrainCircuit className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-headline text-white mb-3">
                      Teacher's Corner
                    </CardTitle>
                    <p className="text-indigo-100 text-sm leading-relaxed mb-8 flex-1">
                      Your AI assistant for brainstorming lesson plans, drafting report card remarks, and creative activities.
                    </p>
                    <div className="flex items-center text-white font-medium text-sm mt-auto bg-white/10 w-fit px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-colors">
                      Explore AI Tools <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>

            {/* School-wide Attendance Breakdown */}
            <motion.div variants={itemVariants} className="lg:col-span-12 mt-8">
              <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold font-headline text-gray-900">Class Attendance Summary</h3>
                </div>
                <Badge variant="secondary" className="font-semibold text-primary bg-primary/5 border-primary/10">
                  All Classes
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(attendanceBreakdown)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([className, stats]) => {
                    const percentage = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
                    return (
                      <Card key={className} className="border-0 shadow-md bg-white/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 ring-1 ring-gray-100 overflow-hidden">
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-sm font-bold text-gray-500 uppercase tracking-tight mb-1">{className}</p>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-gray-900">{stats.present}</span>
                                <span className="text-sm text-gray-400 font-medium">/ {stats.total}</span>
                              </div>
                            </div>
                            <div className={`p-2 rounded-xl ${percentage >= 90 ? 'bg-emerald-50 text-emerald-600' : percentage >= 70 ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                              <span className="text-xs font-bold">{Math.round(percentage)}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, delay: 0.5 }}
                              className={`h-full rounded-full ${percentage >= 90 ? 'bg-emerald-500' : percentage >= 70 ? 'bg-blue-500' : 'bg-amber-500'}`}
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </motion.div>

          </motion.div>
        </div>
      </main>
    </div>
  );
}


