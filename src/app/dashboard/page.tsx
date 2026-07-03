

'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/header';
import StudentProfile from '@/components/student-profile';
import ContactBar from '@/components/contact-bar';
import { Button } from '@/components/ui/button';
import { 
    Wallet, Megaphone, CalendarDays, Eye, Phone, Mail, MessageCircle,
    ChevronRight, ArrowLeft, Users, UserCircle, LayoutDashboard,
    Calendar as CalendarIcon, Info, Frown, Loader2, Copy, FileQuestion, CheckCircle, XCircle, Landmark, Smartphone, UtensilsCrossed, History, Camera, ShieldCheck, Banknote, TrendingDown, CheckCheck, RefreshCw, Notebook, BookCopy, PartyPopper, Pin, Bus, Bot, Sparkles, GraduationCap, HelpCircle, FileText
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Student, getStudentById, getStudentsByParentId, Announcement, getAnnouncementsForStudent, CalendarEvent, getCalendarEvents, Homework, getHomeworkForClass, School, getSchoolDetails, signOutUser, getAcademicPeriods, AcademicPeriod, updateStudentDetails, getFeeCategories, FeeCategory, isDailyTransaction, LedgerTransaction } from '@/lib/data-store';
import { explainConcept, summarizeTopic, generateQuiz, QuizQuestion, ExplainConceptInput } from '@/ai/flows/student-assistant-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { AttendanceCard } from '@/components/attendance-card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useIdleTimeout } from '@/hooks/use-idle-timeout';
import { useToast } from '@/hooks/use-toast';
import { useFCM } from '@/hooks/use-fcm';
import ReactMarkdown from 'react-markdown';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirebase } from '@/firebase/client-provider';
import { FeePaymentDialog } from '@/components/fee-payment-dialog';
import { StudentLedgerView } from '@/components/student-ledger-view';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Notification Prompt Component
const NotificationPrompt = ({ permission, requestPermission, fcmToken }: { permission: NotificationPermission, requestPermission: () => void, fcmToken: string | null }) => {
    if (fcmToken) return null;

    if (permission === 'denied') {
        return (
            <div className="mb-8">
                <Card className="border-red-200 bg-red-50 text-red-900 shadow-sm">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Info className="w-4 h-4 text-red-600" /> Notifications Blocked
                        </CardTitle>
                        <CardDescription className="text-red-700 text-xs">
                            Your browser is blocking notifications. Please enable them in your device settings (or "Add to Home Screen" if on iOS) to receive alerts.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <Card className="border-none shadow-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Smartphone className="w-24 h-24 rotate-12" />
                </div>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-black flex items-center gap-2">
                        <Smartphone className="w-5 h-5" /> Stay Updated!
                    </CardTitle>
                    <CardDescription className="text-blue-100 text-sm font-medium">
                        Enable push notifications to receive real-time alerts for school announcements and fee reminders directly on your phone.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="pt-2">
                    <Button 
                        onClick={requestPermission} 
                        className="bg-white text-blue-700 hover:bg-blue-50 font-black px-8 py-6 rounded-2xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest"
                    >
                        {permission === 'granted' ? 'Retry Setup' : 'Enable Notifications'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

// Child Switcher Component for persistent navigation
const ChildSwitcher = ({ children, activeId, onSelect, onBackToOverview }: { 
    children: Student[], 
    activeId: string | null, 
    onSelect: (id: string, child: Student) => void,
    onBackToOverview: () => void
}) => {
    return (
        <div className="flex flex-wrap items-center gap-3 mb-8 p-3 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm overflow-x-auto no-scrollbar">
            <button
                onClick={onBackToOverview}
                className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrap border-2",
                    !activeId 
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                        : "bg-white text-muted-foreground border-transparent hover:bg-primary/5 hover:text-primary"
                )}
            >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Family Overview
            </button>
            <div className="h-6 w-px bg-muted mx-1" />
            {children.map(child => (
                <button
                    key={child.studentId}
                    onClick={() => onSelect(child.studentId, child)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs whitespace-nowrap border-2",
                        activeId === child.studentId 
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" 
                            : "bg-white text-muted-foreground border-transparent hover:bg-primary/5 hover:text-primary"
                    )}
                >
                    <Avatar className="w-6 h-6 border border-current/10">
                        <AvatarImage src={child.profilePicture} />
                        <AvatarFallback className="text-[10px]">{child.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {child.name.split(' ')[0]}
                </button>
            ))}
        </div>
    );
};

const FeeRow = ({ label, value, className, currency = 'GH¢' }: { label: string, value: number, className?: string, currency?: string }) => (
  <div className="flex justify-between items-center py-2 border-b border-border/50">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={cn("font-semibold text-base", className)}>{currency}{value.toFixed(2)}</span>
  </div>
);

const GeneratedContentDisplay = ({ content, title }: { content: string, title: string }) => {
    const { toast } = useToast();
    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        toast({ title: "Copied to Clipboard!" });
    }
    return (
        <div className="mt-6 p-4 border bg-[#dee0e2] rounded-lg animate-in fade-in-50">
            <h4 className="font-semibold mb-2 flex justify-between items-center text-lg text-primary">
                {title}
                <div>
                     <Button variant="ghost" size="sm" onClick={handleCopy}><Copy className="w-4 h-4 mr-2" /> Copy</Button>
                </div>
            </h4>
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-strong:text-foreground prose-headings:text-primary">
                <ReactMarkdown>{content}</ReactMarkdown>
            </div>
        </div>
    );
};


function DashboardContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const { auth, db, storage } = useFirebase();
    const urlId = searchParams.get('id');
    const schoolId = searchParams.get('schoolId');
    
    // Initialize FCM Notifications
    const { permission, requestPermission, fcmToken } = useFCM(urlId, schoolId);
    
    // Edit Profile State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editProfileData, setEditProfileData] = useState({ name: '', parentEmail: '', parentPhone: '' });
    const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    const [studentData, setStudentData] = useState<Student | null>(null);
    const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [homework, setHomework] = useState<Homework[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [notFound, setNotFound] = useState(false);

    const [familyChildren, setFamilyChildren] = useState<Student[]>([]);
    const [familyAnnouncements, setFamilyAnnouncements] = useState<Announcement[]>([]);
    const [isFamilyView, setIsFamilyView] = useState(false);
    const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
    const [familyActiveTab, setFamilyActiveTab] = useState<'overview' | 'children' | 'calendar'>('overview');
    const [academicPeriods, setAcademicPeriods] = useState<AcademicPeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([]);

    
    // AI Assistant State
    const [activeTool, setActiveTool] = useState<any | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const [homeworkHelperInput, setHomeworkHelperInput] = useState({ question: '' });
    const [generatedExplanation, setGeneratedExplanation] = useState('');

    const [revisionInput, setRevisionInput] = useState({ topic: '' });
    const [generatedSummary, setGeneratedSummary] = useState('');

    const [quizGeneratorInput, setQuizGeneratorInput] = useState({ topic: '' });
    const [generatedQuiz, setGeneratedQuiz] = useState<any[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [showAnswers, setShowAnswers] = useState(false);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentData || !auth || !db || !storage) return;
        
        setIsUpdatingProfile(true);
        try {
            await updateStudentDetails(db, storage, auth, studentData.studentId, {
                name: editProfileData.name,
                parentEmail: editProfileData.parentEmail,
                parentPhone: editProfileData.parentPhone
            }, profilePhotoFile, schoolId!);
            
            toast({ title: "Success", description: "Profile updated successfully." });
            setIsEditingProfile(false);
            setProfilePhotoFile(null);
            fetchStudentData(studentData.studentId);
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message || "Failed to update profile.", variant: "destructive" });
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const openEditProfile = () => {
        if (!studentData) return;
        setEditProfileData({
            name: studentData.name,
            parentEmail: studentData.parentEmail || '',
            parentPhone: studentData.parentPhone || ''
        });
        setIsEditingProfile(true);
    };
    
    const handleLogout = () => {
        if(auth) {
            signOutUser(auth);
        }
        router.push('/');
        toast({ title: 'Session Expired', description: 'You have been logged out due to inactivity.' });
    };

    useIdleTimeout({ onIdle: handleLogout, timeout: 1000 * 60 * 15 }); // 15 minutes

    const initializeData = async () => {
        if (!urlId || !schoolId || !db) return;
        setIsLoading(true);
        setNotFound(false);
        try {
            const school = await getSchoolDetails(db, schoolId);
            setSchoolDetails(school);

            const periods = await getAcademicPeriods(db, schoolId);
            setAcademicPeriods(periods);
            const current = periods.find(p => p.isCurrent);
            if (current) setSelectedPeriodId(current.id);
            else if (periods.length > 0) setSelectedPeriodId(periods[0].id);

            const categories = await getFeeCategories(db, schoolId);
            setFeeCategories(categories);


            const student = await getStudentById(db, schoolId, urlId);
            if (student) {
                setIsFamilyView(false);
                setActiveStudentId(student.studentId);
                await fetchStudentData(student.studentId, student);
            } else {
                const children = await getStudentsByParentId(db, schoolId, urlId);
                if (children.length > 0) {
                    setFamilyChildren(children);
                    setIsFamilyView(true);
                    
                    // Fetch family announcements (all school + all children)
                    const announcementPromises = children.map(c => getAnnouncementsForStudent(db, schoolId, c.studentId));
                    const results = await Promise.all(announcementPromises);
                    const merged = Array.from(new Set(results.flat().map(a => a.id)))
                        .map(id => results.flat().find(a => a.id === id)!)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    setFamilyAnnouncements(merged);

                    const events = await getCalendarEvents(db, schoolId);
                    setCalendarEvents(events);
                } else {
                    setNotFound(true);
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            setNotFound(true);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStudentData = async (studentId: string, preFetchedStudent?: Student) => {
        setIsRefreshing(true);
        try {
            const student = preFetchedStudent || await getStudentById(db!, schoolId!, studentId);
            if (student) {
                const [announcementsData, events, homeworkData] = await Promise.all([
                    getAnnouncementsForStudent(db!, schoolId!, studentId),
                    getCalendarEvents(db!, schoolId!),
                    getHomeworkForClass(db!, schoolId!, student.className),
                ]);
                setStudentData(student);
                setAnnouncements(announcementsData);
                setCalendarEvents(events);
                setHomework(homeworkData);
            }
        } catch (e) {
            console.error(e);
        } finally {
             setIsRefreshing(false);
        }
    };


    useEffect(() => {
        if(db && urlId) {
           initializeData();
        }
    }, [urlId, schoolId, db]);

    const currentPeriod = useMemo(() => {
        return academicPeriods.find(p => p.id === selectedPeriodId);
    }, [academicPeriods, selectedPeriodId]);

    const isDateInPeriod = (date: string, period: AcademicPeriod) => {
        if (!period.startDate || !period.endDate) return false;
        const d = new Date(date + "T00:00:00");
        const start = new Date(period.startDate + "T00:00:00");
        const end = new Date(period.endDate + "T23:59:59");
        return d >= start && d <= end;
    };


    const financialData = useMemo(() => {
        if (!studentData) return { 
            totalOutstanding: 0, 
            balanceBF: 0, 
            feeBreakdown: {} as Record<string, number>,
            mainFeesBalance: 0,
            dailyFeesBalance: 0,
            dailyFeeEstimate: 0,
            dailyAccrued: 0
        };
        
        const allFeeCategories = [...feeCategories];
        if (!allFeeCategories.some(c => c.id === 'feeding' || c.name === 'Feeding Fee')) {
            allFeeCategories.push({ id: 'feeding', name: 'Feeding Fee', schoolId: schoolId || '', isDaily: true } as FeeCategory);
        }

        const fullLedger = (studentData.ledger || []).filter(t => !t.isVoided);
        
        // Match Admin Portal's Period Sorting and Indexing
        // Admin reverses academicPeriods then finds index
        const sortedPeriodsForIndex = [...academicPeriods].reverse();
        const currentPeriodIndex = sortedPeriodsForIndex.findIndex(p => p.id === selectedPeriodId);

        // Split ledger into Daily and Main
        const dailyLedger = fullLedger.filter(t => isDailyTransaction(t, allFeeCategories));
        const mainLedger = fullLedger.filter(t => !isDailyTransaction(t, allFeeCategories));

        const getPeriodBalances = (ledger: LedgerTransaction[]) => {
            // Match Admin's Arrears logic (lines 1524-1530 in admin page.tsx)
            const prevTransactions = ledger.filter(t => {
                if (!t.periodId) return false; // Admin excludes transactions without periodId
                const tPeriodIndex = sortedPeriodsForIndex.findIndex(p => p.id === t.periodId);
                return tPeriodIndex < currentPeriodIndex && t.periodId !== selectedPeriodId;
            });

            const bf = prevTransactions.reduce((sum, t) => sum + (Number(t.debit) || 0) - (Number(t.credit) || 0), 0);
            
            // Match Admin's Current Term logic (line 1532 in admin page.tsx)
            const currentTransactions = ledger.filter(t => !selectedPeriodId || t.periodId === selectedPeriodId);

            const billed = currentTransactions.reduce((sum, t) => sum + (Number(t.debit) || 0), 0);
            const paid = currentTransactions.reduce((sum, t) => sum + (Number(t.credit) || 0), 0);
            
            // Note: Admin's total balance calculation (lines 1539-1544)
            // totals.billed = (bf > 0 ? bf : 0) + sum(debit)
            // totals.paid = (bf < 0 ? abs(bf) : 0) + sum(credit)
            // balance = totals.billed - totals.paid
            const adminBilled = (bf > 0 ? bf : 0) + billed;
            const adminPaid = (bf < 0 ? Math.abs(bf) : 0) + paid;
            const balance = adminBilled - adminPaid;

            return { bf, billed, paid, balance, currentTransactions };
        };

        const dailyData = getPeriodBalances(dailyLedger);
        const mainData = getPeriodBalances(mainLedger);

        const breakdown = [...dailyData.currentTransactions, ...mainData.currentTransactions]
            .filter(t => t.debit > 0)
            .reduce((acc: Record<string, number>, t) => {
                let displayName = t.description;
                if (t.category) {
                    if (t.category === 'feeding' || t.category === 'feeding fee') {
                        displayName = 'Feeding Fee';
                    } else if (t.category !== 'general' && t.category !== 'transportation') {
                        const cat = allFeeCategories.find(c => c.id === t.category);
                        if (cat) displayName = cat.name;
                    }
                }
                acc[displayName] = (acc[displayName] || 0) + t.debit;
                return acc;
            }, {});

        // Daily Fee Estimate logic (Term Estimate, not Attendance-based)
        let termDays = 0;
        if (currentPeriod?.startDate && currentPeriod?.endDate) {
            const start = new Date(currentPeriod.startDate);
            const end = new Date(currentPeriod.endDate);
            let days = 0;
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                if (d.getDay() !== 0 && d.getDay() !== 6) days++;
            }
            termDays = days;
        }

        // Identify the "real" feeding category if it exists in the database
        const dynamicFeedingCat = allFeeCategories.find(c => c.isDaily && (c.name.toLowerCase().trim() === 'feeding fee' || c.name.toLowerCase().trim() === 'feeding'));
        const dynamicFeedingId = dynamicFeedingCat?.id.toLowerCase().trim();

        const discount = Number(studentData.feeDiscount) || 0;
        const discountFactor = 1 - (discount / 100);

        let dailyFeeEstimate = 0;
        let dailyAccrued = 0;
        const daysPresent = (studentData.attendance || []).filter(a => a.attended && (!selectedPeriodId || a.periodId === selectedPeriodId)).length;

        // Unified Daily Fee Calculation
        feeCategories.filter(c => c.isDaily).forEach(cat => {
            const normId = cat.id;
            
            const studentRate = (studentData.dailyFees || []).find(f => 
                f.categoryId === normId
            )?.rate || 0;

            const rateWithDiscount = Number(studentRate) * discountFactor;
            dailyFeeEstimate += rateWithDiscount * termDays;
            dailyAccrued += rateWithDiscount * daysPresent;
        });

        const mainFeesBalance = mainData.balance;
        const dailyFeesBalance = dailyData.balance;
        const totalOutstanding = mainFeesBalance + dailyAccrued;

        return { 
            totalOutstanding,
            balanceBF: mainData.bf + dailyData.bf,
            feeBreakdown: breakdown,
            mainFeesBalance,
            dailyFeesBalance,
            dailyFeeEstimate,
            dailyAccrued
        };
    }, [studentData, currentPeriod, selectedPeriodId, feeCategories, schoolId, academicPeriods]);

    const attendanceSummary = useMemo(() => {
        if (!studentData || !studentData.attendance || studentData.attendance.length === 0) return { present: 0, total: 0, rate: 0 };
        
        const filteredAttendance = studentData.attendance.filter(a => {
            if (currentPeriod && currentPeriod.startDate && currentPeriod.endDate) {
                return isDateInPeriod(a.date, currentPeriod);
            }
            return a.periodId === selectedPeriodId;
        });

        const present = filteredAttendance.filter(a => a.attended).length;
        const total = filteredAttendance.length;
        return { present, total, rate: total > 0 ? (present / total) * 100 : 0 };
    }, [studentData, currentPeriod, selectedPeriodId]);

    // AI Assistant handlers
    const handleGenerateExplanation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentData) return;
        setIsGenerating(true);
        setGeneratedExplanation('');
        try {
            const input: ExplainConceptInput = {
                question: homeworkHelperInput.question,
                className: studentData.className,
            };
            const result = await explainConcept(input);
            setGeneratedExplanation(result.explanation);
        } catch (error) {
            toast({ title: "Error", description: "Could not get explanation.", variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateSummary = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setGeneratedSummary('');
        try {
            const result = await summarizeTopic(revisionInput);
            setGeneratedSummary(result.summary);
        } catch (error) {
            toast({ title: "Error", description: "Could not generate summary.", variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateQuiz = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setGeneratedQuiz([]);
        setUserAnswers({});
        setShowAnswers(false);
        try {
            const result = await generateQuiz(quizGeneratorInput);
            setGeneratedQuiz(result.questions);
        } catch (error) {
            toast({ title: "Error", description: "Could not generate quiz.", variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const resetAndCloseTool = () => {
        setActiveTool(null);
        setGeneratedExplanation('');
        setGeneratedSummary('');
        setGeneratedQuiz([]);
        setHomeworkHelperInput({ question: '' });
        setRevisionInput({ topic: '' });
        setQuizGeneratorInput({ topic: '' });
        setUserAnswers({});
        setShowAnswers(false);
    };

    const assistantTools = [
        {
            id: 'homeworkHelper',
            icon: <HelpCircle />,
            title: 'AI Homework Helper',
            description: 'Get hints and explanations for tough questions.',
            iconColor: 'bg-red-100 text-red-700',
            cardColor: 'bg-[#f3c5c5]'
        },
        {
            id: 'revisionAssistant',
            icon: <FileText />,
            title: 'Smart Revision Assistant',
            description: 'Summarize key lessons to prepare for exams.',
            iconColor: 'bg-green-100 text-green-700',
            cardColor: 'bg-[#f9e1bf]'
        },
        {
            id: 'quizGenerator',
            icon: <FileQuestion />,
            title: 'AI Quiz Generator',
            description: 'Practice short revision quizzes on any topic.',
            iconColor: 'bg-yellow-100 text-yellow-700',
            cardColor: 'bg-[#bff0db]',
        },
    ];

    if (!db) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (isLoading) {
        return (
        <div className="min-h-screen bg-[#dee0e2] text-foreground font-body">
            <Header userName="Loading..." schoolName="Loading school..."/>
            <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
                <div className="flex items-center gap-4 bg-card p-4 rounded-lg shadow-sm">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div>
                        <Skeleton className="h-7 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
                </div>
            </main>
        </div>
        );
    }
    
    if (notFound) {
        return (
        <div className="min-h-screen bg-[#dee0e2] text-foreground font-body">
            <Header />
            <main className="container mx-auto px-4 py-8 flex flex-col items-center justify-center text-center">
                <Card className="w-full max-w-md">
                    <CardHeader><CardTitle className="flex items-center justify-center gap-2"><Frown className="w-8 h-8 text-destructive"/>Record Not Found</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">The School ID or Student/Parent ID does not match any of our records.</p>
                        <Button onClick={() => window.location.href = '/'} className="mt-6">Back to Login</Button>
                    </CardContent>
                </Card>
            </main>
        </div>
        );
    }

    if (isFamilyView && !studentData) {
        let totalFamilyArrears = 0;
        const today = new Date().toISOString().split('T')[0];
        const currentPeriod = academicPeriods.find(p => p.id === selectedPeriodId);
        
        const sortedPeriodsForIndex = [...academicPeriods].reverse();
        const currentPeriodIndex = sortedPeriodsForIndex.findIndex(p => p.id === selectedPeriodId);

        const childrenWithArrears = familyChildren.map(child => {
            const getBalanceForChild = (student: Student) => {
                const ledger = student.ledger || [];
                const mainLedger = ledger.filter(t => !t.isVoided && !isDailyTransaction(t, feeCategories));
                
                // Match Admin's Arrears logic (strictly previous periods)
                const bfTransactions = mainLedger.filter(t => {
                    if (!t.periodId) return false;
                    const tPeriodIndex = sortedPeriodsForIndex.findIndex(p => p.id === t.periodId);
                    return tPeriodIndex < currentPeriodIndex && t.periodId !== selectedPeriodId;
                });

                const bf = bfTransactions.reduce((sum, t) => sum + (Number(t.debit) || 0) - (Number(t.credit) || 0), 0);

                // Match Admin's Current Term logic (strictly current period)
                const currentTransactions = mainLedger.filter(t => t.periodId === selectedPeriodId);
                const billed = currentTransactions.reduce((sum, t) => sum + (Number(t.debit) || 0), 0);
                const paid = currentTransactions.reduce((sum, t) => sum + (Number(t.credit) || 0), 0);
                
                const mainBalance = (bf > 0 ? bf : 0) + billed - ((bf < 0 ? Math.abs(bf) : 0) + paid);

                // Daily Accrued based on attendance
                const daysPresent = (student.attendance || []).filter(a => a.attended && (!selectedPeriodId || a.periodId === selectedPeriodId)).length;
                
                let totalDailyRate = 0;
                feeCategories.filter(c => c.isDaily).forEach(cat => {
                    const rate = (student.dailyFees || []).find(f => f.categoryId === cat.id)?.rate || 0;
                    totalDailyRate += Number(rate);
                });

                const dailyAccrued = totalDailyRate * daysPresent;
                return mainBalance + dailyAccrued;
            };

            const studentArrears = getBalanceForChild(child);
            totalFamilyArrears += (studentArrears > 0 ? studentArrears : 0);
            
            const attendanceToday = child.attendance?.find(a => a.date === today);

            return {
                ...child,
                studentArrears,
                attendanceToday: attendanceToday ? (attendanceToday.attended ? 'Present' : 'Absent') : 'Not Marked'
            };
        });

        return (
        <div className="min-h-screen bg-[#dee0e2] text-foreground font-body">
                <Header 
                    userName="Family Dashboard" 
                    userIdentifier={`Parent ID: ${urlId}`}
                    schoolName={schoolDetails?.name}
                    schoolLogoUrl={schoolDetails?.logoUrl}
                />
                <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
            <NotificationPrompt permission={permission} requestPermission={requestPermission} fcmToken={fcmToken} />
                    <Tabs value={familyActiveTab} onValueChange={(val: any) => setFamilyActiveTab(val)} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-auto mb-8 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-white/20">
                            <TabsTrigger value="overview" className="rounded-xl py-3 font-bold text-xs data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Family Overview</TabsTrigger>
                            <TabsTrigger value="children" className="rounded-xl py-3 font-bold text-xs data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Your Children</TabsTrigger>
                            <TabsTrigger value="calendar" className="rounded-xl py-3 font-bold text-xs data-[state=active]:bg-primary data-[state=active]:text-white transition-all">School Calendar</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* 1. Quick Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="border-none shadow-xl bg-gradient-to-br from-primary/10 to-primary/5">
                                    <CardHeader className="pb-2">
                                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Total Family Arrears</CardDescription>
                                        <CardTitle className={cn("text-2xl font-black", totalFamilyArrears > 0 ? "text-destructive" : "text-emerald-600")}>
                                            GH¢{totalFamilyArrears.toFixed(2)}
                                        </CardTitle>
                                    </CardHeader>
                                </Card>
                                <Card className="border-none shadow-xl bg-white">
                                    <CardHeader className="pb-2">
                                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Children Registered</CardDescription>
                                        <CardTitle className="text-2xl font-black text-primary">{familyChildren.length}</CardTitle>
                                    </CardHeader>
                                </Card>
                                <Card className="border-none shadow-xl bg-white">
                                    <CardHeader className="pb-2">
                                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today's Attendance</CardDescription>
                                        <CardTitle className="text-2xl font-black text-emerald-600">
                                            {childrenWithArrears.filter(c => c.attendanceToday === 'Present').length} / {familyChildren.length}
                                        </CardTitle>
                                    </CardHeader>
                                </Card>
                                <Card className="border-none shadow-xl bg-white">
                                    <CardHeader className="pb-2">
                                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Term</CardDescription>
                                        <CardTitle className="text-sm font-black text-primary truncate">
                                            {currentPeriod ? `${currentPeriod.year} - ${currentPeriod.term}` : 'N/A'}
                                        </CardTitle>
                                    </CardHeader>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Side: Financial & Attendance List */}
                                <div className="lg:col-span-2 space-y-6">
                                    <Card className="border-none shadow-2xl overflow-hidden rounded-2xl bg-white">
                                        <CardHeader className="bg-primary/5 border-b border-primary/10 py-4">
                                            <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                                                <Wallet className="w-5 h-5" /> Family Summary
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader className="bg-muted/30">
                                                    <TableRow>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-tighter">Child</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-tighter">Class</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-tighter">Today</TableHead>
                                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-tighter">Balance</TableHead>
                                                        <TableHead className="w-10"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {childrenWithArrears.map(child => (
                                                        <TableRow key={child.studentId} className="group hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => { setActiveStudentId(child.studentId); fetchStudentData(child.studentId, child); }}>
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar className="w-8 h-8 border border-primary/10">
                                                                        <AvatarImage src={child.profilePicture} />
                                                                        <AvatarFallback className="text-[10px] font-bold">{child.name.charAt(0)}</AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="font-bold text-sm group-hover:text-primary transition-colors">{child.name}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">{child.className}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={child.attendanceToday === 'Present' ? 'default' : child.attendanceToday === 'Absent' ? 'destructive' : 'secondary'} className="text-[10px] font-bold px-2 py-0">
                                                                    {child.attendanceToday}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right font-black text-sm">
                                                                <span className={child.studentArrears > 0 ? "text-destructive" : "text-emerald-600"}>
                                                                    GH¢{child.studentArrears.toFixed(2)}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Eye className="w-4 h-4 text-primary" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>

                                    {/* Recent Announcements Feed */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-primary flex items-center gap-2 px-1">
                                            <Megaphone className="w-5 h-5 text-indigo-600" /> Family Announcements
                                        </h3>
                                        <div className="space-y-3">
                                            {familyAnnouncements.length === 0 ? (
                                                <Card className="border-dashed border-2 border-muted bg-transparent">
                                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                                        <Info className="w-8 h-8 text-muted-foreground mb-2" />
                                                        <p className="text-sm text-muted-foreground">No recent announcements for your family.</p>
                                                    </CardContent>
                                                </Card>
                                            ) : (
                                                familyAnnouncements.slice(0, 5).map(ann => (
                                                    <Card key={ann.id} className="border-none shadow-lg bg-white overflow-hidden group hover:shadow-xl transition-all">
                                                        <div className="h-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                                                        <CardHeader className="p-4">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
                                                                        {ann.recipient === 'all' ? 'School Wide' : `For: ${familyChildren.find(c => c.studentId === ann.recipient)?.name || ann.recipient}`}
                                                                    </span>
                                                                    <CardTitle className="text-sm font-black">{ann.subject}</CardTitle>
                                                                </div>
                                                                <span className="text-[10px] text-muted-foreground font-medium">{new Date(ann.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                                            </div>
                                                            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{ann.message}</p>
                                                        </CardHeader>
                                                    </Card>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Upcoming Events & Quick Links */}
                                <div className="space-y-8">
                                    <Card className="border-none shadow-2xl bg-primary text-white rounded-2xl overflow-hidden">
                                        <CardHeader>
                                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                                <CalendarDays className="w-5 h-5" /> Upcoming Events
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {calendarEvents.filter(e => new Date(e.date) >= new Date()).slice(0, 3).length === 0 ? (
                                                <p className="text-xs text-white/70 italic text-center py-4">No upcoming events scheduled.</p>
                                            ) : (
                                                calendarEvents.filter(e => new Date(e.date) >= new Date()).slice(0, 3).map(event => (
                                                    <div key={event.id} className="flex gap-3 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all cursor-default">
                                                        <div className="flex flex-col items-center justify-center min-w-[40px] h-10 bg-white text-primary rounded-lg font-black text-xs leading-tight">
                                                            <span>{new Date(event.date).getDate()}</span>
                                                            <span className="text-[8px] uppercase">{new Date(event.date).toLocaleDateString('en-GB', { month: 'short' })}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold leading-tight">{event.title}</span>
                                                            <span className="text-[10px] text-white/70 line-clamp-1">{event.type}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                            <Button variant="secondary" className="w-full h-8 text-[10px] font-black uppercase tracking-widest mt-2" onClick={() => setFamilyActiveTab('calendar')}>
                                                View Full Calendar
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground px-1">Resources</h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            <Button variant="outline" className="justify-start h-12 rounded-xl border-primary/10 hover:bg-primary/5 transition-all gap-3 bg-white" onClick={() => window.open('tel:' + schoolDetails?.schoolPhone)}>
                                                <Phone className="w-4 h-4 text-primary" />
                                                <div className="flex flex-col items-start">
                                                    <span className="text-xs font-bold">Contact School</span>
                                                    <span className="text-[9px] text-muted-foreground">Speak with the office</span>
                                                </div>
                                            </Button>
                                            <Button variant="outline" className="justify-start h-12 rounded-xl border-primary/10 hover:bg-primary/5 transition-all gap-3 bg-white" onClick={() => window.open('mailto:' + schoolDetails?.schoolEmail)}>
                                                <Mail className="w-4 h-4 text-primary" />
                                                <div className="flex flex-col items-start">
                                                    <span className="text-xs font-bold">Email Office</span>
                                                    <span className="text-[9px] text-muted-foreground">General inquiries</span>
                                                </div>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="children" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {childrenWithArrears.map(child => (
                                    <Card key={child.studentId} className="cursor-pointer border-none shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 rounded-3xl overflow-hidden group" onClick={() => { setActiveStudentId(child.studentId); fetchStudentData(child.studentId, child); }}>
                                        <div className={cn("h-2 w-full", child.studentArrears > 0 ? "bg-destructive" : "bg-emerald-500")} />
                                        <CardHeader className="flex flex-row items-center gap-4 p-6">
                                            {child.profilePicture ? (
                                                <img src={child.profilePicture} alt={child.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/10 shadow-lg group-hover:scale-105 transition-transform" />
                                            ) : (
                                                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl shadow-inner group-hover:scale-105 transition-transform">
                                                    {child.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{child.className}</span>
                                                    <CardTitle className="text-xl font-black group-hover:text-primary transition-colors">{child.name}</CardTitle>
                                                    <CardDescription className="text-xs font-bold mt-1">ID: {child.studentId}</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardFooter className="bg-muted/30 p-6 flex flex-col gap-4">
                                            <div className="w-full flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Total Balance</span>
                                                    <span className={cn("text-lg font-black", child.studentArrears > 0 ? "text-destructive" : "text-emerald-600")}>
                                                        GH¢{child.studentArrears.toFixed(2)}
                                                    </span>
                                                </div>
                                                <Badge variant={child.attendanceToday === 'Present' ? 'default' : child.attendanceToday === 'Absent' ? 'destructive' : 'secondary'} className="px-3 py-1 font-black text-[10px] uppercase">
                                                    {child.attendanceToday}
                                                </Badge>
                                            </div>
                                            <Button className="w-full rounded-xl h-10 font-black text-xs uppercase tracking-widest gap-2">
                                                <UserCircle className="w-4 h-4" /> View Profile
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="calendar" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
                                <CardHeader className="bg-primary/5 border-b border-primary/10 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-primary/10 rounded-2xl">
                                            <CalendarDays className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl font-black text-primary tracking-tight">School Calendar</CardTitle>
                                            <CardDescription className="text-sm font-bold">Stay updated with academic events and holidays.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {calendarEvents.length === 0 ? (
                                            <div className="col-span-full py-12 text-center text-muted-foreground font-bold">No school events scheduled yet.</div>
                                        ) : (
                                            calendarEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(event => (
                                                <div key={event.id} className="relative group p-6 rounded-3xl border-2 border-primary/5 hover:border-primary/20 bg-white hover:shadow-xl transition-all duration-300">
                                                    <div className={cn(
                                                        "absolute top-4 right-4 px-2 py-1 rounded-lg text-[9px] font-black uppercase",
                                                        event.type === 'Holiday' ? "bg-red-100 text-red-600" : event.type === 'Exam' ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                                                    )}>
                                                        {event.type}
                                                    </div>
                                                    <div className="flex flex-col gap-4">
                                                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex flex-col items-center justify-center text-primary font-black shadow-inner">
                                                            <span className="text-lg leading-none">{new Date(event.date).getDate()}</span>
                                                            <span className="text-[10px] uppercase leading-none">{new Date(event.date).toLocaleDateString('en-GB', { month: 'short' })}</span>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-black text-primary leading-tight group-hover:text-primary/80 transition-colors">{event.title}</h4>
                                                            <p className="text-xs text-muted-foreground font-bold mt-2 leading-relaxed">{event.description}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        );
    }

    if (!studentData) {
        return null;
    }

    const homeworkColors = ['bg-yellow-200', 'bg-green-200', 'bg-blue-200', 'bg-pink-200', 'bg-purple-200'];

    return (
        <div className="min-h-screen bg-[#dee0e2] text-foreground font-body">
        <Header 
            userName={studentData.name} 
            userIdentifier={`Student ID: ${studentData.studentId}`}
            profilePicture={studentData.profilePicture}
            schoolName={schoolDetails?.name}
            schoolLogoUrl={schoolDetails?.logoUrl}
        />
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
            <NotificationPrompt permission={permission} requestPermission={requestPermission} fcmToken={fcmToken} />
            {isFamilyView && (
                <Button variant="ghost" className="mb-4 text-primary hover:text-primary/80" onClick={() => { setActiveStudentId(null); setStudentData(null); }}>
                    ← Back to Family List
                </Button>
            )}
            <div className="md:relative">
                <StudentProfile 
                    name={studentData.name} 
                    studentClass={studentData.className} 
                    studentId={studentData.studentId}
                    profilePicture={studentData.profilePicture}
                    onRefresh={() => fetchStudentData(studentData.studentId)}
                    isRefreshing={isRefreshing}
                    onEdit={openEditProfile}
                    feeDiscount={studentData.feeDiscount}
                />
            </div>

            {/* Edit Profile Dialog */}
            <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Student Profile</DialogTitle>
                        <DialogDescription>
                            Update the student's basic information and profile photo.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateProfile} className="space-y-6 pt-4">
                        <div className="flex flex-col items-center gap-4 mb-4">
                            <div className="relative group">
                                <Avatar className="w-24 h-24 border-2 border-primary/20">
                                    <AvatarImage src={profilePhotoFile ? URL.createObjectURL(profilePhotoFile) : studentData.profilePicture} />
                                    <AvatarFallback><Camera className="w-8 h-8 text-muted-foreground" /></AvatarFallback>
                                </Avatar>
                                <Label htmlFor="photo-upload" className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                    <Camera className="w-6 h-6" />
                                </Label>
                                <Input 
                                    id="photo-upload" 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">Click to upload new photo</p>
                        </div>

                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Student Name</Label>
                                <Input 
                                    id="name" 
                                    value={editProfileData.name} 
                                    onChange={(e) => setEditProfileData({...editProfileData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Parent Email</Label>
                                <Input 
                                    id="email" 
                                    type="email"
                                    value={editProfileData.parentEmail} 
                                    onChange={(e) => setEditProfileData({...editProfileData, parentEmail: e.target.value})}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Parent Phone</Label>
                                <Input 
                                    id="phone" 
                                    value={editProfileData.parentPhone} 
                                    onChange={(e) => setEditProfileData({...editProfileData, parentPhone: e.target.value})}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                            <Button type="submit" disabled={isUpdatingProfile}>
                                {isUpdatingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            
             <Tabs defaultValue="fees" className="w-full mt-6">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
                    <TabsTrigger value="fees" className="data-[state=active]:bg-[#900b02] data-[state=active]:text-white">Fees &amp; Attendance</TabsTrigger>
                    <TabsTrigger value="announcements" className="data-[state=active]:bg-[#900b02] data-[state=active]:text-white">Announcements</TabsTrigger>
                    <TabsTrigger value="homework" className="data-[state=active]:bg-[#900b02] data-[state=active]:text-white">Homework</TabsTrigger>
                    <TabsTrigger value="calendar" className="data-[state=active]:bg-[#900b02] data-[state=active]:text-white">Calendar</TabsTrigger>
                    <TabsTrigger value="ai-assistant" className="data-[state=active]:bg-[#900b02] data-[state=active]:text-white">AI Assistant</TabsTrigger>
                </TabsList>

                <TabsContent value="fees" className="mt-6 space-y-8">
                    <div className="flex items-center justify-between mb-4 px-1">
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Financial Records</span>
                            <Badge variant="outline" className="text-[10px] font-bold bg-white border-primary/20 text-primary">
                                {currentPeriod ? `${currentPeriod.year} - ${currentPeriod.term}` : 'All Time'}
                            </Badge>
                         </div>
                         {financialData.totalOutstanding > 0 && (
                             <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-bold animate-pulse">
                                 Action Required: Arrears Detected
                             </Badge>
                         )}
                    </div>

                    <div className="space-y-8 items-start">
                        {/* 2. Main Column: Statement of Account */}
                        <div className="space-y-8">
                            <section>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <h3 className="text-xl font-bold text-primary flex items-center gap-2 underline decoration-primary/20 decoration-4 underline-offset-8">
                                        <Landmark className="w-5 h-5 text-indigo-600" /> Statement of Account
                                    </h3>
                                    
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Term:</span>
                                        <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                                            <SelectTrigger className="w-[180px] h-8 text-[10px] font-bold border-2 bg-white">
                                                <SelectValue placeholder="Select Term" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {academicPeriods.map(p => (
                                                    <SelectItem key={p.id} value={p.id} className="text-xs font-bold">
                                                        {p.year} - {p.term} {p.isCurrent ? '(Active)' : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <StudentLedgerView 
                                    student={studentData} 
                                    periods={academicPeriods} 
                                    selectedPeriodId={selectedPeriodId} 
                                    feeCategories={feeCategories}
                                    schoolId={schoolId || undefined}
                                    feeDiscount={studentData.feeDiscount}
                                />
                            </section>

                            <section>
                                 <h3 className="text-xl font-bold text-primary flex items-center gap-2 mb-6 underline decoration-primary/20 decoration-4 underline-offset-8">
                                    <Smartphone className="w-5 h-5 text-indigo-600" /> Quick Payment
                                </h3>
                                <Card className="overflow-hidden border-none shadow-2xl bg-white/80 backdrop-blur-md">
                                    <div className="h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-indigo-100 rounded-xl shadow-inner text-indigo-700">
                                                <Landmark className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl font-bold tracking-tight text-slate-900">Payment Portal</CardTitle>
                                                <CardDescription className="text-slate-500">Securely pay school fees</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Primary Action: Online Payment */}
                                        <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xl relative overflow-hidden group flex flex-col justify-between">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <Wallet className="w-32 h-32 -mr-12 -mt-12 rotate-12" />
                                            </div>
                                            <div className="relative z-10 flex flex-col h-full justify-center">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-200 border-indigo-500/30 hover:bg-indigo-500/30">Instant Pay</Badge>
                                                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Hubtel Secure</span>
                                                    </div>
                                                    <h4 className="text-xl font-bold mb-6">Online via Hubtel</h4>
                                                </div>
                                                <FeePaymentDialog
                                                    studentId={studentData.studentId}
                                                    studentName={studentData.name}
                                                    schoolId={schoolId!}
                                                    email={studentData.parentEmail}
                                                    outstandingBalance={financialData.totalOutstanding}
                                                    hubtelMerchantNumber={schoolDetails?.hubtelMerchantNumber || ''}
                                                    periodId={selectedPeriodId}
                                                    mainFeesBalance={financialData.mainFeesBalance}
                                                    dailyFeesBalance={financialData.dailyFeesBalance}
                                                    dailyFeeEstimate={financialData.dailyFeeEstimate}
                                                    dailyAccrued={financialData.dailyAccrued}
                                                />
                                            </div>
                                        </div>

                                        {/* Manual Payment Methods */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 px-1">
                                                <div className="h-px flex-1 bg-slate-200" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manual Details</span>
                                                <div className="h-px flex-1 bg-slate-200" />
                                            </div>

                                            {(!schoolDetails?.bankAccounts || schoolDetails.bankAccounts.length === 0) && !schoolDetails?.momoNumber ? (
                                                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                    <Info className="mx-auto h-6 w-6 text-slate-400" />
                                                    <p className="mt-2 text-xs text-slate-500">Contact school for details.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {schoolDetails?.momoNumber && (
                                                        <div className="group p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-yellow-100 text-yellow-700 rounded-lg">
                                                                        <Smartphone className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">MoMo</p>
                                                                        <p className="text-sm font-bold text-slate-900">{schoolDetails.momoNumber}</p>
                                                                    </div>
                                                                </div>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                                    onClick={() => { 
                                                                        navigator.clipboard.writeText(schoolDetails.momoNumber || ''); 
                                                                        toast({title: "MoMo number copied!"})
                                                                    }}
                                                                >
                                                                    <Copy className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {schoolDetails?.bankAccounts && schoolDetails.bankAccounts.map(account => (
                                                        <div key={account.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                                                                    <Banknote className="w-4 h-4" />
                                                                </div>
                                                                <p className="text-sm font-bold text-slate-900">{account.bankName}</p>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-1 pl-1 text-[10px]">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-slate-400 uppercase font-bold">Account</span>
                                                                    <span className="font-mono font-bold text-slate-700">{account.accountNumber}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-2 pb-6 flex justify-center">
                                        <p className="text-[10px] text-slate-400 text-center italic">
                                            Keep receipts for verification.
                                        </p>
                                    </CardFooter>
                                </Card>
                            </section>

                            {/* Attendance Heatmap / Records */}
                            <section>
                                <h3 className="text-xl font-bold text-primary flex items-center gap-2 mb-6 underline decoration-primary/20 decoration-4 underline-offset-8">
                                    <CalendarDays className="w-5 h-5 text-indigo-600" /> Attendance History
                                </h3>
                                <AttendanceCard attendance={studentData.attendance || []} />
                            </section>
                        </div>
                    </div>

                </TabsContent>
                
                <TabsContent value="announcements" className="mt-6">
                    <Card className="shadow-md bg-accent/20 border-accent">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <Megaphone className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="font-headline text-primary">School Announcements</CardTitle>
                                    <CardDescription>Important messages from the school</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                             {announcements.length > 0 ? (
                                <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                                {announcements.map((item, index) => (
                                        <AccordionItem value={`item-${index}`} key={item.id}>
                                            <AccordionTrigger>
                                                <div className="flex flex-col items-start text-left">
                                                    <span className="font-semibold">{item.subject}</span>
                                                    <span className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="prose prose-sm max-w-none dark:prose-invert prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground">
                                                <ReactMarkdown>{item.message}</ReactMarkdown>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                             ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Megaphone className="w-12 h-12 mx-auto" />
                                    <p className="mt-4">No announcements have been posted yet.</p>
                                </div>
                             )}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="homework" className="mt-6">
                    <Card className="shadow-md">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <BookCopy className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="font-headline text-primary">My Homework</CardTitle>
                                    <CardDescription>Assignments for {studentData.className}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                        {homework.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {homework.map((hw, index) => (
                                        <div key={hw.id} className={`relative p-4 rounded-lg shadow-md text-gray-800 transform rotate-[-2deg] hover:rotate-0 hover:scale-105 transition-transform ${homeworkColors[index % homeworkColors.length]}`}>
                                            <Pin className="absolute top-2 right-2 w-5 h-5 text-gray-600/70" />
                                            <h3 className="font-bold text-lg mb-2">{hw.title}</h3>
                                            <p className="text-sm mb-3 h-16 overflow-hidden">{hw.description}</p>
                                            <p className="text-xs font-semibold text-primary">Due by: {new Date(hw.dueDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-green-700 bg-green-50 rounded-lg">
                                    <PartyPopper className="w-16 h-16 mx-auto" />
                                    <h3 className="mt-4 text-xl font-bold">All Caught Up!</h3>
                                    <p className="mt-1">You have no homework right now. Great job!</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="calendar" className="mt-6">
                    <Card className="shadow-md">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <CalendarDays className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="font-headline text-primary">School Calendar</CardTitle>
                                    <CardDescription>Upcoming term events and holidays</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                        <div className="max-h-96 overflow-y-auto pr-2">
                            {calendarEvents.length > 0 ? (
                                    <div className="space-y-4">
                                        {calendarEvents.map(event => (
                                            <div key={event.id} className="flex items-start gap-4 p-3 rounded-md bg-[#dee0e2]">
                                                <div className="flex flex-col items-center justify-center text-center w-16">
                                                    <span className="text-lg font-bold text-primary">{new Date(event.date + "T00:00:00").getDate()}</span>
                                                    <span className="text-sm text-muted-foreground -mt-1">{new Date(event.date + "T00:00:00").toLocaleDateString('en-GB', { month: 'short' })}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <div className='flex justify-between items-start'>
                                                        <p className="font-semibold">{event.title}</p>
                                                        <Badge variant={
                                                            event.type === 'Holiday' ? 'destructive' :
                                                            event.type === 'Exam' ? 'secondary' : 'default'
                                                        }>{event.type}</Badge>
                                                    </div>
                                                    {event.description && <p className="text-sm text-muted-foreground mt-1">{event.description}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <CalendarIcon className="w-12 h-12 mx-auto" />
                                        <p className="mt-4">The school calendar has not been updated yet.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="ai-assistant" className="mt-6">
                    <Card className="shadow-md">
                         <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <Bot className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="font-headline text-primary">AI Student Assistant</CardTitle>
                                    <CardDescription>Your personal AI-powered learning companion.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {assistantTools.map(tool => (
                                    <Card 
                                        key={tool.id} 
                                        className={cn(
                                            "group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col",
                                            tool.cardColor
                                        )}
                                        onClick={() => setActiveTool(tool)}
                                    >
                                        <CardHeader className="flex-row items-start gap-4">
                                            <div className={`p-3 rounded-lg ${tool.iconColor}`}>
                                                {tool.icon}
                                            </div>
                                            <div className="flex-1">
                                                <CardTitle className="text-lg font-semibold">{tool.title}</CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            <div className="hidden md:flex flex-col items-center mt-12 gap-4">
                <p className="text-muted-foreground">Need help? Contact the school</p>
                <div className="flex flex-wrap justify-center gap-4">
                    <Button asChild><a href={schoolDetails?.schoolPhone ? `tel:${schoolDetails.schoolPhone}` : '#'}><Phone className="mr-2 h-4 w-4" /> Call Us</a></Button>
                    <Button asChild variant="outline"><a href={schoolDetails?.schoolEmail ? `mailto:${schoolDetails.schoolEmail}` : '#'}><Mail className="mr-2 h-4 w-4" /> Email Us</a></Button>
                    <Button asChild><a href={schoolDetails?.schoolPhone ? `https://wa.me/${schoolDetails.schoolPhone.replace(/\D/g, '')}` : '#'} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</a></Button>
                </div>
            </div>
        </main>
        <ContactBar schoolPhone={schoolDetails?.schoolPhone} schoolEmail={schoolDetails?.schoolEmail} />

        {/* AI Assistant Dialog */}
        <Dialog open={!!activeTool} onOpenChange={(isOpen) => { if (!isOpen) resetAndCloseTool() }}>
            <DialogContent className="max-w-2xl">
                {activeTool && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 text-2xl">
                                <div className={`p-3 rounded-lg ${activeTool.iconColor}`}>
                                    {activeTool.icon}
                                </div>
                                {activeTool.title}
                            </DialogTitle>
                            <DialogDescription className="pt-2">{activeTool.description}</DialogDescription>
                        </DialogHeader>
                        
                        <div className="py-4 max-h-[60vh] overflow-y-auto px-1">
                            {activeTool.id === 'homeworkHelper' && (
                                <form id="homework-helper-form" onSubmit={handleGenerateExplanation} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="question">Question or Concept</Label>
                                        <Textarea 
                                            id="question"
                                            placeholder="e.g., What is photosynthesis? or How do I solve 2x + 5 = 15?"
                                            value={homeworkHelperInput.question}
                                            onChange={e => setHomeworkHelperInput({ ...homeworkHelperInput, question: e.target.value })}
                                            required
                                            disabled={isGenerating}
                                        />
                                    </div>
                                    {isGenerating && <div className="flex justify-center items-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
                                    {generatedExplanation && <GeneratedContentDisplay content={generatedExplanation} title="AI Generated Explanation" />}
                                </form>
                            )}

                            {activeTool.id === 'revisionAssistant' && (
                                <form id="revision-assistant-form" onSubmit={handleGenerateSummary} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="topic">Topic or Subject</Label>
                                        <Input
                                            id="topic"
                                            placeholder="e.g., The Water Cycle, World War II"
                                            value={revisionInput.topic}
                                            onChange={e => setRevisionInput({ topic: e.target.value })}
                                            required
                                            disabled={isGenerating}
                                        />
                                    </div>
                                    {isGenerating && <div className="flex justify-center items-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
                                    {generatedSummary && <GeneratedContentDisplay content={generatedSummary} title="AI Generated Summary" />}
                                </form>
                            )}

                            {activeTool.id === 'quizGenerator' && (
                                <form id="quiz-generator-form" onSubmit={handleGenerateQuiz} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="quiz-topic">Topic or Subject</Label>
                                        <Input
                                            id="quiz-topic"
                                            placeholder="e.g., The Solar System, Fractions"
                                            value={quizGeneratorInput.topic}
                                            onChange={e => setQuizGeneratorInput({ topic: e.target.value })}
                                            required
                                            disabled={isGenerating}
                                        />
                                    </div>
                                    {isGenerating && <div className="flex justify-center items-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
                                    
                                    {generatedQuiz.length > 0 && (
                                        <div className="mt-6 space-y-6">
                                            <h4 className="font-semibold text-lg text-primary">Generated Quiz on: {quizGeneratorInput.topic}</h4>
                                            {generatedQuiz.map((q, qIndex) => (
                                                <div key={qIndex} className="p-4 border rounded-lg bg-[#dee0e2]/50">
                                                    <p className="font-medium mb-4">{qIndex + 1}. {q.question}</p>
                                                    <div className="space-y-2">
                                                        {q.options.map((option, oIndex) => {
                                                            const isSelected = userAnswers[qIndex] === option;
                                                            const isCorrect = q.answer === option;
                                                            return (
                                                                <Button
                                                                    key={oIndex}
                                                                    type="button"
                                                                    variant={showAnswers ? (isCorrect ? 'default' : (isSelected ? 'destructive' : 'outline')) : (isSelected ? 'secondary' : 'outline')}
                                                                    className={cn("w-full justify-start h-auto py-2 px-3 text-wrap", {
                                                                        'bg-green-100 border-green-400 text-green-800 hover:bg-green-200': showAnswers && isCorrect,
                                                                        'bg-red-100 border-red-400 text-red-800 hover:bg-red-200': showAnswers && !isCorrect && isSelected,
                                                                    })}
                                                                    onClick={() => !showAnswers && setUserAnswers(prev => ({...prev, [qIndex]: option}))}
                                                                >
                                                                    {showAnswers && (isCorrect ? <CheckCircle className="mr-2"/> : (isSelected ? <XCircle className="mr-2"/> : <div className="w-6 h-4 mr-2"/>))}
                                                                    {option}
                                                                </Button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                            <Button type="button" onClick={() => setShowAnswers(true)} disabled={showAnswers || Object.keys(userAnswers).length !== generatedQuiz.length}>Check Answers</Button>
                                        </div>
                                    )}
                                </form>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={resetAndCloseTool} disabled={isGenerating}>Cancel</Button>
                            <Button 
                                type="submit" 
                                form={activeTool.id === 'homeworkHelper' ? 'homework-helper-form' : activeTool.id === 'revisionAssistant' ? 'revision-assistant-form' : 'quiz-generator-form'}
                                disabled={isGenerating}
                            >
                                {isGenerating ? <><Loader2 className="animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate</>}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full flex items-center justify-center bg-[#dee0e2]">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    )
}

    
