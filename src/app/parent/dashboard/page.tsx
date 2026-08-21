

'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/header';
import StudentProfile from '@/components/student-profile';
import ContactBar from '@/components/contact-bar';
import { Button } from '@/components/ui/button';
import { 
    Wallet, Megaphone, CalendarDays, Eye, Phone, Mail, MessageCircle,
    ChevronRight, ArrowLeft, ArrowRight, Lock, Zap, Users, UserCircle, LayoutDashboard,
    Calendar as CalendarIcon, Info, Frown, Loader2, Copy, FileQuestion, CheckCircle, XCircle, Landmark, Smartphone, UtensilsCrossed, History, Camera, ShieldCheck, Banknote, TrendingDown, CheckCheck, RefreshCw, Notebook, BookCopy, PartyPopper, Pin, Bus, Bot, Sparkles, GraduationCap, HelpCircle, FileText, Download, KeyRound
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
import { Student, getStudentById, getStudentsByParentId, getStudentsByParentPhone, Announcement, getAnnouncementsForStudent, CalendarEvent, getCalendarEvents, Homework, getHomeworkForClass, School, getSchoolDetails, signOutUser, getAcademicPeriods, AcademicPeriod, updatePin, updateStudentDetails, getFeeCategories, FeeCategory, isDailyTransaction, LedgerTransaction, calculateStudentTotalBalance, LibraryResource, getLibraryResourcesForClass, StudentReport, getAllStudentReports } from '@/lib/data-store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
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
import { ParentBulkFeePaymentDialog } from '@/components/parent-bulk-fee-payment-dialog';
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
const ChildSwitcher = ({ children, activeId, onSelect, onBackToOverview, showOverview = false, className }: { 
    children: Student[], 
    activeId: string | null, 
    onSelect: (id: string, child: Student) => void,
    onBackToOverview: () => void,
    showOverview?: boolean,
    className?: string
}) => {
    const currentValue = activeId || (showOverview ? "overview" : "");

    const handleValueChange = (value: string) => {
        if (value === "overview") {
            onBackToOverview();
        } else {
            const selectedChild = children.find(c => c.studentId === value);
            if (selectedChild) {
                onSelect(value, selectedChild);
            }
        }
    };

    return (
        <div className={cn("flex flex-wrap items-center gap-3 mb-8 p-3 bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm w-full md:w-auto md:inline-flex", className)}>
            <Select value={currentValue} onValueChange={handleValueChange}>
                <SelectTrigger className="w-[180px] sm:w-[240px] md:w-[280px] bg-white border-2 border-primary/10 hover:border-primary/30 transition-colors rounded-lg font-bold h-12 shadow-sm focus:ring-primary/20">
                    <SelectValue placeholder="Select a view" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-primary/20 shadow-xl p-1 bg-white/95 backdrop-blur-xl">
                    {showOverview && (
                        <>
                            <SelectItem value="overview" className="font-bold py-3 cursor-pointer rounded-lg focus:bg-primary/5 focus:text-primary transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <LayoutDashboard className="w-4 h-4 text-primary" />
                                    </div>
                                    <span>Family Overview</span>
                                </div>
                            </SelectItem>
                            <div className="my-1 h-px bg-border/50 mx-2" />
                        </>
                    )}
                    
                    {children.map(child => (
                        <SelectItem key={child.studentId} value={child.studentId} className="font-bold py-2.5 cursor-pointer rounded-lg focus:bg-primary/5 focus:text-primary transition-colors">
                            <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
                                    <AvatarImage src={child.profilePicture} />
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{child.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{child.name.split(' ')[0]}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
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
        <div className="mt-6 p-4 border border-slate-200 bg-slate-50/80 rounded-lg animate-in fade-in-50">
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
    const actionParam = searchParams.get('action');
    const isQuickPay = actionParam === 'pay';
    const [activeTab, setActiveTab] = useState(isQuickPay ? "finances" : "overview");
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

    const [showPinModal, setShowPinModal] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [isUpdatingPin, setIsUpdatingPin] = useState(false);

    useEffect(() => {
        const authFlag = sessionStorage.getItem(`auth_${urlId}`);
        if (authFlag !== 'true') {
            router.replace('/');
        }
    }, [urlId, router]);

    // Check if pin change is required
    useEffect(() => {
        const pinChangeReq = sessionStorage.getItem('pinChangeRequired');
        if (pinChangeReq === 'true') {
            setShowPinModal(true);
        }
    }, []);

    const handlePinChange = async () => {
        if (newPin.length !== 4 || confirmPin.length !== 4) {
            setPinError('PIN must be exactly 4 digits.');
            return;
        }
        if (newPin !== confirmPin) {
            setPinError('PINs do not match.');
            return;
        }
        if (!db || !schoolId || !urlId) return;
        
        setIsUpdatingPin(true);
        setPinError('');
        try {
            await updatePin(db, schoolId, urlId, false, newPin);
            setShowPinModal(false);
            sessionStorage.removeItem('pinChangeRequired');
            toast({ title: 'PIN Updated', description: 'Your secure PIN has been updated successfully.' });
        } catch (e: any) {
            setPinError(e.message || 'Failed to update PIN.');
        } finally {
            setIsUpdatingPin(false);
        }
    };

    const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [homework, setHomework] = useState<Homework[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [notFound, setNotFound] = useState(false);

    const [familyChildren, setFamilyChildren] = useState<Student[]>([]);
    const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
    const [academicPeriods, setAcademicPeriods] = useState<AcademicPeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([]);
    const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
    const [libraryResources, setLibraryResources] = useState<LibraryResource[]>([]);

    
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
                setActiveStudentId(student.studentId);
                await fetchStudentData(student.studentId, student);
                
                // Fetch siblings by parentPhone to enable sibling switching and family bulk payment
                if (student.parentPhone) {
                    const siblings = await getStudentsByParentPhone(db, schoolId, student.parentPhone);
                    setFamilyChildren(siblings);
                }
            } else {
                // If student ID is not found, fallback to loading by Parent Phone or Parent ID
                let children = await getStudentsByParentPhone(db, schoolId, urlId);
                if (children.length === 0) {
                    children = await getStudentsByParentId(db, schoolId, urlId);
                }
                
                if (children.length > 0) {
                    const firstChild = children[0];
                    setFamilyChildren(children);
                    setActiveStudentId(firstChild.studentId);
                    await fetchStudentData(firstChild.studentId, firstChild);
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
                const [announcementsData, events, homeworkData, reportsData, resourcesData] = await Promise.all([
                    getAnnouncementsForStudent(db!, schoolId!, studentId),
                    getCalendarEvents(db!, schoolId!),
                    getHomeworkForClass(db!, schoolId!, student.className),
                    getAllStudentReports(db!, schoolId!, studentId),
                    getLibraryResourcesForClass(db!, schoolId!, student.className)
                ]);
                setStudentData(student);
                setAnnouncements(announcementsData);
                setCalendarEvents(events);
                setHomework(homeworkData);
                setStudentReports(reportsData);
                setLibraryResources(resourcesData);
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

        // Daily Recurring Fee Estimate logic (Term Estimate, not Attendance-based)
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

        // Unified Daily Recurring Fee Calculation
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
        const totalOutstanding = mainFeesBalance + dailyFeesBalance + dailyAccrued;

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

    const familyArrearsData = useMemo(() => {
        let totalFamilyArrears = 0;
        let totalFamilyMainArrears = 0;
        let totalFamilyDailyArrears = 0;

        const childrenWithArrears = familyChildren.map(child => {
            const balanceInfo = calculateStudentTotalBalance(child, academicPeriods, selectedPeriodId, feeCategories);
            const studentArrears = Math.max(0, balanceInfo.totalOutstanding);
            const mainArrears = Math.max(0, balanceInfo.mainData.balance);
            const dailyArrears = Math.max(0, balanceInfo.dailyData.balance + balanceInfo.dailyAccruedInfo);

            totalFamilyArrears += studentArrears;
            totalFamilyMainArrears += mainArrears;
            totalFamilyDailyArrears += dailyArrears;
            
            return {
                ...child,
                studentArrears,
                mainArrears,
                dailyArrears,
                attendanceToday: (child.attendance || []).find(a => a.date === new Date().toISOString().split('T')[0])?.attended ? 'Present' : (child.attendance || []).find(a => a.date === new Date().toISOString().split('T')[0]) ? 'Absent' : 'Not Recorded'
            };
        });

        return { totalFamilyArrears, totalFamilyMainArrears, totalFamilyDailyArrears, childrenWithArrears };
    }, [familyChildren, academicPeriods, selectedPeriodId, feeCategories]);

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
        <div className="min-h-screen bg-white text-foreground font-body">
            <Header userName="Loading..." schoolName="Loading school..."/>
            <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">

            {/* PIN Change Modal */}
            <Dialog open={showPinModal} onOpenChange={(open) => {
                // Prevent closing if required
                if (sessionStorage.getItem('pinChangeRequired') !== 'true') setShowPinModal(open);
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary"/> Setup Secure PIN</DialogTitle>
                        <DialogDescription>
                            For your security, please change your default PIN to a new 4-digit secure PIN.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>New 4-Digit PIN</Label>
                            <Input type="password" maxLength={4} placeholder="e.g. 8421" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} disabled={isUpdatingPin} className="text-xl tracking-widest text-center" />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirm New PIN</Label>
                            <Input type="password" maxLength={4} placeholder="e.g. 8421" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} disabled={isUpdatingPin} className="text-xl tracking-widest text-center" />
                        </div>
                        {pinError && <p className="text-xs font-bold text-rose-500 text-center">{pinError}</p>}
                    </div>
                    <DialogFooter>
                        <Button className="w-full" onClick={handlePinChange} disabled={isUpdatingPin || newPin.length !== 4 || confirmPin.length !== 4}>
                            {isUpdatingPin ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Secure PIN
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
        <div className="min-h-screen bg-white text-foreground font-body">
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



    if (!studentData) {
        return null;
    }

    const homeworkColors = ['bg-yellow-200', 'bg-green-200', 'bg-blue-200', 'bg-pink-200', 'bg-purple-200'];

    const generateReportCard = (report: StudentReport) => {
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text(schoolDetails?.name || 'School Report Card', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`Student: ${studentData?.name}`, 14, 35);
        doc.text(`Class: ${report.className}`, 14, 42);
        doc.text(`Term: ${report.term} (${report.academicYear})`, 14, 49);
        
        doc.text(`Total Marks: ${report.summary?.totalMarks || 0}`, 140, 35);
        doc.text(`Average: ${report.summary?.averageScore || 0}%`, 140, 42);
        doc.text(`Position: ${report.summary?.classPosition || 'N/A'}`, 140, 49);

        const tableData = (report.subjects || []).map(s => [
            s.name,
            s.classAssessmentScore || '-',
            s.examScore || '-',
            s.totalScore || '-',
            s.grade || '-',
            s.remark || '-'
        ]);

        autoTable(doc, {
            startY: 60,
            head: [['Subject', 'Class Score', 'Exam Score', 'Total', 'Grade', 'Remark']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [149, 54, 234] }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 60;
        doc.text(`Teacher's Remark: ${report.remarks?.teacherRemark || '-'}`, 14, finalY + 15);
        doc.text(`Head's Remark: ${report.remarks?.headTeacherRemark || '-'}`, 14, finalY + 25);

        doc.save(`${studentData?.name.replace(/\s+/g, '_')}_Report_${report.term}.pdf`);
    };

    return (
        <div className="min-h-screen bg-white text-foreground font-body">
        {!isQuickPay && (
<Header 
            userName={studentData.name} 
            userIdentifier={`Student ID: ${studentData.studentId}`}
            profilePicture={studentData.profilePicture}
            schoolName={schoolDetails?.name}
            schoolLogoUrl={schoolDetails?.logoUrl}
        />
)}
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">

            {/* PIN Change Modal */}
            <Dialog open={showPinModal} onOpenChange={(open) => {
                // Prevent closing if required
                if (sessionStorage.getItem('pinChangeRequired') !== 'true') setShowPinModal(open);
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary"/> Setup Secure PIN</DialogTitle>
                        <DialogDescription>
                            For your security, please change your default PIN to a new 4-digit secure PIN.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>New 4-Digit PIN</Label>
                            <Input type="password" maxLength={4} placeholder="e.g. 8421" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} disabled={isUpdatingPin} className="text-xl tracking-widest text-center" />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirm New PIN</Label>
                            <Input type="password" maxLength={4} placeholder="e.g. 8421" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} disabled={isUpdatingPin} className="text-xl tracking-widest text-center" />
                        </div>
                        {pinError && <p className="text-xs font-bold text-rose-500 text-center">{pinError}</p>}
                    </div>
                    <DialogFooter>
                        <Button className="w-full" onClick={handlePinChange} disabled={isUpdatingPin || newPin.length !== 4 || confirmPin.length !== 4}>
                            {isUpdatingPin ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Secure PIN
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <NotificationPrompt permission={permission} requestPermission={requestPermission} fcmToken={fcmToken} />
            
            <div className="relative">
                {familyChildren.length > 1 && (
                    <ChildSwitcher 
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-auto mb-0"
                        children={familyChildren}
                        activeId={activeStudentId}
                        onSelect={(id, child) => {
                            setActiveStudentId(id); 
                            fetchStudentData(id, child); 
                        }}
                        onBackToOverview={() => {
                            setActiveStudentId(null);
                            setStudentData(null);
                        }}
                    />
                )}
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
            
             {isQuickPay && (
    <div className="mb-4">
        <Button variant="outline" onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('action');
            window.location.href = url.pathname + url.search;
        }}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Full Dashboard
        </Button>
    </div>
)}
<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
          {!isQuickPay && (
<TabsList className="flex w-full items-center justify-start overflow-x-auto flex-nowrap h-auto p-0 bg-transparent gap-2 border-b border-slate-300 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-none">
            <TabsTrigger
              value="overview"
              className="flex-shrink-0 whitespace-nowrap border border-[#9536ea] bg-[#ab4bf8] text-white hover:bg-[#9536ea] data-[state=active]:bg-[#900b02] data-[state=active]:text-white data-[state=active]:border-[#900b02] py-2 px-4 font-bold text-xs rounded-none data-[state=active]:rounded-md transition-all shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="finances"
              className="flex-shrink-0 whitespace-nowrap border border-[#9536ea] bg-[#ab4bf8] text-white hover:bg-[#9536ea] data-[state=active]:bg-[#900b02] data-[state=active]:text-white data-[state=active]:border-[#900b02] py-2 px-4 font-bold text-xs rounded-none data-[state=active]:rounded-md transition-all shadow-sm"
            >
              Finances
            </TabsTrigger>
            <TabsTrigger
              value="academics-hub"
              className="flex-shrink-0 whitespace-nowrap border border-[#9536ea] bg-[#ab4bf8] text-white hover:bg-[#9536ea] data-[state=active]:bg-[#900b02] data-[state=active]:text-white data-[state=active]:border-[#900b02] py-2 px-4 font-bold text-xs rounded-none data-[state=active]:rounded-md transition-all shadow-sm"
            >
              Academics Hub
            </TabsTrigger>
            <TabsTrigger
              value="school-life-hub"
              className="flex-shrink-0 whitespace-nowrap border border-[#9536ea] bg-[#ab4bf8] text-white hover:bg-[#9536ea] data-[state=active]:bg-[#900b02] data-[state=active]:text-white data-[state=active]:border-[#900b02] py-2 px-4 font-bold text-xs rounded-none data-[state=active]:rounded-md transition-all shadow-sm"
            >
              School Life Hub
            </TabsTrigger>
            <TabsTrigger
              value="ai-assistant"
              className="flex-shrink-0 whitespace-nowrap border border-[#9536ea] bg-[#ab4bf8] text-white hover:bg-[#9536ea] data-[state=active]:bg-[#900b02] data-[state=active]:text-white data-[state=active]:border-[#900b02] py-2 px-4 font-bold text-xs rounded-none data-[state=active]:rounded-md transition-all shadow-sm"
            >
              AI Assistant
            </TabsTrigger>
          </TabsList>
)}

          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Financial Summary Card */}
            <Card className="shadow-md border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" /> Financial Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Outstanding</p>
                    <p className={`text-3xl font-bold ${financialData.totalOutstanding > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      GH¢ {financialData.totalOutstanding.toFixed(2)}
                    </p>
                  </div>
                  {financialData.totalOutstanding > 0 && (
                     <Button size="sm" onClick={() => setActiveTab('finances')}>Pay Now</Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Attendance Summary */}
              <Card className="shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                     <CalendarDays className="w-5 h-5 text-indigo-500" /> Today's Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-2xl font-bold text-slate-800">
                     {(studentData.attendance || []).find((a: any) => a.date === new Date().toISOString().split("T")[0])?.attended ? "Present" : "Not Recorded/Absent"}
                   </p>
                   <p className="text-sm text-muted-foreground mt-1">Term Rate: {attendanceSummary.rate.toFixed(0)}%</p>
                </CardContent>
              </Card>
              
              {/* Alerts Summary */}
              <Card className="shadow-md">
                <CardHeader className="pb-2">
                   <CardTitle className="text-lg flex items-center gap-2">
                     <Megaphone className="w-5 h-5 text-amber-500" /> Pending Alerts
                   </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                   <div className="flex justify-between items-center text-sm border-b pb-2">
                     <span className="font-medium text-slate-700">Unread Announcements</span>
                     <Badge variant="secondary" className="bg-amber-100 text-amber-800">{announcements.length}</Badge>
                   </div>
                   <div className="flex justify-between items-center text-sm pt-1">
                     <span className="font-medium text-slate-700">Upcoming Homework</span>
                     <Badge variant="secondary" className="bg-blue-100 text-blue-800">{homework.length}</Badge>
                   </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="finances" className="mt-6 space-y-8">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-400 rounded-xl shadow-sm mb-6">
                         <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Financial Records</span>
                            <div className="h-4 w-px bg-slate-300" />
                            <Badge variant="outline" className="text-[11px] font-bold bg-white border-primary/30 text-primary px-2.5 py-1">
                                {currentPeriod ? `${currentPeriod.year} - ${currentPeriod.term}` : 'All Time'}
                            </Badge>
                         </div>
                         {financialData.totalOutstanding > 0 && (
                             <Badge className="bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold px-3 py-1 flex items-center gap-1.5 shadow-sm">
                                 <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
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
                                
                                {financialData.balanceBF > 0 && (
                                    <div className="mb-6 p-4 md:p-6 bg-rose-50 border-2 border-rose-200 rounded-xl flex items-start gap-4 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-2 h-full bg-rose-500" />
                                        <div className="p-3 bg-rose-100 rounded-full shrink-0 relative">
                                            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                                            <History className="w-6 h-6 text-rose-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-rose-900 flex items-center gap-2 tracking-tight">
                                                Previous Arrears: GH¢{financialData.balanceBF.toFixed(2)}
                                            </h4>
                                            <p className="text-sm text-rose-800 mt-1 font-medium leading-relaxed max-w-2xl">
                                                You have unpaid balances from previous academic terms. To view the details and pay these arrears, please select the specific previous term from the <strong className="bg-rose-200/50 px-1 py-0.5 rounded text-rose-900">Select Term</strong> dropdown menu above and use the payment button on that page.
                                            </p>
                                        </div>
                                    </div>
                                )}

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

                                    {familyChildren.length > 1 && (
                                        <div className="px-6 pb-4">
                                            <ParentBulkFeePaymentDialog
                                                childrenWithArrears={familyArrearsData.childrenWithArrears}
                                                schoolId={schoolId!}
                                                parentId={studentData.parentPhone || ''}
                                                parentEmail={studentData.parentEmail}
                                                periodId={selectedPeriodId}
                                                hubtelMerchantNumber={schoolDetails?.hubtelMerchantNumber || ''}
                                                totalFamilyArrears={familyArrearsData.totalFamilyArrears}
                                                totalFamilyMainArrears={familyArrearsData.totalFamilyMainArrears}
                                                totalFamilyDailyArrears={familyArrearsData.totalFamilyDailyArrears}
                                                trigger={
                                                    <Button className="w-full bg-[#04396d] hover:bg-[#032a52] text-white py-6 text-lg font-bold shadow-[0_5px_15px_rgba(4,57,109,0.3)] hover:shadow-[0_8px_20px_rgba(4,57,109,0.4)] transition-all">
                                                        <Landmark className="mr-2 h-6 w-6" />
                                                        Pay All Fees For All Children
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    )}

                                    <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mt-4 p-0 sm:p-6 lg:p-6 lg:pt-0">
                                        
                                        {/* Left Column: The Uploaded Payment Mockup */}
                                        <div className="relative w-full rounded-none sm:rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(26,27,65,0.2)] hover:shadow-[0_15px_50px_rgba(26,27,65,0.3)] transition-shadow">
                                            {/* Desktop/Tablet Image */}
                                            <img 
                                                src="/Payment.png" 
                                                alt="Secure Payment via Hubtel" 
                                                className="hidden md:block w-full h-auto"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement!.innerHTML += '<div class="hidden md:flex absolute inset-0 bg-slate-100 items-center justify-center text-slate-500 p-6 text-center"><p>Ensure image is saved as <strong>public/Payment.png</strong></p></div>';
                                                }}
                                            />
                                            {/* Mobile/Phone Image */}
                                            <img 
                                                src="/Payment portrait.png" 
                                                alt="Secure Payment via Hubtel (Mobile)" 
                                                className="block md:hidden w-full h-auto"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement!.innerHTML += '<div class="flex md:hidden absolute inset-0 bg-slate-100 items-center justify-center text-slate-500 p-6 text-center"><p>Ensure image is saved as <strong>public/Payment portrait.png</strong></p></div>';
                                                }}
                                            />
                                            
                                            {/* Invisible clickable overlay over the "Pay Fees Online" button area */}
                                            <div className="absolute bottom-[6%] left-[6%] right-[6%] h-[15%] z-10">
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
                                                    defaultOpen={searchParams.get('action') === 'pay'}
                                                >
                                                    <button 
                                                        className="w-full h-full cursor-pointer hover:bg-white/10 rounded-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-white/50" 
                                                        title="Click to Pay Fees Online"
                                                        aria-label="Pay Fees Online"
                                                    />
                                                </FeePaymentDialog>
                                            </div>
                                        </div>

                                        {/* Right Column: Happy Parent Generated Image */}
                                        <div className="flex flex-col items-center justify-center p-6 sm:p-4">
                                            <div className="relative rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.15)] group w-full max-w-[320px]">
                                                <img 
                                                    src="/happy_parent_paying.png" 
                                                    alt="Happy parent successfully paying school fees" 
                                                    className="w-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            </div>
                                            <div className="mt-6 text-center px-4 max-w-[320px]">
                                                <h4 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Instant Peace of Mind</h4>
                                                <p className="text-sm text-slate-500 mx-auto leading-relaxed font-medium">
                                                    Join thousands of parents using our secure, automated payment system to settle fees instantly from anywhere in the world.
                                                </p>
                                            </div>
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

          <TabsContent value="academics-hub" className="mt-6 space-y-8">
             <div className="space-y-8">
               <h3 className="text-2xl font-bold text-primary flex items-center gap-2 border-b pb-2">
                 <GraduationCap className="w-6 h-6" /> Academics Hub
               </h3>
               
               {/* Homework Section */}
               <div>
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
               </div>

               {/* Academics Reports Section */}
               <div>
                  <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Academic Performance Tracker</CardTitle>
                            <CardDescription>Track continuous assessment and exam scores over time.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {studentReports.length > 0 ? (
                                <div className="space-y-8">
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={studentReports.slice().reverse().map(r => ({ term: r.term, total: r.summary?.totalMarks || 0, avg: r.summary?.averageScore || 0 }))}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="term" />
                                                <YAxis />
                                                <RechartsTooltip />
                                                <Legend />
                                                <Bar dataKey="avg" name="Average Score (%)" fill="#8884d8" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-lg">Official Report Cards</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {studentReports.map(report => (
                                                <Card key={report.id} className="border-primary/20">
                                                    <CardHeader className="p-4 pb-2">
                                                        <CardTitle className="text-md flex items-center justify-between">
                                                            {report.term}
                                                            <Badge variant="outline">{report.academicYear}</Badge>
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-2">
                                                        <div className="flex justify-between text-sm mb-4">
                                                            <span>Average: <span className="font-bold">{report.summary?.averageScore}%</span></span>
                                                            <span>Position: <span className="font-bold">{report.summary?.classPosition || 'N/A'}</span></span>
                                                        </div>
                                                        <Button className="w-full" variant="outline" onClick={() => generateReportCard(report)}>
                                                            <Download className="w-4 h-4 mr-2" /> Download PDF
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-8 text-muted-foreground">
                                    <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No academic reports available yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
               </div>

               {/* E-Library Section */}
               <div>
                  <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Digital E-Library</CardTitle>
                            <CardDescription>Download textbooks, past papers, and reading materials.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {libraryResources.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {libraryResources.map(resource => (
                                        <div key={resource.id} className="flex items-center justify-between p-4 border rounded-xl shadow-sm bg-slate-50">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1">
                                                    {resource.type === 'pdf' ? <FileText className="text-red-500 w-6 h-6" /> : <BookCopy className="text-blue-500 w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{resource.title}</h4>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">Added: {format(resource.dateAdded, 'MMM d, yyyy')}</p>
                                                </div>
                                            </div>
                                            <Button asChild size="sm" variant="secondary" className="flex-shrink-0 ml-4">
                                                <a href={resource.fileUrl} target="_blank" rel="noreferrer">
                                                    <Download className="w-4 h-4 mr-1" /> View
                                                </a>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-8 text-muted-foreground">
                                    <BookCopy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No resources available for {studentData?.className} right now.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
               </div>
             </div>
          </TabsContent>

          <TabsContent value="school-life-hub" className="mt-6 space-y-8">
             <div className="space-y-8">
               <h3 className="text-2xl font-bold text-primary flex items-center gap-2 border-b pb-2">
                 <Users className="w-6 h-6" /> School Life Hub
               </h3>

               {/* Announcements Section */}
               <div>
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
               </div>

               {/* Calendar Section */}
               <div>
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
                                            <div key={event.id} className="flex items-start gap-4 p-3 rounded-md bg-slate-50 border border-slate-100">
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
               </div>
             </div>
          </TabsContent>

          <TabsContent value="ai-assistant" className="mt-6 space-y-8">
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
        {!isQuickPay && <ContactBar schoolPhone={schoolDetails?.schoolPhone} schoolEmail={schoolDetails?.schoolEmail} />}

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
                                                <div key={qIndex} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50">
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
            <div className="min-h-screen w-full flex items-center justify-center bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    )
}

    
