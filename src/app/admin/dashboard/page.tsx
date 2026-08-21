'use client';

import { useState, useMemo, useEffect, useCallback, useRef, forwardRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle as AlertCircleIcon, AlertTriangle, Archive, ArchiveRestore, ArrowLeft, Banknote, Bell, BellOff, BookCopy, Bus, Calendar as CalendarIcon, CalendarDays, Check, CheckCheck, ChevronDown, ChevronsUpDown, CreditCard, DatabaseZap, DollarSign, Download, Edit, Eye, EyeOff, FilePlus, FileText, HandCoins, HeartPulse, Home, Landmark, LayoutGrid, Loader2, LogOut, Mail, Menu, MessageSquare, Mic, MoreHorizontal, Notebook, Package, Pencil, Percent, Phone, PieChart, PlusCircle, Printer, QrCode, Receipt, RefreshCcw, Save, School as SchoolIcon, Search, Send, Settings, ShieldAlert, ShieldCheck, Sparkles, Trash2, TrendingDown, TrendingUp, Upload, User, UserCircle, UserPlus, Users, UtensilsCrossed, Wallet, X, XCircle } from 'lucide-react';

import { doc, getDoc } from 'firebase/firestore';
import { exportToCSV } from '@/lib/export-utils';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { ZipSMALogo } from '@/components/zipsma-logo';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getParents, addParent, updateParent, Parent, getStudents, addStudent, deleteStudent, updateStudentDetails, setAttendance, Student, FeeItem, PaymentItem, signOutUser, updateStudentId, sendAnnouncement, getAnnouncementsForAdmin, deleteAnnouncement, Announcement, CalendarEvent, getCalendarEvents, addCalendarEvent, deleteCalendarEvent, StaffId, getStaffIds, addStaffId, deleteStaffId, updateStaffId, Expenditure, getExpenditures, addExpenditure, deleteExpenditure, Debt, getDebts, addDebt, deleteDebt, getStaffDetails, StaffDetails, StaffRole, updateStaffDetails, School, getSchoolDetails, updateSchoolDetails, archiveStudent, archiveStaff, BankAccount, AcademicPeriod, InstallmentStage, getAcademicPeriods, addAcademicPeriod, setAsCurrentPeriod, deleteAcademicPeriod, updateAcademicPeriod, postLedgerTransaction, voidLedgerTransaction, updateLedgerTransaction, LedgerTransaction, getFeeCategories, addFeeCategory, deleteFeeCategory, updateFeeCategory, FeeCategory, postBulkClassLedgerTransaction, postBulkDailyPayments, resetSchoolFinancials, reconcileDailyFees, voidFeeCategoryRecords, isDailyTransaction, calculateInstallmentExpectedAmount, calculateInstallmentOutstandingBalance, calculateStudentTotalBalance, updatePin } from '@/lib/data-store';
import { allExpenditureCategories } from '@/lib/constants';
import { MigrationModal } from '@/components/admin-dashboard/migration-modal';
import { ParentSelector } from '@/components/admin-dashboard/parent-selector';
import { Calendar } from '@/components/ui/calendar';
import { DatePicker } from '@/components/ui/date-picker';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GradientAvatar } from '@/components/gradient-avatar';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import FirebaseConfigError from '@/components/firebase-config-error';
import { Badge } from '@/components/ui/badge';
import { useIdleTimeout } from '@/hooks/use-idle-timeout';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFirebase, useAuth } from '@/firebase/client-provider';
import { FeesReminderSettings } from '@/components/fees-reminder-settings';
import { VoiceReminderSettings } from '@/components/voice-reminder-settings';
import { DailyFeesReminderSettings } from '@/components/daily-fees-reminder-settings';
import { CalendarReminderSettings } from '@/components/calendar-reminder-settings';
import { AttendanceReminderSettings } from '@/components/attendance-reminder-settings';
import { AdminSidebar } from '@/components/admin-sidebar';
import { AcademicReportsTab } from '@/components/admin-dashboard/academic-reports-tab';
import QRGenerationTab from '@/components/admin-dashboard/qr-generation-tab';
import AdminLessonPlansTab from '@/components/admin-dashboard/admin-lesson-plans-tab';
import { PromoteStudentsTab } from '@/components/admin-dashboard/promote-students-tab';
import { DebtorsListTab } from '@/components/admin-dashboard/debtors-list-tab';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { generateReceipt } from '@/lib/receipt-utils';
import { LedgerTable } from '@/components/admin-dashboard/ledger-table';
import { RecordTransactionModal } from '@/components/admin-dashboard/record-transaction-modal';
import { ApplyAdmissionBillModal } from '@/components/admin-dashboard/apply-admission-bill-modal';
import { VoidTransactionModal } from '@/components/admin-dashboard/void-transaction-modal';
import { FinanceAiInsightsTab } from '@/components/admin-dashboard/finance-ai-insights-tab';
import { ParentBulkPaymentModal } from '@/components/admin-dashboard/parent-bulk-payment-modal';
import { ParentBulkMainPaymentModal } from '@/components/admin-dashboard/parent-bulk-main-payment-modal';
import { FamilyOverviewModal } from '@/components/admin-dashboard/family-overview-modal';
import { BulkDailyRatesModal } from '@/components/admin-dashboard/bulk-daily-rates-modal';
import { BulkFeeReminderModal } from '@/components/admin-dashboard/bulk-fee-reminder-modal';
import { MonthlyReportConfigModal } from '@/components/admin-dashboard/monthly-report-config-modal';
import { PrintableMonthlyReport } from '@/components/admin-dashboard/printable-monthly-report';
import { GenerateTermBillsModal } from '@/components/admin-dashboard/generate-term-bills-modal';
import { AdmissionBillTab } from '@/components/admin-dashboard/admission-bill-tab';
import { BudgetingTab } from '@/components/admin-dashboard/budgeting-tab';

const defaultAddStudentForm = {
    studentId: '',
    name: '',
    className: '',
    dateOfBirth: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    parentId: '',
    parentName: '',
    parentPhone: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    parentEmail: '',
    medicalNotes: '',
    feeDiscount: '' as any,
    preferredVoiceLanguage: 'en-GH',
    dailyFees: [] as { categoryId: string, rate: number }[]
};
const defaultEditStudentForm: Omit<Student, 'dateAdded' | 'attendance' | 'isArchived' | 'feeDiscount' | 'dailyFees'> & { feeDiscount?: string | number, dailyFees?: { categoryId: string, rate: number }[] } = {
    studentId: '',
    name: '',
    className: '',
    profilePicture: '',
    schoolId: '',
    dateOfBirth: '',
    gender: 'Male',
    parentId: '',
    parentName: '',
    parentPhone: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    parentEmail: '',
    medicalNotes: '',
    feeDiscount: 0,
    preferredVoiceLanguage: 'en-GH',
    dailyFees: []
};

const defaultPaymentForm = { amount: '', notes: '', date: new Date().toISOString().split('T')[0] };
const defaultCommunicationForm = { recipient: 'all', subject: '', message: '', sendAsSMS: false, sendAsVoice: false };
const defaultCalendarEventForm = { title: '', date: '', type: 'Event' as 'Event' | 'Holiday' | 'Exam', description: '' };
const defaultAddStaffForm = { id: '', name: '', role: 'Teacher' as StaffRole, className: '', phone: '', email: '', password: '' };

const STAFF_ROLES: StaffRole[] = ['Teacher', 'Assistant Teacher', 'Administrator', 'Principal', 'Accountant', 'Secretary', 'Gatekeeper', 'Security', 'Cashier', 'Driver', 'Cook', 'Cleaner', 'Other'];
const defaultExpenditureForm = { description: '', category: '', amount: '', date: new Date().toISOString().split('T')[0] };
const defaultDebtForm = { creditor: '', description: '', amount: '', date: new Date().toISOString().split('T')[0] };
const defaultSchoolSettingsForm = { 
    name: '', 
    schoolPhone: '', 
    schoolEmail: '', 
    momoNumber: '', 
    momoName: '', 
    bankAccounts: [] as BankAccount[],
    hubtelSmsClientId: '',
    hubtelSmsClientSecret: '',
    hubtelSenderId: '',
    hubtelPaymentClientId: '',
    hubtelPaymentClientSecret: '',
    hubtelMerchantNumber: '',
    sendexaApiKey: '',
    sendexaVoiceCallerId: '',
    arkeselApiKey: '',
    arkeselVoiceCallerId: '',
    settingsPin: '',
    customFeeBlockMessage: ''
};



// This is a valid child for TooltipTrigger with asChild
const StudentInfoTrigger = forwardRef<HTMLDivElement, { student: Student, onClick: () => void }>(function StudentInfoTrigger({ student, onClick, ...props }, ref) {
    return (
        <div
            ref={ref}
            className="group cursor-pointer"
            onClick={onClick}
            {...props}
        >
            <p className="font-medium text-left transition-transform origin-left group-hover:scale-105">{student.name}</p>
            <p className="text-sm text-muted-foreground transition-transform origin-left group-hover:scale-105">{student.studentId}</p>
        </div>
    );
});

