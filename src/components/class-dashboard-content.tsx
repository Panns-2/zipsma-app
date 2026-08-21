

'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getStudentsByClass, setAttendance, Student, Homework, getHomeworkForClass, addHomework, deleteHomework, signOutUser, getAcademicPeriods, AcademicPeriod } from '@/lib/data-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LogOut, Users, Loader2, BookCopy, PlusCircle, Trash2, GraduationCap, Bot, Sparkles, LayoutDashboard, Cake, Printer, HelpCircle } from 'lucide-react';
import { ZipSMALogo } from '@/components/zipsma-logo';
import { useToast } from '@/hooks/use-toast';
import { WeeklyAttendanceTab, TermAttendanceTab, ManageHomeworkTab, ClassAnnouncementsTab, StudentReportsTab, ManageELibraryTab, StaffLessonPlansTab } from './class-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { useFirebase } from '@/firebase/client-provider';
import { motion, type Variants } from 'framer-motion';

const defaultHomeworkForm = { title: '', description: '', dueDate: new Date().toISOString().split('T')[0] };

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
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

export default function ClassDashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { auth, db } = useFirebase();
    
    const className = searchParams.get('name');
    const decodedClassName = useMemo(() => className ? decodeURIComponent(className).trim() : '', [className]);
    const schoolId = searchParams.get('schoolId');

    const [students, setStudents] = useState<Student[]>([]);
    const [homework, setHomework] = useState<Homework[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAttendanceSubmitting, setIsAttendanceSubmitting] = useState<{[key: string]: boolean}>({});
    const [activePeriod, setActivePeriod] = useState<AcademicPeriod | null>(null);

    const [homeworkForm, setHomeworkForm] = useState(defaultHomeworkForm);
    const [homeworkToDelete, setHomeworkToDelete] = useState<Homework | null>(null);

    const fetchData = useCallback(async (currentClassName: string, currentSchoolId: string) => {
        if (!currentClassName || !currentSchoolId || !db) return;
        setIsLoading(true);
        try {
            const [classStudents, classHomework, periods] = await Promise.all([
                getStudentsByClass(db, currentSchoolId, currentClassName),
                getHomeworkForClass(db, currentSchoolId, currentClassName),
                getAcademicPeriods(db, currentSchoolId)
            ]);
            setStudents(classStudents);
            setHomework(classHomework);
            const current = periods.find(p => p.isCurrent) || periods[0];
            setActivePeriod(current || null);

        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast({ title: "Error", description: "Could not fetch class data. Please check your connection and try again.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast, db]);

    useEffect(() => {
        // This effect should only run on the client
        if (typeof window === 'undefined' || !db) {
            return;
        }

        const staffId = sessionStorage.getItem('staffId');
        const staffClassName = sessionStorage.getItem('staffClassName');
        const sessionSchoolId = sessionStorage.getItem('schoolId');

        // URL parameters are the source of truth, but we verify against session storage
        if (!staffId || staffClassName !== decodedClassName || sessionSchoolId !== schoolId) {
            router.replace('/staff/login');
            toast({ title: 'Unauthorized', description: 'Your session is invalid. Please log in again.', variant: 'destructive' });
            return;
        }
        
        // Ensure we have the necessary IDs before fetching
        if (decodedClassName && schoolId) {
            fetchData(decodedClassName, schoolId);
        } else {
            // If the URL params are missing, something is wrong.
            setIsLoading(false);
            toast({ title: 'Error', description: 'Missing required class or school information.', variant: 'destructive' });
        }
    }, [router, toast, decodedClassName, schoolId, fetchData, db]);


    const handleLogout = async () => {
        sessionStorage.removeItem('staffId');
        sessionStorage.removeItem('staffClassName');
        sessionStorage.removeItem('schoolId');
        if (auth) {
            await signOutUser(auth);
        }
        router.push('/');
        toast({ title: 'Logged Out', description: 'You have been logged out.' });
    };

    const handleToggleAttendance = async (studentId: string, date: string, isChecked: boolean) => {
        if (!auth || !db) return;
        const key = `${studentId}-${date}`;
        setIsAttendanceSubmitting(prev => ({...prev, [key]: true}));
        try {
            await setAttendance(db, auth, studentId, date, isChecked, activePeriod?.id, schoolId || undefined);
            setStudents(prevStudents => prevStudents.map(s => {
                if (s.studentId === studentId) {
                    const attendance = s.attendance || [];
                    const recordIndex = attendance.findIndex(a => a.date === date);
                    if (recordIndex > -1) {
                        attendance[recordIndex].attended = isChecked;
                        if (activePeriod) attendance[recordIndex].periodId = activePeriod.id;
                    } else {
                        attendance.push({ id: Date.now(), date: date, attended: isChecked, periodId: activePeriod?.id });
                    }
                    return { ...s, attendance };
                }
                return s;
            }));
        } catch (error) {
            toast({ title: "Error", description: "Could not update attendance. You may not have permission.", variant: "destructive" });
        } finally {
             setIsAttendanceSubmitting(prev => ({...prev, [key]: false}));
        }
    };

    const handleAddHomework = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolId || !auth || !db) return;
        setIsSubmitting(true);
        try {
            await addHomework(db, auth, schoolId, { ...homeworkForm, className: decodedClassName });
            toast({ title: 'Homework Assigned', description: `"${homeworkForm.title}" has been added.`});
            setHomeworkForm(defaultHomeworkForm);
            fetchData(decodedClassName, schoolId);
        } catch (error) {
            toast({ title: "Error", description: "Could not assign homework.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteHomework = (hw: Homework) => setHomeworkToDelete(hw);
    const confirmDeleteHomework = async () => {
        if(homeworkToDelete && schoolId && auth && db) {
            setIsSubmitting(true);
            try {
                await deleteHomework(db, auth, homeworkToDelete.id);
                toast({ title: 'Homework Deleted', description: `The assignment has been removed.`, variant: 'destructive'});
                fetchData(decodedClassName, schoolId);
            } catch (error) {
                toast({ title: "Error", description: "Could not delete homework.", variant: "destructive" });
            } finally {
                setHomeworkToDelete(null);
                setIsSubmitting(false);
            }
        }
    }
    
    const last5Weekdays = useMemo(() => {
        const weekdays: string[] = [];
        let currentDate = new Date();
        while (weekdays.length < 5) {
            const dayOfWeek = currentDate.getDay(); // Sunday is 0, Saturday is 6
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                weekdays.push(currentDate.toISOString().split('T')[0]);
            }
            currentDate.setDate(currentDate.getDate() - 1);
        }
        return weekdays.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    }, []);

    const upcomingBirthdays = useMemo(() => {
        const currentMonth = new Date().getMonth();
        return students.filter(student => {
            if (!student.dateOfBirth) return false;
            const dob = new Date(student.dateOfBirth);
            return dob.getMonth() === currentMonth;
        });
    }, [students]);

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
         return (
             <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <span className="ml-4 text-lg font-medium text-gray-600">Loading classroom data...</span>
            </div>
         )
    }

    return (
        <div className="min-h-screen bg-gray-50 text-foreground font-sans flex flex-col">
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200 print:hidden">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <ZipSMALogo />
                            <h1 className="text-xl md:text-2xl font-bold text-primary font-headline hidden sm:flex items-center gap-2">
                              <LayoutDashboard className="w-5 h-5" /> Class Dashboard
                            </h1>
                            <nav className="hidden md:flex ml-6 items-center gap-4 border-l pl-6">
                                <Link href="/help-center" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4" />
                                    Help Center
                                </Link>
                            </nav>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={`/staff/dashboard?schoolId=${schoolId}&staffId=${sessionStorage.getItem('staffId')}`} passHref>
                            <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                                Back to Portal
                            </Button>
                        </Link>
                        <Button onClick={handleLogout} variant="outline" size="sm" className="hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <LogOut className="mr-2 h-4 w-4" />Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Banner */}
                <div className="w-full h-40 md:h-56 lg:h-64 relative print:hidden">
                    <Image 
                        src="/class_hero.png" 
                        alt="Classroom Banner" 
                        fill 
                        className="object-cover opacity-90"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40"></div>
                </div>

                <div className="container mx-auto px-4 -mt-24 md:-mt-32 relative z-20">
                    <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden mb-8 print:hidden">
                        <CardContent className="p-6 md:p-10 flex flex-col md:flex-row justify-between items-center gap-8">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex-1 text-center md:text-left">
                                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mb-4">
                                    <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                                        Academic Management
                                    </span>
                                    {upcomingBirthdays.length > 0 ? (
                                        <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                                            <Cake className="w-3.5 h-3.5" /> {upcomingBirthdays.length} Birthday{upcomingBirthdays.length !== 1 ? 's' : ''} This Month!
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-gray-50 text-gray-400 border border-gray-100 rounded-full text-xs font-bold flex items-center gap-1">
                                            <Cake className="w-3.5 h-3.5" /> No Birthdays
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 font-headline tracking-tight leading-tight">
                                    {decodedClassName}
                                </h2>
                                <p className="text-gray-500 mt-4 flex items-center justify-center md:justify-start gap-2 text-lg md:text-xl font-medium">
                                    <Users className="w-6 h-6 text-primary/60" /> {students.length} Students <span className="text-gray-300 mx-1">|</span> {activePeriod?.term || 'Academic Session'}
                                </p>

                                <div className="mt-8 flex flex-wrap justify-center md:justify-start gap-3">
                                    <Button onClick={handlePrint} variant="outline" className="bg-white hover:bg-gray-50 rounded-full shadow-sm border-gray-200 h-11 px-6 font-semibold">
                                        <Printer className="mr-2 h-4.5 w-4.5" /> Print Roster
                                    </Button>
                                    <Link href={`/teachers-corner?schoolId=${schoolId}&staffId=${sessionStorage.getItem('staffId')}`} passHref>
                                        <Button size="lg" className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700 text-white shadow-lg hover:shadow-primary/20 transition-all duration-300 group rounded-full h-11 px-8 font-bold border-0">
                                            <Sparkles className="mr-2 h-5 w-5 text-blue-200 group-hover:animate-pulse" />
                                            Teacher's Corner
                                        </Button>
                                    </Link>
                                </div>
                            </motion.div>
                            
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                transition={{ duration: 0.6, delay: 0.2 }} 
                                className="hidden lg:block flex-shrink-0"
                            >
                                <div className="w-48 h-48 rounded-full border-8 border-white shadow-xl overflow-hidden bg-primary/10 flex items-center justify-center">
                                    <GraduationCap className="w-24 h-24 text-primary opacity-20" />
                                </div>
                            </motion.div>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="attendance" className="w-full">
                        <div className="flex justify-center mb-8 print:hidden">
                            <TabsList className="flex overflow-x-auto scrollbar-hide bg-gray-100 p-1 rounded-full border border-gray-200 shadow-inner max-w-fit">
                                <TabsTrigger 
                                    value="attendance" 
                                    className="whitespace-nowrap rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                                >
                                    Weekly Attendance
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="term-attendance" 
                                    className="whitespace-nowrap rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                                >
                                    Term Attendance
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="homework" 
                                    className="whitespace-nowrap rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                                >
                                    Manage Homework
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="announcements" 
                                    className="whitespace-nowrap rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                                >
                                    Announcements
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="reports" 
                                    className="whitespace-nowrap rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                                >
                                    Student Reports
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="library" 
                                    className="whitespace-nowrap rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                                >
                                    Manage E-Library
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="lesson-plans" 
                                    className="whitespace-nowrap rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                                >
                                    Lesson Plans
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full">
                            <TabsContent value="attendance" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                                <motion.div variants={itemVariants}>
                                    <Card className="border-0 shadow-lg bg-white overflow-hidden rounded-2xl">
                                        <CardContent className="p-0">
                                            <WeeklyAttendanceTab 
                                                students={students} 
                                                isLoading={isLoading} 
                                                decodedClassName={decodedClassName} 
                                                isAttendanceSubmitting={isAttendanceSubmitting} 
                                                onToggleAttendance={handleToggleAttendance} 
                                                activePeriod={activePeriod}
                                            />
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </TabsContent>

                            <TabsContent value="term-attendance" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                                <motion.div variants={itemVariants}>
                                    <Card className="border-0 shadow-lg bg-white overflow-hidden rounded-2xl">
                                        <CardContent className="p-0">
                                            <TermAttendanceTab 
                                                students={students} 
                                                isLoading={isLoading} 
                                                decodedClassName={decodedClassName} 
                                                activePeriod={activePeriod}
                                            />
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </TabsContent>

                            <TabsContent value="homework" className="mt-0 focus-visible:outline-none focus-visible:ring-0 print:hidden">
                                <motion.div variants={itemVariants}>
                                    <ManageHomeworkTab 
                                        homework={homework}
                                        isLoading={isLoading}
                                        isSubmitting={isSubmitting}
                                        homeworkForm={homeworkForm}
                                        setHomeworkForm={setHomeworkForm}
                                        onAddHomework={handleAddHomework}
                                        onDeleteHomework={handleDeleteHomework}
                                    />
                                </motion.div>
                            </TabsContent>

                            <TabsContent value="announcements" className="mt-0 focus-visible:outline-none focus-visible:ring-0 print:hidden">
                                <motion.div variants={itemVariants}>
                                    <ClassAnnouncementsTab 
                                        className={decodedClassName} 
                                        schoolId={schoolId || ''} 
                                    />
                                </motion.div>
                            </TabsContent>

                            <TabsContent value="reports" className="mt-0 focus-visible:outline-none focus-visible:ring-0 print:block">
                                <motion.div variants={itemVariants}>
                                    <StudentReportsTab 
                                        students={students}
                                        schoolId={schoolId}
                                        className={decodedClassName}
                                    />
                                </motion.div>
                            </TabsContent>

                            <TabsContent value="library" className="mt-0 focus-visible:outline-none focus-visible:ring-0 print:hidden">
                                <motion.div variants={itemVariants}>
                                    <ManageELibraryTab 
                                        schoolId={schoolId} 
                                        className={decodedClassName} 
                                    />
                                </motion.div>
                            </TabsContent>

                            <TabsContent value="lesson-plans" className="mt-0 focus-visible:outline-none focus-visible:ring-0 print:hidden">
                                <motion.div variants={itemVariants}>
                                    <StaffLessonPlansTab 
                                        staffId={sessionStorage.getItem('staffId') || ''}
                                        schoolId={schoolId || ''}
                                        className={decodedClassName}
                                    />
                                </motion.div>
                            </TabsContent>
                        </motion.div>
                    </Tabs>
                </div>
            </main>

            <AlertDialog open={!!homeworkToDelete} onOpenChange={(isOpen) => !isOpen && setHomeworkToDelete(null)}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-headline text-gray-900">Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-base text-gray-600">
                            This will permanently delete the homework assignment <span className="font-semibold text-gray-900">"{homeworkToDelete?.title}"</span>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteHomework} className="bg-destructive hover:bg-destructive/90 rounded-full" disabled={isSubmitting}>
                            Delete Assignment
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