function AdminDashboard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { auth, db, storage } = useFirebase();
    const { user, loading: authLoading } = useAuth();

    const schoolId = searchParams.get('schoolId');

    const [parents, setParents] = useState<Parent[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [archivedStudents, setArchivedStudents] = useState<Student[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [staffIds, setStaffIds] = useState<StaffId[]>([]);
    const [archivedStaff, setArchivedStaff] = useState<StaffId[]>([]);
    const [staffDetails, setStaffDetails] = useState<StaffDetails[]>([]);
    const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [staffSearchQuery, setStaffSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<'admin' | 'accountant'>('admin');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAttendanceSubmitting, setIsAttendanceSubmitting] = useState<{[key: string]: boolean}>({});
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [selectedClassForFees, setSelectedClassForFees] = useState<string>('all');
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [showPaymentSecret, setShowPaymentSecret] = useState(false);
    const [academicPeriods, setAcademicPeriods] = useState<AcademicPeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
    const [isAcademicSetupOpen, setIsAcademicSetupOpen] = useState(false);
    const [isComboboxOpen, setIsComboboxOpen] = useState(false);
    const [comboboxValue, setComboboxValue] = useState("");
    
    useEffect(() => {
        if (isComboboxOpen && selectedStudentId) {
            const student = students.find(s => s.studentId === selectedStudentId);
            if (student) {
                setComboboxValue(`${student.name} ${student.studentId}`);
            }
        } else if (!isComboboxOpen) {
            setComboboxValue("");
        }
    }, [isComboboxOpen, selectedStudentId, students]);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSettingsAuthOpen, setIsSettingsAuthOpen] = useState(false);
    const [settingsPinInput, setSettingsPinInput] = useState('');
    const [tempTab, setTempTab] = useState('');
    const [newPeriodForm, setNewPeriodForm] = useState({ 
        year: '', 
        term: 'First Term' as AcademicPeriod['term'],
        startDate: '',
        endDate: '',
        vacationDate: '',
        nextTermBegins: '',
        installmentPlan: [] as InstallmentStage[]
    });
    const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [staffToDelete, setStaffToDelete] = useState<StaffId | null>(null);
    const [categoryToClear, setCategoryToClear] = useState<{studentId: string, categoryId: string, categoryName: string, docId?: string} | null>(null);
    const [studentToArchive, setStudentToArchive] = useState<Student | null>(null);
    const [staffToArchive, setStaffToArchive] = useState<StaffId | null>(null);
    const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
    const [expenditureToDelete, setExpenditureToDelete] = useState<Expenditure | null>(null);
    const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
    const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([]);
    const [selectedClassForAbsent, setSelectedClassForAbsent] = useState<{ className: string, absentStudents: Student[] } | null>(null);

    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

    const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
    const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
    const [isAddStaffDialogOpen, setIsAddStaffDialogOpen] = useState(false);
    const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
    const [selectedStudentForView, setSelectedStudentForView] = useState<Student | null>(null);
    const [selectedStaffForSalary, setSelectedStaffForSalary] = useState<StaffId | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIsDaily, setNewCategoryIsDaily] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');
    const [editingCategoryIsDaily, setEditingCategoryIsDaily] = useState(false);
    const [feesActiveSubTab, setFeesActiveSubTab] = useState<'main' | 'daily'>('main');
    const [selectedDailyCategoryForPayments, setSelectedDailyCategoryForPayments] = useState<string>('feeding');
    const [selectedPaymentDate, setSelectedPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Clear selection when the date changes to prevent accidental bulk payments on the wrong date
    useEffect(() => {
        setBulkDailyPaymentsSelection({});
    }, [selectedPaymentDate]);
    const [bulkDailyPaymentsSelection, setBulkDailyPaymentsSelection] = useState<Record<string, boolean>>({});

    const [addStudentForm, setAddStudentForm] = useState(defaultAddStudentForm);
    const [addStaffForm, setAddStaffForm] = useState(defaultAddStaffForm);
    const [editStudentForm, setEditStudentForm] = useState(defaultEditStudentForm);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [editingRateId, setEditingRateId] = useState<string | null>(null);
    const [editingRateValue, setEditingRateValue] = useState<string>('');
    const [staffDetailsForm, setStaffDetailsForm] = useState({
        amount: '',
        ssnitNumber: '',
        ghanaCardNumber: '',
        bankName: '',
        accountNumber: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        address: '',
        dateOfHire: '',
        qualifications: '',
        contractType: ''
    });
    const [expenditureForm, setExpenditureForm] = useState(defaultExpenditureForm);
    const [debtForm, setDebtForm] = useState(defaultDebtForm);
    const [schoolSettingsForm, setSchoolSettingsForm] = useState(defaultSchoolSettingsForm);
    const [communicationForm, setCommunicationForm] = useState(defaultCommunicationForm);
    const [calendarEventForm, setCalendarEventForm] = useState(defaultCalendarEventForm);
    const [isBulkFeeDialogOpen, setIsBulkFeeDialogOpen] = useState(false);
    const [selectedBulkStudentIds, setSelectedBulkStudentIds] = useState<string[]>([]);
    const [isRecordTransactionModalOpen, setIsRecordTransactionModalOpen] = useState(false);
    const [isAdmissionBillModalOpen, setIsAdmissionBillModalOpen] = useState(false);
    const [transactionToVoid, setTransactionToVoid] = useState<string | null>(null);
    const [isParentBulkModalOpen, setIsParentBulkModalOpen] = useState(false);
    const [isParentBulkMainModalOpen, setIsParentBulkMainModalOpen] = useState(false);
    const [isBulkDailyRatesModalOpen, setBulkDailyRatesModalOpen] = useState(false);
    const [isBulkReminderModalOpen, setIsBulkReminderModalOpen] = useState(false);
    const [isReportConfigModalOpen, setIsReportConfigModalOpen] = useState(false);
    const [isGenerateTermBillsModalOpen, setIsGenerateTermBillsModalOpen] = useState(false);
    const [printReportConfig, setPrintReportConfig] = useState<{ month: number, year: number } | null>(null);

    const [isFamilyOverviewModalOpen, setIsFamilyOverviewModalOpen] = useState(false);
    const [selectedFamilyStudent, setSelectedFamilyStudent] = useState<Student | null>(null);
    const [transactionModalInitialType, setTransactionModalInitialType] = useState<'fee' | 'payment' | 'adjustment'>('payment');
    const [transactionModalInitialCategoryId, setTransactionModalInitialCategoryId] = useState<string | undefined>(undefined);
    const [transactionToEdit, setTransactionToEdit] = useState<LedgerTransaction | null>(null);
    const [bulkFeeForm, setBulkFeeForm] = useState({
        category: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        periodId: '',
        applyDiscounts: true
    });

    const handleOpenBulkFee = () => {
        const classStudents = students.filter(s => s.className === selectedClassForFees);
        setSelectedBulkStudentIds(classStudents.map(s => s.studentId)); // Default to selecting all in class
        setBulkFeeForm({
            category: '',
            description: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            periodId: selectedPeriodId || '',
            applyDiscounts: true
        });
        setIsBulkFeeDialogOpen(true);
    };

    const handlePostBulkTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClassForFees || selectedClassForFees === 'all') {
            toast({ title: "Error", description: "Please select a specific class first.", variant: "destructive" });
            return;
        }
        if (!schoolId) return;

        setIsSubmitting(true);
        try {
            if (selectedBulkStudentIds.length === 0) {
                toast({ title: "No Students Selected", description: "Please select at least one student to apply this fee to.", variant: "destructive" });
                return;
            }

            const isDailyFee = feesActiveSubTab === 'daily';
            let amount = parseFloat(bulkFeeForm.amount);
            if (isNaN(amount) || amount <= 0) {
                if (isDailyFee) {
                    amount = 0;
                } else {
                    throw new Error("Please enter a valid amount.");
                }
            }

            const transactionData = {
                type: 'fee' as const,
                category: bulkFeeForm.category,
                categoryId: bulkFeeForm.category,
                description: bulkFeeForm.description || 'Class Fee',
                debit: amount,
                credit: 0,
                date: bulkFeeForm.date,
                periodId: bulkFeeForm.periodId || selectedPeriodId || undefined
            };

            await postBulkClassLedgerTransaction(db, auth, schoolId, selectedClassForFees, transactionData, bulkFeeForm.applyDiscounts, selectedBulkStudentIds, isDailyFee);
            await fetchAdminData();
            toast({ title: "Success", description: `Bulk fee recorded for ${selectedBulkStudentIds.length} student(s).` });
            setIsBulkFeeDialogOpen(false);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetFinancials = async () => {
        if (!schoolId) return;
        setIsSubmitting(true);
        try {
            await resetSchoolFinancials(db, auth, schoolId);
            await fetchAdminData();
            toast({ title: "Financial Records Reset", description: "All student fees, payments, ledgers, and attendance records have been cleared." });
            setIsResetDialogOpen(false);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenTransactionModal = (
        type: 'fee' | 'payment' | 'adjustment' = 'payment', 
        toEdit: LedgerTransaction | null = null,
        initialCategoryId?: string
    ) => {
        setTransactionModalInitialType(type);
        setTransactionModalInitialCategoryId(initialCategoryId);
        setTransactionToEdit(toEdit);
        setIsRecordTransactionModalOpen(true);
    };

    const handleSaveDailyRate = async () => {
        if (!editingRateId || !editingRateValue) return;
        const [studentId, categoryId] = editingRateId.split('|');
        if (!studentId || !categoryId || !schoolId) return;

        setIsSubmitting(true);
        try {
            const student = students.find(s => s.studentId === studentId);
            if (!student) throw new Error("Student not found.");

            const newRate = parseFloat(editingRateValue);
            if (isNaN(newRate) || newRate < 0) throw new Error("Invalid rate amount.");

            const updatedDailyFees = [...(student.dailyFees || [])];
            const existingIndex = updatedDailyFees.findIndex(f => f.categoryId === categoryId);
            
            if (existingIndex >= 0) {
                updatedDailyFees[existingIndex].rate = newRate;
            } else {
                updatedDailyFees.push({ categoryId, rate: newRate });
            }

            await updateStudentDetails(db, storage, auth, student.id || studentId, { dailyFees: updatedDailyFees }, null, schoolId);
            await fetchAdminData();
            toast({ title: "Rate Updated", description: `Daily rate has been successfully updated.` });
            setEditingRateId(null);
            setEditingRateValue('');
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenQuickDailyPayment = (studentId: string, category: string) => {
        const student = students.find(s => s.studentId === studentId);
        if (student) setSelectedStudentId(student.studentId);
        
        const cat = feeCategories.find(c => c.name === category || c.id === category);
        handleOpenTransactionModal('payment', null, cat?.id);
    };

    const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const selectedAttendanceDateFormatted = useMemo(() => new Date(selectedAttendanceDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), [selectedAttendanceDate]);

    const handleLogout = async () => {
        await signOutUser(auth);
        router.push('/');
        toast({ title: 'Logged Out', description: 'You have been logged out.' });
    };

    useIdleTimeout({ onIdle: handleLogout, timeout: 1000 * 60 * 15 }); // 15 minutes

    const handleSetActiveTab = (tab: string) => {
        if (tab === 'settings' && schoolDetails?.settingsPin) {
            setTempTab(tab);
            setIsSettingsAuthOpen(true);
            setSettingsPinInput('');
        } else {
            setActiveTab(tab);
        }
    };

    const handleVerifySettingsPin = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (settingsPinInput === schoolDetails?.settingsPin) {
            setActiveTab(tempTab || 'settings');
            setIsSettingsAuthOpen(false);
            setSettingsPinInput('');
        } else {
            toast({ title: "Incorrect PIN", description: "You do not have permission to access settings.", variant: "destructive" });
        }
    };

    const fetchAdminData = useCallback(async () => {
        if (!db || !schoolId || !user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const schoolData = await getSchoolDetails(db, schoolId);
            const currentPeriod = selectedPeriodId || schoolData?.currentPeriodId;

            const safeFetch = async <T,>(promise: Promise<T>, label: string): Promise<T | null> => {
                try {
                    return await promise;
                } catch (e: any) {
                    console.warn(`Failed to fetch ${label}:`, e);
                    const link = e.message?.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)?.[0];
                    if (link) {
                        toast({
                            title: `${label} Setup Required`,
                            description: (
                                <div className="space-y-2">
                                    <p>Database index missing for {label}.</p>
                                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-white bg-destructive px-2 py-1 rounded inline-block uppercase">Fix Now</a>
                                </div>
                            ),
                            variant: "destructive"
                        });
                    }
                    return null;
                }
            };

            const [allParents, allStudents, allEvents, allStaff, allStaffDetails, allExpenditures, allDebts, allPeriods, allAnnouncements, allFeeCategories] = await Promise.all([
                safeFetch(getParents(db, schoolId), "Parents"),
                safeFetch(getStudents(db, schoolId, true), "Students"),
                safeFetch(getCalendarEvents(db, schoolId), "Calendar"),
                safeFetch(getStaffIds(db, schoolId, true), "Staff"),
                safeFetch(getStaffDetails(db, schoolId), "Staff Salaries"),
                safeFetch(getExpenditures(db, schoolId, currentPeriod || undefined), "Expenditures"),
                safeFetch(getDebts(db, schoolId, currentPeriod || undefined), "Debts"),
                safeFetch(getAcademicPeriods(db, schoolId), "Academic Periods"),
                safeFetch(getAnnouncementsForAdmin(db, schoolId), "Announcements"),
                safeFetch(getFeeCategories(db, schoolId), "Fee Categories")
            ]);

            if (schoolData) {
                setSchoolDetails(schoolData);
                
                let role: 'admin' | 'accountant' = 'admin';
                if (schoolData.adminUid !== user.uid) {
                    try {
                        const staffDocRef = doc(db, 'staff', user.uid);
                        const staffSnap = await getDoc(staffDocRef);
                        if (staffSnap.exists()) {
                            const staffData = staffSnap.data();
                            if (staffData.role === 'Accountant') {
                                role = 'accountant';
                            }
                        }
                    } catch (e) {
                        console.error("Failed to fetch staff role", e);
                    }
                }
                
                setUserRole(role);
                if (role === 'accountant') {
                    setActiveTab('fees');
                }
            }

            if (allParents) {
                setParents(allParents);
            }

            if (allStudents) {
                const activeStudents = allStudents.filter(s => !s.isArchived);
                setStudents(activeStudents);
                setArchivedStudents(allStudents.filter(s => s.isArchived));
                
                setSelectedStudentId(prevSelectedId => {
                    if (prevSelectedId && activeStudents.length > 0) {
                        const stillExists = activeStudents.some(s => s.studentId === prevSelectedId);
                        if (stillExists) return prevSelectedId;
                    }
                    return null;
                });
            }

            if (allStaff) {
                setStaffIds(allStaff.filter(s => !s.isArchived).sort((a, b) => b.dateAdded.getTime() - a.dateAdded.getTime()));
                setArchivedStaff(allStaff.filter(s => s.isArchived));
            }

            if (allEvents) setCalendarEvents(allEvents);
            if (allStaffDetails) setStaffDetails(allStaffDetails);
            if (allExpenditures) setExpenditures(allExpenditures);
            if (allDebts) setDebts(allDebts);
            if (allPeriods) setAcademicPeriods(allPeriods);
            if (allAnnouncements) setAnnouncements(allAnnouncements.sort((a, b) => b.date.getTime() - a.date.getTime()));
            if (allFeeCategories) setFeeCategories(allFeeCategories);

            if (!selectedPeriodId && schoolData?.currentPeriodId) {
                setSelectedPeriodId(schoolData.currentPeriodId);
            } else if (!selectedPeriodId && allPeriods && allPeriods.length > 0) {
                const current = allPeriods.find(p => p.isCurrent) || allPeriods[0];
                setSelectedPeriodId(current.id);
            }

            if (schoolData) {
                setSchoolSettingsForm({ 
                    name: schoolData.name || '', 
                    schoolPhone: schoolData.schoolPhone || '',
                    schoolEmail: schoolData.schoolEmail || '',
                    momoNumber: schoolData.momoNumber || '',
                    momoName: schoolData.momoName || '',
                    bankAccounts: schoolData.bankAccounts || [],
                    hubtelSmsClientId: schoolData.hubtelSmsClientId || '',
                    hubtelSmsClientSecret: schoolData.hubtelSmsClientSecret || '',
                    hubtelSenderId: schoolData.hubtelSenderId || '',
                    hubtelPaymentClientId: schoolData.hubtelPaymentClientId || '',
                    hubtelPaymentClientSecret: schoolData.hubtelPaymentClientSecret || '',
                    hubtelMerchantNumber: schoolData.hubtelMerchantNumber || '',
                    sendexaApiKey: schoolData.sendexaApiKey || '',
                    sendexaVoiceCallerId: schoolData.sendexaVoiceCallerId || '',
                    arkeselApiKey: schoolData.arkeselApiKey || '',
                    arkeselVoiceCallerId: schoolData.arkeselVoiceCallerId || '',
                    settingsPin: schoolData.settingsPin || '',
                    customFeeBlockMessage: schoolData.customFeeBlockMessage || ''
                });
                setLogoPreview(schoolData.logoUrl);
            }

        } catch (error: any) {
            console.error("Critical Data Fetch Error:", error);
            
            let indexLink: string | undefined;
            const findLink = (obj: any): string | undefined => {
                if (!obj) return undefined;
                if (typeof obj === 'string') {
                    const match = obj.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
                    return match ? match[0] : undefined;
                }
                if (typeof obj === 'object') {
                    for (const key in obj) {
                        const result = findLink(obj[key]);
                        if (result) return result;
                    }
                }
                return undefined;
            };

            indexLink = findLink(error) || findLink(error.stack);
            
            if (indexLink) {
                toast({ 
                    title: "Database Setup Required", 
                    description: (
                        <div className="space-y-3">
                            <p>To load your school data, Firestore needs a one-time index creation.</p>
                            <a 
                                href={indexLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-block w-full text-center px-4 py-3 bg-white text-destructive rounded-lg text-xs font-black uppercase tracking-widest hover:bg-white/90 transition-all shadow-md active:scale-95"
                            >
                                Fix Database Now
                            </a>
                        </div>
                    ), 
                    variant: "destructive", 
                    duration: 60000 
                });
            } else {
                toast({ 
                    title: "Data Loading Error", 
                    description: `Could not fetch dashboard data. Details: ${error.message || String(error)}. Please verify your internet and database setup.`,
                    variant: "destructive",
                    duration: 15000 
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, [db, schoolId, toast, selectedPeriodId, user]); 
 
    useEffect(() => {
        if(db && schoolId && user) {
            fetchAdminData();
        }
    }, [db, schoolId, fetchAdminData, selectedPeriodId, user]); 

    const filteredStudents = useMemo(() => {
        if (!searchQuery) return students;
        return students.filter(student =>
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.studentId.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [students, searchQuery]);

    const filteredStaff = useMemo(() => {
        if (!staffSearchQuery) return staffIds;
        const query = staffSearchQuery.toLowerCase();
        return staffIds.filter(s => 
            s.name.toLowerCase().includes(query) ||
            s.role.toLowerCase().includes(query) ||
            (s.staffId && s.staffId.toLowerCase().includes(query)) ||
            (s.email && s.email.toLowerCase().includes(query))
        );
    }, [staffIds, staffSearchQuery]);

    const selectedStudent = useMemo(() => students.find(s => s.studentId === selectedStudentId) || null, [selectedStudentId, students]);

    const studentsByClass = useMemo(() => {
        return students.reduce((acc, student) => {
            const className = student.className?.trim() || 'Unassigned';
            if (!acc[className]) {
                acc[className] = [];
            }
            acc[className].push(student);
            return acc;
        }, {} as Record<string, Student[]>);
    }, [students]);

    const classes = useMemo(() => {
        return Object.keys(studentsByClass)
            .sort()
            .map(name => ({ id: name, name }));
    }, [studentsByClass]);

    const attendanceBreakdown = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return Object.entries(studentsByClass).map(([className, classStudents]) => {
            const presentStudents = classStudents.filter(s => 
                s.attendance?.some(a => a.date === today && a.attended)
            );
            const present = presentStudents.length;
            const absentStudents = classStudents.filter(s => !presentStudents.includes(s));
            return {
                className,
                present,
                total: classStudents.length,
                absentStudents
            };
        }).sort((a, b) => a.className.localeCompare(b.className));
    }, [studentsByClass]);

    const uniqueClassNames = useMemo(() => {
        const standardClasses = [
            'Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2',
            'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
            'JHS 1', 'JHS 2', 'JHS 3'
        ];
        const classNames = new Set([
            ...standardClasses,
            ...students.map(s => s.className).filter(Boolean)
        ]);
        
        return Array.from(classNames).sort((a, b) => {
            const indexA = standardClasses.indexOf(a);
            const indexB = standardClasses.indexOf(b);
            
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [students]);

    const filteredStudentsForFees = useMemo(() => {
        let list = students;
        if (selectedClassForFees !== 'all') {
            list = list.filter(s => s.className === selectedClassForFees);
        }
        return list;
    }, [students, selectedClassForFees]);

    useEffect(() => {
        if (selectedStudent) {
        } else {
        }
    }, [selectedStudent]);

    const handleSelectStudentForFeeds = (studentId: string) => {
        setSelectedStudentId(studentId);
        setActiveTab('fees');
    }

    const handleArchiveStudent = (student: Student) => setStudentToArchive(student);
    const handleToggleMuteReminders = async (student: Student) => {
        if (!db || !storage || !auth || !student.id) return;
        try {
            const newMuteStatus = !student.muteReminders;
            await updateStudentDetails(db, storage, auth, student.id, { muteReminders: newMuteStatus }, null, schoolId || undefined);
            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, muteReminders: newMuteStatus } : s));
            toast({
                title: newMuteStatus ? 'Reminders Muted' : 'Reminders Enabled',
                description: `Automatic fee reminders for ${student.name} have been ${newMuteStatus ? 'paused' : 'restored'}.`,
            });
        } catch (error) {
            console.error("Error toggling mute status:", error);
            toast({ title: 'Error', description: 'Failed to update reminder status.', variant: 'destructive' });
        }
    };
    const confirmArchiveStudent = async () => {
        if (studentToArchive) {
            setIsSubmitting(true);
            try {
                await archiveStudent(db, auth, studentToArchive.studentId, true, schoolId || undefined);
                await fetchAdminData();
                toast({ title: "Student Archived", description: `${studentToArchive.name} has been moved to the archive.`, variant: 'destructive'});
            } catch (error) {
                toast({ title: "Error", description: "Failed to archive student.", variant: 'destructive'});
            } finally {
                setStudentToArchive(null);
                setIsSubmitting(false);
            }
        }
    };
    
    const handleRestoreStudent = async (studentId: string) => {
        setIsSubmitting(true);
        try {
            await archiveStudent(db, auth, studentId, false, schoolId || undefined);
            await fetchAdminData();
            toast({ title: "Student Restored", description: `The student has been restored to the active list.`});
        } catch (error) {
            toast({ title: "Error", description: "Failed to restore student.", variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteStudent = (student: Student) => setStudentToDelete(student);
    const confirmDeleteStudent = async () => {
        if (studentToDelete) {
            setIsSubmitting(true);
            try {
                await deleteStudent(db, storage, auth, studentToDelete.studentId, schoolId || undefined);
                await fetchAdminData();
                toast({ title: "Student Deleted Permanently", description: `${studentToDelete.name} has been removed.`, variant: 'destructive'});
            } catch (error) {
                toast({ title: "Error", description: "Failed to delete student.", variant: 'destructive'});
            } finally {
                setStudentToDelete(null);
                setIsSubmitting(false);
            }
        }
    }
    
    const handleArchiveStaff = (staff: StaffId) => setStaffToArchive(staff);
    const confirmArchiveStaff = async () => {
        if (staffToArchive) {
            setIsSubmitting(true);
            try {
                await archiveStaff(db, auth, staffToArchive.id, true);
                await fetchAdminData();
                toast({ title: "Staff Archived", description: `${staffToArchive.name} has been moved to the archive.`, variant: 'destructive'});
            } catch (error) {
                toast({ title: "Error", description: "Failed to archive staff.", variant: 'destructive'});
            } finally {
                setStaffToArchive(null);
                setIsSubmitting(false);
            }
        }
    };

    const handleRestoreStaff = async (staffId: string) => {
        setIsSubmitting(true);
        try {
            await archiveStaff(db, auth, staffId, false);
            await fetchAdminData();
            toast({ title: "Staff Restored", description: `Staff ID ${staffId} has been restored.`});
        } catch (error) {
            toast({ title: "Error", description: "Failed to restore staff.", variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteStaff = (staff: StaffId) => setStaffToDelete(staff);
    const confirmDeleteStaff = async () => {
        if (staffToDelete) {
            setIsSubmitting(true);
            try {
                await deleteStaffId(db, auth, staffToDelete.id);
                await fetchAdminData();
                toast({ title: "Staff Deleted Permanently", description: `Staff ID ${staffToDelete.id} has been revoked.`, variant: 'destructive'});
            } catch(error) {
                toast({ title: "Error", description: "Could not delete Staff ID.", variant: 'destructive' });
            } finally {
                setStaffToDelete(null);
                setIsSubmitting(false);
            }
        }
    }

    const handleDeleteExpenditure = (expenditure: Expenditure) => setExpenditureToDelete(expenditure);
    const confirmDeleteExpenditure = async () => {
        if (expenditureToDelete) {
            setIsSubmitting(true);
            try {
                await deleteExpenditure(db, auth, expenditureToDelete.id);
                toast({ title: "Expenditure Deleted", description: `The expenditure record has been removed.`, variant: 'destructive'});
                await fetchAdminData();
            } catch (error) {
                toast({ title: "Error", description: "Could not delete expenditure.", variant: 'destructive' });
            } finally {
                setExpenditureToDelete(null);
                setIsSubmitting(false);
            }
        }
    }

    const handleDeleteDebt = (debt: Debt) => setDebtToDelete(debt);
    const confirmDeleteDebt = async () => {
        if (debtToDelete) {
            setIsSubmitting(true);
            try {
                await deleteDebt(db, auth, debtToDelete.id);
                toast({ title: "Debt Deleted", description: `The debt record has been removed.`, variant: 'destructive'});
                await fetchAdminData();
            } catch (error) {
                toast({ title: "Error", description: "Could not delete debt.", variant: 'destructive' });
            } finally {
                setDebtToDelete(null);
                setIsSubmitting(false);
            }
        }
    }

    const handleOpenEditDialog = (student: Student) => {
        setSelectedStudentForEdit(student);
        const studentToEdit = {
            studentId: student.studentId,
            name: student.name || '',
            className: student.className || '',
            profilePicture: student.profilePicture || '',
            schoolId: student.schoolId || '',
            dateOfBirth: student.dateOfBirth || '',
            gender: student.gender || 'Male',
            parentId: student.parentId || '',
            parentName: student.parentName || '',
            parentPhone: student.parentPhone || '',
            address: student.address || '',
            emergencyContactName: student.emergencyContactName || '',
            emergencyContactPhone: student.emergencyContactPhone || '',
            parentEmail: student.parentEmail || '',
            medicalNotes: student.medicalNotes || '',
            dailyFees: student.dailyFees || [],
            feeDiscount: student.feeDiscount || 0,
            preferredVoiceLanguage: student.preferredVoiceLanguage || 'en-GH'
        }
        setEditStudentForm(studentToEdit as any);
        setPhotoPreview(student.profilePicture);
        setPhotoFile(null);
        setIsEditDialogOpen(true);
    };

    const handleOpenViewDialog = (student: Student) => {
        setSelectedStudentForView(student);
        setIsViewDialogOpen(true);
    };
    
    const handleOpenSalaryDialog = (staff: StaffId) => {
        const details = staffDetails.find(d => d.id === staff.id);
        setSelectedStaffForSalary(staff);
        setStaffDetailsForm({ 
            amount: String(details?.salary || ''),
            ssnitNumber: details?.ssnitNumber || '',
            ghanaCardNumber: details?.ghanaCardNumber || '',
            bankName: details?.bankName || '',
            accountNumber: details?.accountNumber || '',
            emergencyContactName: details?.emergencyContactName || '',
            emergencyContactPhone: details?.emergencyContactPhone || '',
            address: details?.address || '',
            dateOfHire: details?.dateOfHire || '',
            qualifications: details?.qualifications || '',
            contractType: details?.contractType || ''
        });
        setIsSalaryDialogOpen(true);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };
    
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleRefreshLedger = async () => {
        if (!schoolId || !selectedPeriodId) return;
        setIsSubmitting(true);
        try {
            await reconcileDailyFees(db, auth, schoolId, selectedPeriodId);
            await fetchAdminData();
            toast({ title: "Ledger Refreshed", description: "Automated entries have been reconciled with current records." });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmAddCategory = async () => {
        if (!newCategoryName.trim() || !schoolId) return;
        setIsSubmitting(true);
        try {
            await addFeeCategory(db, auth, schoolId, newCategoryName.trim(), newCategoryIsDaily);
            await fetchAdminData();
            toast({ title: "Category Added", description: `"${newCategoryName}" is now available in your fee library.` });

            setNewCategoryName('');
            setNewCategoryIsDaily(false);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmDeleteCategory = async (categoryId: string, categoryName: string) => {
        if (!window.confirm(`Are you sure you want to delete the "${categoryName}" category? This will not remove historical transaction data, but you won't be able to select it for new transactions.`)) return;
        
        setIsSubmitting(true);
        try {
            await deleteFeeCategory(db, auth, categoryId);
            await fetchAdminData();
            toast({ title: "Category Deleted", description: `The category "${categoryName}" has been removed.` });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveEditCategory = async (categoryId: string) => {
        if (!editingCategoryName.trim()) return;
        setIsSubmitting(true);
        try {
            await updateFeeCategory(db, auth, categoryId, editingCategoryName.trim(), editingCategoryIsDaily);
            await fetchAdminData();
            toast({ title: 'Category Updated', description: `Category renamed to "${editingCategoryName.trim()}".` });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setEditingCategoryId(null);
            setEditingCategoryName('');
            setEditingCategoryIsDaily(false);
            setIsSubmitting(false);
        }
    };

    const handleExportFinancialSummary = () => {
        exportToCSV(`Financial_Summary_${schoolId || 'export'}.csv`, [{
            'Total Income': overallTotals.totalIncome,
            'Total Expenditure': overallTotals.totalExpenditure,
            'Net Savings': overallTotals.netSavings,
            'Total Debt': overallTotals.totalDebt,
        }]);
    };

    const handleExportExpenditures = () => {
        exportToCSV(`Expenditures_${schoolId || 'export'}.csv`, expenditures.map(e => ({
            Date: e.date,
            Description: e.description,
            Category: e.category,
            Amount: e.amount,
            Type: e.type
        })));
    };

    const handleRecordDailyPayments = async () => {
        if (!schoolId) {
            toast({ title: "Error", description: "School ID missing.", variant: "destructive" });
            return;
        }

        const selectedKeys = Object.keys(bulkDailyPaymentsSelection).filter(key => bulkDailyPaymentsSelection[key]);
        if (selectedKeys.length === 0) {
            toast({ title: "No Records Selected", description: "Please select the daily recurring fee records you want to record payments for.", variant: "destructive" });
            return;
        }

        const paymentsToRecord = selectedKeys.map(key => {
            const [studentId, categoryId] = key.split('|');
            const student = students.find(s => s.studentId === studentId);
            const category = feeCategories.find(c => c.id === categoryId) || { name: 'Feeding Fee', id: 'feeding' };
            
            const df = student?.dailyFees?.find(f => f.categoryId === categoryId);
            const amount = Number(df?.rate) || 0;

            return {
                studentId,
                amount,
                date: selectedPaymentDate,
                category: category.name,
                categoryId: category.id,
                description: `${category.name} Payment`,
                periodId: selectedPeriodId || undefined
            };
        }).filter(p => p.amount > 0);

        if (paymentsToRecord.length === 0) {
            toast({ title: "Zero Amount", description: "Selected records have GH¢0.00 rate.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await postBulkDailyPayments(db, auth, schoolId, paymentsToRecord);
            await fetchAdminData();
            toast({ title: "Payments Recorded", description: `Successfully logged payments for ${paymentsToRecord.length} records.` });
            setBulkDailyPaymentsSelection({});
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVoidTransaction = (transactionId: string) => {
        setTransactionToVoid(transactionId);
    };

    const handleOpenEditTransaction = (t: LedgerTransaction) => {
        handleOpenTransactionModal(
            t.debit > 0 ? 'fee' : 'payment',
            t
        );
    };

    const handleUpdateDailyRate = async (studentId: string, categoryId: string, newRate: number) => {
        setIsSubmitting(true);
        try {
            const student = students.find(s => s.studentId === studentId);
            if (!student) return;

            const updates: any = {};
            const otherFees = (student.dailyFees || []).filter(df => df.categoryId !== categoryId);
            updates.dailyFees = [...otherFees, { categoryId, rate: newRate }];

            await updateStudentDetails(db, storage, auth, student.id || studentId, updates, null, schoolId || undefined);
            
            // Sync past attendance with new rates
            await reconcileDailyFees(db, auth, studentId, selectedPeriodId || undefined, schoolId || undefined);
            
            await fetchAdminData();
            toast({ title: "Rate Updated", description: "The daily recurring fee rate and past records have been synchronized." });
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to update rate.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
            setEditingRateId(null);
        }
    };

    const handleSyncAllDailyFees = async () => {
        setIsSubmitting(true);
        let count = 0;
        try {
            for (const student of students) {
                try {
                    const changed = await reconcileDailyFees(db, auth, student.studentId, selectedPeriodId || undefined, schoolId || undefined);
                    if (changed) count++;
                } catch (studentError: any) {
                    console.warn(`[handleSyncAllDailyFees] Skipping student ${student.name}:`, studentError.message);
                }
            }
            await fetchAdminData();
            toast({ 
                title: "Cleanup Complete", 
                description: `Successfully cleaned and reconciled billing records for ${count} students.` 
            });
        } catch (error: any) {
            toast({ title: "Sync Error", description: error.message || "Failed to sync all records.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPin = async (isStudent: boolean) => {
        if (!db || !schoolId || !selectedStudentForEdit) return;
        try {
            const idToUpdate = isStudent ? selectedStudentForEdit.studentId : selectedStudentForEdit.parentId;
            if (!idToUpdate) throw new Error("No ID found to update.");
            await updatePin(db, schoolId, idToUpdate, isStudent, '1234');
            // Re-fetch or simply notify
            toast({ title: 'PIN Reset', description: `${isStudent ? 'Student' : 'Parent'} PIN has been reset to 1234.` });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentForEdit) return;

        setIsSubmitting(true);
        try {
            const { studentId, profilePicture, ...detailsToUpdateRaw } = editStudentForm;
            const detailsToUpdate = {
                ...detailsToUpdateRaw,
                feeDiscount: detailsToUpdateRaw.feeDiscount ? Number(detailsToUpdateRaw.feeDiscount) : 0
            };
            const upperCaseStudentId = studentId.trim().toUpperCase();
            const studentIdChanged = selectedStudentForEdit.studentId !== upperCaseStudentId;

            if (studentIdChanged) {
                 await updateStudentId(db, auth, selectedStudentForEdit.studentId, upperCaseStudentId, schoolId || undefined);
            }
            
            await updateStudentDetails(db, storage, auth, selectedStudentForEdit.id || upperCaseStudentId, detailsToUpdate, photoFile, schoolId || undefined);

            await fetchAdminData();
            if (studentIdChanged) {
                setSelectedStudentId(upperCaseStudentId);
            }
            toast({ title: "Success", description: "Student information updated." });
            setIsEditDialogOpen(false);
            setSelectedStudentForEdit(null);
            setPhotoPreview(null);
            setPhotoFile(null);
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Could not update student details.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleClearDailyFees = async () => {
        if (!categoryToClear) return;
        const { studentId, categoryId, categoryName, docId } = categoryToClear;
        const targetSchoolId = schoolId || schoolDetails?.id;
        if (!targetSchoolId) {
            toast({ title: "Error", description: "School ID not found. Please refresh and try again.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        const resolvedId = docId || studentId;
        
        try {
            const result = await voidFeeCategoryRecords(
                db, 
                auth, 
                resolvedId,
                categoryId, 
                categoryName, 
                "Cleared from Daily Recurring Fee Category Page",
                undefined
            );
            
            const matchCount = typeof result === 'number' ? result : 0;
            
            await fetchAdminData();
            
            if (matchCount > 0) {
                toast({
                    title: "Records Cleared",
                    description: `Successfully voided ${matchCount} ledger entries for ${categoryName}.`,
                });
            } else {
                toast({
                    title: "No Records Found",
                    description: `Could not find any active ledger entries matching "${categoryName}".`,
                    variant: "destructive"
                });
            }
        } catch (error: any) {
            toast({
                title: "Error Clearing Records",
                description: error.message || "Failed to clear records. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
            setCategoryToClear(null);
        }
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolId) return;
        setIsSubmitting(true);
        try {
            const studentData = {
                ...addStudentForm,
                schoolId: schoolId.toUpperCase(),
                studentId: addStudentForm.studentId.trim().toUpperCase()
            };
            await addStudent(db, auth, schoolId, studentData as any);
            await fetchAdminData();
            toast({ title: "Success", description: `${addStudentForm.name} has been added.` });
            setAddStudentForm(defaultAddStudentForm);
            setIsAddStudentDialogOpen(false);
            setActiveTab('students');
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolId) return;

        const isGatekeeper = addStaffForm.role === 'Gatekeeper' || addStaffForm.role === 'Security';
        if (!isGatekeeper && !addStaffForm.email) {
            toast({ title: "Error", description: "Email address is required for this role.", variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const currentStaff = staffIds.find(s => s.id === editingStaffId);
            const isLegacy = editingStaffId && currentStaff && !currentStaff.uid;

            const res = await fetch('/api/staff/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolId,
                    email: addStaffForm.email,
                    password: addStaffForm.password || undefined,
                    name: addStaffForm.name,
                    role: addStaffForm.role,
                    phone: addStaffForm.phone,
                    className: addStaffForm.className === 'none' ? undefined : addStaffForm.className,
                    staffId: isLegacy ? undefined : (addStaffForm.id.trim() || undefined),
                    legacyStaffId: isLegacy ? editingStaffId : undefined,
                    uid: editingStaffId && !isLegacy ? editingStaffId : undefined
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to register staff member.");
            }

            toast({ 
                title: editingStaffId ? "Staff Updated" : "Staff Registered", 
                description: `${addStaffForm.name} has been successfully ${editingStaffId ? 'updated' : 'added to the system'}.` 
            });

            await fetchAdminData();
            setAddStaffForm(defaultAddStaffForm);
            
            if (!editingStaffId) {
                // New staff registration: immediately open HR details
                setIsAddStaffDialogOpen(false);
                setSelectedStaffForSalary({
                    id: data.uid || addStaffForm.id, // Fallback to id if uid is missing
                    name: addStaffForm.name,
                    schoolId: schoolId,
                    role: addStaffForm.role,
                    dateAdded: new Date().toISOString()
                } as any);
                setStaffDetailsForm({ 
                    amount: '', ssnitNumber: '', ghanaCardNumber: '', bankName: '', accountNumber: '', 
                    emergencyContactName: '', emergencyContactPhone: '', address: '', dateOfHire: '', qualifications: '', contractType: '' 
                });
                setIsSalaryDialogOpen(true);
            } else {
                setEditingStaffId(null);
                setIsAddStaffDialogOpen(false);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleSalarySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStaffForSalary || !schoolId) return;
        setIsSubmitting(true);
        try {
            await updateStaffDetails(db, auth, schoolId, selectedStaffForSalary.id, {
                salary: Number(staffDetailsForm.amount),
                ssnitNumber: staffDetailsForm.ssnitNumber,
                ghanaCardNumber: staffDetailsForm.ghanaCardNumber,
                bankName: staffDetailsForm.bankName,
                accountNumber: staffDetailsForm.accountNumber,
                emergencyContactName: staffDetailsForm.emergencyContactName,
                emergencyContactPhone: staffDetailsForm.emergencyContactPhone,
                address: staffDetailsForm.address,
                dateOfHire: staffDetailsForm.dateOfHire,
                qualifications: staffDetailsForm.qualifications,
                contractType: staffDetailsForm.contractType as any
            });
            await fetchAdminData();
            toast({ title: "Success", description: `Staff details updated for ${selectedStaffForSalary.name}.` });
            setIsSalaryDialogOpen(false);
            setSelectedStaffForSalary(null);
        } catch (error: any) {
             toast({ title: "Error", description: error.message || "Could not update salary.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddAcademicPeriod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolId) return;
        setIsSubmitting(true);
        try {
            if (editingPeriodId) {
                await updateAcademicPeriod(db, auth, editingPeriodId, newPeriodForm);
                toast({ title: "Term Updated", description: `${newPeriodForm.term} for ${newPeriodForm.year} has been updated.` });
            } else {
                await addAcademicPeriod(db, auth, schoolId, { ...newPeriodForm, isCurrent: false });
                toast({ title: "Term Created", description: `${newPeriodForm.term} for ${newPeriodForm.year} has been created.` });
            }
            await fetchAdminData();
            setNewPeriodForm({ 
                year: '', 
                term: 'First Term',
                startDate: '',
                endDate: '',
                vacationDate: '',
                nextTermBegins: '',
                installmentPlan: []
            });
            setEditingPeriodId(null);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSetCurrentPeriod = async (periodId: string) => {
        if (!schoolId) return;
        setIsSubmitting(true);
        try {
            await setAsCurrentPeriod(db, auth, schoolId, periodId);
            setSelectedPeriodId(periodId);
            await fetchAdminData();
            toast({ title: "Current Term Updated", description: "The default term for all users has been updated." });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAcademicPeriod = async (periodId: string) => {
        if (!schoolId) return;
        if (!auth?.currentUser) {
            toast({ title: "Session Expired", description: "Please log in again to perform this action.", variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            await deleteAcademicPeriod(db, auth, periodId);
            if (selectedPeriodId === periodId) {
                setSelectedPeriodId(null);
            }
            await fetchAdminData();
            toast({ title: "Term Deleted", description: "The academic period has been removed.", variant: 'destructive' });
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Could not delete period.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveSchoolSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolId) return;
        setIsSubmitting(true);
        try {
            const { 
                name, schoolPhone, schoolEmail, momoNumber, momoName, 
                bankAccounts, hubtelSmsClientId, hubtelSmsClientSecret,
                hubtelSenderId, hubtelPaymentClientId, hubtelPaymentClientSecret,
                hubtelMerchantNumber, sendexaApiKey, sendexaVoiceCallerId, arkeselApiKey, arkeselVoiceCallerId, settingsPin, customFeeBlockMessage 
            } = schoolSettingsForm;
            
            await updateSchoolDetails(db, storage, auth, schoolId, { 
                name, schoolPhone, schoolEmail, momoNumber, momoName, 
                bankAccounts, hubtelSmsClientId, hubtelSmsClientSecret,
                hubtelSenderId, hubtelPaymentClientId, hubtelPaymentClientSecret,
                hubtelMerchantNumber, sendexaApiKey, sendexaVoiceCallerId, arkeselApiKey, arkeselVoiceCallerId, settingsPin, customFeeBlockMessage 
            }, logoFile);
    
            await fetchAdminData();
            toast({ title: "Success", description: "School settings have been updated." });
            setLogoFile(null);
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Could not update school settings.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };        

    const handleToggleAttendance = async (studentId: string, isChecked: boolean) => {
        setIsAttendanceSubmitting(prev => ({...prev, [studentId]: true}));
        try {
            await setAttendance(db, auth, studentId, selectedAttendanceDate, isChecked, selectedPeriodId || undefined, schoolId || undefined);
            setStudents(prevStudents => prevStudents.map(s => {
                if (s.studentId === studentId) {
                    const attendance = [...(s.attendance || [])];
                    const recordIndex = attendance.findIndex(a => a.date === selectedAttendanceDate);
                    if (recordIndex > -1) {
                        attendance[recordIndex] = { ...attendance[recordIndex], attended: isChecked, periodId: selectedPeriodId || undefined };
                    } else {
                        attendance.push({ id: Date.now(), date: selectedAttendanceDate, attended: isChecked, periodId: selectedPeriodId || undefined });
                    }
                    return { ...s, attendance };
                }
                return s;
            }));
        } catch (error) {
            toast({ title: "Error", description: "Could not update attendance.", variant: "destructive" });
        } finally {
             setIsAttendanceSubmitting(prev => ({...prev, [studentId]: false}));
        }
    };

    const handleDeleteAnnouncement = async () => {
        if (!announcementToDelete || !auth || !db) return;
        setIsSubmitting(true);
        try {
            await deleteAnnouncement(db, auth, announcementToDelete.id);
            toast({ title: 'Announcement Deleted', description: 'The message has been removed from the portal.' });
            fetchAdminData();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete announcement.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
            setAnnouncementToDelete(null);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {

        e.preventDefault();
        if (!schoolId) {
            toast({ title: "Error", description: "School ID not found.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        let announcementSent = false;
        
        // --- In-App Announcement Logic ---
        try {
            // We only send the announcement, not the SMS flag
            const announcementData = {
                recipient: communicationForm.recipient,
                subject: communicationForm.subject,
                message: communicationForm.message,
            };
            await sendAnnouncement(db, auth, schoolId, announcementData);
            announcementSent = true;
            toast({ title: "Success", description: "In-app announcement was sent." });

        } catch (error: any) {
            console.error("Failed to send announcement:", error);
            toast({
                title: "Error Sending Announcement",
                description: error.message || "An unknown error occurred with the in-app announcement.",
                variant: "destructive",
                duration: 9000
            });
        }

        // --- Push Notification & SMS Logic ---
        toast({ title: communicationForm.sendAsVoice ? "Sending Voice SMS..." : (communicationForm.sendAsSMS ? "Sending SMS & Notification..." : "Sending Notification..."), description: "Please wait." });
        
        let voiceSent = false;
        if (communicationForm.sendAsVoice) {
             try {
                const voiceResponse = await fetch('/api/voice/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        schoolId: schoolId,
                        message: communicationForm.message,
                        recipient: communicationForm.recipient === 'all' ? 'all' : 'specific',
                        specificParent: communicationForm.recipient !== 'all' ? communicationForm.recipient : undefined
                    })
                });
                
                const voiceResult = await voiceResponse.json();
                if (voiceResponse.ok) {
                    toast({ title: "Voice SMS Queued", description: voiceResult.message });
                    voiceSent = true;
                } else {
                    toast({ title: "Voice SMS Failed", description: voiceResult.error, variant: "destructive" });
                }
             } catch (error) {
                 toast({ title: "Voice API Error", description: "Network error sending Voice SMS.", variant: "destructive" });
             }
        }

        try {
            const smsResponse = await fetch('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolId: schoolId,
                    // Use the message from the form for the body
                    message: communicationForm.message, 
                    // Determine the recipient for the API
                    recipient: communicationForm.recipient === 'all' ? 'all' : 'specific',
                    specificParent: communicationForm.recipient !== 'all' ? communicationForm.recipient : undefined,
                    notificationOnly: !communicationForm.sendAsSMS
                }),
            });

            const smsResult = await smsResponse.json();

            if (smsResponse.ok) {
                if (!communicationForm.sendAsVoice) {
                    toast({
                        title: communicationForm.sendAsSMS ? "SMS & Notification Sent" : "Notification Sent",
                        description: smsResult.message || `Message was sent successfully.`,
                        variant: "default"
                    });
                }
            } else {
                if (!communicationForm.sendAsVoice || communicationForm.sendAsSMS) {
                    toast({
                        title: "Sending Failed",
                        description: smsResult.error || "The message could not be sent. Please check your credentials and try again.",
                        variant: "destructive",
                        duration: 10000
                    });
                }
            }
        } catch (error: any) {
            console.error("Failed to make API request:", error);
            if (!communicationForm.sendAsVoice || communicationForm.sendAsSMS) {
                toast({
                    title: "API Error",
                    description: "A network or server error occurred while trying to send the message.",
                    variant: "destructive",
                    duration: 10000
                });
            }
        }

        // Reset the form only if at least one operation was attempted
        if (announcementSent || communicationForm.sendAsSMS || voiceSent) {
             setCommunicationForm(defaultCommunicationForm);
        }
        
        setIsSubmitting(false);
    };

    const handleAddCalendarEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolId) return;
        setIsSubmitting(true);
        try {
            await addCalendarEvent(db, auth, schoolId, calendarEventForm);
            toast({ title: "Success", description: "Calendar event added." });
            setCalendarEventForm(defaultCalendarEventForm);
            await fetchAdminData();
        } catch (error) {
            toast({ title: "Error", description: "Could not add calendar event.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEvent = (event: CalendarEvent) => setEventToDelete(event);
    const confirmDeleteEvent = async () => {
        if (eventToDelete) {
            setIsSubmitting(true);
            try {
                await deleteCalendarEvent(db, auth, eventToDelete.id);
                toast({ title: "Event Deleted", description: `The event "${eventToDelete.title}" has been removed.`, variant: 'destructive'});
                await fetchAdminData();
            } catch (error) {
                toast({ title: "Error", description: "Could not delete event.", variant: 'destructive' });
            } finally {
                setEventToDelete(null);
                setIsSubmitting(false);
            }
        }
    }
    
    const handleAddExpenditure = async (formToSubmit: typeof defaultExpenditureForm) => {
        if (!schoolId) return;
        setIsSubmitting(true);
        const newExpenditure = {
            description: formToSubmit.description,
            category: formToSubmit.category,
            amount: Number(formToSubmit.amount),
            date: formToSubmit.date,
            periodId: selectedPeriodId || undefined
        };
        try {
            await addExpenditure(db, auth, schoolId, newExpenditure);
            toast({ title: "Success", description: "Expenditure recorded." });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            await fetchAdminData();
        }
    };

    const handleAddDebt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolId) return;
        setIsSubmitting(true);
        const newDebt = {
            ...debtForm,
            amount: Number(debtForm.amount),
            periodId: selectedPeriodId || undefined
        };
        try {
            await addDebt(db, auth, schoolId, newDebt);
            toast({ title: "Success", description: "Debt recorded." });
            setDebtForm(defaultDebtForm);
            await fetchAdminData();
        } catch (error) {
            toast({ title: "Error", description: "Could not add debt.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleBankAccountChange = (index: number, field: keyof Omit<BankAccount, 'id'>, value: string) => {
        const updatedAccounts = [...schoolSettingsForm.bankAccounts];
        updatedAccounts[index] = { ...updatedAccounts[index], [field]: value };
        setSchoolSettingsForm(prev => ({ ...prev, bankAccounts: updatedAccounts }));
    };

    const addBankAccount = () => {
        setSchoolSettingsForm(prev => ({
            ...prev,
            bankAccounts: [...prev.bankAccounts, { id: Date.now(), bankName: '', accountName: '', accountNumber: '' }]
        }));
    };

    const removeBankAccount = (index: number) => {
        setSchoolSettingsForm(prev => ({
            ...prev,
            bankAccounts: prev.bankAccounts.filter((_, i) => i !== index)
        }));
    };

    const ledgerTotals = useMemo(() => {
        if (!selectedStudent) return { billed: 0, paid: 0, balance: 0, expected: 0, installmentBalance: 0 };
        
        const isDailySubTab = feesActiveSubTab === 'daily';
        
        const filteredLedger = (selectedStudent.ledger || []).filter(t => {
            const isTransactionDaily = isDailyTransaction(t, feeCategories);
            return isDailySubTab ? isTransactionDaily : !isTransactionDaily;
        });
        
        const sortedPeriods = [...academicPeriods].reverse();
        const currentPeriodIndex = sortedPeriods.findIndex(p => p.id === selectedPeriodId);
        
        const prevTransactions = filteredLedger.filter(t => {
            if (!t.periodId) return false;
            const tPeriodIndex = sortedPeriods.findIndex(p => p.id === t.periodId);
            return tPeriodIndex < currentPeriodIndex && t.periodId !== selectedPeriodId;
        });
        
        let balanceBF = prevTransactions.reduce((sum, t) => {
            if (t.isVoided) return sum;
            const isAutomated = t.id && (t.id.startsWith('auto-df-') || t.id.startsWith('auto-feeding-') || t.id.startsWith('feeding-') || t.id.startsWith('mig-df-') || t.id.startsWith('mig-fa-'));
            const debit = (isDailySubTab && isAutomated) ? 0 : (Number(t.debit) || 0);
            return sum + debit - (Number(t.credit) || 0);
        }, 0);

        if (isDailySubTab && selectedStudent.attendance) {
            const prevAttendance = selectedStudent.attendance.filter(a => {
                if (!a.attended || !a.periodId || a.periodId === selectedPeriodId) return false;
                const tPeriodIndex = sortedPeriods.findIndex(p => p.id === a.periodId);
                return tPeriodIndex < currentPeriodIndex;
            });
            let prevAccrued = 0;
            feeCategories.filter(c => c.isDaily).forEach(cat => {
                const studentRate = (selectedStudent.dailyFees || []).find(f => f.categoryId === cat.id || f.categoryId === cat.name)?.rate || 0;
                prevAccrued += prevAttendance.length * Number(studentRate);
            });
            balanceBF += prevAccrued;
        }

        const currentLedger = filteredLedger.filter(t => !selectedPeriodId || t.periodId === selectedPeriodId);

        const totals = currentLedger.reduce((acc, t) => {
            if (t.isVoided) return acc;
            const isAutomated = t.id && (t.id.startsWith('auto-df-') || t.id.startsWith('auto-feeding-') || t.id.startsWith('feeding-') || t.id.startsWith('mig-df-') || t.id.startsWith('mig-fa-'));
            const debit = (isDailySubTab && isAutomated) ? 0 : (Number(t.debit) || 0);
            
            acc.billed += debit;
            acc.paid += (Number(t.credit) || 0);
            return acc;
        }, { billed: balanceBF > 0 ? balanceBF : 0, paid: balanceBF < 0 ? Math.abs(balanceBF) : 0 });

        if (isDailySubTab && selectedStudent.attendance) {
            const currentAttendance = selectedStudent.attendance.filter(a => a.attended && (!selectedPeriodId || a.periodId === selectedPeriodId));
            let currentAccrued = 0;
            feeCategories.filter(c => c.isDaily).forEach(cat => {
                const studentRate = (selectedStudent.dailyFees || []).find(f => f.categoryId === cat.id || f.categoryId === cat.name)?.rate || 0;
                currentAccrued += currentAttendance.length * Number(studentRate);
            });
            totals.billed += currentAccrued;
        }

        const currentPeriod = academicPeriods.find(p => p.id === selectedPeriodId);
        let expected = totals.billed;
        if (!isDailySubTab && currentPeriod) {
            expected = calculateInstallmentExpectedAmount(selectedStudent, currentPeriod, feeCategories);
        }

        return { 
            ...totals, 
            balance: isDailySubTab ? (totals.paid - totals.billed) : (totals.billed - totals.paid),
            expected,
            installmentBalance: Math.max(0, expected - totals.paid)
        };
    }, [selectedStudent, selectedPeriodId, feeCategories, academicPeriods, feesActiveSubTab]);

    const overallTotals = useMemo(() => {
        const byCategory: Record<string, { billed: number; paid: number; accrued: number }> = {};
        
        // Initialize with all known categories
        feeCategories.forEach(cat => {
            byCategory[cat.name] = { billed: 0, paid: 0, accrued: 0 };
        });

        // Helper to get consistent category name
        const getDisplayCategory = (catRef: string) => {
            if (!catRef) return 'General';
            if (catRef === 'feeding' || catRef === 'Feeding Fee') return 'Feeding Fee';
            const cat = feeCategories.find(c => c.id === catRef || c.name === catRef);
            return cat?.name || catRef || 'General';
        };

        let totalArrears = 0;

        students.forEach(student => {
            const balanceInfo = calculateStudentTotalBalance(student, academicPeriods, selectedPeriodId || undefined, feeCategories);
            if (balanceInfo.totalOutstanding > 0) {
                totalArrears += balanceInfo.totalOutstanding;
            }

            if (student.ledger) {
                student.ledger.forEach(t => {
                    if (t.isVoided) return;

                    // Only add to period-specific totals if it matches the current filter
                    if (!selectedPeriodId || t.periodId === selectedPeriodId) {
                        const displayCat = getDisplayCategory(t.category || '');
                        if (!byCategory[displayCat]) {
                            byCategory[displayCat] = { billed: 0, paid: 0, accrued: 0 };
                        }
                        
                        byCategory[displayCat].billed += (Number(t.debit) || 0);
                        byCategory[displayCat].paid += (Number(t.credit) || 0);
                    }
                });
            }
        });

        const totalIncome = Object.values(byCategory).reduce((sum, c) => sum + (Number(c.paid) || 0), 0);
        const totalExpenditure = expenditures.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
        const totalDebt = debts.reduce((sum, debt) => sum + (Number(debt.amount) || 0), 0);

        return {
            byCategory,
            totalIncome,
            totalExpenditure,
            netSavings: totalIncome - totalExpenditure,
            totalDebt,
            totalArrears,
        };
    }, [students, expenditures, debts, selectedPeriodId, feeCategories, academicPeriods]);

    const chartData = useMemo(() => {
        const incomeVsExpenditure = [
            { name: 'Total Income', value: overallTotals.totalIncome, fill: 'hsl(var(--success))' },
            { name: 'Total Expenditure', value: overallTotals.totalExpenditure, fill: 'hsl(var(--destructive))' },
        ];

        const arrearsByClass = Object.entries(studentsByClass)
            .map(([className, classStudents]) => {
                const totalArrears = classStudents.reduce((sum, student) => {
                    const balanceInfo = calculateStudentTotalBalance(student, academicPeriods, selectedPeriodId || undefined, feeCategories);
                    return sum + (balanceInfo.totalOutstanding > 0 ? balanceInfo.totalOutstanding : 0);
                }, 0);
                return { name: className, arrears: totalArrears };
            })
            .filter(c => c.arrears > 0)
            .sort((a,b) => b.arrears - a.arrears);

        return { incomeVsExpenditure, arrearsByClass };
    }, [overallTotals, studentsByClass, selectedPeriodId, academicPeriods, feeCategories]);

    const monthlyFinancialData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const data = months.map(m => ({ name: m, Income: 0, Expenditure: 0 }));

        const currentYearStr = new Date().getFullYear().toString();

        students.forEach(student => {
            if (student.ledger) {
                student.ledger.forEach(t => {
                    if (t.isVoided) return;
                    if (t.date && t.date.startsWith(currentYearStr)) {
                        const monthIndex = new Date(t.date).getMonth();
                        if (monthIndex >= 0 && monthIndex < 12) {
                            data[monthIndex].Income += (Number(t.credit) || 0);
                        }
                    }
                });
            }
        });

        expenditures.forEach(exp => {
            if (exp.date && exp.date.startsWith(currentYearStr)) {
                const monthIndex = new Date(exp.date).getMonth();
                if (monthIndex >= 0 && monthIndex < 12) {
                    data[monthIndex].Expenditure += (Number(exp.amount) || 0);
                }
            }
        });

        const currentMonthIndex = new Date().getMonth();
        const monthsToShow = Math.max(5, currentMonthIndex + 1);
        return data.slice(0, monthsToShow);
    }, [students, expenditures]);



    const dailyCategoriesForModal = useMemo(() => {
        const list = [...feeCategories.filter(c => c.isDaily)];
        const hasFeeding = list.some(c => c.id === 'feeding' || c.name.toLowerCase() === 'feeding fee');
        if (!hasFeeding) {
            list.unshift({ id: 'feeding', name: 'Feeding Fee', schoolId: schoolId || '', isDaily: true } as FeeCategory);
        }
        return list;
    }, [feeCategories, schoolId]);

    const dailyFeeSummary = useMemo(() => {
        const summary: {
            studentName: string, 
            className: string, 
            categoryName: string, 
            categoryId: string,
            daysPresent: number, 
            dailyRate: number, 
            totalBilled: number,
            totalPaid: number,
            balance: number,
            status: 'Paid' | 'Partially Paid' | 'Unpaid',
            studentId: string,
            docId: string,
            profilePicture?: string
        }[] = [];

        // Identify the "real" feeding category if it exists in the database
        const dynamicFeedingCat = feeCategories.find(c => c.isDaily && (c.name.toLowerCase().trim() === 'feeding fee' || c.name.toLowerCase().trim() === 'feeding'));
        const dynamicFeedingId = dynamicFeedingCat?.id.toLowerCase().trim();

        students.forEach(student => {
            const processedCategoryIds = new Set<string>();
            
            const processCategory = (name: string, id: string, rate: number) => {
                const catIdLower = id.toLowerCase().trim();
                if (processedCategoryIds.has(catIdLower)) return;
                processedCategoryIds.add(catIdLower);

                const relevantTransactions = (student.ledger || []).filter(t => {
                    const isVoided = t.isVoided === true || String(t.isVoided) === 'true';
                    if (isVoided) return false;
                    
                    // 1. Strict ID Match (Primary)
                    // This is the most reliable way to avoid cross-contamination
                    if (t.categoryId && t.categoryId === id) return (!selectedPeriodId || t.periodId === selectedPeriodId);

                    // 2. Legacy/Fallback Matching
                    const tCategory = String(t.category || "").toLowerCase().trim();
                    const targetIdLower = catIdLower;
                    const targetNameLower = name.toLowerCase().trim();
                    
                    // Use isDailyTransaction to verify this is a daily recurring fee transaction
                    const isDaily = isDailyTransaction(t, feeCategories);
                    if (!isDaily) return false;

                    // Specialized matching for Feeding Fee (Legacy)
                    const isFeedingTarget = targetIdLower === 'feeding' || targetNameLower === 'feeding fee' || (dynamicFeedingId && targetIdLower === dynamicFeedingId);
                    const isFeedingMatch = isFeedingTarget && (tCategory === 'feeding fee' || tCategory === 'feeding' || (dynamicFeedingId && tCategory === dynamicFeedingId));

                    const isMatch = t.categoryId === id ||
                                   t.categoryId === name ||
                                   tCategory === targetIdLower || 
                                   tCategory === targetNameLower ||
                                   isFeedingMatch ||
                                   (t.id && t.id.startsWith(`auto-df-${id}`)) ||
                                   (isFeedingTarget && t.id && (t.id.startsWith('auto-feeding-') || t.id.startsWith('feeding-')));
                                   
                    return (!selectedPeriodId || t.periodId === selectedPeriodId) && isMatch;
                });

                const manualDebits = relevantTransactions.reduce((sum, t) => {
                    const isAutomated = t.id && (t.id.startsWith('auto-df-') || t.id.startsWith('auto-feeding-') || t.id.startsWith('feeding-') || t.id.startsWith('mig-df-') || t.id.startsWith('mig-fa-'));
                    return sum + (isAutomated ? 0 : (Number(t.debit) || 0));
                }, 0);
                const daysPresent = (student.attendance || []).filter(a => a.attended && (!selectedPeriodId || a.periodId === selectedPeriodId)).length;
                const totalBilled = (daysPresent * rate) + manualDebits;
                const totalPaid = relevantTransactions.reduce((sum, t) => sum + (t.credit || 0), 0);
                const balance = totalPaid - totalBilled; // Wallet Balance (Positive = Credit, Negative = Arrears)
                
                let status: 'Paid' | 'Partially Paid' | 'Unpaid' = 'Unpaid';
                if (balance >= 0 && totalBilled > 0) status = 'Paid';
                else if (totalPaid > 0 && balance < 0) status = 'Partially Paid';
                
                if (totalBilled > 0 || totalPaid > 0 || relevantTransactions.length > 0 || rate > 0) {
                    summary.push({
                        studentName: student.name,
                        className: student.className || 'Unassigned',
                        categoryName: name,
                        categoryId: id,
                        daysPresent,
                        dailyRate: rate,
                        totalBilled,
                        totalPaid,
                        balance,
                        status,
                        studentId: student.studentId,
                        docId: student.id || student.studentId,
                        profilePicture: student.profilePicture
                    });
                }
            };

            // Process all dynamic daily recurring fee categories using the official category list
            feeCategories.filter(c => c.isDaily).forEach(cat => {
                const normName = cat.name.toLowerCase().trim();
                const normId = cat.id;
                
                // Find student's assigned rate for this category
                const studentRate = (student.dailyFees || []).find(f => 
                    f.categoryId === normId
                )?.rate || 0;

                processCategory(cat.name, cat.id, Number(studentRate));
            });
        });
        return summary;
    }, [students, selectedPeriodId, feeCategories, selectedClassForFees]);

    const filteredDailyFeeSummary = useMemo(() => {
        if (selectedClassForFees === 'all') return dailyFeeSummary;
        return dailyFeeSummary.filter(s => s.className === selectedClassForFees);
    }, [dailyFeeSummary, selectedClassForFees]);

    const dailyRevenueSummary = useMemo(() => {
        const dateMap: Record<string, { date: string, mainFeesAmount: number, dailyFeesAmount: number, totalAmount: number }> = {};

        students.forEach(student => {
            if (student.ledger) {
                student.ledger.forEach(t => {
                    if (!t.isVoided && t.type === 'payment' && t.credit > 0) {
                        const dateStr = t.date.split('T')[0];
                        
                        if (!dateMap[dateStr]) {
                            dateMap[dateStr] = { date: dateStr, mainFeesAmount: 0, dailyFeesAmount: 0, totalAmount: 0 };
                        }

                        if (isDailyTransaction(t, feeCategories)) {
                            dateMap[dateStr].dailyFeesAmount += t.credit;
                        } else {
                            dateMap[dateStr].mainFeesAmount += t.credit;
                        }
                        dateMap[dateStr].totalAmount += t.credit;
                    }
                });
            }
        });

        return Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date));
    }, [students, feeCategories]);

    const allFeeCategories = useMemo(() => {
        const combined = [...feeCategories];
        if (!combined.some(c => c.id === 'feeding' || c.name === 'Feeding Fee')) {
            combined.push({ id: 'feeding', name: 'Feeding Fee', schoolId: schoolId || '', isDaily: true } as FeeCategory);
        }
        return combined;
    }, [feeCategories, schoolId]);

    const selectedPeriod = academicPeriods.find(p => p.id === selectedPeriodId);

    if (!db) {
      return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    
    if (!schoolId) {
        return (
             <main className="container mx-auto p-4 md:p-8">
                <Card className="w-full max-w-md mx-auto mt-10">
                    <CardHeader>
                        <CardTitle className="text-heading-md flex items-center gap-2">
                           <AlertCircleIcon className="w-6 h-6 text-destructive" /> Invalid Access
                        </CardTitle>
                        <CardDescription>
                            Please try to access the dashboard through your registration link.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/')} className="w-full">
                            Back to Login
                        </Button>
                    </CardContent>
                </Card>
             </main>
        );
    }

    if (printReportConfig) {
        return (
            <PrintableMonthlyReport
                month={printReportConfig.month}
                year={printReportConfig.year}
                students={students}
                expenditures={expenditures}
                schoolDetails={schoolDetails}
                feeCategories={feeCategories}
                onClose={() => setPrintReportConfig(null)}
            />
        );
    }

    return (
            <>
                <div className="h-screen w-full flex bg-background text-foreground overflow-hidden print:h-auto print:overflow-visible print:bg-white">
                    <AdminSidebar
                        activeTab={activeTab}
                        setActiveTab={handleSetActiveTab}
                        handleLogout={handleLogout}
                        feesActiveSubTab={feesActiveSubTab}
                        setFeesActiveSubTab={(tab) => setFeesActiveSubTab(tab as 'main' | 'daily')}
                        schoolName={schoolDetails?.name}
                        schoolId={schoolId ?? undefined}
                        logoUrl={schoolDetails?.logoUrl}
                        userRole={userRole}
                    />
                    <div className="flex flex-col flex-1 min-w-0 print:block print:h-auto">
                        <header className="bg-card shadow-sm sticky top-0 z-40 border-b flex flex-wrap lg:flex-nowrap items-center px-4 py-2 gap-y-2 gap-x-4 min-h-[4rem] print:hidden">
                        {/* Logo and Name Wrapper */}
                        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 order-1">
                            {schoolDetails?.logoUrl ? (
                                <Avatar className="h-9 w-9 flex-shrink-0">
                                    <AvatarImage src={schoolDetails.logoUrl} alt={schoolDetails.name} />
                                    <AvatarFallback>{schoolDetails?.name?.charAt(0) || 'S'}</AvatarFallback>
                                </Avatar>
                            ) : (
                                <ZipSMALogo className="h-8 w-8 flex-shrink-0" />
                            )}
                            <div className="flex flex-col min-w-0">
                                <h1 className="text-md font-bold text-primary truncate leading-tight">{schoolDetails?.name}</h1>
                                {selectedPeriod && <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{selectedPeriod.year} - {selectedPeriod.term}</p>}
                            </div>
                        </div>

                        {/* Term Selector Mobile: Move to next line (order-3), Desktop: Stay inline (order-2) */}
                        <div className="w-full lg:w-auto order-3 lg:order-2">
                            {/* Term Selector for both Desktop & Mobile */}
                            <Select value={selectedPeriodId || ''} onValueChange={(val) => {
                                setSelectedPeriodId(val);
                                // Automatically refresh data when term changes
                                // The useEffect at the bottom handles this if we add periodId to dependencies
                            }}>
                                <SelectTrigger className="w-full lg:w-[200px] h-9 text-xs md:text-sm bg-muted/50 border-primary/20">
                                    <CalendarDays className="w-3 h-3 md:w-4 md:h-4 mr-2 text-primary shrink-0" />
                                    <SelectValue placeholder="Select Term" />
                                </SelectTrigger>
                                <SelectContent>
                                    <div className="p-2 text-[10px] font-semibold text-muted-foreground uppercase border-b mb-1">Academic Term</div>
                                    {academicPeriods.length === 0 ? (
                                        <SelectItem value="none" disabled>No Terms Setup</SelectItem>
                                    ) : (
                                        academicPeriods.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.year} - {p.term} {p.isCurrent && "(Current)"}
                                            </SelectItem>
                                        ))
                                    )}
                                    <div className="p-1 border-t mt-1">
                                        <Button variant="ghost" size="sm" className="w-full text-[10px] h-8 justify-start px-2" onClick={(e) => { e.stopPropagation(); setIsAcademicSetupOpen(true); }}>
                                            <Settings className="w-3 h-3 mr-2" /> Academic Setup
                                        </Button>
                                    </div>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Sidebar Trigger */}
                        <div className="flex-shrink-0 order-2 lg:order-3">
                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="icon" className="flex-shrink-0 lg:hidden h-9 w-9">
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-0 w-[280px] flex">
                                    <AdminSidebar
                                        activeTab={activeTab}
                                        setActiveTab={(tab) => {
                                            handleSetActiveTab(tab);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        handleLogout={handleLogout}
                                        feesActiveSubTab={feesActiveSubTab}
                                        setFeesActiveSubTab={(tab) => setFeesActiveSubTab(tab as 'main' | 'daily')}
                                        schoolName={schoolDetails?.name}
                                        schoolId={schoolId ?? undefined}
                                        logoUrl={schoolDetails?.logoUrl}
                                        isMobile={true}
                                    />
                                </SheetContent>
                            </Sheet>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/50 dark:bg-transparent relative pb-8 print:flex-none print:h-auto print:overflow-visible print:bg-white">
                        {/* Hero Banner */}
                        <div className="w-full h-32 md:h-48 lg:h-56 relative mb-6 print:hidden">
                            <Image 
                                src="/cover-placeholder.png" 
                                alt="School Cover" 
                                fill 
                                className="object-cover"
                                priority
                            />
                        </div>
                        
                        <div className="px-4 md:px-6 lg:px-8 -mt-20 md:-mt-28 relative z-10 drop-shadow-2xl print:mt-0 print:px-0 print:drop-shadow-none">
                            <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="min-h-full drop-shadow-lg"
                            >
                        {activeTab === 'dashboard' && (
                            <Card>
                                 <CardHeader>
                                    <CardTitle className="text-heading-md">School Overview</CardTitle>
                                    <CardDescription>A high-level view of school finances and enrollment.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? (
                                        <div className="grid md:grid-cols-4 gap-4">
                                            <Skeleton className="h-24 w-full" />
                                            <Skeleton className="h-24 w-full" />
                                            <Skeleton className="h-24 w-full" />
                                            <Skeleton className="h-24 w-full" />
                                        </div>
                                    ) : (
                                        <>
                                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
                                            {userRole === "admin" && <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-heading-md">Total Students</CardTitle>
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{students.length}</div>
                                                    <p className="text-xs text-muted-foreground">Currently enrolled</p>
                                                </CardContent>
                                            </Card>}
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-heading-md">Total Arrears</CardTitle>
                                                    <AlertCircleIcon className="h-4 w-4 text-destructive" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold text-destructive">GH¢{overallTotals.totalArrears.toFixed(2)}</div>
                                                    <p className="text-xs text-muted-foreground">Outstanding from all students</p>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-heading-md">Total Income</CardTitle>
                                                    <Banknote className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold text-success">GH¢{overallTotals.totalIncome.toFixed(2)}</div>
                                                    <p className="text-xs text-muted-foreground">From all fee collections</p>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-heading-md">Total Expenditure</CardTitle>
                                                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold text-destructive">GH¢{overallTotals.totalExpenditure.toFixed(2)}</div>
                                                    <p className="text-xs text-muted-foreground">Total recorded expenses</p>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-heading-md">Net Savings / Loss</CardTitle>
                                                    <Wallet className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className={`text-2xl font-bold ${overallTotals.netSavings >= 0 ? 'text-success' : 'text-destructive'}`}>GH¢{(overallTotals.netSavings || 0).toFixed(2)}</div>
                                                    <p className="text-xs text-muted-foreground">Income minus Expenditures</p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                                            <Card>
                                                <CardHeader><CardTitle className="text-heading-md">Income vs. Expenditure</CardTitle></CardHeader>
                                                <CardContent>
                                                    <ResponsiveContainer width="100%" height={300}>
                                                        <BarChart data={chartData.incomeVsExpenditure} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="name" />
                                                            <YAxis />
                                                            <ChartTooltip />
                                                            <Bar dataKey="value" name="Amount" />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader><CardTitle className="text-heading-md">Fee Arrears by Class</CardTitle></CardHeader>
                                                <CardContent>
                                                {chartData.arrearsByClass.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height={300}>
                                                        <BarChart data={chartData.arrearsByClass} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="name" />
                                                            <YAxis />
                                                            <ChartTooltip />
                                                            <Bar dataKey="arrears" name="Arrears" fill='hsl(var(--destructive))' />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                                        <CheckCheck className="w-8 h-8 mr-2" />
                                                        <p>No outstanding fee arrears. Well done!</p>
                                                    </div>
                                                )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                        <div className="mt-8">
                                            <Card className="border-primary/10 shadow-sm overflow-hidden">
                                                <CardHeader className="bg-slate-50/50 border-b border-primary/5 py-4 px-6">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                                                                <Users className="w-5 h-5" /> Class Attendance Summary
                                                            </CardTitle>
                                                            <CardDescription className="text-xs font-medium">Real-time attendance breakdown for all classes today.</CardDescription>
                                                        </div>
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold uppercase tracking-widest text-[10px] py-1 px-3">
                                                            Today
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-6 bg-white/50">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                        {attendanceBreakdown.length === 0 ? (
                                                            <div className="col-span-full text-center py-12 text-muted-foreground bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                                                <p className="font-semibold text-sm">No classes found to track attendance.</p>
                                                                <p className="text-[10px] mt-1">Assign students to classes to see live metrics here.</p>
                                                            </div>
                                                        ) : (
                                                            attendanceBreakdown.map((item) => (
                                                                <div 
                                                                    key={item.className} 
                                                                    className={cn(
                                                                        "p-4 bg-card border border-primary/5 rounded-2xl shadow-sm transition-all group hover:border-primary/20",
                                                                        item.total - item.present > 0 ? "cursor-pointer hover:shadow-md" : ""
                                                                    )}
                                                                    onClick={() => {
                                                                        if (item.total - item.present > 0) {
                                                                            setSelectedClassForAbsent({ className: item.className, absentStudents: item.absentStudents });
                                                                        }
                                                                    }}
                                                                >
                                                                    <div className="flex justify-between items-start mb-3">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors truncate max-w-[150px]">
                                                                                {item.className}
                                                                            </span>
                                                                            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Attendance</span>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="text-lg font-black text-numeric text-primary leading-none">
                                                                                {item.present} <span className="text-xs text-muted-foreground font-medium">/ {item.total}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                        <motion.div 
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${item.total > 0 ? (item.present / item.total) * 100 : 0}%` }}
                                                                            className={cn(
                                                                                "h-full rounded-full transition-all duration-1000",
                                                                                item.present === item.total ? "bg-emerald-500" : 
                                                                                item.present === 0 ? "bg-slate-300" : "bg-primary"
                                                                            )}
                                                                        />
                                                                    </div>
                                                                    <div className="mt-2.5 flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter">
                                                                        <span className={cn(item.present === item.total ? "text-emerald-600" : "text-muted-foreground")}>
                                                                            {item.present === item.total ? "FULL HOUSE" : `${item.total - item.present} ABSENT`}
                                                                        </span>
                                                                        <span className="text-numeric bg-primary/5 px-1.5 py-0.5 rounded text-primary">
                                                                            {item.total > 0 ? Math.round((item.present / item.total) * 100) : 0}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>

                                                    <Dialog open={!!selectedClassForAbsent} onOpenChange={(open) => !open && setSelectedClassForAbsent(null)}>
                                                        <DialogContent className="sm:max-w-[425px]">
                                                            <DialogHeader>
                                                                <DialogTitle>Absent Students - {selectedClassForAbsent?.className}</DialogTitle>
                                                                <DialogDescription>
                                                                    The following {selectedClassForAbsent?.absentStudents.length} {selectedClassForAbsent?.absentStudents.length === 1 ? 'student is' : 'students are'} absent today.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <ScrollArea className="max-h-[60vh]">
                                                                <div className="space-y-4 pr-4">
                                                                    {selectedClassForAbsent?.absentStudents.map(student => (
                                                                        <div key={student.studentId} className="flex items-center gap-3">
                                                                            <GradientAvatar name={student.name} size="sm" />
                                                                            <div>
                                                                                <p className="font-bold text-sm text-slate-800">{student.name}</p>
                                                                                <p className="text-xs text-slate-500">{student.studentId}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </ScrollArea>
                                                        </DialogContent>
                                                    </Dialog>
                                                </CardContent>
                                            </Card>
                                        </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === 'students' && (
                            <Card>
                                <CardHeader className="flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-heading-md">Student List</CardTitle>
                                        <CardDescription>A list of all active students currently enrolled.</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        {students.some(s => s.parentName) && (
                                            <Button variant="outline" onClick={() => setIsMigrationModalOpen(true)}>
                                                Migrate Parent Data
                                            </Button>
                                        )}
                                        <Button onClick={() => setIsAddStudentDialogOpen(true)}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add New Student
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? (
                                        <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[60px]">Photo</TableHead>
                                                    <TableHead>Student</TableHead>
                                                    <TableHead>Class Level</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Array.from({ length: 3 }).map((_, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                                                        <TableCell><div className="space-y-2"><Skeleton className="h-4 w-[250px]" /><Skeleton className="h-4 w-[200px]" /></div></TableCell>
                                                        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                                        <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        </div>
                                    ) : students.length === 0 ? (
                                        <div className="flex flex-col items-center pb-8">
                                            <EmptyState 
                                                title="No Active Students Found" 
                                                description="Get started by adding your first student to the portal." 
                                            />
                                            <Button className="mt-2" onClick={() => setIsAddStudentDialogOpen(true)}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Student
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-4 relative">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    type="search"
                                                    placeholder="Search by name or student ID..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-8 w-full"
                                                />
                                            </div>
                                            <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[60px]">Photo</TableHead>
                                                        <TableHead>Student</TableHead>
                                                        <TableHead>Class Level</TableHead>
                                                        <TableHead className="text-center">Fee Exemption</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredStudents.map((student) => (
                                                        <TableRow key={student.studentId}>
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    {(() => {
                                                                        const normalizeStr = (str?: string | null) => str ? str.trim().toLowerCase() : '';
                                                                        const pId = normalizeStr(student.parentPhone) || normalizeStr(student.parentId) || normalizeStr(student.parentName);
                                                                        const hasSiblings = pId ? students.filter(s => {
                                                                            const spId = normalizeStr(s.parentPhone) || normalizeStr(s.parentId) || normalizeStr(s.parentName);
                                                                            return spId === pId && s.studentId !== student.studentId;
                                                                        }).length > 0 : false;

                                                                        if (hasSiblings) {
                                                                            return (
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        <button 
                                                                                            onClick={() => {
                                                                                                setSelectedFamilyStudent(student);
                                                                                                setIsFamilyOverviewModalOpen(true);
                                                                                            }} 
                                                                                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                                                                                        >
                                                                                            <Users className="w-5 h-5" />
                                                                                        </button>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent><p>View Family Ledger</p></TooltipContent>
                                                                                </Tooltip>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <button 
                                                                                        onClick={() => {
                                                                                            setSelectedFamilyStudent(student);
                                                                                            setIsFamilyOverviewModalOpen(true);
                                                                                        }} 
                                                                                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                                                                                    >
                                                                                        <User className="w-5 h-5" />
                                                                                    </button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent><p>View Quick Ledger</p></TooltipContent>
                                                                            </Tooltip>
                                                                        );
                                                                    })()}
                                                                    <GradientAvatar name={student.name} src={student.profilePicture} size="md" />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <StudentInfoTrigger student={student} onClick={() => handleOpenViewDialog(student)} />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Click to view student information</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TableCell>
                                                            <TableCell>{student.className}</TableCell>
                                                            <TableCell className="text-center">
                                                                <Checkbox 
                                                                    checked={!!student.feeExemption}
                                                                    onCheckedChange={async (checked) => {
                                                                        if (!db || !storage || !auth || !student.id) return;
                                                                        try {
                                                                            await updateStudentDetails(db, storage, auth, student.id, { feeExemption: !!checked }, null, schoolId || undefined);
                                                                            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, feeExemption: !!checked } : s));
                                                                            toast({
                                                                                title: checked ? 'Exemption Granted' : 'Exemption Removed',
                                                                                description: `Fee exemption has been ${checked ? 'granted to' : 'removed from'} ${student.name}.`,
                                                                            });
                                                                        } catch (error) {
                                                                            toast({ title: 'Error', description: 'Failed to update fee exemption status.', variant: 'destructive' });
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    size="icon" 
                                                                                    className={cn("h-8 w-8", student.muteReminders ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-slate-400 hover:text-primary")}
                                                                                    onClick={() => handleToggleMuteReminders(student)}
                                                                                >
                                                                                    {student.muteReminders ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>{student.muteReminders ? "Reminders Muted - Click to restore" : "Reminders Active - Click to mute"}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>

                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            <DropdownMenuItem onClick={() => handleOpenViewDialog(student)}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => handleOpenEditDialog(student)}><Edit className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => handleSelectStudentForFeeds(student.studentId)}><Wallet className="mr-2 h-4 w-4"/> Manage All Fees</DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => { setSelectedStudentId(student.studentId); setIsGenerateTermBillsModalOpen(true); }}><Printer className="mr-2 h-4 w-4" /> Print Term Bill</DropdownMenuItem>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem 
                                                                                onClick={() => handleToggleMuteReminders(student)}
                                                                                className={student.muteReminders ? "text-primary" : "text-amber-600"}
                                                                            >
                                                                                {student.muteReminders ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
                                                                                {student.muteReminders ? "Enable Reminders" : "Mute Reminders"}
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleArchiveStudent(student)}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            </div>
                                            {filteredStudents.length === 0 && (
                                                <div className="text-center py-12 px-4">
                                                    <p className="text-muted-foreground">No students match your search.</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === 'fees' && (
                            <div className="space-y-6">
                                {/* Shared Filter Bar */}
                                <div className="sticky top-0 z-10 flex flex-col lg:flex-row items-center justify-between gap-4 bg-card border border-primary/10 p-4 rounded-2xl shadow-sm transition-all">
                                    <div className="flex items-center gap-4 w-full lg:w-auto">
                                        <div className="p-2.5 bg-primary/10 rounded-xl">
                                            <Receipt className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex flex-col">
                                            <h2 className="text-xl font-bold text-primary leading-tight">
                                                {feesActiveSubTab === 'daily' 
                                                    ? (selectedStudent ? 'Daily Collection History' : 'Daily Collections') 
                                                    : 'Core School Fees'}
                                            </h2>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Fees Management</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                                        {feesActiveSubTab === 'main' && (
                                            <Button 
                                                variant="outline" 
                                                onClick={() => setIsBulkReminderModalOpen(true)}
                                                className="h-10 px-4 rounded-xl font-bold gap-2 border-primary/20 text-primary text-xs"
                                            >
                                                <Bell className="w-4 h-4" /> <span>Send Reminders</span>
                                            </Button>
                                        )}
                                        {feesActiveSubTab === 'daily' && (
                                            <Button
                                                onClick={() => setIsParentBulkModalOpen(true)}
                                                className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all"
                                            >
                                                <Users className="w-4 h-4" />
                                                Parent Pay
                                            </Button>
                                        )}
                                        {feesActiveSubTab === 'main' && (
                                            <Button
                                                onClick={() => setIsParentBulkMainModalOpen(true)}
                                                className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all"
                                            >
                                                <Users className="w-4 h-4" />
                                                Parent Pay
                                            </Button>
                                        )}
                                        <Select value={selectedClassForFees} onValueChange={(val) => {
                                            setSelectedClassForFees(val);
                                            setSelectedStudentId(null);
                                            setBulkDailyPaymentsSelection({});
                                        }}>
                                            <SelectTrigger className="w-full md:w-[160px] h-10 rounded-xl border-primary/20 hover:bg-primary/5 transition-all font-bold text-xs">
                                                <SelectValue placeholder="All Classes" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                                <SelectItem value="all" className="font-bold">All Classes</SelectItem>
                                                {uniqueClassNames.map(c => (
                                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                         {selectedClassForFees !== 'all' && feesActiveSubTab === 'main' && (
                                            <>
                                                <Button 
                                                    onClick={handleOpenBulkFee}
                                                    className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-lg shadow-primary/20 flex items-center gap-2 group transition-all"
                                                >
                                                    <FilePlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                    Bulk Fee
                                                </Button>
                                                
                                                <Button 
                                                    onClick={() => setIsGenerateTermBillsModalOpen(true)}
                                                    className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-2 group transition-all"
                                                >
                                                    <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                    Print Term Bills
                                                </Button>

                                                <Button
                                                    onClick={() => setFeesActiveSubTab('daily')}
                                                    className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 group transition-all"
                                                >
                                                    <CalendarIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                    Daily Collections
                                                </Button>
                                            </>
                                        )}

                                        {selectedClassForFees !== 'all' && feesActiveSubTab === 'daily' && (
                                            <Button 
                                                onClick={() => setBulkDailyRatesModalOpen(true)}
                                                className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-lg shadow-primary/20 flex items-center gap-2 group transition-all"
                                            >
                                                <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                Bulk Set Rates
                                            </Button>
                                        )}

                                        <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className="w-full md:w-[240px] justify-between h-10 rounded-xl border-primary/20 hover:bg-primary/5 transition-all"
                                                >
                                                    <span className="truncate font-bold text-xs">
                                                        {selectedStudentId
                                                            ? students.find((s) => s.studentId === selectedStudentId)?.name
                                                            : "Search Student..."}
                                                    </span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[calc(100vw-2rem)] md:w-[320px] p-0 border-none shadow-2xl rounded-2xl overflow-hidden" align="end">
                                                <Command className="bg-white" value={comboboxValue} onValueChange={setComboboxValue}>
                                                    <CommandInput placeholder="Search student..." className="h-12" />
                                                    <CommandList className="max-h-[300px]">
                                                        <CommandEmpty>No student found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {filteredStudentsForFees.map((s) => (
                                                                <CommandItem
                                                                    key={s.studentId}
                                                                    id={`student-item-${s.studentId}`}
                                                                    value={`${s.name} ${s.studentId}`}
                                                                    onSelect={() => {
                                                                        setSelectedStudentId(s.studentId);
                                                                        setIsComboboxOpen(false);
                                                                    }}
                                                                    className="flex items-center justify-between py-3 px-4 cursor-pointer"
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-sm">{s.name}</span>
                                                                        <span className="text-muted-foreground text-[10px]">ID: {s.studentId}</span>
                                                                    </div>
                                                                    <Badge variant="secondary" className="text-[9px]">{s.className}</Badge>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>

                                        {selectedStudent && (
                                            <div className="flex gap-2">
                                                <Button 
                                                    onClick={() => handleOpenTransactionModal('payment')}
                                                    className="h-10 px-4 rounded-xl font-bold gap-2 shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                                >
                                                    <Banknote className="w-4 h-4" /> <span>Record Payment</span>
                                                </Button>
                                                {feesActiveSubTab === 'main' && (
                                                    <Button 
                                                        onClick={() => handleOpenTransactionModal('fee')}
                                                        variant="outline"
                                                        className="h-10 px-4 rounded-xl font-bold gap-2 border-primary/20 hover:bg-primary/5 text-primary text-xs"
                                                    >
                                                        <FilePlus className="w-4 h-4" /> <span>Charge Fee</span>
                                                    </Button>
                                                )}
                                                {feesActiveSubTab === 'main' && (!selectedStudent.ledger || selectedStudent.ledger.filter(t => !t.isVoided).length === 0) && (
                                                    <Button 
                                                        onClick={() => setIsAdmissionBillModalOpen(true)}
                                                        variant="outline"
                                                        className="h-10 px-4 rounded-xl font-bold gap-2 border-amber-500/30 hover:bg-amber-50 text-amber-700 text-xs"
                                                    >
                                                        <FileText className="w-4 h-4" /> <span>Load Admission Bill</span>
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                </div>
                                </div>

                                {feesActiveSubTab === 'main' && (
                                    <div className="space-y-6 outline-none animate-in fade-in-50 duration-300">
                                    {selectedStudent && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="flex items-center justify-between p-5 bg-blue-50/50 border-4 border-blue-500 rounded-2xl shadow-md transition-all hover:shadow-lg">
                                                <div>
                                                    <p className="text-label-caps text-blue-600/80 mb-0.5">Total Fees</p>
                                                    <p className="text-xl font-bold text-blue-900 text-numeric">GH¢{(ledgerTotals.billed || 0).toFixed(2)}</p>
                                                </div>
                                                <TrendingDown className="w-8 h-8 text-blue-500/30" />
                                            </div>
                                            
                                            {feesActiveSubTab === 'main' && academicPeriods.find(p => p.id === selectedPeriodId)?.installmentPlan?.length ? (
                                                <div className={cn(
                                                    "flex items-center justify-between p-5 border-4 rounded-2xl shadow-md transition-all hover:shadow-lg",
                                                    ledgerTotals.installmentBalance > 0 ? "bg-amber-50 border-amber-500" : "bg-emerald-50 border-emerald-500"
                                                )}>
                                                    <div>
                                                        <p className={cn(
                                                            "text-[10px] font-black uppercase tracking-widest mb-0.5",
                                                            ledgerTotals.installmentBalance > 0 ? "text-amber-600/80" : "text-emerald-600/80"
                                                        )}>Expected by Now</p>
                                                        <p className={cn(
                                                            "text-xl font-bold text-numeric",
                                                            ledgerTotals.installmentBalance > 0 ? "text-amber-900" : "text-emerald-900"
                                                        )}>GH¢{(ledgerTotals.expected || 0).toFixed(2)}</p>
                                                        {ledgerTotals.installmentBalance > 0 && (
                                                            <p className="text-[10px] text-amber-700 font-bold mt-1">Shortfall: GH¢{ledgerTotals.installmentBalance.toFixed(2)}</p>
                                                        )}
                                                    </div>
                                                    <CalendarDays className={cn(
                                                        "w-8 h-8",
                                                        ledgerTotals.installmentBalance > 0 ? "text-amber-500/30" : "text-emerald-500/30"
                                                    )} />
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between p-5 bg-emerald-50/50 border-4 border-emerald-500 rounded-2xl shadow-md transition-all hover:shadow-lg">
                                                    <div>
                                                        <p className="text-label-caps text-emerald-600/80 mb-0.5">Total Paid</p>
                                                        <p className="text-xl font-bold text-emerald-900 text-numeric">GH¢{(ledgerTotals.paid || 0).toFixed(2)}</p>
                                                    </div>
                                                    <Banknote className="w-8 h-8 text-emerald-500/30" />
                                                </div>
                                            )}

                                            <div className={cn(
                                                "flex items-center justify-between p-5 border-4 rounded-2xl shadow-md transition-all hover:shadow-lg",
                                                ledgerTotals.balance > 0 ? "bg-red-50 border-red-500" : "bg-emerald-50 border-emerald-500"
                                            )}>
                                                <div>
                                                    <p className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest mb-0.5",
                                                        ledgerTotals.balance > 0 ? "text-red-600/80" : "text-emerald-600/80"
                                                    )}>Total Balance</p>
                                                    <p className={cn(
                                                        "text-xl font-bold text-numeric",
                                                        ledgerTotals.balance > 0 ? "text-red-900" : "text-emerald-900"
                                                    )}>GH¢{(ledgerTotals.balance || 0).toFixed(2)}</p>
                                                </div>
                                                <Wallet className={cn(
                                                    "w-8 h-8",
                                                    ledgerTotals.balance > 0 ? "text-red-500/30" : "text-emerald-500/30"
                                                )} />
                                            </div>
                                        </div>
                                    )}

                                    {!selectedStudent ? (
                                        <div className="space-y-6">
                                            {selectedClassForFees !== 'all' ? (
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight">
                                                                Class: {selectedClassForFees}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground font-medium">{filteredStudentsForFees.length} children found</span>
                                                        </div>
                                                        <Button variant="ghost" size="sm" onClick={() => setSelectedClassForFees('all')} className="text-xs font-bold text-primary hover:bg-primary/5 h-8">
                                                            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Clear Filter
                                                        </Button>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                        {filteredStudentsForFees.map(student => (
                                                            <Card 
                                                                key={student.studentId} 
                                                                className="border-primary/10 hover:border-primary/30 transition-all cursor-pointer group bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md rounded-2xl overflow-hidden" 
                                                                onClick={() => setSelectedStudentId(student.studentId)}
                                                            >
                                                                <CardContent className="p-4 flex items-center gap-4">
                                                                    <GradientAvatar name={student.name} src={student.profilePicture} size="md" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{student.name}</p>
                                                                        <p className="text-[10px] text-muted-foreground truncate uppercase text-numeric tracking-tighter">ID: {student.studentId}</p>
                                                                    </div>
                                                                    <div className="p-2 rounded-xl bg-primary/5 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                                        <Wallet className="h-4 w-4" />
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-32 border border-dashed rounded-[2rem] bg-muted/5 shadow-inner">
                                                    <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                                                        <Search className="w-8 h-8 text-primary/40" />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-muted-foreground">Select a class or student</h3>
                                                    <p className="text-xs text-muted-foreground/60 max-w-[250px] text-center mt-2 font-medium">Choose a class to see all children, or search by name to record fees.</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-6 pt-4">
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-4">
                                                    {selectedClassForFees !== 'all' && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => setSelectedStudentId(null)}
                                                            className="h-8 px-2 text-primary font-bold hover:bg-primary/5"
                                                        >
                                                            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                                                        </Button>
                                                    )}
                                                    <h3 className="text-label-caps">
                                                        <FileText className="w-4 h-4" /> Transaction History
                                                    </h3>
                                                </div>
                                                {!selectedStudent.ledger && (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-8 text-[10px] font-black uppercase border-primary/30 hover:bg-primary hover:text-primary-foreground"
                                                        onClick={handleRefreshLedger}
                                                    >
                                                        <DatabaseZap className="w-3 h-3 mr-1.5" /> Refresh Ledger
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            {(() => {
                                                const isDailySubTab = (feesActiveSubTab as string) === 'daily';
                                                
                                                const filteredLedger = (selectedStudent.ledger || []).filter(t => {
                                                    const isDaily = isDailyTransaction(t, allFeeCategories);
                                                    return isDailySubTab ? isDaily : !isDaily;
                                                });
                                                
                                                const sortedPeriods = [...academicPeriods].reverse();
                                                const currentPeriodIndex = sortedPeriods.findIndex(p => p.id === selectedPeriodId);
                                                
                                                const prevTransactions = filteredLedger.filter(t => {
                                                    if (!t.periodId) return false;
                                                    const tPeriodIndex = sortedPeriods.findIndex(p => p.id === t.periodId);
                                                    return tPeriodIndex < currentPeriodIndex && t.periodId !== selectedPeriodId;
                                                });
                                                
                                                const balanceBF = prevTransactions.reduce((sum, t) => sum + (t.isVoided ? 0 : (Number(t.debit) || 0) - (Number(t.credit) || 0)), 0);
                                                const currentLedger = filteredLedger.filter(t => !selectedPeriodId || t.periodId === selectedPeriodId);
                                                
                                                const displayLedger = balanceBF !== 0 ? [
                                                    {
                                                        id: 'BF',
                                                        date: 'Opening',
                                                        description: `Balance Brought Forward (${isDailySubTab ? 'Daily Recurring Fees' : 'Core Fees'})`,
                                                        category: 'general',
                                                        debit: balanceBF > 0 ? balanceBF : 0,
                                                        credit: balanceBF < 0 ? Math.abs(balanceBF) : 0,
                                                        isVoided: false,
                                                        type: 'adjustment'
                                                    } as any,
                                                    ...currentLedger
                                                ] : currentLedger;

                                                return (
                                                    <LedgerTable 
                                                        ledger={displayLedger} 
                                                        onVoid={(id) => {
                                                            if (id === 'BF') return;
                                                            handleVoidTransaction(id);
                                                        }}
                                                        onEdit={handleOpenEditTransaction}
                                                        generateReceipt={generateReceipt}
                                                        schoolDetails={schoolDetails}
                                                        student={selectedStudent}
                                                        academicPeriods={academicPeriods}
                                                        feeCategories={allFeeCategories}
                                                    />
                                                );
                                            })()}
                                        </div>
                                    )}
                                    </div>
                                )}

                                {feesActiveSubTab === 'daily' && (
                                    <div className="space-y-6 outline-none animate-in fade-in-50 duration-300">
                                        {selectedStudent ? (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="flex items-center justify-between p-5 bg-blue-50/50 border-4 border-blue-500 rounded-2xl shadow-md transition-all hover:shadow-lg">
                                                        <div>
                                                            <p className="text-label-caps text-blue-600/80 mb-0.5">Total Spent (Attendance)</p>
                                                            <p className="text-xl font-bold text-blue-900 text-numeric">GH¢{(ledgerTotals.billed || 0).toFixed(2)}</p>
                                                        </div>
                                                        <TrendingDown className="w-8 h-8 text-blue-500/30" />
                                                    </div>
                                                    <div className="flex items-center justify-between p-5 bg-emerald-50/50 border-4 border-emerald-500 rounded-2xl shadow-md transition-all hover:shadow-lg">
                                                        <div>
                                                            <p className="text-label-caps text-emerald-600/80 mb-0.5">Total Top-ups</p>
                                                            <p className="text-xl font-bold text-emerald-900 text-numeric">GH¢{(ledgerTotals.paid || 0).toFixed(2)}</p>
                                                        </div>
                                                        <Banknote className="w-8 h-8 text-emerald-500/30" />
                                                    </div>
                                                    <div className={cn(
                                                        "flex items-center justify-between p-5 border-4 rounded-2xl shadow-md transition-all hover:shadow-lg",
                                                        ledgerTotals.balance < 0 ? "bg-red-50 border-red-500" : "bg-emerald-50 border-emerald-500"
                                                    )}>
                                                        <div>
                                                            <p className={cn(
                                                                "text-[10px] font-black uppercase tracking-widest mb-0.5",
                                                                ledgerTotals.balance < 0 ? "text-red-600/80" : "text-emerald-600/80"
                                                            )}>Wallet Balance</p>
                                                            <p className={cn(
                                                                "text-xl font-bold text-numeric",
                                                                ledgerTotals.balance < 0 ? "text-red-900" : "text-emerald-900"
                                                            )}>GH¢{(ledgerTotals.balance || 0).toFixed(2)}</p>
                                                            <p className="text-[10px] font-bold opacity-70">
                                                                {ledgerTotals.balance >= 0 ? "Prepaid Credit" : "Outstanding Arrears"}
                                                            </p>
                                                        </div>
                                                        <Wallet className={cn(
                                                            "w-8 h-8",
                                                            ledgerTotals.balance < 0 ? "text-red-500/30" : "text-emerald-500/30"
                                                        )} />
                                                    </div>
                                                </div>

                                                <div className="space-y-6 pt-4">
                                                    <div className="flex items-center justify-between px-1">
                                                        <div className="flex items-center gap-4">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => setSelectedStudentId(null)}
                                                                className="h-8 px-2 text-primary font-bold hover:bg-primary/5"
                                                            >
                                                                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Daily Collections
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    
                                                    {(() => {
                                                        const filteredLedger = (selectedStudent.ledger || []).filter(t => {
                                                            return isDailyTransaction(t, allFeeCategories);
                                                        });
                                                        
                                                        const sortedPeriods = [...academicPeriods].reverse();
                                                        const currentPeriodIndex = sortedPeriods.findIndex(p => p.id === selectedPeriodId);
                                                        
                                                        const prevTransactions = filteredLedger.filter(t => {
                                                            if (!t.periodId) return false;
                                                            const tPeriodIndex = sortedPeriods.findIndex(p => p.id === t.periodId);
                                                            return tPeriodIndex < currentPeriodIndex && t.periodId !== selectedPeriodId;
                                                        });
                                                        
                                                        let balanceBF = prevTransactions.reduce((sum, t) => {
                                                            if (t.isVoided) return sum;
                                                            const isAutomated = t.id && (t.id.startsWith('auto-df-') || t.id.startsWith('auto-feeding-') || t.id.startsWith('feeding-') || t.id.startsWith('mig-df-') || t.id.startsWith('mig-fa-'));
                                                            return sum + (isAutomated ? 0 : (Number(t.debit) || 0)) - (Number(t.credit) || 0);
                                                        }, 0);

                                                        const prevAttendance = (selectedStudent.attendance || []).filter(a => {
                                                            if (!a.attended || !a.periodId || a.periodId === selectedPeriodId) return false;
                                                            const tPeriodIndex = sortedPeriods.findIndex(p => p.id === a.periodId);
                                                            return tPeriodIndex < currentPeriodIndex;
                                                        });
                                                        let prevAccruedInfo = 0;
                                                        allFeeCategories.filter(c => c.isDaily).forEach(cat => {
                                                            const studentRate = (selectedStudent.dailyFees || []).find(f => f.categoryId === cat.id || f.categoryId === cat.name)?.rate || 0;
                                                            prevAccruedInfo += prevAttendance.length * Number(studentRate);
                                                        });
                                                        balanceBF += prevAccruedInfo;

                                                        const currentLedger = filteredLedger.filter(t => !selectedPeriodId || t.periodId === selectedPeriodId);
                                                        
                                                        // Calculate attendance-based charges from dailyFeeSummary
                                                        const relevantSummaries = dailyFeeSummary.filter(s => s.studentId === (selectedStudent.id || selectedStudent.studentId));
                                                        const totalAttendanceCharges = relevantSummaries.reduce((sum, s) => sum + s.totalBilled, 0);
                                                        
                                                        // Calculate total wallet balance (Net of all history including current period)
                                                        const allPayments = filteredLedger.reduce((sum, t) => sum + (t.isVoided ? 0 : (Number(t.credit) || 0)), 0);
                                                        const allCharges = filteredLedger.reduce((sum, t) => {
                                                            if (t.isVoided) return sum;
                                                            const isAutomated = t.id && (t.id.startsWith('auto-df-') || t.id.startsWith('auto-feeding-') || t.id.startsWith('feeding-') || t.id.startsWith('mig-df-') || t.id.startsWith('mig-fa-'));
                                                            return sum + (isAutomated ? 0 : (Number(t.debit) || 0));
                                                        }, 0);
                                                        const walletBalance = allPayments - (allCharges + totalAttendanceCharges);

                                                        // Calculate summary totals for daily categories (Includes both ledger and attendance)
                                                        const summaryTotals = { ...relevantSummaries.reduce((acc, s) => {
                                                            acc[s.categoryName] = (acc[s.categoryName] || 0) + s.totalBilled;
                                                            return acc;
                                                        }, {} as Record<string, number>) };
                                                        
                                                        currentLedger.forEach(t => {
                                                            const isAutomated = t.id && (t.id.startsWith('auto-df-') || t.id.startsWith('auto-feeding-') || t.id.startsWith('feeding-') || t.id.startsWith('mig-df-') || t.id.startsWith('mig-fa-'));
                                                            if (t.isVoided || isAutomated || (Number(t.debit) || 0) <= 0) return;
                                                            const catId = t.categoryId || t.category;
                                                            const catObj = allFeeCategories.find(c => c.id === catId || c.name === catId);
                                                            const catName = catObj ? catObj.name : (t.category || 'Other');
                                                            summaryTotals[catName] = (summaryTotals[catName] || 0) + (Number(t.debit) || 0);
                                                        });

                                                        const cleanedCurrentLedger = currentLedger.filter(t => {
                                                            const isAutomated = t.id && (t.id.startsWith('auto-df-') || t.id.startsWith('auto-feeding-') || t.id.startsWith('feeding-') || t.id.startsWith('mig-df-') || t.id.startsWith('mig-fa-'));
                                                            return !isAutomated;
                                                        });

                                                        const currentAttendance = (selectedStudent.attendance || []).filter(a => {
                                                            return a.attended && (!selectedPeriodId || a.periodId === selectedPeriodId);
                                                        });
                                                        
                                                        const attendanceLedgerRows: any[] = [];
                                                        currentAttendance.forEach(a => {
                                                            allFeeCategories.filter(c => c.isDaily).forEach(cat => {
                                                                const studentRate = (selectedStudent.dailyFees || []).find(f => f.categoryId === cat.id || f.categoryId === cat.name)?.rate || 0;
                                                                if (Number(studentRate) > 0) {
                                                                    attendanceLedgerRows.push({
                                                                        id: `auto-att-${a.id || a.date}-${cat.id}`,
                                                                        date: a.date,
                                                                        description: `Daily Rate (${cat.name})`,
                                                                        category: cat.id,
                                                                        debit: Number(studentRate),
                                                                        credit: 0,
                                                                        isVoided: false,
                                                                        type: 'charge',
                                                                        isDaily: true
                                                                    });
                                                                }
                                                            });
                                                        });

                                                        const displayLedger = [
                                                            ...(balanceBF !== 0 ? [{
                                                                id: 'BF',
                                                                date: 'Opening',
                                                                description: 'Balance Brought Forward (Daily Recurring Fees)',
                                                                category: 'general',
                                                                debit: balanceBF > 0 ? balanceBF : 0,
                                                                credit: balanceBF < 0 ? Math.abs(balanceBF) : 0,
                                                                isVoided: false,
                                                                type: 'adjustment'
                                                            }] : []),
                                                            ...cleanedCurrentLedger,
                                                            ...attendanceLedgerRows
                                                        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) as any[];

                                                        return (
                                                            <div className="space-y-6">

                                                                <LedgerTable 
                                                                    ledger={displayLedger} 
                                                                    onVoid={(id) => {
                                                                        if (id === 'BF') return;
                                                                        handleVoidTransaction(id);
                                                                    }}
                                                                    onEdit={handleOpenEditTransaction}
                                                                    generateReceipt={generateReceipt}
                                                                    schoolDetails={schoolDetails}
                                                                    student={selectedStudent}
                                                                    academicPeriods={academicPeriods}
                                                                    feeCategories={allFeeCategories}
                                                                    hideDailyAmounts={true}
                                                                />
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                        <Card className="border border-primary/10 shadow-lg rounded-2xl overflow-hidden">
                                            <CardHeader className="bg-primary/5 border-b border-primary/10 py-4">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div>
                                                        <CardTitle className="text-heading-lg flex items-center gap-2">
                                                            <UtensilsCrossed className="w-6 h-6 text-primary" />
                                                            Daily Collections
                                                        </CardTitle>
                                                        <CardDescription className="font-medium">Track accumulated fees and record payments in bulk for selected records.</CardDescription>
                                                    </div>
                                                    
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-primary/10 shadow-sm">
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm"
                                                                        className="h-8 flex items-center gap-2 px-3 border-r border-primary/5 hover:bg-primary/5 rounded-none group"
                                                                    >
                                                                        <CalendarIcon className="w-3.5 h-3.5 text-primary/60 group-hover:text-primary transition-colors" />
                                                                        <span className="font-bold text-[11px] text-primary whitespace-nowrap">
                                                                            {selectedPaymentDate ? new Date(selectedPaymentDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Select Date'}
                                                                        </span>
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden bg-white z-[100]" align="start">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={selectedPaymentDate ? new Date(selectedPaymentDate + 'T00:00:00') : undefined}
                                                                        onSelect={(date) => date && setSelectedPaymentDate(date.toISOString().split('T')[0])}
                                                                        initialFocus
                                                                        className="rounded-2xl"
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                            <Button 
                                                                size="sm"
                                                                disabled={isSubmitting || Object.values(bulkDailyPaymentsSelection).filter(Boolean).length === 0}
                                                                onClick={handleRecordDailyPayments}
                                                                className="h-8 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-[10px] px-4 shadow-md shadow-primary/10 transition-all gap-2"
                                                            >
                                                                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                                Record {Object.values(bulkDailyPaymentsSelection).filter(Boolean).length} Payments
                                                            </Button>
                                                        </div>

                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button 
                                                                        variant="outline" 
                                                                        size="sm" 
                                                                        className="h-9 w-9 p-0 border-primary/10 bg-white hover:bg-primary/5 text-primary"
                                                                        onClick={handleSyncAllDailyFees}
                                                                        disabled={isLoading}
                                                                    >
                                                                        <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="bottom">
                                                                    <p className="font-bold">Sync & Fix Errors</p>
                                                                    <p className="text-xs">Reconciles attendance records with the ledger.</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        
                                                        <Badge variant="outline" className="bg-white font-black text-xs px-3 py-1.5 border-2 text-primary border-primary/20">
                                                            {filteredDailyFeeSummary.length} Records
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader className="bg-muted/30">
                                                            <TableRow>
                                                                <TableHead className="w-[100px] pl-6">
                                                                    <div className="flex items-center gap-2">
                                                                        <Checkbox 
                                                                            checked={(() => {
                                                                                const selectableRows = filteredDailyFeeSummary.filter(row => {
                                                                                    const student = students.find(s => s.studentId === row.studentId);
                                                                                    const isAlreadyPaid = student?.ledger?.some(t => 
                                                                                        !t.isVoided && 
                                                                                        t.date === selectedPaymentDate && 
                                                                                        (t.categoryId === row.categoryId || t.category === row.categoryId || t.category === row.categoryName) &&
                                                                                        (t.credit || 0) > 0
                                                                                    );
                                                                                    const isPresent = student?.attendance?.some(a => a.date === selectedPaymentDate && a.attended);
                                                                                    return !isAlreadyPaid && isPresent;
                                                                                });
                                                                                return selectableRows.length > 0 && selectableRows.every(row => bulkDailyPaymentsSelection[`${row.studentId}|${row.categoryId}`]);
                                                                            })()}
                                                                                onCheckedChange={(checked) => {
                                                                                    const newSelection = { ...bulkDailyPaymentsSelection };
                                                                                    filteredDailyFeeSummary.forEach(row => {
                                                                                        const student = students.find(s => s.studentId === row.studentId);
                                                                                        const isAlreadyPaid = student?.ledger?.some(t => 
                                                                                            !t.isVoided && 
                                                                                            t.date === selectedPaymentDate && 
                                                                                            (t.categoryId === row.categoryId || t.category === row.categoryId || t.category === row.categoryName) &&
                                                                                            (t.credit || 0) > 0
                                                                                        );
                                                                                        const isPresent = student?.attendance?.some(a => a.date === selectedPaymentDate && a.attended);

                                                                                        if (!isAlreadyPaid && isPresent) {
                                                                                            newSelection[`${row.studentId}|${row.categoryId}`] = !!checked;
                                                                                        }
                                                                                    });
                                                                                    setBulkDailyPaymentsSelection(newSelection);
                                                                                }}
                                                                            className="border-primary/30 data-[state=checked]:bg-primary"
                                                                        />
                                                                        <span className="font-bold text-primary uppercase text-[10px] tracking-widest cursor-pointer" onClick={() => {
                                                                            const isAllSelected = (() => {
                                                                                const selectableRows = filteredDailyFeeSummary.filter(row => {
                                                                                    const student = students.find(s => s.studentId === row.studentId);
                                                                                    const isAlreadyPaid = student?.ledger?.some(t => 
                                                                                        !t.isVoided && 
                                                                                        t.date === selectedPaymentDate && 
                                                                                        (t.categoryId === row.categoryId || t.category === row.categoryId || t.category === row.categoryName) &&
                                                                                        (t.credit || 0) > 0
                                                                                    );
                                                                                    const isPresent = student?.attendance?.some(a => a.date === selectedPaymentDate && a.attended);
                                                                                    return !isAlreadyPaid && isPresent;
                                                                                });
                                                                                return selectableRows.length > 0 && selectableRows.every(row => bulkDailyPaymentsSelection[`${row.studentId}|${row.categoryId}`]);
                                                                            })();
                                                                            
                                                                            const newSelection = { ...bulkDailyPaymentsSelection };
                                                                            filteredDailyFeeSummary.forEach(row => {
                                                                                const student = students.find(s => s.studentId === row.studentId);
                                                                                const isAlreadyPaid = student?.ledger?.some(t => 
                                                                                    !t.isVoided && 
                                                                                    t.date === selectedPaymentDate && 
                                                                                    (t.categoryId === row.categoryId || t.category === row.categoryId || t.category === row.categoryName) &&
                                                                                    (t.credit || 0) > 0
                                                                                );
                                                                                const isPresent = student?.attendance?.some(a => a.date === selectedPaymentDate && a.attended);

                                                                                if (!isAlreadyPaid && isPresent) {
                                                                                    newSelection[`${row.studentId}|${row.categoryId}`] = !isAllSelected;
                                                                                }
                                                                            });
                                                                            setBulkDailyPaymentsSelection(newSelection);
                                                                        }}>ALL</span>
                                                                    </div>
                                                                </TableHead>
                                                                <TableHead className="font-bold text-primary uppercase text-[10px] tracking-widest">Student Name</TableHead>
                                                                <TableHead className="font-bold text-primary uppercase text-[10px] tracking-widest">Status</TableHead>
                                                                <TableHead className="font-bold text-primary uppercase text-[10px] tracking-widest text-right">Credit Balance</TableHead>
                                                                <TableHead className="text-right font-bold text-primary uppercase text-[10px] tracking-widest pr-6">Actions</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {filteredDailyFeeSummary.length > 0 ? (
                                                                filteredDailyFeeSummary.map((row, idx) => {
                                                                    const selectionKey = `${row.studentId}|${row.categoryId}`;
                                                                    const isSelected = !!bulkDailyPaymentsSelection[selectionKey];
                                                                    
                                                                    return (
                                                                        <TableRow key={`${row.studentName}-${row.categoryName}-${idx}`} className={cn("hover:bg-primary/5 transition-all duration-200 border-primary/5 h-20", isSelected && "bg-primary/[0.04] shadow-inner")}>
                                                                            <TableCell className="pl-6">
                                                                                {(() => {
                                                                                    const student = students.find(s => s.studentId === row.studentId);
                                                                                    const isAlreadyPaid = student?.ledger?.some(t => 
                                                                                        !t.isVoided && 
                                                                                        t.date === selectedPaymentDate && 
                                                                                        (t.categoryId === row.categoryId || t.category === row.categoryId || t.category === row.categoryName) &&
                                                                                        (t.credit || 0) > 0
                                                                                    );
                                                                                    const isPresent = student?.attendance?.some(a => a.date === selectedPaymentDate && a.attended);
                                                                                    const isDisabled = isAlreadyPaid || !isPresent;

                                                                                    return (
                                                                                        <TooltipProvider>
                                                                                            <Tooltip>
                                                                                                <TooltipTrigger asChild>
                                                                                                    <div className="flex items-center justify-center">
                                                                                                        <Checkbox 
                                                                                                            checked={isSelected || isAlreadyPaid}
                                                                                                            disabled={isDisabled}
                                                                                                            onCheckedChange={(checked) => {
                                                                                                                setBulkDailyPaymentsSelection(prev => ({
                                                                                                                    ...prev,
                                                                                                                    [selectionKey]: !!checked
                                                                                                                }));
                                                                                                            }}
                                                                                                            className={cn(
                                                                                                                "border-primary/30 data-[state=checked]:bg-primary transition-opacity",
                                                                                                                isDisabled && "opacity-50 cursor-not-allowed"
                                                                                                            )}
                                                                                                        />
                                                                                                    </div>
                                                                                                </TooltipTrigger>
                                                                                                {isAlreadyPaid ? (
                                                                                                    <TooltipContent side="right" className="bg-emerald-600 text-white font-bold border-none shadow-lg">
                                                                                                        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                                                                                                            <CheckCheck className="w-3 h-3" /> Paid for {new Date(selectedPaymentDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                                                                        </p>
                                                                                                    </TooltipContent>
                                                                                                ) : !isPresent ? (
                                                                                                    <TooltipContent side="right" className="bg-amber-600 text-white font-bold border-none shadow-lg">
                                                                                                        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                                                                                                            <XCircle className="w-3 h-3" /> Not present on {new Date(selectedPaymentDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                                                                        </p>
                                                                                                    </TooltipContent>
                                                                                                ) : null}
                                                                                            </Tooltip>
                                                                                        </TooltipProvider>
                                                                                    );
                                                                                })()}
                                                                            </TableCell>
                                                                            <TableCell className="font-bold text-sm whitespace-nowrap">
                                                                                <div className="flex items-center gap-3">
                                                                                    <GradientAvatar name={row.studentName} src={row.profilePicture} size="md" />
                                                                                    <div className="flex flex-col">
                                                                                        <span>{row.studentName}</span>
                                                                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{row.categoryName}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <Badge 
                                                                                    variant={row.status === 'Paid' ? 'secondary' : row.status === 'Partially Paid' ? 'secondary' : 'outline'}
                                                                                    className={cn(
                                                                                        "text-[10px] px-2 py-0 h-5 font-bold uppercase tracking-tighter",
                                                                                        row.status === 'Paid' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                                                                                        row.status === 'Partially Paid' ? "bg-amber-50 text-amber-700 border-amber-200" : 
                                                                                        "bg-red-50 text-red-700 border-red-200"
                                                                                    )}
                                                                                >
                                                                                    {row.status}
                                                                                </Badge>
                                                                            </TableCell>
                                                                            <TableCell className={`text-right font-black text-sm text-numeric ${row.balance >= 0 ? 'text-emerald-700' : 'text-destructive'}`}>
                                                                                GH¢{row.balance.toFixed(2)}
                                                                            </TableCell>
                                                                            <TableCell className="text-right pr-6">
                                                                                <div className="flex items-center justify-end">
                                                                                    <DropdownMenu>
                                                                                        <DropdownMenuTrigger asChild>
                                                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10">
                                                                                                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                                                                            </Button>
                                                                                        </DropdownMenuTrigger>
                                                                                        <DropdownMenuContent align="end" className="w-56 rounded-xl border-none shadow-2xl p-2">
                                                                                            <div className="px-3 py-2.5 mb-1 bg-muted/40 rounded-lg">
                                                                                                <p className="text-[11px] font-black uppercase text-muted-foreground tracking-widest mb-1.5 border-b border-primary/5 pb-1">Fee Details</p>
                                                                                                <div className="grid grid-cols-2 gap-y-1.5">
                                                                                                    <span className="text-xs text-muted-foreground font-medium">Daily Rate:</span>
                                                                                                    <span className="text-xs font-bold text-right">GH¢{row.dailyRate.toFixed(2)}</span>
                                                                                                    <span className="text-xs text-muted-foreground font-medium">Days Present:</span>
                                                                                                    <span className="text-xs font-bold text-right">{row.daysPresent} days</span>
                                                                                                    <span className="text-xs text-muted-foreground font-medium">Total Spent:</span>
                                                                                                    <span className="text-xs font-bold text-right text-rose-600">GH¢{row.totalBilled.toFixed(2)}</span>
                                                                                                    <span className="text-xs text-muted-foreground font-medium">Total Top-ups:</span>
                                                                                                    <span className="text-xs font-bold text-right text-emerald-600">GH¢{row.totalPaid.toFixed(2)}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                            <DropdownMenuSeparator className="bg-primary/5 mx-0" />
                                                                                            <DropdownMenuItem 
                                                                                                onSelect={(e) => {
                                                                                                    e.preventDefault();
                                                                                                    setEditingRateId(selectionKey);
                                                                                                    setEditingRateValue(row.dailyRate.toString());
                                                                                                }}
                                                                                                className="font-bold text-xs uppercase text-primary focus:text-primary focus:bg-primary/5 cursor-pointer py-3 rounded-lg"
                                                                                            >
                                                                                                <Pencil className="w-4 h-4 mr-2" /> Change Rate
                                                                                            </DropdownMenuItem>
                                                                                            <DropdownMenuItem 
                                                                                                onClick={() => handleOpenQuickDailyPayment(row.studentId, row.categoryName)}
                                                                                                className="font-bold text-xs uppercase text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 cursor-pointer py-2.5"
                                                                                            >
                                                                                                <PlusCircle className="w-4 h-4 mr-2" /> Pay Now
                                                                                            </DropdownMenuItem>
                                                                                            <DropdownMenuSeparator className="bg-primary/5" />
                                                                                            <DropdownMenuItem 
                                                                                                onClick={() => setCategoryToClear({studentId: row.studentId, categoryId: row.categoryId, categoryName: row.categoryName, docId: row.docId})}
                                                                                                className="font-bold text-xs uppercase text-destructive focus:text-destructive focus:bg-red-50 cursor-pointer py-2.5"
                                                                                            >
                                                                                                <Trash2 className="w-4 h-4 mr-2" /> Clear Records
                                                                                            </DropdownMenuItem>
                                                                                        </DropdownMenuContent>
                                                                                    </DropdownMenu>
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    );
                                                                })
                                                            ) : (
                                                                <TableRow>
                                                                    <TableCell colSpan={5} className="h-64 text-center">
                                                                        <div className="flex flex-col items-center justify-center opacity-40">
                                                                            <Users className="w-12 h-12 mb-4" />
                                                                            <p className="font-bold">No daily recurring fee records found for this period.</p>
                                                                            <p className="text-xs">Ensure attendance has been marked and daily rates are set for students.</p>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {userRole === 'admin' && activeTab === 'attendance' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-heading-md">Daily Attendance</CardTitle>
                                    <CardDescription>Mark student attendance for {selectedAttendanceDateFormatted}.</CardDescription>
                                    <div className="pt-4 max-w-sm space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Attendance Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start text-left h-10 rounded-xl border-primary/20 hover:bg-primary/5 transition-all font-bold text-xs"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                                    {selectedAttendanceDateFormatted}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={selectedAttendanceDate ? new Date(selectedAttendanceDate + 'T00:00:00') : undefined}
                                                    onSelect={(date) => date && setSelectedAttendanceDate(date.toISOString().split('T')[0])}
                                                    initialFocus
                                                    className="rounded-2xl"
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? (
                                        <div className="space-y-4">
                                            <Skeleton className="h-8 w-1/4" />
                                            <Skeleton className="h-24 w-full" />
                                            <Skeleton className="h-8 w-1/4" />
                                            <Skeleton className="h-24 w-full" />
                                        </div>
                                    ) : Object.keys(studentsByClass).length === 0 ? (
                                         <div className="text-center py-12 px-4">
                                            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                                            <h3 className="mt-4 text-lg font-medium">No Students Found</h3>
                                            <p className="mt-1 text-sm text-muted-foreground">There are no students in the system.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {Object.keys(studentsByClass).sort().map(className => (
                                                <div key={className}>
                                                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">{className}</h2>
                                                    <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Student Name</TableHead>
                                                                <TableHead>Student ID</TableHead>
                                                                <TableHead className="text-center w-[120px]">Present</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {studentsByClass[className].map(student => {
                                                                const attendanceRecord = student.attendance?.find(a => a.date === selectedAttendanceDate);
                                                                const isAttended = !!attendanceRecord?.attended;
                                                                const studentIsSubmitting = isAttendanceSubmitting[student.studentId];
                                                                return (
                                                                    <TableRow key={student.studentId}>
                                                                        <TableCell className="font-medium">{student.name}</TableCell>
                                                                        <TableCell>{student.studentId}</TableCell>
                                                                        <TableCell className="text-center">
                                                                            {studentIsSubmitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> :
                                                                            <Checkbox
                                                                                id={`att-${student.studentId}`}
                                                                                checked={isAttended}
                                                                                onCheckedChange={(checked) => handleToggleAttendance(student.studentId, !!checked)}
                                                                                className="h-5 w-5"
                                                                            />}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === 'finances' && (
                             <Card>
                                <CardHeader>
                                    <CardTitle className="text-heading-md flex items-center gap-2"><Wallet className="w-6 h-6"/> Financial Management</CardTitle>
                                    <CardDescription>Track school income, expenditures, and liabilities.</CardDescription>
                                </CardHeader>
                                 <CardContent>
                                    <Tabs defaultValue="summary" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-9 h-auto gap-2 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/60">
                                            <TabsTrigger value="summary" className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 flex gap-2 items-center text-slate-600 hover:text-slate-900"><PieChart className="w-4 h-4"/> Overview</TabsTrigger>
                                            <TabsTrigger value="income" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 flex gap-2 items-center text-slate-600 hover:text-slate-900"><TrendingUp className="w-4 h-4"/> Income</TabsTrigger>
                                            <TabsTrigger value="expenditures" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 flex gap-2 items-center text-slate-600 hover:text-slate-900"><CreditCard className="w-4 h-4"/> Expenditures</TabsTrigger>
                                            <TabsTrigger value="budgeting" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 flex gap-2 items-center text-slate-600 hover:text-slate-900"><Wallet className="w-4 h-4"/> Budgeting</TabsTrigger>
                                            <TabsTrigger value="debts" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 flex gap-2 items-center text-slate-600 hover:text-slate-900"><CreditCard className="w-4 h-4"/> Debts</TabsTrigger>
                                            <TabsTrigger value="daily_report" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 flex gap-2 items-center text-slate-600 hover:text-slate-900"><CalendarIcon className="w-4 h-4"/> Daily Recurring Fees</TabsTrigger>
                                            <TabsTrigger value="daily_revenue" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 flex gap-2 items-center text-slate-600 hover:text-slate-900"><CalendarIcon className="w-4 h-4"/> Daily Rev</TabsTrigger>
                                            <TabsTrigger value="monthly_report" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 flex gap-2 items-center text-slate-600 hover:text-slate-900"><CalendarDays className="w-4 h-4"/> Monthly</TabsTrigger>
                                            <TabsTrigger value="ai_insights" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 flex gap-2 items-center text-indigo-600 hover:text-indigo-800"><Sparkles className="w-4 h-4"/> AI Insights</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="budgeting" className="mt-6">
                                            <BudgetingTab schoolId={schoolId || ''} periodId={selectedPeriodId || ''} expenditures={expenditures} />
                                        </TabsContent>
                                        <TabsContent value="summary" className="mt-6">
                                            <Card className="bg-muted/30">
                                                <CardHeader><CardTitle className="text-heading-md flex items-center justify-between w-full">
                                                        <span>Overall Financial Summary</span>
                                                        <div className="flex gap-2">
                                                            <Button size="sm" onClick={handleExportFinancialSummary} className="h-9 gap-2 bg-emerald-600 text-white hover:bg-emerald-700 font-medium border-0 shadow-sm"><Download className="w-4 h-4"/> Export CSV</Button>
                                                            <Button size="sm" onClick={() => setIsReportConfigModalOpen(true)} className="h-9 gap-2 bg-indigo-600 text-white hover:bg-indigo-700 font-medium border-0 shadow-sm"><Printer className="w-4 h-4"/> Print Monthly Report</Button>
                                                        </div>
                                                    </CardTitle></CardHeader>
                                                <CardContent>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                                                        <div><p className="text-sm text-muted-foreground font-sans font-medium">Total Income</p><p className="text-2xl font-bold text-success text-numeric">GH¢{(overallTotals.totalIncome || 0).toFixed(2)}</p></div>
                                                        <div><p className="text-sm text-muted-foreground font-sans font-medium">Total Expenditure</p><p className="text-2xl font-bold text-destructive text-numeric">GH¢{(overallTotals.totalExpenditure || 0).toFixed(2)}</p></div>
                                                        <div><p className="text-sm text-muted-foreground font-sans font-medium">Net Savings / Loss</p><p className={`text-2xl font-bold ${overallTotals.netSavings >= 0 ? 'text-success' : 'text-destructive'} text-numeric`}>GH¢{(overallTotals.netSavings || 0).toFixed(2)}</p></div>
                                                        <div><p className="text-sm text-muted-foreground font-sans font-medium">Total Debt</p><p className="text-2xl font-bold text-numeric">GH¢{(overallTotals.totalDebt || 0).toFixed(2)}</p></div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            
                                        </TabsContent>

                                        <TabsContent value="income" className="mt-6">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-heading-md">Income Analysis by Category</CardTitle>
                                                    <CardDescription>Breakdown of billed, accrued, and paid amounts for all fee types.</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <Table wrapperClassName="max-h-[500px]">
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Category</TableHead>
                                                                <TableHead className="text-right">Billed (Termly)</TableHead>
                                                                <TableHead className="text-right">Accrued (Daily)</TableHead>
                                                                <TableHead className="text-right">Total Paid</TableHead>
                                                                <TableHead className="text-right">Arrears</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {Object.entries(overallTotals.byCategory).map(([name, data]) => {
                                                                const totalExpected = data.billed + data.accrued;
                                                                const arrears = Math.max(0, totalExpected - data.paid);
                                                                return (
                                                                    <TableRow key={name}>
                                                                        <TableCell className="font-medium">{name}</TableCell>
                                                                        <TableCell className="text-right text-numeric">GH¢{data.billed.toFixed(2)}</TableCell>
                                                                        <TableCell className="text-right text-numeric">GH¢{data.accrued.toFixed(2)}</TableCell>
                                                                        <TableCell className="text-right text-numeric text-success font-bold">GH¢{data.paid.toFixed(2)}</TableCell>
                                                                        <TableCell className="text-right text-numeric text-destructive font-bold">GH¢{arrears.toFixed(2)}</TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        <TabsContent value="expenditures" className="mt-6">
                                            <div className="space-y-6">
                                                <ExpenditureSection 
                                                    title="All Expenditures"
                                                    description="Track all school expenditures in one place. Enter a description and AI will suggest a category."
                                                    income={overallTotals.totalIncome || 0}
                                                    totalExpenditure={overallTotals.totalExpenditure || 0}
                                                    expenditures={expenditures}
                                                    categories={allExpenditureCategories}
                                                    onAddExpenditure={handleAddExpenditure}
                                                    onDeleteExpenditure={handleDeleteExpenditure}
                                                    isSubmitting={isSubmitting}
                                                />
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="daily_report" className="mt-6">
                                            <Card>
                                                <CardHeader>
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <CardTitle className="text-heading-md">Daily Recurring Fees Accrual Report</CardTitle>
                                                            <CardDescription>Detailed report of daily recurring fees (Feeding, etc.) accrued based on attendance.</CardDescription>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Label className="text-xs">Filter Class:</Label>
                                                            <Select value={selectedClassForFees} onValueChange={setSelectedClassForFees}>
                                                                <SelectTrigger className="w-[150px] h-8 text-xs">
                                                                    <SelectValue placeholder="All Classes" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="all">All Classes</SelectItem>
                                                                    {classes.map(c => (
                                                                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="overflow-x-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Student</TableHead>
                                                                    <TableHead>Class</TableHead>
                                                                    <TableHead>Fee Type</TableHead>
                                                                    <TableHead className="text-right">Days</TableHead>
                                                                    <TableHead className="text-right">Rate</TableHead>
                                                                    <TableHead className="text-right">Accrued</TableHead>
                                                                    <TableHead className="text-right">Paid</TableHead>
                                                                    <TableHead className="text-right">Credit/Arrears</TableHead>
                                                                    <TableHead className="text-right">Status</TableHead>
                                                                    <TableHead className="text-right">Actions</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {dailyFeeSummary.length === 0 ? (
                                                                    <TableRow>
                                                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No daily recurring fee records for the selected period/class.</TableCell>
                                                                    </TableRow>
                                                                ) : (
                                                                    dailyFeeSummary.map((item, idx) => (
                                                                        <TableRow key={idx}>
                                                                            <TableCell className="font-medium">{item.studentName}</TableCell>
                                                                            <TableCell>{item.className}</TableCell>
                                                                            <TableCell>{item.categoryName}</TableCell>
                                                                            <TableCell className="text-right">{item.daysPresent}</TableCell>
                                                                            <TableCell className="text-right text-numeric">GH¢{item.dailyRate.toFixed(2)}</TableCell>
                                                                            <TableCell className="text-right text-numeric">GH¢{item.totalBilled.toFixed(2)}</TableCell>
                                                                            <TableCell className="text-right text-numeric text-emerald-600 font-medium">GH¢{item.totalPaid.toFixed(2)}</TableCell>
                                                                            <TableCell className={`text-right text-numeric font-bold ${item.balance >= 0 ? 'text-emerald-700' : 'text-destructive'}`}>
                                                                                {item.balance >= 0 ? `+GH¢${item.balance.toFixed(2)}` : `-GH¢${Math.abs(item.balance).toFixed(2)}`}
                                                                            </TableCell>
                                                                            <TableCell className="text-right">
                                                                                <Badge variant="outline" className={item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' : item.status === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold' : 'bg-destructive/10 text-destructive border-destructive/20 font-bold'}>
                                                                                    {item.status === 'Paid' && item.balance > 0 ? 'Pre-paid' : item.status}
                                                                                </Badge>
                                                                            </TableCell>
                                                                            <TableCell className="text-right">
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    size="sm" 
                                                                                    onClick={() => handleOpenQuickDailyPayment(item.studentId, item.categoryName)}
                                                                                    className="h-8 px-2 text-emerald-600 hover:bg-emerald-50 font-bold text-[10px] uppercase gap-1"
                                                                                >
                                                                                    <PlusCircle className="w-3 h-3" /> Pay
                                                                                </Button>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))
                                                                )}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        <TabsContent value="daily_revenue" className="mt-6">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-heading-md">Daily Revenue Summary</CardTitle>
                                                    <CardDescription>Day-by-day breakdown of all incoming revenue.</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="overflow-x-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Date</TableHead>
                                                                    <TableHead className="text-right">Core Fees Collected</TableHead>
                                                                    <TableHead className="text-right">Daily Recurring Fees Collected</TableHead>
                                                                    <TableHead className="text-right">Total Revenue</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {dailyRevenueSummary.length === 0 ? (
                                                                    <TableRow>
                                                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No payments recorded.</TableCell>
                                                                    </TableRow>
                                                                ) : (
                                                                    dailyRevenueSummary.map((day, idx) => (
                                                                        <TableRow key={idx}>
                                                                            <TableCell className="font-medium whitespace-nowrap">
                                                                                {(() => {
                                                                                    const [year, month, dayPart] = day.date.split('-');
                                                                                    return `${dayPart}-${month}-${year}`;
                                                                                })()}
                                                                            </TableCell>
                                                                            <TableCell className="text-right font-medium text-emerald-600">GH¢{day.mainFeesAmount.toFixed(2)}</TableCell>
                                                                            <TableCell className="text-right font-medium text-blue-600">GH¢{day.dailyFeesAmount.toFixed(2)}</TableCell>
                                                                            <TableCell className="text-right font-bold text-slate-800">GH¢{day.totalAmount.toFixed(2)}</TableCell>
                                                                        </TableRow>
                                                                    ))
                                                                )}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                        <TabsContent value="monthly_report" className="mt-6">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-heading-md">Monthly Financial History</CardTitle>
                                                    <CardDescription>Review income versus expenditure month-by-month for the current year.</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="overflow-x-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Month</TableHead>
                                                                    <TableHead className="text-right">Total Income</TableHead>
                                                                    <TableHead className="text-right">Total Expenditure</TableHead>
                                                                    <TableHead className="text-right">Net Profit/Loss</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {monthlyFinancialData.length === 0 ? (
                                                                    <TableRow>
                                                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No financial data available for this year.</TableCell>
                                                                    </TableRow>
                                                                ) : (
                                                                    monthlyFinancialData.map((item, idx) => {
                                                                        const net = item.Income - item.Expenditure;
                                                                        return (
                                                                            <TableRow key={idx}>
                                                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                                                <TableCell className="text-right text-emerald-600 font-medium">GH¢{item.Income.toFixed(2)}</TableCell>
                                                                                <TableCell className="text-right text-rose-600 font-medium">GH¢{item.Expenditure.toFixed(2)}</TableCell>
                                                                                <TableCell className={`text-right font-bold ${net >= 0 ? 'text-emerald-700' : 'text-destructive'}`}>
                                                                                    {net >= 0 ? `+GH¢${net.toFixed(2)}` : `-GH¢${Math.abs(net).toFixed(2)}`}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        );
                                                                    })
                                                                )}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        
                                        <TabsContent value="debts" className="mt-6">
                                            <Card className="mt-6">
                                                <CardHeader><CardTitle className="text-heading-md">Manage Debts & Liabilities</CardTitle></CardHeader>
                                                <CardContent className="grid md:grid-cols-2 gap-8">
                                                     <Card>
                                                        <CardHeader><CardTitle className="text-heading-md flex items-center gap-2"><HandCoins className="w-5 h-5"/> Record a Debt</CardTitle></CardHeader>
                                                        <form onSubmit={handleAddDebt}>
                                                            <CardContent className="space-y-4">
                                                                <div className="space-y-2"><Label htmlFor="debt-creditor">Creditor</Label><Input id="debt-creditor" placeholder="e.g. ABC Bank" value={debtForm.creditor} onChange={e => setDebtForm({...debtForm, creditor: e.target.value})} required disabled={isSubmitting}/></div>
                                                                <div className="space-y-2"><Label htmlFor="debt-desc">Description</Label><Input id="debt-desc" placeholder="e.g. Loan for school bus" value={debtForm.description} onChange={e => setDebtForm({...debtForm, description: e.target.value})} required disabled={isSubmitting}/></div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-2"><Label htmlFor="debt-amount">Amount (GH¢)</Label><Input id="debt-amount" type="number" placeholder="0.00" value={debtForm.amount} onChange={e => setDebtForm({...debtForm, amount: e.target.value})} required disabled={isSubmitting}/></div>
                                                                    <div className="space-y-2"><Label htmlFor="debt-date">Date Incurred</Label><DatePicker id="debt-date" value={debtForm.date} onChange={val => setDebtForm({...debtForm, date: val})} disabled={isSubmitting}/></div>
                                                                </div>
                                                            </CardContent>
                                                            <DialogFooter className="px-6 pb-6"><Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="animate-spin" /> Saving...</> : 'Save Debt Record'}</Button></DialogFooter>
                                                        </form>
                                                    </Card>
                                                     <Card>
                                                        <CardHeader><CardTitle className="text-heading-md">Debt History</CardTitle></CardHeader>
                                                        <CardContent>
                                                            {isLoading ? <Skeleton className="h-40 w-full" /> : 
                                                            debts.length === 0 ? <p className="text-center text-muted-foreground py-8">No debts recorded.</p> : (
                                                                <div className="overflow-x-auto">
                                                                <Table><TableHeader><TableRow><TableHead>Details</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                                                    <TableBody>
                                                                        {debts.map(debt => (
                                                                            <TableRow key={debt.id}>
                                                                                <TableCell><div className="font-medium">{debt.creditor}</div><div className="text-xs text-muted-foreground">{debt.description} &bull; {new Date(debt.date).toLocaleDateString('en-GB')}</div></TableCell>
                                                                                <TableCell className="text-right text-numeric">GH¢{debt.amount.toFixed(2)}</TableCell>
                                                                                <TableCell className="text-right"><Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteDebt(debt)} disabled={isSubmitting}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
<TabsContent value="ai_insights" className="mt-6">
                                            <FinanceAiInsightsTab 
                                                totalIncome={overallTotals.totalIncome || 0}
                                                totalOutstanding={overallTotals.totalDebt || 0}
                                                expendituresThisMonth={overallTotals.totalExpenditure || 0}
                                                dailyFeesIncome={dailyFeeSummary.reduce((acc, row) => acc + row.totalPaid, 0)}
                                                dailyFeesOutstanding={dailyFeeSummary.reduce((acc, row) => acc + row.balance, 0)}
                                                recentExpenditures={expenditures.slice(0, 5).map(e => ({ category: e.category, amount: Number(e.amount) || 0 }))}
                                                totalStudentsWithDebt={students.filter(s => {
                                                    const balanceInfo = calculateStudentTotalBalance(s, academicPeriods, selectedPeriodId || undefined, feeCategories);
                                                    return balanceInfo.totalOutstanding > 0;
                                                }).length}
                                            />
                                        </TabsContent>
                                    </Tabs>
                                 </CardContent>
                            </Card>
                        )}

                        {userRole === 'admin' && activeTab === 'staff' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card className="border-4 border-primary">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-heading-md uppercase text-primary/60">Total Staff</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold">{staffIds.length}</div>
                                            <p className="text-xs text-muted-foreground">{staffIds.filter(s => s.role === 'Teacher' || s.role === 'Assistant Teacher').length} Teaching • {staffIds.filter(s => s.role !== 'Teacher' && s.role !== 'Assistant Teacher').length} Support</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-4 border-emerald-600">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-heading-md uppercase text-emerald-600/60">Monthly Payroll</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-emerald-600">GH¢{staffIds.reduce((sum, s) => sum + (staffDetails.find(d => d.id === s.id)?.salary || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                            <p className="text-xs text-muted-foreground">Estimated total monthly expenditure</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-4 border-amber-600">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-heading-md uppercase text-amber-600/60">Active Roles</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold">{new Set(staffIds.map(s => s.role)).size}</div>
                                            <p className="text-xs text-muted-foreground">Distinct job categories</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div>
                                    <Dialog open={isAddStaffDialogOpen} onOpenChange={setIsAddStaffDialogOpen}>
                                        <DialogContent className="max-w-md">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2">
                                                    {editingStaffId ? <Edit className="w-5 h-5"/> : <UserPlus className="w-5 h-5"/>} 
                                                    {editingStaffId ? 'Edit Staff Details' : 'Register Staff'}
                                                </DialogTitle>
                                                <DialogDescription>{editingStaffId ? 'Update information for this employee.' : 'Enter details to add a new employee.'}</DialogDescription>
                                            </DialogHeader>
                                            <form onSubmit={handleAddStaff}>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="add-staff-name" className="text-xs font-bold uppercase">Full Name</Label>
                                                        <Input id="add-staff-name" placeholder="e.g. John Doe" className="border-2" value={addStaffForm.name} onChange={e => setAddStaffForm({ ...addStaffForm, name: e.target.value })} required disabled={isSubmitting}/>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="add-staff-role" className="text-xs font-bold uppercase">Role</Label>
                                                            <Select value={addStaffForm.role} onValueChange={(val: StaffRole) => setAddStaffForm({...addStaffForm, role: val})} disabled={isSubmitting}>
                                                                <SelectTrigger id="add-staff-role" className="border-2">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {STAFF_ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="add-staff-id" className="text-xs font-bold uppercase">Staff ID</Label>
                                                            <Input id="add-staff-id" placeholder="Optional" className="border-2" value={addStaffForm.id} onChange={e => setAddStaffForm({ ...addStaffForm, id: e.target.value.toUpperCase() })} disabled={isSubmitting}/>
                                                        </div>
                                                    </div>

                                                    {(addStaffForm.role === 'Teacher' || addStaffForm.role === 'Assistant Teacher') && (
                                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                                            <Label htmlFor="add-staff-class" className="text-xs font-bold uppercase">Assigned Class</Label>
                                                            <Input
                                                                id="add-staff-class"
                                                                list="staff-class-list"
                                                                placeholder="Select or type a class"
                                                                className="border-2"
                                                                value={addStaffForm.className || ''}
                                                                onChange={e => setAddStaffForm({ ...addStaffForm, className: e.target.value })}
                                                                disabled={isSubmitting}
                                                            />
                                                            <datalist id="staff-class-list">
                                                                {uniqueClassNames.map(name => <option key={name} value={name} />)}
                                                            </datalist>
                                                            <p className="text-[10px] text-muted-foreground">You can type a new class name or select from existing ones.</p>
                                                        </div>
                                                    )}

                                                    {addStaffForm.role !== 'Gatekeeper' && addStaffForm.role !== 'Security' && addStaffForm.role !== 'Cashier' && (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="add-staff-phone" className="text-xs font-bold uppercase">Phone Number</Label>
                                                            <Input id="add-staff-phone" type="tel" placeholder="024XXXXXXX" className="border-2" value={addStaffForm.phone} onChange={e => setAddStaffForm({ ...addStaffForm, phone: e.target.value })} disabled={isSubmitting}/>
                                                        </div>
                                                    )}
                                                    {addStaffForm.role !== 'Gatekeeper' && addStaffForm.role !== 'Security' && addStaffForm.role !== 'Cashier' && (
                                                        <>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="add-staff-email" className="text-xs font-bold uppercase">Email Address</Label>
                                                                <Input id="add-staff-email" type="email" placeholder="staff@example.com" className="border-2" value={addStaffForm.email} onChange={e => setAddStaffForm({ ...addStaffForm, email: e.target.value })} required disabled={isSubmitting}/>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="add-staff-password" className="text-xs font-bold uppercase">Password {editingStaffId ? '(Leave blank to keep current)' : ''}</Label>
                                                                <Input id="add-staff-password" type="password" placeholder={editingStaffId ? "••••••••" : "Min 6 characters"} className="border-2" value={addStaffForm.password || ''} onChange={e => setAddStaffForm({ ...addStaffForm, password: e.target.value })} required={!editingStaffId} disabled={isSubmitting}/>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <DialogFooter className="flex gap-2">
                                                    {editingStaffId && (
                                                        <DialogClose asChild>
                                                            <Button type="button" variant="outline" className="h-12" onClick={() => {
                                                                setEditingStaffId(null);
                                                                setAddStaffForm(defaultAddStaffForm);
                                                            }}>Cancel</Button>
                                                        </DialogClose>
                                                    )}
                                                    <Button type="submit" disabled={isSubmitting} className="flex-1 bg-primary font-bold uppercase tracking-widest h-12">
                                                        {isSubmitting ? <Loader2 className="animate-spin" /> : (editingStaffId ? <><Save className="mr-2 h-4 w-4" /> Save</> : <><UserPlus className="mr-2 h-4 w-4" /> Add</>)}
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>

                                    <Card className="border-2 shadow-lg">
                                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div>
                                                <CardTitle className="text-heading-md">Active Personnel</CardTitle>
                                                <CardDescription>Manage your current staff members.</CardDescription>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <Search className="w-4 h-4 text-muted-foreground" />
                                                    <Input 
                                                        placeholder="Search staff..." 
                                                        className="w-48 h-8 text-sm" 
                                                        value={staffSearchQuery}
                                                        onChange={(e) => setStaffSearchQuery(e.target.value)}
                                                    />
                                                </div>
                                                <Button onClick={() => {
                                                    setEditingStaffId(null);
                                                    setAddStaffForm(defaultAddStaffForm);
                                                    setIsAddStaffDialogOpen(true);
                                                }} className="h-8 shadow-sm">
                                                    <UserPlus className="w-4 h-4 mr-2" /> Register Staff
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="overflow-hidden rounded-xl border">
                                                <Table>
                                                    <TableHeader className="bg-muted/50">
                                                        <TableRow>
                                                            <TableHead className="font-bold uppercase text-[10px]">Staff Profile</TableHead>
                                                            <TableHead className="font-bold uppercase text-[10px]">Role/Class</TableHead>
                                                            <TableHead className="font-bold uppercase text-[10px]">Contact Info</TableHead>
                                                            <TableHead className="font-bold uppercase text-[10px]">Salary</TableHead>
                                                            <TableHead className="text-right font-bold uppercase text-[10px]">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredStaff.length === 0 ? (
                                                            <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">No staff found.</TableCell></TableRow>
                                                        ) : (
                                                            filteredStaff.map((staff) => {
                                                            const details = staffDetails.find(d => d.id === staff.id);
                                                            return (
                                                                <TableRow key={staff.id} className="hover:bg-muted/30">
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-3">
                                                                            <GradientAvatar name={staff.name} size="sm" />
                                                                            <div>
                                                                                <p className="font-bold text-sm leading-none">{staff.name}</p>
                                                                                <p className="text-[10px] text-muted-foreground text-numeric mt-1">{staff.uid ? (staff.staffId || 'N/A') : staff.id}</p>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge variant="outline" className={cn(
                                                                            "font-bold uppercase text-[9px] border-2",
                                                                            (staff.role === 'Teacher' || staff.role === 'Assistant Teacher') ? "border-blue-200 text-blue-700 bg-blue-50" :
                                                                            staff.role === 'Administrator' ? "border-purple-200 text-purple-700 bg-purple-50" : "border-gray-200"
                                                                        )}>
                                                                            {staff.role} {staff.className ? `(${staff.className})` : ''}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                         <div className="space-y-1">
                                                                             {staff.phone && (
                                                                                 <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                                     <Phone className="w-3 h-3" />
                                                                                     <span>{staff.phone}</span>
                                                                                 </div>
                                                                             )}
                                                                             {staff.email && (
                                                                                 <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                                     <Mail className="w-3 h-3" />
                                                                                     <span className="truncate max-w-[120px]">{staff.email}</span>
                                                                                 </div>
                                                                             )}
                                                                             {!staff.phone && !staff.email && <span className="text-muted-foreground italic text-[10px]">No contact info</span>}
                                                                         </div>
                                                                     </TableCell>
                                                                    <TableCell>
                                                                        <div className="font-bold text-sm">
                                                                            {details?.salary ? `GH¢${details.salary.toFixed(2)}` : <span className="text-muted-foreground italic font-normal text-xs">Not Set</span>}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end">
                                                                                 <DropdownMenuItem onClick={() => {
                                                                                    setEditingStaffId(staff.id);
                                                                                    setAddStaffForm({
                                                                                        name: staff.name || '',
                                                                                        role: staff.role || 'Teacher',
                                                                                        id: staff.uid ? (staff.staffId || '') : staff.id,
                                                                                        className: staff.className || '',
                                                                                        phone: staff.phone || '',
                                                                                        email: staff.email || '',
                                                                                        password: ''
                                                                                    });
                                                                                    setIsAddStaffDialogOpen(true);
                                                                                }}><Edit className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => handleOpenSalaryDialog(staff)}><DollarSign className="mr-2 h-4 w-4" /> Set Salary</DropdownMenuItem>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem className="text-destructive" onClick={() => handleArchiveStaff(staff)}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </TableCell>
                                                                </TableRow>
                                                                );
                                                            })
                                                        )}
                                                    </TableBody>
                                                    </Table>
                                                    </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                        )}

                        {userRole === 'admin' && activeTab === 'calendar' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-heading-md flex items-center gap-2"><CalendarDays className="w-6 h-6"/> School Calendar</CardTitle>
                                    <CardDescription>Manage important dates for the school term.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <Card>
                                            <CardHeader><CardTitle className="text-heading-md">Add New Event</CardTitle></CardHeader>
                                            <form onSubmit={handleAddCalendarEvent}>
                                                <CardContent className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="event-title">Event Title</Label>
                                                        <Input id="event-title" placeholder="e.g. Mid-term Break" value={calendarEventForm.title} onChange={e => setCalendarEventForm({...calendarEventForm, title: e.target.value})} required disabled={isSubmitting} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="event-date">Date</Label>
                                                            <DatePicker id="event-date" value={calendarEventForm.date} onChange={val => setCalendarEventForm({...calendarEventForm, date: val})} disabled={isSubmitting} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="event-type">Event Type</Label>
                                                            <Select value={calendarEventForm.type} onValueChange={(value: 'Event' | 'Holiday' | 'Exam') => setCalendarEventForm({...calendarEventForm, type: value})} required disabled={isSubmitting}>
                                                                <SelectTrigger id="event-type"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Event">Event</SelectItem>
                                                                    <SelectItem value="Holiday">Holiday</SelectItem>
                                                                    <SelectItem value="Exam">Exam</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="event-description">Description (Optional)</Label>
                                                        <Textarea id="event-description" placeholder="Additional details about the event..." value={calendarEventForm.description} onChange={e => setCalendarEventForm({...calendarEventForm, description: e.target.value})} disabled={isSubmitting}/>
                                                    </div>
                                                </CardContent>
                                                <DialogFooter className="px-6 pb-6">
                                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                                                        {isSubmitting ? <><Loader2 className="animate-spin" /> Adding Event...</> : <><PlusCircle className="mr-2 h-4 w-4" /> Add Event to Calendar</>}
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </Card>
                                    </div>
                                    <div className="space-y-6">
                                        <Card>
                                            <CardHeader><CardTitle className="text-heading-md">Upcoming Events</CardTitle></CardHeader>
                                            <CardContent>
                                                <div className="divide-y divide-border">
                                                    {calendarEvents.length === 0 ? (
                                                        <p className="text-center text-muted-foreground py-8">No calendar events found.</p>
                                                    ) : (
                                                        calendarEvents.map(event => (
                                                             <div key={event.id} className="p-4 grid grid-cols-[1fr_auto_auto] items-center gap-x-4">
                                                                <div>
                                                                    <p className="font-medium">{event.title}</p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {new Date(event.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                                                    </p>
                                                                </div>
                                                                <Badge variant={
                                                                    event.type === 'Holiday' ? 'destructive' :
                                                                    event.type === 'Exam' ? 'secondary' : 'default'
                                                                }>{event.type}</Badge>
                                                                <div className="self-center">
                                                                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteEvent(event)} disabled={isSubmitting}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {userRole === 'admin' && activeTab === 'communication' && (
                            <div className="space-y-6">
                                <Card className="max-w-3xl mx-auto border-4 border-primary">
                                    <CardHeader>
                                        <CardTitle className="text-heading-md flex items-center gap-2"><Send className="w-6 h-6"/> Communication Center</CardTitle>
                                        <CardDescription>Send announcements to parents. They will appear on the parent's dashboard and can optionally be sent as an SMS.</CardDescription>
                                    </CardHeader>
                                    <form onSubmit={handleSendMessage}>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="recipient">Recipient</Label>
                                                <Select name="recipient" value={communicationForm.recipient} onValueChange={(value) => setCommunicationForm({...communicationForm, recipient: value})} required disabled={isSubmitting}>
                                                    <SelectTrigger id="recipient" className="border-2">
                                                        <SelectValue placeholder="Select a recipient" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Parents</SelectItem>
                                                        {students.map(student => (
                                                            <SelectItem key={student.studentId} value={student.studentId}>
                                                                Parent of {student.name} ({student.studentId})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="subject">Subject</Label>
                                                <Input id="subject" placeholder="e.g. Upcoming School Event" className="border-2" value={communicationForm.subject} onChange={e => setCommunicationForm({...communicationForm, subject: e.target.value})} required disabled={isSubmitting}/>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="message">Message</Label>
                                                <Textarea id="message" placeholder="Type your announcement here..." className="border-2" rows={5} value={communicationForm.message} onChange={e => setCommunicationForm({...communicationForm, message: e.target.value})} required disabled={isSubmitting}/>
                                            </div>
                                            <div className="flex flex-col space-y-4 pt-4 border-t">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id="sendAsSMS" 
                                                        checked={communicationForm.sendAsSMS} 
                                                        onCheckedChange={(checked) => setCommunicationForm({...communicationForm, sendAsSMS: !!checked})}
                                                        disabled={isSubmitting}
                                                    />
                                                    <label
                                                        htmlFor="sendAsSMS"
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                    >
                                                        Also send as SMS Message
                                                    </label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id="sendAsVoice" 
                                                        checked={communicationForm.sendAsVoice} 
                                                        onCheckedChange={(checked) => setCommunicationForm({...communicationForm, sendAsVoice: !!checked})}
                                                        disabled={isSubmitting}
                                                    />
                                                    <label
                                                        htmlFor="sendAsVoice"
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                    >
                                                        Also send as Voice SMS
                                                    </label>
                                                </div>
                                            </div>
                                        </CardContent>
                                        <DialogFooter className="px-6 pb-6">
                                            <Button type="submit" className="w-full font-black uppercase tracking-widest" disabled={isSubmitting}>
                                                {isSubmitting ? <><Loader2 className="animate-spin" /> Sending...</> : <><Send className="mr-2 h-4 w-4" /> Send Announcement</>}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Card>

                                <Card className="max-w-3xl mx-auto border-2">
                                    <CardHeader>
                                        <CardTitle className="text-heading-md font-headline">Recent Announcements</CardTitle>
                                        <CardDescription>View and manage previously sent messages.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y">
                                            {announcements.length === 0 ? (
                                                <div className="p-8 text-center text-muted-foreground italic">No announcements sent yet.</div>
                                            ) : announcements.map((announcement) => (
                                                <div key={announcement.id} className="p-4 flex justify-between items-start hover:bg-muted/30 transition-colors">
                                                    <div className="space-y-1">
                                                        <h4 className="font-bold text-sm">{announcement.subject}</h4>
                                                        <p className="text-xs text-muted-foreground line-clamp-2 max-w-lg">{announcement.message}</p>
                                                        <div className="flex gap-2 text-[10px] font-bold uppercase tracking-tighter text-primary/60 pt-1">
                                                            <span>To: {announcement.recipient === 'all' ? 'All Parents' : announcement.recipient.startsWith('class:') ? announcement.recipient.split(':')[1] : `Parent (${announcement.recipient})`}</span>
                                                            <span>•</span>
                                                            <span>{announcement.date.toLocaleDateString('en-GB')}</span>
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                                        onClick={() => setAnnouncementToDelete(announcement)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {userRole === 'admin' && activeTab === 'promote-students' && (
                            <PromoteStudentsTab 
                                students={students} 
                                db={db} 
                                auth={auth} 
                                storage={storage} 
                                schoolId={schoolId!} 
                            />
                        )}

                        {activeTab === 'debtors' && (
                            <DebtorsListTab 
                                students={[...students, ...archivedStudents]} 
                                academicPeriods={academicPeriods} 
                                feeCategories={feeCategories} 
                                selectedPeriodId={selectedPeriodId}
                            />
                        )}

                        {userRole === 'admin' && activeTab === 'archive' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-heading-md flex items-center gap-2"><Archive className="w-6 h-6"/> Archive</CardTitle>
                                    <CardDescription>View archived students and staff. You can restore them or delete them permanently.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Tabs defaultValue="archived-students" className="w-full">
                                         <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="archived-students">Archived Students</TabsTrigger>
                                            <TabsTrigger value="archived-staff">Archived Staff</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="archived-students" className="mt-6">
                                            <Card>
                                                <CardHeader><CardTitle className="text-heading-md">Archived Student List</CardTitle></CardHeader>
                                                <CardContent>
                                                    {isLoading ? <Skeleton className="h-40 w-full" /> : 
                                                    archivedStudents.length === 0 ? <p className="text-center text-muted-foreground py-8">No students have been archived.</p> : (
                                                        <div className="overflow-x-auto">
                                                        <Table>
                                                            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                                            <TableBody>
                                                                {archivedStudents.map(student => (
                                                                    <TableRow key={student.studentId}>
                                                                        <TableCell>
                                                                            <div className="font-medium">{student.name}</div>
                                                                            <div className="text-xs text-muted-foreground">{student.studentId}</div>
                                                                        </TableCell>
                                                                        <TableCell>{student.className}</TableCell>
                                                                        <TableCell className="text-right">
                                                                            <Button variant="outline" size="sm" className="mr-2" onClick={() => handleRestoreStudent(student.studentId)} disabled={isSubmitting}><ArchiveRestore className="mr-2 h-4 w-4"/> Restore</Button>
                                                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteStudent(student)} disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4"/> Delete</Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                         <TabsContent value="archived-staff" className="mt-6">
                                            <Card>
                                                <CardHeader><CardTitle className="text-heading-md">Archived Staff List</CardTitle></CardHeader>
                                                <CardContent>
                                                    {isLoading ? <Skeleton className="h-40 w-full" /> :
                                                    archivedStaff.length === 0 ? <p className="text-center text-muted-foreground py-8">No staff have been archived.</p> : (
                                                        <div className="overflow-x-auto">
                                                        <Table>
                                                            <TableHeader><TableRow><TableHead>Staff Member</TableHead><TableHead>Assigned Class</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                                            <TableBody>
                                                                {archivedStaff.map(staff => (
                                                                    <TableRow key={staff.id}>
                                                                        <TableCell>
                                                                            <p className="font-medium">{staff.name}</p>
                                                                            <p className="text-sm text-muted-foreground text-numeric">{staff.id}</p>
                                                                        </TableCell>
                                                                        <TableCell>{staff.className}</TableCell>
                                                                        <TableCell className="text-right">
                                                                            <Button variant="outline" size="sm" className="mr-2" onClick={() => handleRestoreStaff(staff.id)} disabled={isSubmitting}><ArchiveRestore className="mr-2 h-4 w-4"/> Restore</Button>
                                                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteStaff(staff)} disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4"/> Delete</Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        )}

                        {userRole === 'admin' && activeTab === 'academic-reports' && (
                            <AcademicReportsTab schoolId={schoolId} />
                        )}

                        {userRole === 'admin' && activeTab === 'lesson-plans' && (
                            <AdminLessonPlansTab schoolId={schoolId} />
                        )}

                        {userRole === 'admin' && activeTab === 'qr-generation' && (
                            <QRGenerationTab schoolId={schoolId} schoolName={schoolDetails?.name || ''} />
                        )}

                        {activeTab === 'admission-bills' && (
                            <AdmissionBillTab schoolDetails={schoolDetails} />
                        )}

                        {userRole === 'admin' && activeTab === 'settings' && (
                            <div className="max-w-4xl mx-auto">
                                <Card className="mb-8 border-amber-200 bg-amber-50/30">
                                    <CardHeader>
                                        <CardTitle className="text-heading-md flex items-center gap-2 text-amber-800"><ShieldCheck className="w-6 h-6"/> Security Settings</CardTitle>
                                        <CardDescription>Protect your sensitive gateway credentials with a security PIN. This PIN will be required to access this settings tab in the future.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="max-w-xs space-y-2">
                                            <Label htmlFor="settingsPin">4-Digit Security PIN</Label>
                                            <Input 
                                                id="settingsPin" 
                                                type="password"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={4}
                                                placeholder={schoolDetails?.settingsPin ? "****" : "Set 4-digit PIN"} 
                                                value={schoolSettingsForm.settingsPin || ''} 
                                                onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, settingsPin: e.target.value })} 
                                                disabled={isSubmitting} 
                                                className="text-lg tracking-widest"
                                            />
                                            <p className="text-xs text-muted-foreground">Keep this PIN safe. It prevents unauthorized access to your API keys.</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="mb-8 border-blue-200 bg-blue-50/30">
                                    <CardHeader>
                                        <CardTitle className="text-heading-md flex items-center gap-2 text-blue-800"><MessageSquare className="w-6 h-6"/> Hubtel SMS Gateway Settings</CardTitle>
                                        <CardDescription>Configure credentials for school fee reminders and general announcements. Find these in Hubtel Dashboard under <strong>Programmable SMS</strong>.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="hubtelSenderId">SMS Sender ID</Label>
                                                <Input 
                                                    id="hubtelSenderId" 
                                                    placeholder="Sender Name (max 11 chars)" 
                                                    maxLength={11}
                                                    value={schoolSettingsForm.hubtelSenderId || ''} 
                                                    onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, hubtelSenderId: e.target.value })} 
                                                    disabled={isSubmitting} 
                                                />
                                                <p className="text-[10px] text-muted-foreground">Alphanumeric only. This is the name parents see on their phones.</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="hubtelSmsClientId">SMS Client ID</Label>
                                                <Input 
                                                    id="hubtelSmsClientId" 
                                                    placeholder="From Programmable SMS API Key" 
                                                    value={schoolSettingsForm.hubtelSmsClientId || ''} 
                                                    onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, hubtelSmsClientId: e.target.value })} 
                                                    disabled={isSubmitting} 
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="hubtelSmsClientSecret">SMS Client Secret</Label>
                                            <div className="relative">
                                                <Input 
                                                    id="hubtelSmsClientSecret" 
                                                    type={showSecretKey ? "text" : "password"}
                                                    placeholder="From Programmable SMS API Key" 
                                                    value={schoolSettingsForm.hubtelSmsClientSecret || ''} 
                                                    onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, hubtelSmsClientSecret: e.target.value })} 
                                                    disabled={isSubmitting} 
                                                    className="pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSecretKey(!showSecretKey)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="mb-8 border-violet-200 bg-violet-50/30">
                                    <CardHeader>
                                        <CardTitle className="text-heading-md flex items-center gap-2 text-violet-800"><Mic className="w-6 h-6"/> Voice Call Settings</CardTitle>
                                        <CardDescription>Configure credentials for Automated Text-to-Speech Voice Calls.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                          <div className="space-y-4">
                                              <Card>
                                                <CardHeader>
                                                <CardTitle className="text-heading-md flex items-center gap-2 text-violet-800"><Mic className="w-6 h-6"/> Sendexa Voice Call Settings</CardTitle>
                                                <CardDescription>Configure credentials for Automated Text-to-Speech Voice Calls via Sendexa.</CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                      <div className="grid gap-2">
                                                          <Label htmlFor="sendexaApiKey">Sendexa API Key</Label>
                                                          <div className="relative">
                                                              <Input 
                                                                  id="sendexaApiKey" 
                                                                  type={showSecretKey ? "text" : "password"} 
                                                                  placeholder="From Sendexa Dashboard" 
                                                                  value={schoolSettingsForm.sendexaApiKey || ''} 
                                                                  onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, sendexaApiKey: e.target.value })} 
                                                                  disabled={isSubmitting} 
                                                                  className="pr-10"
                                                              />
                                                               <button type="button" onClick={() => setShowSecretKey(!showSecretKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                                                                    {showSecretKey ? <EyeOff size={16}/> : <Eye size={16}/>}
                                                                </button>
                                                          </div>
                                                      </div>
                                                      <div className="grid gap-2">
                                                          <Label htmlFor="sendexaVoiceCallerId">Caller ID (Sender Name / Phone)</Label>
                                                          <Input 
                                                              id="sendexaVoiceCallerId" 
                                                              placeholder="e.g. SENDEXA or +233..." 
                                                              value={schoolSettingsForm.sendexaVoiceCallerId || ''} 
                                                              onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, sendexaVoiceCallerId: e.target.value })} 
                                                              disabled={isSubmitting} 
                                                          />
                                                      </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                <CardTitle className="text-heading-md flex items-center gap-2 text-blue-800"><Mic className="w-6 h-6"/> Arkesel Voice Call Settings</CardTitle>
                                                <CardDescription>Configure credentials for Automated Voice Calls via Arkesel.</CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                      <div className="grid gap-2">
                                                          <Label htmlFor="arkeselApiKey">Arkesel API Key</Label>
                                                          <div className="relative">
                                                              <Input 
                                                                  id="arkeselApiKey" 
                                                                  type={showSecretKey ? "text" : "password"} 
                                                                  placeholder="From Arkesel Dashboard" 
                                                                  value={schoolSettingsForm.arkeselApiKey || ''} 
                                                                  onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, arkeselApiKey: e.target.value })} 
                                                                  disabled={isSubmitting} 
                                                                  className="pr-10"
                                                              />
                                                               <button type="button" onClick={() => setShowSecretKey(!showSecretKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                                                                    {showSecretKey ? <EyeOff size={16}/> : <Eye size={16}/>}
                                                                </button>
                                                          </div>
                                                      </div>
                                                      <div className="grid gap-2">
                                                          <Label htmlFor="arkeselVoiceCallerId">Caller ID (Sender Name / Phone)</Label>
                                                          <Input 
                                                              id="arkeselVoiceCallerId" 
                                                              placeholder="e.g. Arkesel or +233..." 
                                                              value={schoolSettingsForm.arkeselVoiceCallerId || ''} 
                                                              onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, arkeselVoiceCallerId: e.target.value })} 
                                                              disabled={isSubmitting} 
                                                          />
                                                      </div>
                                                </CardContent>
                                            </Card>
                                          </div>
                                    </CardContent>
                                </Card>

                                <Card className="mb-8 border-indigo-200 bg-indigo-50/30">
                                    <CardHeader>
                                        <CardTitle className="text-heading-md flex items-center gap-2 text-indigo-800"><Wallet className="w-6 h-6"/> Hubtel Payment Gateway Settings</CardTitle>
                                        <CardDescription>Configure credentials for receiving online payments. Find these in Hubtel Dashboard under <strong>Merchant Account</strong>.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="hubtelMerchantNumber">Merchant Account Number</Label>
                                                <Input 
                                                    id="hubtelMerchantNumber" 
                                                    placeholder="HM..." 
                                                    value={schoolSettingsForm.hubtelMerchantNumber || ''} 
                                                    onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, hubtelMerchantNumber: e.target.value })} 
                                                    disabled={isSubmitting} 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="hubtelPaymentClientId">Payment Client ID</Label>
                                                <Input 
                                                    id="hubtelPaymentClientId" 
                                                    placeholder="Merchant API Client ID" 
                                                    value={schoolSettingsForm.hubtelPaymentClientId || ''} 
                                                    onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, hubtelPaymentClientId: e.target.value })} 
                                                    disabled={isSubmitting} 
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="hubtelPaymentClientSecret">Payment Client Secret</Label>
                                            <div className="relative">
                                                <Input 
                                                    id="hubtelPaymentClientSecret" 
                                                    type={showPaymentSecret ? "text" : "password"}
                                                    placeholder="Merchant API Client Secret" 
                                                    value={schoolSettingsForm.hubtelPaymentClientSecret || ''} 
                                                    onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, hubtelPaymentClientSecret: e.target.value })} 
                                                    disabled={isSubmitting} 
                                                    className="pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPaymentSecret(!showPaymentSecret)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showPaymentSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-heading-md flex items-center gap-2"><Settings className="w-6 h-6"/> School Information</CardTitle>
                                        <CardDescription>Manage your school's public details and payment information.</CardDescription>
                                    </CardHeader>
                                    <form onSubmit={handleSaveSchoolSettings}>
                                        <CardContent className="space-y-8">
                                            <div className="space-y-4">
                                                <Label>School Logo</Label>
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="h-20 w-20">
                                                        <AvatarImage src={logoPreview || undefined} alt="School Logo" />
                                                        <AvatarFallback><SchoolIcon /></AvatarFallback>
                                                    </Avatar>
                                                    <Label htmlFor="edit-logo" className="cursor-pointer flex items-center gap-2 border p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                                                        <Upload className="h-4 w-4" />
                                                        <span>Change Logo</span>
                                                    </Label>
                                                    <Input id="edit-logo" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor="schoolName">School Name</Label>
                                                    <Input id="schoolName" value={schoolSettingsForm.name} onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, name: e.target.value })} disabled={isSubmitting} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="schoolPhone">School Phone Number</Label>
                                                    <Input id="schoolPhone" type="tel" placeholder="e.g. 0302123456" value={schoolSettingsForm.schoolPhone} onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, schoolPhone: e.target.value })} disabled={isSubmitting} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="schoolEmail">School Email</Label>
                                                <Input id="schoolEmail" type="email" placeholder="e.g. info@yourschool.com" value={schoolSettingsForm.schoolEmail} onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, schoolEmail: e.target.value })} disabled={isSubmitting} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                 <div className="space-y-2">
                                                    <Label htmlFor="momoName">Mobile Money (MoMo) Name</Label>
                                                    <Input id="momoName" placeholder="e.g. John Doe" value={schoolSettingsForm.momoName} onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, momoName: e.target.value })} disabled={isSubmitting} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="momoNumber">Mobile Money (MoMo) Number</Label>
                                                    <Input id="momoNumber" type="tel" placeholder="e.g. 0244123456" value={schoolSettingsForm.momoNumber} onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, momoNumber: e.target.value })} disabled={isSubmitting} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="customFeeBlockMessage">Custom Fee Block Message (Optional)</Label>
                                                <Textarea 
                                                    id="customFeeBlockMessage" 
                                                    placeholder="e.g. Notice: Your child {studentName} was not allowed into the school premises today due to outstanding fee balances." 
                                                    value={schoolSettingsForm.customFeeBlockMessage || ''} 
                                                    onChange={e => setSchoolSettingsForm({ ...schoolSettingsForm, customFeeBlockMessage: e.target.value })} 
                                                    disabled={isSubmitting} 
                                                    className="min-h-[80px]"
                                                />
                                                <p className="text-xs text-muted-foreground">This message is sent to parents via SMS when a student is blocked at the gate due to unpaid fees. Use {'{studentName}'} to insert the child's name.</p>
                                            </div>
                                            <div className="space-y-4 mt-4">
                                                <Label>Bank Account Details</Label>
                                                <div className="space-y-4">
                                                    {schoolSettingsForm.bankAccounts.map((account, index) => (
                                                        <div key={account.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4 p-4 border rounded-md relative">
                                                            <div className="space-y-2"><Label htmlFor={`bankName-${index}`}>Bank Name</Label><Input id={`bankName-${index}`} value={account.bankName} onChange={(e) => handleBankAccountChange(index, 'bankName', e.target.value)} placeholder="e.g. GCB Bank" disabled={isSubmitting}/></div>
                                                            <div className="space-y-2"><Label htmlFor={`accountName-${index}`}>Account Name</Label><Input id={`accountName-${index}`} value={account.accountName} onChange={(e) => handleBankAccountChange(index, 'accountName', e.target.value)} placeholder="e.g. ZipSMA School" disabled={isSubmitting}/></div>
                                                            <div className="space-y-2"><Label htmlFor={`accountNumber-${index}`}>Account Number</Label><Input id={`accountNumber-${index}`} value={account.accountNumber} onChange={(e) => handleBankAccountChange(index, 'accountNumber', e.target.value)} placeholder="e.g. 1234567890123" disabled={isSubmitting}/></div>
                                                            <Button type="button" variant="ghost" size="icon" className="text-destructive self-end mb-1" onClick={() => removeBankAccount(index)} disabled={isSubmitting}><Trash2 /></Button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <Button type="button" variant="outline" size="sm" onClick={addBankAccount} className="mt-2" disabled={isSubmitting}><PlusCircle className="mr-2"/> Add Bank Account</Button>
                                            </div>
                                        </CardContent>
                                        <DialogFooter className="px-6 pb-6">
                                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                                {isSubmitting ? <><Loader2 className="animate-spin" /> Saving Settings...</> : 'Save School Information'}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Card>

                                <div className="mt-8">
                                    <FeesReminderSettings schoolId={schoolId || ''} />
                                </div>

                                <div className="mt-8">
                                    <VoiceReminderSettings schoolId={schoolId || ''} />
                                </div>

                                <div className="mt-8">
                                    <DailyFeesReminderSettings schoolId={schoolId || ''} />
                                </div>

                                <div className="mt-8">
                                    <AttendanceReminderSettings schoolId={schoolId || ''} />
                                </div>

                                <div className="mt-8">
                                    <CalendarReminderSettings schoolId={schoolId || ''} />
                                </div>

                                <Card className="mt-8 border-2 shadow-lg overflow-hidden group">
                                    <CardHeader className="bg-primary/5 border-b-2 border-primary/10 py-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <CardTitle className="text-heading-lg flex items-center gap-2">
                                                    <DollarSign className="w-6 h-6 text-primary" />
                                                    Fee Category Library
                                                </CardTitle>
                                                <CardDescription className="font-medium">Define and manage custom fee types for your school ledger.</CardDescription>
                                            </div>
                                            <Badge variant="outline" className="bg-white font-black text-xs px-3 py-1 border-2">
                                                {feeCategories.length} Categories
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-8">
                                        <div className="flex gap-3 max-w-2xl">
                                            <div className="relative flex-1">
                                                <Input 
                                                    placeholder="New Category Name (e.g. Uniform Fees)" 
                                                    value={newCategoryName} 
                                                    onChange={e => setNewCategoryName(e.target.value)} 
                                                    className="h-14 border-2 pl-12 rounded-2xl font-bold bg-muted/20 focus:bg-white transition-all"
                                                    onKeyDown={e => e.key === 'Enter' && handleConfirmAddCategory()}
                                                />
                                                <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                            </div>
                                            <div className="flex items-center gap-2 px-4 border-2 rounded-2xl bg-muted/10 hover:bg-muted/20 transition-colors">
                                                <Checkbox 
                                                    id="new-category-is-daily"
                                                    checked={newCategoryIsDaily} 
                                                    onCheckedChange={(checked) => setNewCategoryIsDaily(!!checked)} 
                                                />
                                                <Label htmlFor="new-category-is-daily" className="font-bold cursor-pointer whitespace-nowrap">Is Daily</Label>
                                            </div>
                                            <Button 
                                                onClick={handleConfirmAddCategory} 
                                                disabled={isSubmitting || !newCategoryName.trim()} 
                                                className="h-14 px-8 font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
                                            >
                                                {isSubmitting ? <Loader2 className="animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                                                Add
                                            </Button>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {feeCategories.map(cat => (
                                                <motion.div 
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    key={cat.id} 
                                                    className="flex items-center justify-between p-5 rounded-2xl border-2 bg-white hover:border-primary/30 hover:shadow-md transition-all group/item"
                                                >
                                                    {editingCategoryId === cat.id ? (
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <Input
                                                                autoFocus
                                                                value={editingCategoryName}
                                                                onChange={e => setEditingCategoryName(e.target.value)}
                                                                onKeyDown={e => { if (e.key === 'Enter') handleSaveEditCategory(cat.id); if (e.key === 'Escape') { setEditingCategoryId(null); setEditingCategoryName(''); } }}
                                                                className="h-9 flex-1 font-bold"
                                                            />
                                                            <div className="flex items-center gap-1.5 px-2 bg-muted/20 rounded-md py-1 border">
                                                                <Checkbox 
                                                                    id={`edit-daily-${cat.id}`}
                                                                    checked={editingCategoryIsDaily}
                                                                    onCheckedChange={(c) => setEditingCategoryIsDaily(!!c)}
                                                                />
                                                                <Label htmlFor={`edit-daily-${cat.id}`} className="text-xs font-bold whitespace-nowrap cursor-pointer">Daily</Label>
                                                            </div>
                                                            <Button size="icon" className="h-9 w-9 rounded-xl" onClick={() => handleSaveEditCategory(cat.id)} disabled={isSubmitting}>
                                                                <Check className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl" onClick={() => { setEditingCategoryId(null); setEditingCategoryName(''); }}>
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover/item:bg-primary group-hover/item:text-white transition-colors">
                                                                    <Package className="w-6 h-6" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-sm tracking-tight capitalize">{cat.name}</span>
                                                                    {cat.isDaily && <span className="text-[10px] uppercase font-black tracking-widest text-amber-600">Daily Recurring Fee</span>}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl" onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name); setEditingCategoryIsDaily(!!cat.isDaily); }}>
                                                                                <Pencil className="w-4 h-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>Edit Category</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleConfirmDeleteCategory(cat.id, cat.name)}>
                                                                                <Trash2 className="w-5 h-5" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>Delete Category</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </div>
                                                        </>
                                                    )}
                                                </motion.div>
                                            ))}
                                            {feeCategories.length === 0 && (
                                                <div className="col-span-full py-16 text-center border-4 border-dashed rounded-[2.5rem] bg-muted/5 group-hover:bg-muted/10 transition-colors">
                                                    <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <DatabaseZap className="w-8 h-8 text-muted-foreground/40" />
                                                    </div>
                                                    <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No Custom Categories Defined</p>
                                                    <p className="text-muted-foreground/60 text-sm mt-1 font-medium">Add your first category using the field above.</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="mt-8 border-destructive/20 bg-destructive/5 overflow-hidden">
                                    <CardHeader className="py-6 border-b border-destructive/10">
                                        <div className="flex items-center gap-2 text-destructive">
                                            <AlertTriangle className="w-6 h-6" />
                                            <CardTitle className="text-heading-md">Danger Zone: Reset Financial Records</CardTitle>
                                        </div>
                                        <CardDescription className="text-destructive/80 font-medium">Permanently clear all student ledgers, fee records, payments, and attendance history.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-destructive">This action is irreversible.</p>
                                                <p className="text-xs text-muted-foreground max-w-xl">Use this feature when starting a new academic term or if you need to wipe all financial data to start over. This will also reset all student feeding and transportation rates to 0.00.</p>
                                            </div>
                                            <Button 
                                                variant="destructive" 
                                                className="h-12 px-6 font-black uppercase tracking-widest shadow-lg shadow-destructive/20"
                                                onClick={() => setIsResetDialogOpen(true)}
                                                disabled={isSubmitting}
                                            >
                                                <RefreshCcw className="mr-2 h-4 w-4" />
                                                Reset All Records
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                            </motion.div>
                        </AnimatePresence>
                        </div>
                    </main>
                </div>

                <FamilyOverviewModal
                    isOpen={isFamilyOverviewModalOpen}
                    onClose={() => {
                        setIsFamilyOverviewModalOpen(false);
                        setSelectedFamilyStudent(null);
                    }}
                    parentStudent={selectedFamilyStudent}
                    students={students}
                    feeCategories={feeCategories}
                    currentPeriod={academicPeriods.find(p => p.id === selectedPeriodId) || academicPeriods.find(p => p.isCurrent)}
                    periods={academicPeriods}
                />

                <Dialog open={isSettingsAuthOpen} onOpenChange={setIsSettingsAuthOpen}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2"><ShieldAlert className="text-destructive" /> Settings Authentication</DialogTitle>
                            <DialogDescription>Please enter your security PIN to access school settings.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleVerifySettingsPin} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="settings-pin">Security PIN</Label>
                                <Input 
                                    id="settings-pin" 
                                    type="password" 
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={4}
                                    placeholder="Enter 4-digit PIN" 
                                    value={settingsPinInput} 
                                    onChange={(e) => setSettingsPinInput(e.target.value)} 
                                    className="text-center text-2xl tracking-[1em]"
                                    autoFocus
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full">Verify & Access</Button>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!editingRateId} onOpenChange={(open) => { if (!open) { setEditingRateId(null); setEditingRateValue(''); } }}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Change Daily Rate</DialogTitle>
                            <DialogDescription>Update the daily rate for this specific record.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="daily-rate-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">New Rate (GH¢)</Label>
                            <Input 
                                id="daily-rate-input"
                                type="number" 
                                step="0.01" 
                                value={editingRateValue} 
                                onChange={(e) => setEditingRateValue(e.target.value)} 
                                placeholder="e.g. 15.00"
                                disabled={isSubmitting}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setEditingRateId(null); setEditingRateValue(''); }} disabled={isSubmitting}>Cancel</Button>
                            <Button onClick={handleSaveDailyRate} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Rate
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                    <AlertDialogContent className="max-w-md border-2 border-destructive">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-heading-md flex items-center gap-2 text-destructive">
                                <AlertTriangle className="w-6 h-6" />
                                Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-3 pt-2">
                                <p className="font-bold text-foreground">This action will PERMANENTLY DELETE:</p>
                                <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                                    <li>All student ledger transactions</li>
                                    <li>Legacy fee and payment records</li>
                                    <li>Student attendance history</li>
                                    <li>Feeding and transportation rates (reset to 0.00)</li>
                                </ul>
                                <p className="text-xs text-destructive font-bold pt-2">This cannot be undone. All financial aggregated data on the Families page will also be reset to zero.</p>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel disabled={isSubmitting} className="font-bold">Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleResetFinancials();
                                }} 
                                disabled={isSubmitting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase tracking-widest"
                            >
                                {isSubmitting ? <><Loader2 className="animate-spin mr-2" /> Resetting...</> : 'Yes, Reset Everything'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Add New Student</DialogTitle>
                            <DialogDescription>Enter the details for the new student.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddStudent}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                                {/* Column 1 */}
                                <div className="space-y-4">
                                    <div className="space-y-2"><Label htmlFor="add-studentId">Student ID</Label><Input id="add-studentId" value={addStudentForm.studentId} onChange={(e) => setAddStudentForm({...addStudentForm, studentId: e.target.value.toUpperCase()})} placeholder="e.g. FAM-J01" required disabled={isSubmitting} /></div>
                                    <div className="space-y-2"><Label htmlFor="add-name">Student's Full Name</Label><Input id="add-name" value={addStudentForm.name} onChange={(e) => setAddStudentForm({...addStudentForm, name: e.target.value})} placeholder="e.g. John Doe" required disabled={isSubmitting} /></div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-className">Class Level</Label>
                                        <Input
                                            id="add-className"
                                            list="class-names-list-add"
                                            placeholder="Select or type a class"
                                            value={addStudentForm.className}
                                            onChange={e => setAddStudentForm({ ...addStudentForm, className: e.target.value })}
                                            required
                                            disabled={isSubmitting}
                                        />
                                        <datalist id="class-names-list-add">
                                            {uniqueClassNames.map(name => <option key={name} value={name} />)}
                                        </datalist>
                                        <p className="text-xs text-muted-foreground">You can select an existing class or type a new one.</p>
                                    </div>
                                    <div className="space-y-2"><Label htmlFor="add-dob">Date of Birth</Label><DatePicker id="add-dob" value={addStudentForm.dateOfBirth} onChange={(val) => setAddStudentForm({...addStudentForm, dateOfBirth: val})} disabled={isSubmitting} /></div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-gender">Gender</Label>
                                        <Select value={addStudentForm.gender} onValueChange={(value: 'Male' | 'Female' | 'Other') => setAddStudentForm({...addStudentForm, gender: value})} required disabled={isSubmitting}>
                                            <SelectTrigger id="add-gender"><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2"><Label htmlFor="add-address">Home Address</Label><Textarea id="add-address" value={addStudentForm.address} onChange={(e) => setAddStudentForm({...addStudentForm, address: e.target.value})} placeholder="e.g. 123 School Lane, Accra" required disabled={isSubmitting}/></div>
                                </div>

                                 {/* Column 2 */}
                                 <div className="space-y-4">
                                    <ParentSelector
                                        parents={parents}
                                        selectedParentId={addStudentForm.parentId || ''}
                                        onSelectParent={(id) => setAddStudentForm({...addStudentForm, parentId: id})}
                                        onAddNewParent={async (data) => {
                                            if (!db || !auth || !schoolId) throw new Error("Missing dependencies");
                                            const newId = await addParent(db, auth, schoolId, data as any);
                                            await fetchAdminData();
                                            return newId;
                                        }}
                                        onEditParent={async (parentId, data) => {
                                            if (!db || !auth || !schoolId) throw new Error("Missing dependencies");
                                            await updateParent(db, auth, schoolId, parentId, data as any);
                                            await fetchAdminData();
                                        }}
                                        disabled={isSubmitting}
                                    />
                                    <div className="space-y-2"><Label htmlFor="add-medical">Medical Notes (Allergies, etc.)</Label><Textarea id="add-medical" value={addStudentForm.medicalNotes} onChange={(e) => setAddStudentForm({...addStudentForm, medicalNotes: e.target.value})} placeholder="e.g. Allergic to peanuts" disabled={isSubmitting}/></div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-voiceLanguage">Voice Reminder Language</Label>
                                        <Select value={addStudentForm.preferredVoiceLanguage} onValueChange={(value) => setAddStudentForm({...addStudentForm, preferredVoiceLanguage: value})} disabled={isSubmitting}>
                                            <SelectTrigger id="add-voiceLanguage">
                                                <SelectValue placeholder="Select Language" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="en-GH">English</SelectItem>
                                                <SelectItem value="tw">Twi</SelectItem>
                                                <SelectItem value="ha">Hausa</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-discount" className="text-primary font-bold">Fee Discount (%)</Label>
                                        <Input 
                                            id="add-discount" 
                                            type="number" 
                                            min="0" 
                                            max="100" 
                                            value={addStudentForm.feeDiscount} 
                                            onChange={(e) => setAddStudentForm({...addStudentForm, feeDiscount: e.target.value === '' ? '' : Number(e.target.value)})} 
                                            placeholder="e.g. 20 for 20% off" 
                                            disabled={isSubmitting} 
                                        />
                                        <p className="text-[10px] text-muted-foreground italic">Applied automatically to bulk class fees.</p>
                                    </div>
                                 </div>
                            </div>

                            <DialogFooter className="pt-6">
                                <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="animate-spin" /> Saving...</> : 'Save Student'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader><DialogTitle>Edit Student Details</DialogTitle></DialogHeader>
                        <form onSubmit={handleEditSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                                 <div className="space-y-4 md:col-span-2">
                                    <Label>Profile Picture</Label>
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-20 w-20">
                                            <AvatarImage src={photoPreview || undefined} alt="Student avatar" data-ai-hint="person portrait" />
                                            <AvatarFallback>{editStudentForm.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <Label htmlFor="edit-photo" className="cursor-pointer flex items-center gap-2 border p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                                            <Upload className="h-4 w-4" />
                                            <span>Change Photo</span>
                                        </Label>
                                        <Input id="edit-photo" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                    </div>
                                </div>

                                <div className="space-y-2"><Label htmlFor="edit-studentId">Student ID</Label><Input id="edit-studentId" value={editStudentForm.studentId} onChange={(e) => setEditStudentForm({...editStudentForm, studentId: e.target.value.toUpperCase()})} required disabled={isSubmitting} /></div>
                                <div className="space-y-2"><Label htmlFor="edit-name">Name</Label><Input id="edit-name" value={editStudentForm.name} onChange={(e) => setEditStudentForm({...editStudentForm, name: e.target.value})} required disabled={isSubmitting} /></div>
                                 <div className="space-y-2">
                                    <Label htmlFor="edit-class">Class Level</Label>
                                    <Input
                                        id="edit-class"
                                        list="class-names-list-edit"
                                        placeholder="Select or type a class"
                                        value={editStudentForm.className}
                                        onChange={e => setEditStudentForm({ ...editStudentForm, className: e.target.value })}
                                        required
                                        disabled={isSubmitting}
                                    />
                                    <datalist id="class-names-list-edit">
                                        {uniqueClassNames.map(name => <option key={name} value={name} />)}
                                    </datalist>
                                </div>

                                <div className="space-y-2"><Label htmlFor="edit-dob">Date of Birth</Label><DatePicker id="edit-dob" value={editStudentForm.dateOfBirth} onChange={(val) => setEditStudentForm({...editStudentForm, dateOfBirth: val})} disabled={isSubmitting} /></div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-gender">Gender</Label>
                                    <Select value={editStudentForm.gender} onValueChange={(value: 'Male' | 'Female' | 'Other') => setEditStudentForm({...editStudentForm, gender: value})} required disabled={isSubmitting}>
                                        <SelectTrigger id="edit-gender"><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="space-y-2 md:col-span-2"><Label htmlFor="edit-address">Home Address</Label><Textarea id="edit-address" value={editStudentForm.address} onChange={(e) => setEditStudentForm({...editStudentForm, address: e.target.value})} required disabled={isSubmitting}/></div>

                                 <div className="space-y-2 md:col-span-2">
                                    <ParentSelector
                                        parents={parents}
                                        selectedParentId={editStudentForm.parentId || ''}
                                        onSelectParent={(id) => setEditStudentForm({...editStudentForm, parentId: id})}
                                        onAddNewParent={async (data) => {
                                            if (!db || !auth || !schoolId) throw new Error("Missing dependencies");
                                            const newId = await addParent(db, auth, schoolId, data as any);
                                            await fetchAdminData();
                                            return newId;
                                        }}
                                        onEditParent={async (parentId, data) => {
                                            if (!db || !auth || !schoolId) throw new Error("Missing dependencies");
                                            await updateParent(db, auth, schoolId, parentId, data as any);
                                            await fetchAdminData();
                                        }}
                                        disabled={isSubmitting}
                                    />
                                 </div>

                                 <div className="space-y-2 md:col-span-2"><Label htmlFor="edit-medical">Medical Notes</Label><Textarea id="edit-medical" value={editStudentForm.medicalNotes} onChange={(e) => setEditStudentForm({...editStudentForm, medicalNotes: e.target.value})} disabled={isSubmitting}/></div>
                                 <div className="space-y-2">
                                     <Label htmlFor="edit-voiceLanguage">Voice Reminder Language</Label>
                                     <Select value={editStudentForm.preferredVoiceLanguage || 'en-GH'} onValueChange={(value) => setEditStudentForm({...editStudentForm, preferredVoiceLanguage: value})} disabled={isSubmitting}>
                                         <SelectTrigger id="edit-voiceLanguage">
                                             <SelectValue placeholder="Select Language" />
                                         </SelectTrigger>
                                         <SelectContent>
                                             <SelectItem value="en-GH">English</SelectItem>
                                             <SelectItem value="tw">Twi</SelectItem>
                                             <SelectItem value="ha">Hausa</SelectItem>
                                         </SelectContent>
                                     </Select>
                                 </div>
                                 <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="edit-discount" className="text-primary font-bold">Fee Discount (%)</Label>
                                    <Input 
                                        id="edit-discount" 
                                        type="number" 
                                        min="0" 
                                        max="100" 
                                        value={editStudentForm.feeDiscount} 
                                        onChange={(e) => setEditStudentForm({...editStudentForm, feeDiscount: e.target.value === '' ? 0 : Number(e.target.value)})} 
                                        disabled={isSubmitting} 
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Applied automatically to bulk class fees.</p>
                                 </div>
                                 <div className="space-y-4 md:col-span-2 border-t pt-4 mt-4">
                                    <Label className="text-destructive font-bold">Security & Access</Label>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <Button type="button" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleResetPin(true)}>
                                            Reset Student PIN to 1234
                                        </Button>
                                        {selectedStudentForEdit?.parentId && (
                                            <Button type="button" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleResetPin(false)}>
                                                Reset Parent PIN to 1234
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">If the user forgets their PIN, click to reset it to the default (1234). They will be forced to change it on next login.</p>
                                 </div>

                             </div>
                             <DialogFooter className="pt-6"><DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Student Details</DialogTitle>
                            <DialogDescription>
                                Viewing the complete profile for {selectedStudentForView?.name}.
                            </DialogDescription>
                        </DialogHeader>
                        {selectedStudentForView && (
                            <div className="py-4 space-y-6">
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <Avatar className="w-24 h-24 text-lg">
                                        <AvatarImage src={selectedStudentForView.profilePicture} alt={selectedStudentForView.name} data-ai-hint="person portrait" />
                                        <AvatarFallback>{selectedStudentForView.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1 text-center sm:text-left">
                                        <h2 className="text-2xl font-bold">{selectedStudentForView.name}</h2>
                                        <p className="text-muted-foreground">{selectedStudentForView.className} • ID: {selectedStudentForView.studentId}</p>
                                        <p className="text-sm text-muted-foreground">Born on {selectedStudentForView.dateOfBirth ? new Date(selectedStudentForView.dateOfBirth + 'T00:00:00').toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric'}) : 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg border-b pb-2">Contact Information</h3>
                                        <DetailItem icon={UserCircle} label="Parent/Guardian" value={selectedStudentForView.parentName || 'Not Available'} />
                                        <DetailItem icon={Phone} label="Parent Phone" value={selectedStudentForView.parentPhone || 'Not Available'} />
                                        <DetailItem icon={Mail} label="Parent Email" value="Not Available" />
                                        <DetailItem icon={Home} label="Home Address" value={selectedStudentForView.address || 'Not Available'} />
                                    </div>
                                    <div className="space-y-4">
                                         <h3 className="font-semibold text-lg border-b pb-2">Emergency &amp; Medical</h3>
                                        <DetailItem icon={ShieldAlert} label="Emergency Contact" value={`${selectedStudentForView.emergencyContactName} (${selectedStudentForView.emergencyContactPhone})`} />
                                        <DetailItem icon={HeartPulse} label="Medical Notes" value={selectedStudentForView.medicalNotes || "None"} />
                                        <DetailItem icon={TrendingDown} label="Fee Discount" value={selectedStudentForView.feeDiscount ? `${selectedStudentForView.feeDiscount}%` : "None"} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                 <Dialog open={isSalaryDialogOpen} onOpenChange={setIsSalaryDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Staff Details: {selectedStaffForSalary?.name}</DialogTitle>
                            <DialogDescription>Manage HR, payroll, and emergency contact information.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSalarySubmit} className="flex-1 overflow-hidden flex flex-col">
                            <ScrollArea className="flex-1 px-1 pr-4">
                                <div className="space-y-6 py-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="salary-amount">Monthly Salary (GH¢) *</Label>
                                            <Input 
                                                id="salary-amount" type="number" placeholder="0.00" 
                                                value={staffDetailsForm.amount}
                                                onChange={(e) => setStaffDetailsForm({ ...staffDetailsForm, amount: e.target.value })}
                                                required disabled={isSubmitting}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="contractType">Contract Type</Label>
                                            <Select value={staffDetailsForm.contractType} onValueChange={(val) => setStaffDetailsForm({ ...staffDetailsForm, contractType: val })}>
                                                <SelectTrigger id="contractType"><SelectValue placeholder="Select type" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Full-time">Full-time</SelectItem>
                                                    <SelectItem value="Part-time">Part-time</SelectItem>
                                                    <SelectItem value="NSS">National Service (NSS)</SelectItem>
                                                    <SelectItem value="Contract">Contract</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ssnitNumber">SSNIT Number</Label>
                                            <Input id="ssnitNumber" value={staffDetailsForm.ssnitNumber} onChange={(e) => setStaffDetailsForm({ ...staffDetailsForm, ssnitNumber: e.target.value })} disabled={isSubmitting} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ghanaCardNumber">Ghana Card Number</Label>
                                            <Input id="ghanaCardNumber" placeholder="GHA-XXXXXXXXX-X" value={staffDetailsForm.ghanaCardNumber} onChange={(e) => setStaffDetailsForm({ ...staffDetailsForm, ghanaCardNumber: e.target.value })} disabled={isSubmitting} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="bankName">Bank Name</Label>
                                            <Input id="bankName" value={staffDetailsForm.bankName} onChange={(e) => setStaffDetailsForm({ ...staffDetailsForm, bankName: e.target.value })} disabled={isSubmitting} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="accountNumber">Account Number</Label>
                                            <Input id="accountNumber" value={staffDetailsForm.accountNumber} onChange={(e) => setStaffDetailsForm({ ...staffDetailsForm, accountNumber: e.target.value })} disabled={isSubmitting} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="dateOfHire">Date of Hire</Label>
                                            <DatePicker id="dateOfHire" value={staffDetailsForm.dateOfHire} onChange={(val) => setStaffDetailsForm({ ...staffDetailsForm, dateOfHire: val })} disabled={isSubmitting} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="qualifications">Qualifications</Label>
                                            <Input id="qualifications" placeholder="e.g. B.Ed Mathematics" value={staffDetailsForm.qualifications} onChange={(e) => setStaffDetailsForm({ ...staffDetailsForm, qualifications: e.target.value })} disabled={isSubmitting} />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-border">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Emergency & Contact Info</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                                                <Input id="emergencyContactName" value={staffDetailsForm.emergencyContactName} onChange={(e) => setStaffDetailsForm({ ...staffDetailsForm, emergencyContactName: e.target.value })} disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                                                <Input id="emergencyContactPhone" type="tel" value={staffDetailsForm.emergencyContactPhone} onChange={(e) => setStaffDetailsForm({ ...staffDetailsForm, emergencyContactPhone: e.target.value })} disabled={isSubmitting} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="address">Residential Address</Label>
                                            <Textarea id="address" rows={2} value={staffDetailsForm.address} onChange={(e) => setStaffDetailsForm({ ...staffDetailsForm, address: e.target.value })} disabled={isSubmitting} />
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                            <DialogFooter className="mt-4 pt-4 border-t border-border">
                                <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="animate-spin" /> Saving...</> : 'Save Details'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
                
                <AlertDialog open={!!studentToArchive} onOpenChange={(isOpen) => !isOpen && setStudentToArchive(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Archive Student?</AlertDialogTitle><AlertDialogDescription>This will move the student to the archive. You can restore them later.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmArchiveStudent} disabled={isSubmitting}>Archive</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                
                <AlertDialog open={!!studentToDelete} onOpenChange={(isOpen) => !isOpen && setStudentToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Permanently Delete?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone and will permanently delete the student's record.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteStudent} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>Delete Permanently</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={!!staffToArchive} onOpenChange={(isOpen) => !isOpen && setStaffToArchive(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Archive Staff?</AlertDialogTitle><AlertDialogDescription>This will move <span className="font-semibold">{staffToArchive?.name}</span> to the archive and prevent them from logging in. You can restore them later.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmArchiveStaff} disabled={isSubmitting}>Archive</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                
                <AlertDialog open={!!staffToDelete} onOpenChange={(isOpen) => !isOpen && setStaffToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Permanently Delete?</AlertDialogTitle><AlertDialogDescription>This will permanently delete <span className="font-semibold">{staffToDelete?.name}</span> and all associated data. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteStaff} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>Delete Permanently</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={!!categoryToClear} onOpenChange={(isOpen) => !isOpen && setCategoryToClear(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Clear Daily Recurring Fees?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to clear/void ALL <span className="font-semibold">{categoryToClear?.categoryName}</span> records for this student? This will reset their balance for this fee category.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearDailyFees} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>
                                Clear Records
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                
                 <AlertDialog open={!!expenditureToDelete} onOpenChange={(isOpen) => !isOpen && setExpenditureToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the expenditure record for "{expenditureToDelete?.description}".</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteExpenditure} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>Delete Expenditure</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={!!debtToDelete} onOpenChange={(isOpen) => !isOpen && setDebtToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the debt record for "{debtToDelete?.creditor}".</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteDebt} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>Delete Debt</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                 <AlertDialog open={!!eventToDelete} onOpenChange={(isOpen) => !isOpen && setEventToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the calendar event "{eventToDelete?.title}".</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteEvent} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>Delete Event</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {isParentBulkModalOpen && db && auth && schoolId && (
                    <ParentBulkPaymentModal
                        isOpen={isParentBulkModalOpen}
                        onClose={() => setIsParentBulkModalOpen(false)}
                        students={students}
                        feeCategories={feeCategories}
                        schoolId={schoolId}
                        db={db}
                        auth={auth}
                        periodId={selectedPeriodId || undefined}
                        periods={academicPeriods}
                        onSuccess={fetchAdminData}
                    />
                )}

                {isParentBulkMainModalOpen && db && auth && schoolId && selectedPeriod && (
                    <ParentBulkMainPaymentModal
                        isOpen={isParentBulkMainModalOpen}
                        onClose={() => setIsParentBulkMainModalOpen(false)}
                        students={students}
                        feeCategories={feeCategories}
                        schoolId={schoolId}
                        db={db}
                        auth={auth}
                        period={selectedPeriod}
                        periods={academicPeriods}
                        onSuccess={fetchAdminData}
                    />
                )}

                {/* Unified Ledger Transaction Modal */}
                <RecordTransactionModal 
                    isOpen={isRecordTransactionModalOpen}
                    onClose={() => setIsRecordTransactionModalOpen(false)}
                    student={selectedStudent}
                    initialType={transactionModalInitialType}
                    initialCategoryId={transactionModalInitialCategoryId}
                    transactionToEdit={transactionToEdit}
                    academicPeriods={academicPeriods}
                    feeCategories={feeCategories}
                    onSuccess={fetchAdminData}
                    db={db}
                    auth={auth}
                    filterType={feesActiveSubTab as 'main' | 'daily'}
                />

                <ApplyAdmissionBillModal
                    isOpen={isAdmissionBillModalOpen}
                    onClose={() => setIsAdmissionBillModalOpen(false)}
                    student={selectedStudent}
                    schoolId={schoolId || ''}
                    db={db}
                    auth={auth}
                    onSuccess={fetchAdminData}
                    feeCategories={feeCategories}
                    periodId={selectedPeriodId || ''}
                />

                <VoidTransactionModal
                    isOpen={!!transactionToVoid}
                    onClose={() => setTransactionToVoid(null)}
                    studentId={selectedStudentId || ''}
                    transactionId={transactionToVoid || ''}
                    schoolId={schoolId || ''}
                    db={db}
                    auth={auth}
                    onSuccess={fetchAdminData}
                />

                {/* Bulk Class Fee Dialog */}
                <Dialog open={isBulkFeeDialogOpen} onOpenChange={setIsBulkFeeDialogOpen}>
                    <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[95vh] flex flex-col">
                        <DialogHeader className="p-8 bg-primary text-white font-sans shrink-0">
                            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                                <FilePlus className="w-8 h-8" /> Record Class Fee
                            </DialogTitle>
                            <DialogDescription className="text-white/80 font-medium">
                                Apply this fee to ALL students currently in <strong>{selectedClassForFees}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handlePostBulkTransaction} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Category</Label>
                                        <Select value={bulkFeeForm.category} onValueChange={(val: any) => setBulkFeeForm({...bulkFeeForm, category: val})} required>
                                            <SelectTrigger className="h-12 border-primary/20 focus:ring-primary shadow-sm bg-muted/30 font-bold">
                                                <SelectValue placeholder="Select Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(feesActiveSubTab === 'daily' ? dailyCategoriesForModal : feeCategories.filter(c => !c.isDaily)).map(cat => (
                                                    <SelectItem key={cat.id} value={cat.id} className="font-bold">{cat.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Amount (GH¢)</Label>
                                        <Input 
                                            type="number" 
                                            placeholder={feesActiveSubTab === 'daily' ? "Use individual rates if empty" : "0.00"} 
                                            value={bulkFeeForm.amount} 
                                            onChange={e => setBulkFeeForm({...bulkFeeForm, amount: e.target.value})} 
                                            required={feesActiveSubTab !== 'daily'}
                                            className="h-12 border-primary/20 shadow-sm bg-muted/30 text-numeric text-lg font-black"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 transition-all hover:bg-primary/10">
                                    <Checkbox 
                                        id="applyDiscounts" 
                                        checked={bulkFeeForm.applyDiscounts} 
                                        onCheckedChange={(checked) => setBulkFeeForm({...bulkFeeForm, applyDiscounts: checked as boolean})}
                                        className="h-5 w-5 border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:text-white"
                                    />
                                    <div className="grid gap-1 leading-none">
                                        <Label 
                                            htmlFor="applyDiscounts" 
                                            className="text-xs font-black uppercase tracking-widest text-primary cursor-pointer select-none"
                                        >
                                            Respect student-specific discounts
                                        </Label>
                                        <p className="text-[10px] text-muted-foreground font-medium">
                                            If checked, students with an assigned discount percentage will be charged the discounted rate.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Description (Optional)</Label>
                                    <Input 
                                        placeholder="e.g. Second Term Tuition" 
                                        value={bulkFeeForm.description} 
                                        onChange={e => setBulkFeeForm({...bulkFeeForm, description: e.target.value})} 
                                        className="h-12 border-primary/20 shadow-sm bg-muted/30 font-medium"
                                    />
                                </div>

                                <div className="space-y-3 p-4 bg-muted/30 rounded-2xl border border-primary/10">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-black uppercase tracking-widest text-primary">Students to Charge</Label>
                                        <span className="text-[10px] font-bold text-muted-foreground">{selectedBulkStudentIds.length} Selected</span>
                                    </div>
                                    <div className="max-h-[150px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                        {students.filter(s => s.className === selectedClassForFees).map(student => {
                                            const discount = student.feeDiscount || 0;
                                            return (
                                                <div key={student.studentId} className="flex items-center justify-between p-2 hover:bg-primary/5 rounded-xl transition-colors group">
                                                    <div className="flex items-center gap-3">
                                                        <Checkbox 
                                                            id={`bulk-${student.studentId}`} 
                                                            checked={selectedBulkStudentIds.includes(student.studentId)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedBulkStudentIds(prev => [...prev, student.studentId]);
                                                                } else {
                                                                    setSelectedBulkStudentIds(prev => prev.filter(id => id !== student.studentId));
                                                                }
                                                            }}
                                                            className="h-4 w-4 border-primary/30"
                                                        />
                                                        <Label htmlFor={`bulk-${student.studentId}`} className="text-sm font-bold cursor-pointer">{student.name}</Label>
                                                    </div>
                                                    {discount > 0 && (
                                                        <Badge variant="outline" className="text-[9px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200">
                                                            {discount}% Discount
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex gap-2 pt-1 border-t border-primary/5 mt-2">
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setSelectedBulkStudentIds(students.filter(s => s.className === selectedClassForFees).map(s => s.studentId))}
                                            className="text-[9px] h-6 uppercase font-black"
                                        >
                                            Select All
                                        </Button>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setSelectedBulkStudentIds([])}
                                            className="text-[9px] h-6 uppercase font-black text-destructive"
                                        >
                                            Clear All
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant={"outline"} className="w-full h-12 justify-start text-left border-primary/20 bg-muted/30">
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {bulkFeeForm.date ? bulkFeeForm.date.split('-').reverse().join('/') : <span>Pick date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={bulkFeeForm.date ? new Date(bulkFeeForm.date + 'T00:00:00') : undefined}
                                                    onSelect={(date) => date && setBulkFeeForm({ ...bulkFeeForm, date: date.toISOString().split('T')[0] })}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Academic Term</Label>
                                        <Select value={bulkFeeForm.periodId} onValueChange={(val: any) => setBulkFeeForm({...bulkFeeForm, periodId: val})}>
                                            <SelectTrigger className="h-12 border-primary/20 focus:ring-primary shadow-sm bg-muted/30 font-bold">
                                                <SelectValue placeholder="Select Term" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {academicPeriods.map(p => (
                                                    <SelectItem key={p.id} value={p.id} className="font-bold">
                                                        {p.year} - {p.term}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3">
                                    <AlertCircleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="text-xs text-amber-800 leading-relaxed font-medium">
                                        This will create a ledger entry for every student in this class.
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-muted/10 border-t shrink-0">
                                <Button type="submit" className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all rounded-2xl font-sans" disabled={isSubmitting}>
                                    {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin mr-3" /> Processing...</> : 'Apply to Class'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
                <Dialog open={isAcademicSetupOpen} onOpenChange={setIsAcademicSetupOpen}>
                    <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                        <div className="p-8 pb-4 border-b bg-card">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-3 font-sans text-2xl font-black text-primary">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                        <CalendarDays className="w-6 h-6"/>
                                    </div>
                                    Academic Setup & Installments
                                </DialogTitle>
                                <DialogDescription className="text-sm font-medium text-muted-foreground pl-11">
                                    Configure academic terms and define detailed payment structures.
                                </DialogDescription>
                            </DialogHeader>
                        </div>
                        
                        <ScrollArea className="flex-1">
                            <div className="p-8">
                                <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-10">
                                    {/* --- LEFT COLUMN: FORM --- */}
                                    <section className="space-y-8">
                                        <div className="flex items-center gap-2 px-1">
                                            <div className="w-1 h-4 bg-primary rounded-full" />
                                            <h3 className="text-sm uppercase tracking-widest font-black text-primary/70">{editingPeriodId ? 'Edit Academic Term' : 'Create New Term'}</h3>
                                        </div>

                                        <form onSubmit={handleAddAcademicPeriod} className="space-y-8">
                                            <Card className="border-2 border-primary/10 shadow-none bg-primary/5 rounded-3xl overflow-hidden">
                                                <CardContent className="p-8 space-y-6">
                                                    <div className="grid md:grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-black uppercase text-muted-foreground ml-1">Academic Year</Label>
                                                            <Input placeholder="e.g. 2025/2026" value={newPeriodForm.year} onChange={e => setNewPeriodForm({...newPeriodForm, year: e.target.value})} required disabled={isSubmitting} className="h-12 bg-background border-primary/10 text-lg font-bold rounded-2xl focus:ring-primary/20"/>
                                                            <p className="text-xs text-muted-foreground/60 ml-1 leading-none mt-1">Format: YYYY/YYYY (e.g. 2026/2027)</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-black uppercase text-muted-foreground ml-1">Term Name</Label>
                                                            <Select value={newPeriodForm.term} onValueChange={(val: any) => setNewPeriodForm({...newPeriodForm, term: val})}>
                                                                <SelectTrigger className="h-12 bg-background border-primary/10 text-lg font-bold rounded-2xl"><SelectValue/></SelectTrigger>
                                                                <SelectContent className="rounded-2xl border-2">
                                                                    <SelectItem value="First Term" className="font-bold">First Term</SelectItem>
                                                                    <SelectItem value="Second Term" className="font-bold">Second Term</SelectItem>
                                                                    <SelectItem value="Third Term" className="font-bold">Third Term</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <p className="text-xs text-muted-foreground/60 ml-1 leading-none mt-1">Select the current school term</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-black uppercase text-muted-foreground ml-1">Start Date</Label>
                                                            <DatePicker value={newPeriodForm.startDate} onChange={val => setNewPeriodForm({...newPeriodForm, startDate: val})} disabled={isSubmitting} className="h-12 bg-background border-primary/10 font-bold rounded-2xl"/>
                                                            <p className="text-xs text-muted-foreground/60 ml-1 leading-none mt-1">When students return to school</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-black uppercase text-muted-foreground ml-1">End Date</Label>
                                                            <DatePicker value={newPeriodForm.endDate} onChange={val => setNewPeriodForm({...newPeriodForm, endDate: val})} disabled={isSubmitting} className="h-12 bg-background border-primary/10 font-bold rounded-2xl"/>
                                                            <p className="text-xs text-muted-foreground/60 ml-1 leading-none mt-1">Last day of the term</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-black uppercase text-muted-foreground ml-1">Mid-Term Break Date</Label>
                                                            <DatePicker value={newPeriodForm.vacationDate} onChange={val => setNewPeriodForm({...newPeriodForm, vacationDate: val})} disabled={isSubmitting} className="h-12 bg-background border-primary/10 font-bold rounded-2xl"/>
                                                            <p className="text-xs text-muted-foreground/60 ml-1 leading-none mt-1">When the mid-term or end-of-term break starts</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-black uppercase text-muted-foreground ml-1">Next Term Start Date</Label>
                                                            <DatePicker value={newPeriodForm.nextTermBegins} onChange={val => setNewPeriodForm({...newPeriodForm, nextTermBegins: val})} disabled={isSubmitting} className="h-12 bg-background border-primary/10 font-bold rounded-2xl"/>
                                                            <p className="text-xs text-muted-foreground/60 ml-1 leading-none mt-1">Date when the following term starts</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between px-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1 h-4 bg-amber-500 rounded-full" />
                                                        <h3 className="text-sm uppercase tracking-widest font-black text-amber-600/80">Installment Plan</h3>
                                                    </div>
                                                    <Button 
                                                        type="button" 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-10 px-6 rounded-2xl border-amber-200 bg-amber-50 text-amber-700 font-bold hover:bg-amber-100 transition-all active:scale-95 shadow-sm"
                                                        onClick={() => setNewPeriodForm({
                                                            ...newPeriodForm, 
                                                            installmentPlan: [...(newPeriodForm.installmentPlan || []), { id: Date.now().toString(), percentage: 0, deadlineType: 'Week', deadlineValue: '' }]
                                                        })}
                                                    >
                                                        <PlusCircle className="w-4 h-4 mr-2"/> Add Stage
                                                    </Button>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 gap-6">
                                                    {newPeriodForm.installmentPlan?.map((stage, index) => (
                                                        <motion.div 
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            key={stage.id} 
                                                            className="relative group bg-card border-2 border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500"
                                                        >
                                                            <div className="grid md:grid-cols-3 gap-8">
                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Stage (%)</Label>
                                                                    <div className="relative">
                                                                        <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                                                        <Input 
                                                                            type="number" 
                                                                            min="1" max="100"
                                                                            className="h-14 pl-12 rounded-2xl font-black text-xl border-slate-100 bg-slate-50 focus:bg-white transition-all"
                                                                            placeholder="0"
                                                                            value={stage.percentage || ''} 
                                                                            onChange={e => {
                                                                                const newPlan = [...(newPeriodForm.installmentPlan || [])];
                                                                                newPlan[index].percentage = parseInt(e.target.value) || 0;
                                                                                setNewPeriodForm({...newPeriodForm, installmentPlan: newPlan});
                                                                            }} 
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deadline Mode</Label>
                                                                    <Select 
                                                                        value={stage.deadlineType} 
                                                                        onValueChange={(val: any) => {
                                                                            const newPlan = [...(newPeriodForm.installmentPlan || [])];
                                                                            newPlan[index].deadlineType = val;
                                                                            newPlan[index].deadlineValue = '';
                                                                            setNewPeriodForm({...newPeriodForm, installmentPlan: newPlan});
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="h-14 rounded-2xl font-bold border-slate-100 bg-slate-50 focus:bg-white transition-all">
                                                                            <SelectValue/>
                                                                        </SelectTrigger>
                                                                        <SelectContent className="rounded-2xl border-2">
                                                                            <SelectItem value="Week" className="font-bold">By Week Number</SelectItem>
                                                                            <SelectItem value="Date" className="font-bold">By Calendar Date</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                                                        {stage.deadlineType === 'Week' ? 'Week Reference' : 'Due Date'}
                                                                    </Label>
                                                                    <div className="relative">
                                                                        <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                                                        <Input 
                                                                            type={stage.deadlineType === 'Week' ? "number" : "date"}
                                                                            className="h-14 pl-12 rounded-2xl font-bold border-slate-100 bg-slate-50 focus:bg-white transition-all" 
                                                                            placeholder={stage.deadlineType === 'Week' ? "e.g. 4" : ""}
                                                                            value={stage.deadlineType === 'Week' ? (stage.deadlineValue.replace('Week ', '') || '') : (stage.deadlineValue || '')} 
                                                                            onChange={e => {
                                                                                const newPlan = [...(newPeriodForm.installmentPlan || [])];
                                                                                newPlan[index].deadlineValue = stage.deadlineType === 'Week' ? `Week ${e.target.value}` : e.target.value;
                                                                                setNewPeriodForm({...newPeriodForm, installmentPlan: newPlan});
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <Button 
                                                                type="button" 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="absolute -top-4 -right-4 h-10 w-10 bg-white border-2 border-red-50 text-red-500 hover:text-white hover:bg-red-500 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100 z-10"
                                                                onClick={() => {
                                                                    const newPlan = (newPeriodForm.installmentPlan || []).filter((_, i) => i !== index);
                                                                    setNewPeriodForm({ ...newPeriodForm, installmentPlan: newPlan });
                                                                }}
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </Button>
                                                        </motion.div>
                                                    ))}

                                                    {(!newPeriodForm.installmentPlan || newPeriodForm.installmentPlan.length === 0) && (
                                                        <div className="py-12 border-4 border-dashed rounded-[3rem] bg-slate-50/50 flex flex-col items-center justify-center text-center">
                                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                                                <Wallet className="w-8 h-8 text-slate-300" />
                                                            </div>
                                                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No Installments Defined</p>
                                                            <p className="text-slate-400/60 text-sm mt-1">Click "Add Stage" to build your payment plan.</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {newPeriodForm.installmentPlan && newPeriodForm.installmentPlan.length > 0 && (
                                                    <div className="bg-primary/5 rounded-[2.5rem] p-6 border-2 border-primary/10 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                <CheckCheck className="w-6 h-6" />
                                                            </div>
                                                            <span className="text-sm font-black uppercase tracking-widest text-primary/60">Total Structure Coverage:</span>
                                                        </div>
                                                        <span className={cn(
                                                            "text-3xl font-black tracking-tighter px-6 py-2 rounded-2xl",
                                                            newPeriodForm.installmentPlan.reduce((acc, s) => acc + (s.percentage || 0), 0) === 100 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                                        )}>
                                                            {newPeriodForm.installmentPlan.reduce((acc, s) => acc + (s.percentage || 0), 0)}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-4 pt-6">
                                                <Button type="submit" className="flex-1 h-16 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-lg rounded-[2rem]" disabled={isSubmitting}>
                                                    {isSubmitting ? <><Loader2 className="w-6 h-6 animate-spin mr-3"/> Processing...</> : (editingPeriodId ? "Update Academic Period" : "Activate New Term")}
                                                </Button>
                                                {editingPeriodId && (
                                                    <Button type="button" variant="outline" className="h-16 px-8 rounded-[2rem] border-2 font-bold" onClick={() => {
                                                        setEditingPeriodId(null);
                                                        setNewPeriodForm({ year: '', term: 'First Term', startDate: '', endDate: '', vacationDate: '', nextTermBegins: '', installmentPlan: [] });
                                                    }}>Cancel</Button>
                                                )}
                                            </div>
                                            
                                            {/* Extra spacing for scroll */}
                                            <div className="h-12" />
                                        </form>
                                    </section>
                                    
                                    {/* --- RIGHT COLUMN: HISTORY --- */}
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-2 px-1">
                                            <div className="w-1 h-4 bg-slate-400 rounded-full" />
                                            <h3 className="text-sm uppercase tracking-widest font-black text-slate-500">Academic History</h3>
                                        </div>
                                        <div className="border-2 border-slate-100 rounded-[2.5rem] bg-slate-50/30 overflow-hidden divide-y divide-slate-100">
                                            {academicPeriods.length === 0 ? (
                                                <div className="p-20 text-center">
                                                    <CalendarDays className="w-12 h-12 mx-auto text-slate-200 mb-4" />
                                                    <p className="text-sm text-slate-400 font-medium">No historical records found.</p>
                                                </div>
                                            ) : (
                                                academicPeriods.map(p => (
                                                    <div key={p.id} className={cn("p-6 flex items-center justify-between transition-all group", p.isCurrent ? "bg-white border-l-4 border-l-primary" : "hover:bg-white")}>
                                                        <div className="flex flex-col gap-1">
                                                            <p className="font-black text-lg tracking-tight text-slate-800">{p.year}</p>
                                                            <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">{p.term}</p>
                                                            {p.isCurrent && (
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <span className="relative flex h-2 w-2">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                    </span>
                                                                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase tracking-widest">Active Now</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {!p.isCurrent && (
                                                                <Button variant="ghost" size="sm" className="h-10 px-4 text-xs font-black uppercase tracking-widest border-2 border-transparent hover:border-primary/20 hover:bg-primary/5 text-primary rounded-xl transition-all" onClick={() => handleSetCurrentPeriod(p.id)} disabled={isSubmitting}>
                                                                    Set Active
                                                                </Button>
                                                            )}
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                                <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl" onClick={() => {
                                                                    setEditingPeriodId(p.id);
                                                                    setNewPeriodForm({
                                                                        year: p.year,
                                                                        term: p.term,
                                                                        startDate: p.startDate || '',
                                                                        endDate: p.endDate || '',
                                                                        vacationDate: p.vacationDate || '',
                                                                        nextTermBegins: p.nextTermBegins || '',
                                                                        installmentPlan: p.installmentPlan || []
                                                                    });
                                                                }} disabled={isSubmitting}>
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => {
                                                                    if (confirm(`Delete ${p.term} for ${p.year}?`)) {
                                                                        handleDeleteAcademicPeriod(p.id);
                                                                    }
                                                                }} disabled={isSubmitting}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </div>
            <AlertDialog open={!!announcementToDelete} onOpenChange={(isOpen) => !isOpen && setAnnouncementToDelete(null)}>
                <AlertDialogContent className="rounded-2xl border-4 border-destructive">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black font-headline">Permanently Delete Announcement?</AlertDialogTitle>
                        <AlertDialogDescription className="text-base font-bold">
                            This will remove the message "{announcementToDelete?.subject}" from all parent dashboards. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-full border-2">Keep Message</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAnnouncement} className="bg-destructive hover:bg-destructive/90 rounded-full font-bold px-8" disabled={isSubmitting}>
                            Delete Forever
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <BulkFeeReminderModal
                isOpen={isBulkReminderModalOpen}
                onClose={() => setIsBulkReminderModalOpen(false)}
                students={students}
                parents={parents}
                feeCategories={feeCategories}
                schoolId={schoolId}
            />
            <GenerateTermBillsModal
                isOpen={isGenerateTermBillsModalOpen}
                onClose={() => setIsGenerateTermBillsModalOpen(false)}
                school={schoolDetails}
                students={students}
                parents={parents}
                initialStudentId={selectedStudentId}
                initialClassName={selectedClassForFees !== 'all' ? selectedClassForFees : null}
                currentPeriodId={selectedPeriodId}
                periods={academicPeriods}
                feeCategories={feeCategories}
            />

            <MonthlyReportConfigModal
                isOpen={isReportConfigModalOpen}
                onClose={() => setIsReportConfigModalOpen(false)}
                onGenerate={(config) => setPrintReportConfig(config)}
            />
            <BulkDailyRatesModal
                isOpen={isBulkDailyRatesModalOpen}
                onClose={() => setBulkDailyRatesModalOpen(false)}
                students={selectedClassForFees !== 'all' ? students.filter(s => s.className === selectedClassForFees && !s.isArchived) : []}
                feeCategories={feeCategories}
                db={db}
                auth={auth}
                storage={storage}
                schoolId={schoolId}
                onSuccess={() => {
                    fetchAdminData();
                }}
            />
            {db && auth && storage && schoolId && (
                <MigrationModal
                    isOpen={isMigrationModalOpen}
                    onClose={() => setIsMigrationModalOpen(false)}
                    students={students}
                    db={db}
                    auth={auth}
                    storage={storage}
                    schoolId={schoolId}
                    onComplete={() => fetchAdminData()}
                />
            )}
            </>
    );
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    </div>
);

interface ExpenditureSectionProps {
    title: string;
    description: string;
    income: number;
    totalExpenditure: number;
    expenditures: Expenditure[];
    categories: string[];
    onAddExpenditure: (form: typeof defaultExpenditureForm) => Promise<void>;
    onDeleteExpenditure: (exp: Expenditure) => void;
    isSubmitting: boolean;
}

const ExpenditureSection: React.FC<ExpenditureSectionProps> = ({
    title,
    description,
    income,
    totalExpenditure,
    expenditures,
    categories,
    onAddExpenditure,
    onDeleteExpenditure,
    isSubmitting,
}) => {
    const [localForm, setLocalForm] = useState({ ...defaultExpenditureForm });
    const [isCategorizing, setIsCategorizing] = useState(false);
    const [aiSuggested, setAiSuggested] = useState(false);
    const net = income - totalExpenditure;
    
    // Auto categorize when description blurs
    const handleBlurDescription = async () => {
        if (!localForm.description || localForm.description.length < 3) return;
        
        setIsCategorizing(true);
        setAiSuggested(false);
        try {
            const res = await fetch('/api/ai/categorize-expenditure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: localForm.description })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.category && data.category !== 'Other') {
                    setLocalForm(prev => ({ ...prev, category: data.category }));
                    setAiSuggested(true);
                }
            }
        } catch (error) {
            console.error("Failed to auto-categorize:", error);
        } finally {
            setIsCategorizing(false);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onAddExpenditure(localForm);
        setLocalForm({ ...defaultExpenditureForm });
        setAiSuggested(false);
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-heading-md">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Card className="bg-muted/30">
                    <CardHeader><CardTitle className="text-heading-md font-sans">Financial Snapshot</CardTitle></CardHeader>
                    <CardContent>
                         <div className="grid grid-cols-3 gap-4 text-center">
                            <div><p className="text-sm text-muted-foreground font-sans font-medium">Total Income</p><p className="text-xl font-bold text-success text-numeric">GH¢{(income || 0).toFixed(2)}</p></div>
                            <div><p className="text-sm text-muted-foreground font-sans font-medium">Total Expenditure</p><p className="text-xl font-bold text-destructive text-numeric">GH¢{(totalExpenditure || 0).toFixed(2)}</p></div>
                            <div><p className="text-sm text-muted-foreground font-sans font-medium">Net</p><p className={`text-xl font-bold ${net >= 0 ? 'text-success' : 'text-destructive'} text-numeric`}>GH¢{(net || 0).toFixed(2)}</p></div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle className="text-heading-md">Record New Expenditure</CardTitle></CardHeader>
                        <form onSubmit={handleFormSubmit}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input 
                                        placeholder="e.g. Purchase of new textbooks" 
                                        value={localForm.description} 
                                        onChange={e => setLocalForm({...localForm, description: e.target.value})} 
                                        onBlur={handleBlurDescription}
                                        required 
                                        disabled={isSubmitting}
                                    />
                                    {isCategorizing && <p className="text-xs text-muted-foreground animate-pulse flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI is categorizing...</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Amount (GH¢)</Label><Input type="number" placeholder="0.00" value={localForm.amount} onChange={e => setLocalForm({...localForm, amount: e.target.value})} required disabled={isSubmitting}/></div>
                                    <div className="space-y-2"><Label>Date</Label><DatePicker value={localForm.date} onChange={val => setLocalForm({...localForm, date: val})} disabled={isSubmitting}/></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Category</Label>
                                        {aiSuggested && <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI Suggested</span>}
                                    </div>
                                    <Select value={localForm.category} onValueChange={(value) => { setLocalForm({...localForm, category: value}); setAiSuggested(false); }} required disabled={isSubmitting}>
                                        <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                                        <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                            <DialogFooter className="px-6 pb-6"><Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="animate-spin" /> Recording...</> : 'Record Expenditure'}</Button></DialogFooter>
                        </form>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-heading-md">Expenditure History</CardTitle></CardHeader>
                        <CardContent>
                            {expenditures.length === 0 ? <EmptyState title="No Expenditures" description="Records added will display here." /> : (
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Details</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {expenditures.map(exp => (
                                            <TableRow key={exp.id}>
                                                <TableCell><div className="font-medium">{exp.description}</div><div className="text-xs text-muted-foreground">{exp.category} &bull; {new Date(exp.date).toLocaleDateString('en-GB')}</div></TableCell>
                                                <TableCell className="text-right text-numeric">GH¢{Number(exp.amount).toFixed(2)}</TableCell>
                                                <TableCell className="text-right"><Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => onDeleteExpenditure(exp)} disabled={isSubmitting}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>

    );
};

export default function AdminDashboardPage() {

    return (
        <TooltipProvider>
            <Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center bg-background"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
                <AdminDashboard />
            </Suspense>
        </TooltipProvider>
    )
}

