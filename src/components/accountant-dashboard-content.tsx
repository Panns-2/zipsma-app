'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/client-provider';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import {
    Student,
    AcademicPeriod,
    FeeCategory,
    Expenditure,
    Debt,
    StaffId,
    LedgerTransaction,
    getStudents,
    getExpenditures,
    getDebts,
    getAcademicPeriods,
    getFeeCategories,
    getSchoolDetails,
    postBulkDailyPayments,
    addExpenditure,
    deleteExpenditure,
    addDebt,
    deleteDebt,
    voidLedgerTransaction,
    voidFeeCategoryRecords,
    isDailyTransaction,
    calculateInstallmentExpectedAmount,
    School
} from '@/lib/data-store';
import {
    Wallet,
    Landmark,
    TrendingDown,
    Users,
    Search,
    PlusCircle,
    Trash2,
    Loader2,
    LogOut,
    Calendar,
    ChevronRight,
    FileText,
    TrendingUp,
    Receipt,
    AlertCircle,
    LayoutDashboard,
    Menu,
    X,
    User,
    HelpCircle,
    ArrowUpRight,
    DollarSign
} from 'lucide-react';
import { ZipSMALogo } from '@/components/zipsma-logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LedgerTable } from '@/components/admin-dashboard/ledger-table';
import { RecordTransactionModal } from '@/components/admin-dashboard/record-transaction-modal';
import { ParentBulkPaymentModal } from '@/components/admin-dashboard/parent-bulk-payment-modal';
import { ParentBulkMainPaymentModal } from '@/components/admin-dashboard/parent-bulk-main-payment-modal';
import { generateReceipt } from '@/lib/receipt-utils';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface AccountantDashboardContentProps {
    staffMember: StaffId;
    handleLogout: () => void;
    currentDate: string;
}

const defaultExpenditureForm = { description: '', category: '', amount: '', date: new Date().toISOString().split('T')[0], type: 'General' as 'General' | 'Feeding' | 'Transportation' };
const defaultDebtForm = { creditor: '', description: '', amount: '', date: new Date().toISOString().split('T')[0] };

const generalExpenditureCategories = ["Salaries", "Utilities (Water, Electricity)", "Rent/Mortgage", "Loan Repayment", "Taxes & Levies", "School Supplies (Stationery, etc.)", "Maintenance & Repairs", "Marketing & Advertising", "Technology (Software, Internet)", "Savings to Bank", "Other"];
const feedingExpenditureCategories = ["Food & Catering", "Kitchen Staff Salaries", "Utensils & Equipment", "Other"];
const transportationExpenditureCategories = ["Fuel", "Vehicle Maintenance", "Driver Salaries", "Loan Repayment", "Other"];

export default function AccountantDashboardContent({ staffMember, handleLogout, currentDate }: AccountantDashboardContentProps) {
    const { db, auth } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const schoolId = staffMember.schoolId;

    const [students, setStudents] = useState<Student[]>([]);
    const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [academicPeriods, setAcademicPeriods] = useState<AcademicPeriod[]>([]);
    const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<School | null>(null);

    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
    const [selectedClassForFees, setSelectedClassForFees] = useState<string>('all');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [feesActiveSubTab, setFeesActiveSubTab] = useState<'main' | 'daily'>('main');
    const [selectedDailyCategoryForPayments, setSelectedDailyCategoryForPayments] = useState<string>('feeding');
    const [selectedPaymentDate, setSelectedPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [bulkDailyPaymentsSelection, setBulkDailyPaymentsSelection] = useState<Record<string, boolean>>({});

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [expenditureForm, setExpenditureForm] = useState(defaultExpenditureForm);
    const [debtForm, setDebtForm] = useState(defaultDebtForm);

    const [isRecordTransactionModalOpen, setIsRecordTransactionModalOpen] = useState(false);
    const [transactionModalInitialType, setTransactionModalInitialType] = useState<'fee' | 'payment' | 'adjustment'>('payment');
    const [transactionModalInitialCategoryId, setTransactionModalInitialCategoryId] = useState<string | undefined>(undefined);
    const [transactionToEdit, setTransactionToEdit] = useState<LedgerTransaction | null>(null);
    const [isParentBulkModalOpen, setIsParentBulkModalOpen] = useState(false);
    const [isParentBulkMainModalOpen, setIsParentBulkMainModalOpen] = useState(false);

    const [categoryToClear, setCategoryToClear] = useState<{ studentId: string, categoryId: string, categoryName: string, docId?: string } | null>(null);

    // Fetch dashboard data
    const fetchAccountantData = useCallback(async () => {
        if (!db || !schoolId) return;
        setIsLoading(true);
        try {
            const schoolData = await getSchoolDetails(db, schoolId);
            const currentPeriod = selectedPeriodId || schoolData?.currentPeriodId;

            const [allStudents, allExpenditures, allDebts, allPeriods, allFeeCategories] = await Promise.all([
                getStudents(db, schoolId, false),
                getExpenditures(db, schoolId, currentPeriod || undefined),
                getDebts(db, schoolId, currentPeriod || undefined),
                getAcademicPeriods(db, schoolId),
                getFeeCategories(db, schoolId)
            ]);

            if (schoolData) setSchoolDetails(schoolData);
            if (allStudents) {
                setStudents(allStudents);
                setSelectedStudentId(prev => {
                    if (allStudents.length > 0) {
                        const stillExists = allStudents.some(s => s.studentId === prev);
                        return stillExists ? prev : allStudents[0].studentId;
                    }
                    return null;
                });
            }
            if (allExpenditures) setExpenditures(allExpenditures);
            if (allDebts) setDebts(allDebts);
            if (allPeriods) setAcademicPeriods(allPeriods);
            if (allFeeCategories) {
                setFeeCategories(allFeeCategories);
                const dailyCats = allFeeCategories.filter(c => c.isDaily);
                if (dailyCats.length > 0) {
                    setSelectedDailyCategoryForPayments(prev => {
                        const isValid = dailyCats.some(c => c.id === prev);
                        if (isValid) return prev;
                        const feedingCat = dailyCats.find(c => c.name.toLowerCase().trim() === 'feeding fee' || c.name.toLowerCase().trim() === 'feeding');
                        if (feedingCat) return feedingCat.id;
                        return dailyCats[0].id;
                    });
                }
            }

            if (!selectedPeriodId && schoolData?.currentPeriodId) {
                setSelectedPeriodId(schoolData.currentPeriodId);
            } else if (!selectedPeriodId && allPeriods && allPeriods.length > 0) {
                const current = allPeriods.find(p => p.isCurrent) || allPeriods[0];
                setSelectedPeriodId(current.id);
            }
        } catch (error: any) {
            console.error('Critical Accountant Data Fetch Error:', error);
            toast({
                title: 'Data Fetch Error',
                description: 'Failed to load financial records. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [db, schoolId, selectedPeriodId, toast]);

    useEffect(() => {
        fetchAccountantData();
    }, [fetchAccountantData]);

    // Re-initialize daily payment selection when category or date changes
    useEffect(() => {
        setBulkDailyPaymentsSelection({});
    }, [selectedPaymentDate, selectedDailyCategoryForPayments]);

    // Filtering students
    const filteredStudents = useMemo(() => {
        if (!searchQuery) return students;
        return students.filter(student =>
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.studentId.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [students, searchQuery]);

    const selectedStudent = useMemo(() => students.find(s => s.studentId === selectedStudentId) || null, [selectedStudentId, students]);

    const selectedPaymentDateFormatted = useMemo(() => {
        if (!selectedPaymentDate) return '';
        return new Date(selectedPaymentDate + 'T00:00:00').toLocaleDateString('en-GB', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }, [selectedPaymentDate]);

    const studentsByClass = useMemo(() => {
        return students.reduce((acc, student) => {
            const className = student.className?.trim() || 'Unassigned';
            if (!acc[className]) acc[className] = [];
            acc[className].push(student);
            return acc;
        }, {} as Record<string, Student[]>);
    }, [students]);

    const classes = useMemo(() => {
        return Object.keys(studentsByClass).sort().map(name => ({ id: name, name }));
    }, [studentsByClass]);

    const filteredStudentsForFees = useMemo(() => {
        let list = students;
        if (selectedClassForFees !== 'all') {
            list = list.filter(s => s.className === selectedClassForFees);
        }
        return list;
    }, [students, selectedClassForFees]);

    // Financial Totals calculation
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

        const balanceBF = prevTransactions.reduce((sum, t) => sum + (t.isVoided ? 0 : (Number(t.debit) || 0) - (Number(t.credit) || 0)), 0);
        const currentLedger = filteredLedger.filter(t => !selectedPeriodId || t.periodId === selectedPeriodId);

        const totals = currentLedger.reduce((acc, t) => {
            if (t.isVoided) return acc;
            acc.billed += (Number(t.debit) || 0);
            acc.paid += (Number(t.credit) || 0);
            return acc;
        }, { billed: balanceBF > 0 ? balanceBF : 0, paid: balanceBF < 0 ? Math.abs(balanceBF) : 0 });

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
        feeCategories.forEach(cat => {
            byCategory[cat.name] = { billed: 0, paid: 0, accrued: 0 };
        });

        const getDisplayCategory = (catRef: string) => {
            if (!catRef) return 'General';
            if (catRef === 'feeding' || catRef === 'Feeding Fee') return 'Feeding Fee';
            const cat = feeCategories.find(c => c.id === catRef || c.name === catRef);
            return cat?.name || catRef || 'General';
        };

        students.forEach(student => {
            if (student.ledger) {
                student.ledger.forEach(t => {
                    if (t.isVoided) return;
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
            totalDebt
        };
    }, [students, expenditures, debts, selectedPeriodId, feeCategories]);

    // Gather recent transactions for Dashboard view
    const recentTransactions = useMemo(() => {
        const allTx: {
            id: string;
            title: string;
            subtitle: string;
            amount: number;
            date: string;
            isIncoming: boolean;
        }[] = [];

        students.forEach(student => {
            if (student.ledger) {
                student.ledger.forEach(t => {
                    if (t.isVoided) return;
                    if (Number(t.credit) > 0) {
                        allTx.push({
                            id: t.id || `${student.studentId}-${t.date}-${t.credit}`,
                            title: 'Fee Payment',
                            subtitle: student.name,
                            amount: Number(t.credit),
                            date: t.date,
                            isIncoming: true
                        });
                    }
                });
            }
        });

        expenditures.forEach(exp => {
            allTx.push({
                id: exp.id,
                title: 'Expense',
                subtitle: exp.description,
                amount: exp.amount,
                date: exp.date,
                isIncoming: false
            });
        });

        // Sort by date descending, take top 5
        return allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    }, [students, expenditures]);

    // Monthly Chart Data (Income vs Expenditure)
    const chartData = useMemo(() => {
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

    // Financial Actions
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

    const handleVoidTransaction = async (transactionId: string) => {
        if (!selectedStudentId) return;
        const reason = window.prompt("Reason for voiding this transaction?");
        if (!reason) return;

        setIsSubmitting(true);
        try {
            await voidLedgerTransaction(db, auth, selectedStudentId, transactionId, reason, schoolId);
            await fetchAccountantData();
            toast({ title: "Transaction Voided", description: "The transaction has been voided successfully." });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenEditTransaction = (t: LedgerTransaction) => {
        handleOpenTransactionModal(t.debit > 0 ? 'fee' : 'payment', t);
    };

    const handleAddExpenditure = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolId) return;
        setIsSubmitting(true);
        const newExpenditure = {
            description: expenditureForm.description,
            category: expenditureForm.category,
            amount: Number(expenditureForm.amount),
            date: expenditureForm.date,
            type: expenditureForm.type,
            periodId: selectedPeriodId || undefined
        };
        try {
            await addExpenditure(db, auth, schoolId, newExpenditure);
            toast({ title: "Success", description: "Expenditure recorded." });
            setExpenditureForm(defaultExpenditureForm);
            await fetchAccountantData();
        } catch (error) {
            toast({ title: "Error", description: "Could not add expenditure.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmDeleteExpenditure = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this expenditure record?")) return;
        setIsSubmitting(true);
        try {
            await deleteExpenditure(db, auth, id);
            toast({ title: "Expenditure Deleted", description: "The expenditure record was removed.", variant: 'destructive' });
            await fetchAccountantData();
        } catch (error) {
            toast({ title: "Error", description: "Could not delete expenditure.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
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
            await fetchAccountantData();
        } catch (error) {
            toast({ title: "Error", description: "Could not add debt.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmDeleteDebt = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this debt record?")) return;
        setIsSubmitting(true);
        try {
            await deleteDebt(db, auth, id);
            toast({ title: "Debt Deleted", description: "The debt record was removed.", variant: 'destructive' });
            await fetchAccountantData();
        } catch (error) {
            toast({ title: "Error", description: "Could not delete debt.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRecordDailyPayments = async () => {
        if (!schoolId) return;

        const selectedKeys = Object.keys(bulkDailyPaymentsSelection).filter(key => bulkDailyPaymentsSelection[key]);
        if (selectedKeys.length === 0) {
            toast({ title: "No Records Selected", description: "Please select the daily fee records you want to record payments for.", variant: "destructive" });
            return;
        }

        const paymentsToRecord = selectedKeys.map(key => {
            const [studentId, categoryId] = key.split('|');
            const student = students.find(s => s.studentId === studentId);
            const attendedToday = student?.attendance?.some(a => a.date === selectedPaymentDate && a.attended);
            if (!attendedToday) return null;

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
        }).filter((p): p is { studentId: string; amount: number; date: string; category: string; categoryId: string; description: string; periodId: string | undefined } => p !== null && p.amount > 0);

        if (paymentsToRecord.length === 0) {
            toast({ title: "Zero Amount", description: "Selected records have GH¢0.00 rate.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await postBulkDailyPayments(db, auth, schoolId, paymentsToRecord);
            await fetchAccountantData();
            toast({ title: "Payments Recorded", description: `Successfully logged payments for ${paymentsToRecord.length} records.` });
            setBulkDailyPaymentsSelection({});
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClearDailyFees = async () => {
        if (!categoryToClear) return;
        const { studentId, categoryId, categoryName, docId } = categoryToClear;
        setIsSubmitting(true);
        const resolvedId = docId || studentId;

        try {
            const result = await voidFeeCategoryRecords(
                db,
                auth,
                resolvedId,
                categoryId,
                categoryName,
                "Cleared from Accountant Daily Fee Page",
                undefined
            );

            const matchCount = typeof result === 'number' ? result : 0;
            await fetchAccountantData();

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
                description: error.message || "Failed to clear records.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
            setCategoryToClear(null);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-[#00205c]" />
                    <p className="text-lg font-medium text-gray-600 animate-pulse">Loading financial system...</p>
                </div>
            </div>
        );
    }

    const navigationItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'fees', label: 'Students & Fees', icon: Users },
        { id: 'daily-billing', label: 'Daily Billing', icon: Calendar },
        { id: 'expenditures', label: 'Expenditures', icon: TrendingDown },
        { id: 'debts', label: 'Liabilities', icon: Wallet },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'my-account', label: 'My Account', icon: User },
        { id: 'help', label: 'Help & Support', icon: HelpCircle }
    ];

    const getStaffInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="h-screen bg-slate-100 text-slate-800 flex font-sans relative overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="w-[280px] hidden lg:flex flex-col bg-[#00205c] text-white p-6 border-r border-[#00205c]/25 select-none shrink-0 sticky top-0 h-screen">
                <div className="flex items-center gap-3.5 pb-8 mb-4 border-b border-white/10 overflow-hidden">
                    {schoolDetails?.logoUrl ? (
                        <Avatar className="h-12 w-12 border-2 border-white/20 shadow-sm shrink-0">
                            <AvatarImage src={schoolDetails.logoUrl} alt={schoolDetails.name} />
                            <AvatarFallback className="bg-white/10 text-white font-bold">{schoolDetails.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    ) : (
                        <div className="bg-white/10 p-2 rounded-xl border border-white/20 shadow-inner shrink-0">
                            <ZipSMALogo />
                        </div>
                    )}
                    <div className="flex flex-col overflow-hidden">
                        <h1 className="text-base font-black truncate text-white tracking-tight font-headline">{schoolDetails?.name || 'Accountant Portal'}</h1>
                        <span className="text-xs font-bold text-white/60 tracking-wider uppercase">ID: {schoolId || 'ZIPSMAS'}</span>
                    </div>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-1 scrollbar-none pb-4">
                    {navigationItems.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                    "w-full flex items-center gap-3.5 h-11 px-4 rounded-xl text-sm font-semibold transition-all duration-200",
                                    isActive
                                        ? "bg-white/15 text-white border border-white/10 shadow-sm"
                                        : "text-white/70 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-white/50")} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                        <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Need Help?</p>
                        <p className="text-sm text-white/80 mt-1.5 leading-relaxed">Our support team is here to help you.</p>
                        <Button
                            variant="ghost"
                            onClick={() => setActiveTab('help')}
                            className="w-full mt-3 h-9 bg-white/10 text-white hover:bg-white/25 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                            Contact Support
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="w-full justify-start gap-3.5 h-11 px-4 text-white/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all font-semibold"
                    >
                        <LogOut className="h-5 w-5 text-white/50" />
                        <span>Secure Logout</span>
                    </Button>
                </div>
            </aside>

            {/* Mobile Navigation Drawer Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 z-40 bg-slate-900 lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-[280px] z-50 bg-[#00205c] text-white p-6 flex flex-col shadow-2xl lg:hidden"
                        >
                            <div className="flex items-center justify-between pb-6 mb-4 border-b border-white/10">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {schoolDetails?.logoUrl ? (
                                        <Avatar className="h-10 w-10 border border-white/20 shadow-sm shrink-0">
                                            <AvatarImage src={schoolDetails.logoUrl} alt={schoolDetails.name} />
                                            <AvatarFallback className="bg-white/10 text-white font-bold">{schoolDetails.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <div className="bg-white/10 p-1.5 rounded-lg border border-white/20 shadow-inner shrink-0">
                                            <ZipSMALogo />
                                        </div>
                                    )}
                                    <div className="flex flex-col overflow-hidden">
                                        <h1 className="text-sm font-black truncate text-white font-headline">{schoolDetails?.name || 'Accountant Portal'}</h1>
                                        <span className="text-xs font-bold text-white/50 tracking-wider">ID: {schoolId || 'ZIPSMAS'}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-white hover:bg-white/10 rounded-full h-8 w-8"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            <nav className="flex-1 space-y-1 overflow-y-auto">
                                {navigationItems.map(item => {
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setActiveTab(item.id);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3.5 h-11 px-4 rounded-xl text-sm font-semibold transition-all duration-200",
                                                isActive ? "bg-white/15 text-white shadow-sm border border-white/10" : "text-white/70 hover:text-white"
                                            )}
                                        >
                                            <item.icon className="h-5 w-5 text-white/50" />
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>

                            <div className="pt-4 border-t border-white/10 flex flex-col gap-3 mt-auto">
                                <Button
                                    variant="ghost"
                                    onClick={handleLogout}
                                    className="w-full justify-start gap-3.5 h-11 px-4 text-white/70 hover:text-rose-455 hover:bg-rose-500/10 rounded-xl font-semibold"
                                >
                                    <LogOut className="h-5 w-5 text-white/50" />
                                    <span>Secure Logout</span>
                                </Button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Portal Viewport */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 border-b border-slate-200/80 px-6 py-4 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            <Menu className="w-6 h-6" />
                        </Button>
                        <h2 className="text-lg font-extrabold text-slate-800 hidden lg:block font-headline">School Financial Management</h2>
                        <span className="bg-emerald-50 text-emerald-700 text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-200/80 hidden sm:block">
                            Active Session
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-500">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            <span>{currentDate}</span>
                        </div>

                        <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />

                        {/* Accountant profile badge */}
                        <div className="flex items-center gap-2.5">
                            <div className="flex flex-col text-right hidden sm:flex">
                                <span className="text-sm font-black text-slate-800">{staffMember.name}</span>
                                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">{staffMember.role}</span>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-indigo-650 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-indigo-50">
                                {getStaffInitials(staffMember.name)}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-100 relative pb-8">
                    {/* Hero Banner */}
                    <div className="w-full h-32 md:h-48 lg:h-56 relative mb-6">
                        <Image 
                            src="/cover-placeholder.png" 
                            alt="School Cover" 
                            fill 
                            className="object-cover"
                            priority
                        />
                    </div>

                    <div className="px-6 md:px-8 -mt-20 md:-mt-28 relative z-10 space-y-8 drop-shadow-2xl">
                        {/* Welcome banner & selector */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm backdrop-blur-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-800 font-headline">
                                Welcome back, <span className="text-indigo-600">{staffMember.name.split(' ')[0]}!</span> 👋
                            </h2>
                            <p className="text-sm text-slate-500 mt-1 font-medium">Here's what's happening in your school financials today.</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <Label htmlFor="period-selector" className="text-xs font-black uppercase text-slate-400 tracking-wider">Academic Term:</Label>
                            <Select value={selectedPeriodId || ''} onValueChange={setSelectedPeriodId}>
                                <SelectTrigger id="period-selector" className="w-52 h-9 border-slate-200 shadow-sm font-bold text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 transition-all rounded-xl">
                                    <SelectValue placeholder="Select Term" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200 text-slate-700 rounded-xl">
                                    {academicPeriods.map(p => (
                                        <SelectItem key={p.id} value={p.id} className="hover:bg-slate-50 focus:bg-slate-50">{p.year} - {p.term}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'dashboard' && (
                            <motion.div
                                key="dashboard"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-8"
                            >
                                {/* Metrics Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                    <Card className="bg-[#3b82f6] text-white border-0 shadow-md rounded-none overflow-hidden group relative">
                                        <div className="absolute top-0 right-0 p-4 opacity-15">
                                            <Users className="w-14 h-14" />
                                        </div>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/80 font-headline">
                                                Total Students
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-black tracking-tight">{students.length}</div>
                                            <p className="text-xs text-white/75 mt-1 font-semibold">Active profiles in directory</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-[#10b981] text-white border-0 shadow-md rounded-none overflow-hidden group relative">
                                        <div className="absolute top-0 right-0 p-4 opacity-15">
                                            <TrendingUp className="w-14 h-14" />
                                        </div>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/80 font-headline">
                                                Income Received
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-black tracking-tight">GH¢{overallTotals.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                            <p className="text-xs text-white/75 mt-1 font-semibold">Fees and billing collections</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-[#ef4444] text-white border-0 shadow-md rounded-none overflow-hidden group relative">
                                        <div className="absolute top-0 right-0 p-4 opacity-15">
                                            <TrendingDown className="w-14 h-14" />
                                        </div>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/80 font-headline">
                                                Total Expenditures
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-black tracking-tight">GH¢{overallTotals.totalExpenditure.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                            <p className="text-xs text-white/75 mt-1 font-semibold">Term school expenses tracked</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-[#8b5cf6] text-white border-0 shadow-md rounded-none overflow-hidden group relative">
                                        <div className="absolute top-0 right-0 p-4 opacity-15">
                                            <Wallet className="w-14 h-14" />
                                        </div>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/80 font-headline">
                                                Total Liabilities
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-black tracking-tight">GH¢{overallTotals.totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                            <p className="text-xs text-white/75 mt-1 font-semibold">Outstanding school debt records</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Dashboard Main Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                    {/* Column 1: Students Overview */}
                                    <Card className="lg:col-span-4 bg-white border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden flex flex-col h-[520px]">
                                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                            <div>
                                                <CardTitle className="text-base font-black text-slate-800 font-headline">Students Overview</CardTitle>
                                                <CardDescription className="text-sm text-slate-500 font-semibold">Quick student index</CardDescription>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setActiveTab('fees')}
                                                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:bg-slate-50 px-2 rounded-lg"
                                            >
                                                View All
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="flex-1 overflow-y-auto px-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-200">
                                            <div className="relative mb-3">
                                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                <Input
                                                    placeholder="Search student or ID..."
                                                    className="pl-9 h-10 text-sm bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-400 transition-all rounded-xl"
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            {filteredStudents.slice(0, 7).map(s => (
                                                <div
                                                    key={s.studentId}
                                                    onClick={() => {
                                                        setSelectedStudentId(s.studentId);
                                                        setActiveTab('fees');
                                                    }}
                                                    className="w-full cursor-pointer p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 flex items-center justify-between transition-all"
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center shrink-0">
                                                            {getStaffInitials(s.name)}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="font-bold text-sm text-slate-800 truncate">{s.name}</p>
                                                            <p className="text-xs text-slate-400 font-semibold">{s.studentId} • {s.className}</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                                </div>
                                            ))}
                                            {filteredStudents.length === 0 && (
                                                <div className="text-center py-10 text-slate-400 italic text-sm">No students found.</div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Column 2: Financial Summary Chart */}
                                    <Card className="lg:col-span-5 bg-white border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden flex flex-col h-[520px]">
                                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                            <div>
                                                <CardTitle className="text-base font-black text-slate-800 font-headline">Financial Summary</CardTitle>
                                                <CardDescription className="text-sm text-slate-500 font-semibold">Income and expenses this term</CardDescription>
                                            </div>
                                            <Badge variant="outline" className="border-slate-200 text-xs font-extrabold text-slate-500">
                                                This Term
                                            </Badge>
                                        </CardHeader>
                                        <CardContent className="flex-grow flex flex-col justify-between p-6">
                                            <div className="grid grid-cols-2 gap-3.5 mb-5">
                                                <div className="bg-emerald-50/50 border border-emerald-100/80 p-3 rounded-2xl flex items-center gap-3">
                                                    <div className="p-2 bg-emerald-500 text-white rounded-xl">
                                                        <TrendingUp className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-black uppercase text-emerald-700 tracking-wider">Income</span>
                                                        <p className="text-base font-black text-slate-850">GH¢{overallTotals.totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                    </div>
                                                </div>

                                                <div className="bg-rose-50/50 border border-rose-100/80 p-3 rounded-2xl flex items-center gap-3">
                                                    <div className="p-2 bg-rose-500 text-white rounded-xl">
                                                        <TrendingDown className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-black uppercase text-rose-700 tracking-wider">Expenditures</span>
                                                        <p className="text-base font-black text-slate-850">GH¢{overallTotals.totalExpenditure.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                    </div>
                                                </div>

                                                <div className="bg-blue-50/50 border border-blue-100/80 p-3 rounded-2xl flex items-center gap-3">
                                                    <div className="p-2 bg-blue-500 text-white rounded-xl">
                                                        <Landmark className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-black uppercase text-blue-700 tracking-wider">Net Savings</span>
                                                        <p className={cn("text-base font-black", overallTotals.netSavings >= 0 ? "text-emerald-700" : "text-rose-700")}>
                                                            GH¢{overallTotals.netSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="bg-amber-50/50 border border-amber-100/80 p-3 rounded-2xl flex items-center gap-3">
                                                    <div className="p-2 bg-amber-500 text-white rounded-xl">
                                                        <Wallet className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-black uppercase text-amber-700 tracking-wider">Liabilities</span>
                                                        <p className="text-base font-black text-slate-850">GH¢{overallTotals.totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-1 w-full min-h-[160px] relative">
                                                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 font-headline">Income vs Expenditure</p>
                                                <ResponsiveContainer width="100%" height="85%">
                                                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} />
                                                        <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} />
                                                        <ChartTooltip
                                                            contentStyle={{ background: '#00205c', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                                                            formatter={(value: any) => [`GH¢${Number(value).toLocaleString()}`, '']}
                                                        />
                                                        <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                                                        <Bar dataKey="Expenditure" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Column 3: Recent Transactions */}
                                    <Card className="lg:col-span-3 bg-white border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden flex flex-col h-[520px]">
                                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                            <div>
                                                <CardTitle className="text-base font-black text-slate-800 font-headline">Recent Transactions</CardTitle>
                                                <CardDescription className="text-sm text-slate-500 font-semibold">Lately logged activities</CardDescription>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-grow overflow-y-auto px-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
                                            {recentTransactions.map((tx, idx) => (
                                                <div key={tx.id || idx} className="flex justify-between items-center gap-3.5 pb-3.5 border-b border-slate-100 last:border-b-0">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                                                            tx.isIncoming
                                                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                                : "bg-rose-50 text-rose-600 border-rose-100"
                                                        )}>
                                                            <Receipt className="w-4 h-4" />
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="font-bold text-sm text-slate-800 truncate">{tx.title}</p>
                                                            <p className="text-xs text-slate-400 font-semibold truncate mt-0.5">{tx.subtitle}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className={cn("text-sm font-black", tx.isIncoming ? "text-emerald-600" : "text-rose-600")}>
                                                            {tx.isIncoming ? '+' : '-'}GH¢{tx.amount.toFixed(0)}
                                                        </p>
                                                        <span className="text-xs text-slate-400 font-semibold mt-0.5 block">{tx.date.split('-').reverse().slice(0, 2).join('/')}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {recentTransactions.length === 0 && (
                                                <div className="text-center py-10 text-slate-400 italic text-sm">No transactions recorded.</div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Quick Actions Row */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider font-headline">Quick Actions</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <button
                                            onClick={() => {
                                                setActiveTab('fees');
                                                setTimeout(() => handleOpenTransactionModal('payment'), 100);
                                            }}
                                            className="bg-white border border-slate-200/80 p-4 rounded-2xl text-left hover:shadow-md hover:border-indigo-200 transition-all flex items-start gap-3.5 group"
                                        >
                                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
                                                <Receipt className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-sm text-slate-800">Record Payment</p>
                                                <span className="text-xs text-slate-400 font-semibold block mt-0.5">Add new fee payment</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setActiveTab('fees');
                                                setTimeout(() => handleOpenTransactionModal('fee'), 100);
                                            }}
                                            className="bg-white border border-slate-200/80 p-4 rounded-2xl text-left hover:shadow-md hover:border-indigo-200 transition-all flex items-start gap-3.5 group"
                                        >
                                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-105 transition-transform">
                                                <PlusCircle className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-sm text-slate-800">Add Charge</p>
                                                <span className="text-xs text-slate-400 font-semibold block mt-0.5">Add new fee or charge</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setActiveTab('daily-billing')}
                                            className="bg-white border border-slate-200/80 p-4 rounded-2xl text-left hover:shadow-md hover:border-indigo-200 transition-all flex items-start gap-3.5 group"
                                        >
                                            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-sm text-slate-800">Daily Billing</p>
                                                <span className="text-xs text-slate-400 font-semibold block mt-0.5">View today's billings</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setActiveTab('reports')}
                                            className="bg-white border border-slate-200/80 p-4 rounded-2xl text-left hover:shadow-md hover:border-indigo-200 transition-all flex items-start gap-3.5 group"
                                        >
                                            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-105 transition-transform">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-sm text-slate-800">Reports</p>
                                                <span className="text-xs text-slate-400 font-semibold block mt-0.5">View financial reports</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'fees' && (
                            <motion.div
                                key="fees"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="grid lg:grid-cols-12 gap-6 items-start"
                            >
                                {/* Students List */}
                                <Card className="lg:col-span-4 bg-white border border-slate-200/80 shadow-sm h-[700px] flex flex-col rounded-none overflow-hidden" style={{ fontFamily: 'Calibri, Candara, Segoe, Segoe UI, Optima, Arial, sans-serif' }}>
                                    <CardHeader className="bg-[#00205c] text-white p-5 pb-4 relative overflow-hidden border-b-0">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
                                        <div className="flex items-center justify-between relative z-10">
                                            <CardTitle className="text-lg font-black text-white font-headline">Students Directory</CardTitle>
                                            <Button size="sm" onClick={() => setIsParentBulkMainModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] h-7 px-2 uppercase shadow-md flex items-center gap-1 rounded-md">
                                                <Users className="w-3 h-3" />
                                                Parent Pay
                                            </Button>
                                        </div>
                                        <div className="relative mt-3 z-10">
                                            <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <Input
                                                placeholder="Search student or ID..."
                                                className="pl-9 h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white focus:text-slate-800 focus:placeholder:text-slate-400 transition-all rounded-xl"
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 overflow-y-auto px-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-200">
                                         {filteredStudents.length === 0 ? (
                                             <p className="text-center text-slate-400 py-8 italic text-sm">No students found.</p>
                                         ) : (
                                             filteredStudents.map(s => {
                                                 const isSelected = selectedStudentId === s.studentId;
                                                 const balance = (s.ledger || []).reduce((sum, t) => sum + (t.isVoided ? 0 : (Number(t.debit) || 0) - (Number(t.credit) || 0)), 0);
                                                 const hasArrears = balance > 0;
                                                 return (
                                                     <button
                                                         key={s.studentId}
                                                         onClick={() => setSelectedStudentId(s.studentId)}
                                                         className={cn(
                                                             "w-full text-left p-3.5 rounded-none transition-all flex items-center justify-between border",
                                                             isSelected
                                                                 ? 'bg-indigo-650 text-white border-indigo-600 shadow-md'
                                                                 : 'bg-slate-50/70 hover:bg-slate-100 border-slate-100 text-slate-700'
                                                         )}
                                                     >
                                                         <div className="overflow-hidden pr-2">
                                                             <p className="font-extrabold text-sm truncate leading-snug">{s.name}</p>
                                                             <p className={cn("text-xs mt-1 font-semibold", isSelected ? 'text-indigo-200' : 'text-slate-500')}>{s.studentId} • {s.className}</p>
                                                             <div className="flex items-center gap-1.5 mt-1.5">
                                                                 <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", hasArrears ? "bg-rose-500" : "bg-emerald-500")} />
                                                                 <span className={cn("text-xs font-semibold", isSelected ? 'text-indigo-200' : hasArrears ? 'text-rose-600' : 'text-emerald-600')}>
                                                                     {hasArrears ? `Arrears: GH¢${balance.toFixed(0)}` : 'Paid Up'}
                                                                 </span>
                                                             </div>
                                                         </div>
                                                         <ChevronRight className={cn("w-4 h-4 flex-shrink-0", isSelected ? 'text-white' : 'text-slate-400')} />
                                                     </button>
                                                 );
                                             })
                                         )}
                                    </CardContent>
                                </Card>

                                {/* Ledger Details */}
                                <Card className="lg:col-span-8 bg-white border border-slate-200/80 shadow-sm h-[700px] flex flex-col rounded-none overflow-hidden" style={{ fontFamily: 'Calibri, Candara, Segoe, Segoe UI, Optima, Arial, sans-serif' }}>
                                    {selectedStudent ? (
                                        <>
                                            <CardHeader className="bg-[#00205c] text-white p-5 flex flex-row justify-between items-center flex-wrap gap-4 relative overflow-hidden border-b-0">
                                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />
                                                <div className="relative z-10">
                                                    <CardTitle className="text-xl font-black text-white font-headline">{selectedStudent.name}</CardTitle>
                                                    <CardDescription className="text-sm text-white/75 mt-1 font-semibold">ID: {selectedStudent.studentId} • Class: {selectedStudent.className}</CardDescription>
                                                </div>
                                                <div className="flex gap-2 relative z-10">
                                                    <Button size="sm" onClick={() => handleOpenTransactionModal('payment')} className="bg-emerald-600 hover:bg-emerald-500 hover:scale-105 active:scale-95 text-white font-extrabold uppercase tracking-wider text-xs px-4 h-9 rounded-none transition-all shadow-md">Record Payment</Button>
                                                    <Button size="sm" onClick={() => handleOpenTransactionModal('fee')} className="bg-white text-[#00205c] hover:bg-white/90 hover:scale-105 active:scale-95 font-extrabold uppercase tracking-wider text-xs px-4 h-9 rounded-none transition-all shadow-md">Add Charge</Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                                                {/* Student Stats Banner */}
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div className="text-center p-4 bg-[#3b82f6] text-white rounded-none shadow-sm relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                                            <Users className="w-8 h-8" />
                                                        </div>
                                                        <p className="text-xs font-bold uppercase text-white/80 tracking-wider relative z-10">Total Billed</p>
                                                        <p className="text-xl font-black mt-1 font-sans relative z-10">GH¢{ledgerTotals.billed.toFixed(2)}</p>
                                                    </div>
                                                    <div className="text-center p-4 bg-[#10b981] text-white rounded-none shadow-sm relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                                            <TrendingUp className="w-8 h-8" />
                                                        </div>
                                                        <p className="text-xs font-bold uppercase text-white/80 tracking-wider relative z-10">Total Paid</p>
                                                        <p className="text-xl font-black mt-1 font-sans relative z-10">GH¢{ledgerTotals.paid.toFixed(2)}</p>
                                                    </div>
                                                    <div className={cn(
                                                        "text-center p-4 text-white rounded-none shadow-sm relative overflow-hidden group transition-all",
                                                        ledgerTotals.balance > 0 ? 'bg-[#ef4444]' : 'bg-[#10b981]'
                                                    )}>
                                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                                            {ledgerTotals.balance > 0 ? <TrendingDown className="w-8 h-8" /> : <Wallet className="w-8 h-8" />}
                                                        </div>
                                                        <p className="text-xs font-bold uppercase text-white/80 tracking-wider relative z-10">Net Balance</p>
                                                        <p className="text-xl font-black mt-1 font-sans relative z-10">
                                                            GH¢{Math.abs(ledgerTotals.balance).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Sub-tabs for Main vs Daily Ledger */}
                                                <Tabs value={feesActiveSubTab} onValueChange={(val: any) => setFeesActiveSubTab(val)} className="w-full">
                                                    <TabsList className="grid grid-cols-2 w-56 bg-slate-100 p-1 border border-slate-200 rounded-none mb-4">
                                                        <TabsTrigger value="main" className="rounded-none text-xs font-bold py-1.5 data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-500">Term Fees</TabsTrigger>
                                                        <TabsTrigger value="daily" className="rounded-none text-xs font-bold py-1.5 data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-500">Daily Fees</TabsTrigger>
                                                    </TabsList>

                                                    <TabsContent value="main" className="outline-none">
                                                        <LedgerTable
                                                            ledger={(selectedStudent.ledger || []).filter(t => !isDailyTransaction(t, feeCategories))}
                                                            onVoid={handleVoidTransaction}
                                                            onEdit={handleOpenEditTransaction}
                                                            generateReceipt={generateReceipt}
                                                            schoolDetails={schoolDetails}
                                                            student={selectedStudent}
                                                            academicPeriods={academicPeriods}
                                                            feeCategories={feeCategories}
                                                            hideDailyAmounts={false}
                                                        />
                                                    </TabsContent>
                                                    <TabsContent value="daily" className="outline-none">
                                                        <LedgerTable
                                                            ledger={(selectedStudent.ledger || []).filter(t => isDailyTransaction(t, feeCategories))}
                                                            onVoid={handleVoidTransaction}
                                                            onEdit={handleOpenEditTransaction}
                                                            generateReceipt={generateReceipt}
                                                            schoolDetails={schoolDetails}
                                                            student={selectedStudent}
                                                            academicPeriods={academicPeriods}
                                                            feeCategories={feeCategories}
                                                            hideDailyAmounts={true}
                                                        />
                                                    </TabsContent>
                                                </Tabs>
                                            </CardContent>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 text-center">
                                            <Wallet className="w-12 h-12 text-slate-300 mb-3" />
                                            <h3 className="text-base font-bold text-slate-700">Select a Student</h3>
                                            <p className="text-sm max-w-xs mt-1 text-slate-400">Select a student from the directory to view and manage their transactions.</p>
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'daily-billing' && (
                            <motion.div
                                key="daily-billing"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                            >
                                <Card className="bg-white border border-slate-200/80 shadow-sm rounded-none overflow-hidden" style={{ fontFamily: 'Calibri, Candara, Segoe, Segoe UI, Optima, Arial, sans-serif' }}>
                                    <CardHeader className="bg-[#00205c] text-white p-6 relative overflow-hidden border-b-0">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
                                        <CardTitle className="text-lg font-black text-white font-headline relative z-10">Daily Fee Billing & Payments</CardTitle>
                                        <CardDescription className="text-sm text-white/85 mt-1.5 relative z-10 font-semibold">Record bulk daily charges (e.g. Feeding Fee, Transport Fee) for students who attended school today.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-slate-50 p-6 rounded-2xl border border-slate-200/85">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold uppercase text-slate-500 tracking-wider">Select Class</Label>
                                                <Select value={selectedClassForFees} onValueChange={setSelectedClassForFees}>
                                                    <SelectTrigger className="bg-white border-slate-200 text-slate-700 font-bold rounded-none h-10 text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-white border-slate-200 text-slate-700 rounded-none">
                                                        <SelectItem value="all">All Classes</SelectItem>
                                                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold uppercase text-slate-500 tracking-wider">Daily Fee Category</Label>
                                                <Select value={selectedDailyCategoryForPayments} onValueChange={setSelectedDailyCategoryForPayments}>
                                                    <SelectTrigger className="bg-white border-slate-200 text-slate-700 font-bold rounded-none h-10 text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-white border-slate-200 text-slate-700 rounded-none">
                                                        {feeCategories.filter(c => c.isDaily).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                        {feeCategories.filter(c => c.isDaily).length === 0 && (
                                                            <SelectItem value="feeding">Feeding Fee</SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold uppercase text-slate-500 tracking-wider">Payment Date</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className="w-full justify-start text-left h-10 rounded-none border border-slate-200 hover:bg-slate-50 transition-all font-bold text-sm text-slate-800 bg-white"
                                                        >
                                                            <Calendar className="mr-2 h-4 w-4 text-slate-500" />
                                                            {selectedPaymentDateFormatted}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent 
                                                        className="w-auto p-0 border border-slate-200 shadow-xl rounded-none bg-white" 
                                                        align="start"
                                                        style={{ fontFamily: 'Calibri, Candara, Segoe, Segoe UI, Optima, Arial, sans-serif' }}
                                                    >
                                                        <CalendarComponent
                                                            mode="single"
                                                            selected={selectedPaymentDate ? new Date(selectedPaymentDate + 'T00:00:00') : undefined}
                                                            onSelect={(date) => date && setSelectedPaymentDate(date.toISOString().split('T')[0])}
                                                            initialFocus
                                                            className="rounded-none"
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            <Button
                                                onClick={() => setIsParentBulkModalOpen(true)}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold uppercase tracking-wider text-sm h-10 rounded-none transition-all shadow-md flex items-center justify-center gap-2"
                                            >
                                                <Users className="w-4 h-4" />
                                                Parent Pay
                                            </Button>
                                            <Button
                                                onClick={handleRecordDailyPayments}
                                                 disabled={isSubmitting}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold uppercase tracking-wider text-sm h-10 rounded-none transition-all shadow-md"
                                            >
                                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Log Payments'}
                                            </Button>
                                        </div>

                                        <div className="overflow-hidden border border-slate-200 rounded-none bg-white shadow-inner">
                                            <Table>
                                                <TableHeader className="bg-slate-50">
                                                    <TableRow className="border-slate-150">
                                                        <TableHead className="w-[80px] text-center">
                                                            {(() => {
                                                                const presentStudents = filteredStudentsForFees.filter(s =>
                                                                    s.attendance?.some(a => a.date === selectedPaymentDate && a.attended)
                                                                );
                                                                const allPresentSelected = presentStudents.length > 0 && presentStudents.every(s =>
                                                                    !!bulkDailyPaymentsSelection[`${s.studentId}|${selectedDailyCategoryForPayments}`]
                                                                );
                                                                return (
                                                                    <input
                                                                        type="checkbox"
                                                                        className="rounded border-slate-300"
                                                                        checked={allPresentSelected}
                                                                        onChange={(e) => {
                                                                            const isChecked = e.target.checked;
                                                                            const newSelection = { ...bulkDailyPaymentsSelection };
                                                                            presentStudents.forEach(s => {
                                                                                newSelection[`${s.studentId}|${selectedDailyCategoryForPayments}`] = isChecked;
                                                                            });
                                                                            setBulkDailyPaymentsSelection(newSelection);
                                                                        }}
                                                                    />
                                                                );
                                                            })()}
                                                        </TableHead>
                                                        <TableHead className="font-bold text-sm uppercase tracking-wider text-slate-500">Student Profile</TableHead>
                                                        <TableHead className="font-bold text-sm uppercase tracking-wider text-slate-500">Daily Rate (GH¢)</TableHead>
                                                        <TableHead className="font-bold text-sm uppercase tracking-wider text-slate-500">Attendance Status</TableHead>
                                                        <TableHead className="text-right font-bold text-sm uppercase tracking-wider text-slate-500">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredStudentsForFees.length === 0 ? (
                                                        <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-500 italic bg-slate-50/50 text-sm">No students found for this class filter.</TableCell></TableRow>
                                                    ) : (
                                                        filteredStudentsForFees.map(student => {
                                                            const key = `${student.studentId}|${selectedDailyCategoryForPayments}`;
                                                            const isChecked = !!bulkDailyPaymentsSelection[key];
                                                            const rate = student.dailyFees?.find(f => f.categoryId === selectedDailyCategoryForPayments)?.rate || 0;
                                                            const attendedToday = student.attendance?.some(a => a.date === selectedPaymentDate && a.attended);

                                                            return (
                                                                <TableRow key={student.studentId} className={cn("hover:bg-slate-50/65 border-slate-150 transition-colors", attendedToday && "bg-emerald-50/20 hover:bg-emerald-50/30")}>
                                                                    <TableCell className="text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="rounded border-slate-350 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            checked={isChecked && !!attendedToday}
                                                                            disabled={!attendedToday}
                                                                            onChange={(e) => setBulkDailyPaymentsSelection(prev => ({ ...prev, [key]: e.target.checked }))}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                         <p className="font-extrabold text-sm text-slate-800 leading-none">{student.name}</p>
                                                                         <p className="text-xs text-slate-500 mt-1.5 font-semibold">{student.studentId} • {student.className}</p>
                                                                    </TableCell>
                                                                    <TableCell className="font-extrabold text-sm text-slate-700">
                                                                        GH¢{rate.toFixed(2)}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {attendedToday ? (
                                                                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold text-xs">Present</Badge>
                                                                        ) : (
                                                                            <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200 text-xs font-semibold">Absent / Unmarked</Badge>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-none h-8 text-xs font-bold"
                                                                            onClick={() => setCategoryToClear({
                                                                                studentId: student.studentId,
                                                                                categoryId: selectedDailyCategoryForPayments,
                                                                                categoryName: feeCategories.find(c => c.id === selectedDailyCategoryForPayments)?.name || 'Daily Fee',
                                                                                docId: student.id
                                                                            })}
                                                                        >
                                                                            Void Records
                                                                        </Button>
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
                            </motion.div>
                        )}

                        {activeTab === 'expenditures' && (
                            <motion.div
                                key="expenditures"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="grid lg:grid-cols-3 gap-6 items-start"
                            >
                                {/* Record Expense Form */}
                                <Card className="bg-white border border-slate-200/80 shadow-sm rounded-none overflow-hidden h-fit">
                                     <CardHeader className="bg-[#ef4444] text-white p-5 relative overflow-hidden border-b-0">
                                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
                                         <CardTitle className="text-base font-black flex items-center gap-2 font-headline relative z-10">
                                             <PlusCircle className="w-5 h-5 text-white" /> Record Expenditure
                                         </CardTitle>
                                         <CardDescription className="text-sm text-white/85 mt-1 relative z-10 font-semibold">Enter details to record general school expenses.</CardDescription>
                                     </CardHeader>
                                    <form onSubmit={handleAddExpenditure}>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="exp-desc" className="text-sm font-bold text-slate-500 uppercase tracking-wider">Description</Label>
                                                <Input id="exp-desc" className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 text-sm rounded-none h-10" placeholder="e.g. Electricity bill payment" value={expenditureForm.description} onChange={e => setExpenditureForm({ ...expenditureForm, description: e.target.value })} required disabled={isSubmitting} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label htmlFor="exp-type" className="text-sm font-bold text-slate-500 uppercase tracking-wider">Category Type</Label>
                                                    <Select
                                                        value={expenditureForm.type}
                                                        onValueChange={(val: 'General' | 'Feeding' | 'Transportation') => setExpenditureForm({ ...expenditureForm, type: val, category: val === 'General' ? generalExpenditureCategories[0] : val === 'Feeding' ? feedingExpenditureCategories[0] : transportationExpenditureCategories[0] })}
                                                        disabled={isSubmitting}
                                                    >
                                                        <SelectTrigger id="exp-type" className="bg-white border-slate-200 text-slate-800 text-sm rounded-none h-10"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-white border-slate-200 text-slate-700 rounded-none">
                                                            <SelectItem value="General">General</SelectItem>
                                                            <SelectItem value="Feeding">Feeding</SelectItem>
                                                            <SelectItem value="Transportation">Transport</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="exp-cat" className="text-sm font-bold text-slate-500 uppercase tracking-wider">Category</Label>
                                                    <Select
                                                        value={expenditureForm.category}
                                                        onValueChange={val => setExpenditureForm({ ...expenditureForm, category: val })}
                                                        disabled={isSubmitting}
                                                    >
                                                        <SelectTrigger id="exp-cat" className="bg-white border-slate-200 text-slate-800 text-sm rounded-none h-10"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-white border-slate-200 text-slate-700 rounded-none max-h-56">
                                                            {expenditureForm.type === 'General' && generalExpenditureCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                            {expenditureForm.type === 'Feeding' && feedingExpenditureCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                            {expenditureForm.type === 'Transportation' && transportationExpenditureCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label htmlFor="exp-amount" className="text-sm font-bold text-slate-500 uppercase tracking-wider">Amount (GH¢)</Label>
                                                    <Input id="exp-amount" type="number" step="any" className="bg-white border-slate-200 text-slate-800 text-sm rounded-none h-10" placeholder="0.00" value={expenditureForm.amount} onChange={e => setExpenditureForm({ ...expenditureForm, amount: e.target.value })} required disabled={isSubmitting} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="exp-date" className="text-sm font-bold text-slate-500 uppercase tracking-wider">Date</Label>
                                                    <Input id="exp-date" type="date" className="bg-white border-slate-200 text-slate-800 text-sm rounded-none h-10" value={expenditureForm.date} onChange={e => setExpenditureForm({ ...expenditureForm, date: e.target.value })} required disabled={isSubmitting} />
                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold uppercase tracking-wider text-sm py-3.5 rounded-none shadow-md transition-all">
                                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Log Expenditure'}
                                            </Button>
                                        </CardFooter>
                                    </form>
                                </Card>

                                {/* Expense list */}
                                <Card className="lg:col-span-2 bg-white border border-slate-200/80 shadow-sm rounded-none overflow-hidden h-fit">
                                     <CardHeader className="bg-[#ef4444] text-white p-5 relative overflow-hidden border-b-0">
                                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
                                         <CardTitle className="text-base font-black text-white font-headline relative z-10">Expenditure History</CardTitle>
                                         <CardDescription className="text-sm text-white/85 mt-1 relative z-10 font-semibold">Review general school expenditures logged for this term.</CardDescription>
                                     </CardHeader>
                                    <CardContent>
                                        <div className="overflow-hidden rounded-none border border-slate-200 shadow-inner bg-white">
                                            <Table>
                                                <TableHeader className="bg-slate-50">
                                                    <TableRow className="border-slate-150">
                                                        <TableHead className="font-bold text-sm uppercase tracking-wider text-slate-500">Date</TableHead>
                                                        <TableHead className="font-bold text-sm uppercase tracking-wider text-slate-500">Description</TableHead>
                                                        <TableHead className="font-bold text-sm uppercase tracking-wider text-slate-500">Category</TableHead>
                                                        <TableHead className="text-right font-bold text-sm uppercase tracking-wider text-slate-500">Amount</TableHead>
                                                        <TableHead className="text-right font-bold text-sm uppercase tracking-wider text-slate-500">Action</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {expenditures.length === 0 ? (
                                                        <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-500 italic bg-slate-50/50 text-sm">No expenditures logged.</TableCell></TableRow>
                                                    ) : (
                                                        expenditures.map(exp => (
                                                            <TableRow key={exp.id} className="hover:bg-slate-50/60 border-slate-150 transition-colors">
                                                                <TableCell className="text-sm text-slate-700 font-bold">{exp.date.split('-').reverse().join('/')}</TableCell>
                                                                <TableCell>
                                                                    <p className="font-extrabold text-sm text-slate-800 leading-none">{exp.description}</p>
                                                                    <p className="text-xs text-slate-400 mt-1 font-bold">{exp.type} Expenditure</p>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline" className={cn(
                                                                        "border-0 text-xs font-black uppercase tracking-wider rounded-none",
                                                                        exp.type === 'Feeding' ? "bg-emerald-50 text-emerald-700" :
                                                                        exp.type === 'Transportation' ? "bg-amber-50 text-amber-700" :
                                                                        "bg-indigo-50 text-indigo-700"
                                                                    )}>
                                                                        {exp.category}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right font-extrabold text-sm text-rose-600">GH¢{exp.amount.toFixed(2)}</TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="ghost" size="icon" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-none h-8 w-8" onClick={() => handleConfirmDeleteExpenditure(exp.id)} disabled={isSubmitting}>
                                                                        <Trash2 className="h-4 w-4" />
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
                            </motion.div>
                        )}

                        {activeTab === 'debts' && (
                            <motion.div
                                key="debts"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="grid lg:grid-cols-3 gap-6 items-start"
                            >
                                {/* Record Debt Form */}
                                <Card className="bg-white border border-slate-200/80 shadow-sm rounded-none overflow-hidden h-fit">
                                     <CardHeader className="bg-[#8b5cf6] text-white p-5 relative overflow-hidden border-b-0">
                                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
                                         <CardTitle className="text-base font-black flex items-center gap-2 font-headline relative z-10">
                                             <PlusCircle className="w-5 h-5 text-white" /> Log Liability
                                         </CardTitle>
                                         <CardDescription className="text-sm text-white/85 mt-1 relative z-10 font-semibold">Enter details to record a new debt or liability.</CardDescription>
                                     </CardHeader>
                                    <form onSubmit={handleAddDebt}>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="debt-creditor" className="text-sm font-bold text-slate-500 uppercase tracking-wider">Creditor</Label>
                                                <Input id="debt-creditor" className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 text-sm rounded-none h-10" placeholder="Name of business or person" value={debtForm.creditor} onChange={e => setDebtForm({ ...debtForm, creditor: e.target.value })} required disabled={isSubmitting} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="debt-desc" className="text-sm font-bold text-slate-500 uppercase tracking-wider">Description</Label>
                                                <Input id="debt-desc" className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 text-sm rounded-none h-10" placeholder="Reason for debt" value={debtForm.description} onChange={e => setDebtForm({ ...debtForm, description: e.target.value })} required disabled={isSubmitting} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label htmlFor="debt-amount" className="text-sm font-bold text-slate-500 uppercase tracking-wider">Amount (GH¢)</Label>
                                                    <Input id="debt-amount" type="number" step="any" className="bg-white border-slate-200 text-slate-800 text-sm rounded-none h-10" placeholder="0.00" value={debtForm.amount} onChange={e => setDebtForm({ ...debtForm, amount: e.target.value })} required disabled={isSubmitting} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="debt-date" className="text-sm font-bold text-slate-500 uppercase tracking-wider">Date Incurred</Label>
                                                    <Input id="debt-date" type="date" className="bg-white border-slate-200 text-slate-800 text-sm rounded-none h-10" value={debtForm.date} onChange={e => setDebtForm({ ...debtForm, date: e.target.value })} required disabled={isSubmitting} />
                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold uppercase tracking-wider text-sm py-3.5 rounded-none shadow-md transition-all">
                                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Log Debt'}
                                            </Button>
                                        </CardFooter>
                                    </form>
                                </Card>

                                {/* Debt list */}
                                <Card className="lg:col-span-2 bg-white border border-slate-200/80 shadow-sm rounded-none overflow-hidden h-fit">
                                     <CardHeader className="bg-[#8b5cf6] text-white p-5 relative overflow-hidden border-b-0">
                                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
                                         <CardTitle className="text-base font-black text-white font-headline relative z-10">Outstanding Debts</CardTitle>
                                         <CardDescription className="text-sm text-white/85 mt-1 relative z-10 font-semibold">Track outstanding balances and creditors.</CardDescription>
                                     </CardHeader>
                                    <CardContent>
                                        <div className="overflow-hidden rounded-none border border-slate-200 shadow-inner bg-white">
                                            <Table>
                                                <TableHeader className="bg-slate-50">
                                                    <TableRow className="border-slate-150">
                                                        <TableHead className="font-bold text-sm uppercase tracking-wider text-slate-500">Date</TableHead>
                                                        <TableHead className="font-bold text-sm uppercase tracking-wider text-slate-500">Creditor</TableHead>
                                                        <TableHead className="font-bold text-sm uppercase tracking-wider text-slate-500">Description</TableHead>
                                                        <TableHead className="text-right font-bold text-sm uppercase tracking-wider text-slate-500">Amount</TableHead>
                                                        <TableHead className="text-right font-bold text-sm uppercase tracking-wider text-slate-500">Action</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {debts.length === 0 ? (
                                                        <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-500 italic bg-slate-50/50 text-sm">No debts logged.</TableCell></TableRow>
                                                    ) : (
                                                        debts.map(debt => (
                                                            <TableRow key={debt.id} className="hover:bg-slate-50/60 border-slate-150 transition-colors">
                                                                <TableCell className="text-sm text-slate-700 font-bold">{debt.date.split('-').reverse().join('/')}</TableCell>
                                                                <TableCell className="font-extrabold text-sm text-slate-800">{debt.creditor}</TableCell>
                                                                <TableCell className="text-sm text-slate-500">{debt.description}</TableCell>
                                                                <TableCell className="text-right font-extrabold text-sm text-amber-600">GH¢{debt.amount.toFixed(2)}</TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="ghost" size="icon" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-none h-8 w-8" onClick={() => handleConfirmDeleteDebt(debt.id)} disabled={isSubmitting}>
                                                                        <Trash2 className="h-4 w-4" />
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
                            </motion.div>
                        )}

                        {activeTab === 'reports' && (
                            <motion.div
                                key="reports"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-6"
                            >
                                <Card className="bg-white border border-slate-200/80 shadow-sm rounded-none overflow-hidden">
                                    <CardHeader className="bg-[#00205c] text-white p-6 flex flex-row items-center justify-between relative overflow-hidden border-b-0">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
                                        <div className="relative z-10">
                                            <CardTitle className="text-lg font-black text-white font-headline">Financial Report Summary</CardTitle>
                                            <CardDescription className="text-sm text-white/85 mt-1.5 font-semibold">Categorized breakdown of term revenue collections and expenditures.</CardDescription>
                                        </div>
                                        <Badge variant="outline" className="border-white/20 text-xs font-extrabold text-white bg-white/10 relative z-10">
                                            Academic Period Totals
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Revenue Section */}
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 font-headline">
                                                    <TrendingUp className="w-4 h-4 text-emerald-600" /> Revenue Categories
                                                </h3>
                                                <div className="border border-slate-200 rounded-none overflow-hidden bg-white shadow-inner">
                                                    <Table>
                                                        <TableHeader className="bg-slate-50">
                                                            <TableRow className="border-slate-150">
                                                                <TableHead className="font-bold text-sm text-slate-500">Category</TableHead>
                                                                <TableHead className="text-right font-bold text-sm text-slate-500">Collected</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {Object.entries(overallTotals.byCategory).map(([catName, values]) => (
                                                                <TableRow key={catName} className="border-slate-100 hover:bg-slate-50/50">
                                                                    <TableCell className="text-sm font-bold text-slate-700">{catName}</TableCell>
                                                                    <TableCell className="text-right font-black text-sm text-emerald-600">GH¢{values.paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                            {Object.keys(overallTotals.byCategory).length === 0 && (
                                                                <TableRow><TableCell colSpan={2} className="text-center py-6 text-slate-400 text-sm italic">No categorised fee records.</TableCell></TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>

                                            {/* Expenditure Section */}
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 font-headline">
                                                    <TrendingDown className="w-4 h-4 text-rose-600" /> Expenditure Categories
                                                </h3>
                                                <div className="border border-slate-200 rounded-none overflow-hidden bg-white shadow-inner">
                                                    <Table>
                                                        <TableHeader className="bg-slate-50">
                                                            <TableRow className="border-slate-150">
                                                                <TableHead className="font-bold text-sm text-slate-500">Category Type</TableHead>
                                                                <TableHead className="text-right font-bold text-sm text-slate-500">Spent</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {['General', 'Feeding', 'Transportation'].map(type => {
                                                                const totalTypeAmt = expenditures.filter(e => e.type === type).reduce((sum, e) => sum + e.amount, 0);
                                                                return (
                                                                    <TableRow key={type} className="border-slate-100 hover:bg-slate-50/50">
                                                                        <TableCell className="text-sm font-bold text-slate-700">{type} Operations</TableCell>
                                                                        <TableCell className="text-right font-black text-sm text-rose-600">GH¢{totalTypeAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Overview Summary */}
                                        <div className="bg-[#00205c] text-white p-6 rounded-none flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 relative overflow-hidden shadow-md">
                                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />
                                            <div className="flex gap-8 relative z-10">
                                                <div>
                                                    <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Total Income</span>
                                                    <p className="text-xl font-black mt-1 text-[#10b981]">GH¢{overallTotals.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                </div>
                                                <div className="border-l border-white/20 pl-8">
                                                    <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Total Expenses</span>
                                                    <p className="text-xl font-black mt-1 text-[#ef4444]">GH¢{overallTotals.totalExpenditure.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>
                                            <div className="text-center sm:text-right relative z-10">
                                                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">School Net Balance</span>
                                                <p className={cn("text-2xl font-black mt-1", overallTotals.netSavings >= 0 ? "text-[#10b981]" : "text-[#ef4444]")}>
                                                    GH¢{overallTotals.netSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'my-account' && (
                            <motion.div
                                key="my-account"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                            >
                                <Card className="bg-white border border-slate-200/80 shadow-sm rounded-none overflow-hidden max-w-2xl mx-auto">
                                    <CardHeader className="bg-[#00205c] text-white p-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -mr-12 -mt-12" />
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="w-16 h-16 rounded-xl bg-white/10 text-white border border-white/20 flex items-center justify-center font-bold text-xl shadow-inner">
                                                {getStaffInitials(staffMember.name)}
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl font-black text-white font-headline">{staffMember.name}</CardTitle>
                                                <CardDescription className="text-white/60 font-semibold mt-1">Accountant System profile</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                                            <div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Role Assignment</span>
                                                <p className="text-sm font-black text-slate-700 mt-1">{staffMember.role}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Email Address</span>
                                                <p className="text-sm font-bold text-slate-700 mt-1">{staffMember.email || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                                            <div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Phone Number</span>
                                                <p className="text-sm font-bold text-slate-700 mt-1">{staffMember.phone || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Date Created</span>
                                                <p className="text-sm font-bold text-slate-700 mt-1">
                                                    {staffMember.dateAdded ? new Date(staffMember.dateAdded).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Assigned School Reference ID</span>
                                            <p className="text-sm font-bold text-slate-700 mt-1 uppercase select-all tracking-wider">{staffMember.schoolId}</p>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end">
                                        <Button onClick={handleLogout} variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold rounded-none h-10 text-sm">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Sign Out of Profile
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'help' && (
                            <motion.div
                                key="help"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                            >
                                <Card className="bg-white border border-slate-200/80 shadow-sm rounded-none overflow-hidden max-w-2xl mx-auto">
                                    <CardHeader className="bg-[#00205c] text-white p-5 relative overflow-hidden border-b-0">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
                                        <CardTitle className="text-lg font-black text-white font-headline relative z-10">Accountant Portal Support</CardTitle>
                                        <CardDescription className="text-sm text-white/85 mt-1 relative z-10 font-semibold">Get support and learn how to manage school financials.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-none">
                                            <h4 className="text-sm font-black text-indigo-950 uppercase tracking-wider font-headline">Common Workflows</h4>
                                            <ul className="list-disc pl-4 mt-2 text-sm text-indigo-900/80 space-y-1 leading-relaxed">
                                                <li>To invoice students, go to <strong>Students & Fees</strong>, choose a student, and click <strong>Add Charge</strong>.</li>
                                                <li>To register a term fee payment, go to <strong>Students & Fees</strong>, select a student, and click <strong>Record Payment</strong>.</li>
                                                <li>For attendance-based daily payments, use the <strong>Daily Billing</strong> tool to check attendance for the day and batch record entries.</li>
                                            </ul>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider font-headline">Contact Administration</h4>
                                            <p className="text-sm text-slate-505 leading-relaxed">If you face database locking issues or require access changes, please contact the lead school administrator.</p>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Version 0.1.0</span>
                                        <Button className="bg-[#00205c] hover:bg-[#002b7e] text-white font-extrabold text-sm h-9 rounded-xl px-4 shadow-md">
                                            ZipSMA Documentation
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>

            {/* Modals */}
            {selectedStudent && (
                <RecordTransactionModal
                    isOpen={isRecordTransactionModalOpen}
                    onClose={() => setIsRecordTransactionModalOpen(false)}
                    student={selectedStudent}
                    academicPeriods={academicPeriods}
                    feeCategories={feeCategories}
                    selectedPeriodId={selectedPeriodId || undefined}
                    db={db}
                    auth={auth}
                    onSuccess={fetchAccountantData}
                    initialType={transactionModalInitialType}
                    initialCategoryId={transactionModalInitialCategoryId}
                    transactionToEdit={transactionToEdit}
                    filterType={feesActiveSubTab}
                />
            )}

            {isParentBulkModalOpen && db && auth && (
                <ParentBulkPaymentModal
                    isOpen={isParentBulkModalOpen}
                    onClose={() => setIsParentBulkModalOpen(false)}
                    students={students}
                    feeCategories={feeCategories}
                    schoolId={schoolId}
                    db={db}
                    auth={auth}
                    periodId={selectedPeriodId || undefined}
                    onSuccess={fetchAccountantData}
                />
            )}

            {isParentBulkMainModalOpen && db && auth && (
                <ParentBulkMainPaymentModal
                    isOpen={isParentBulkMainModalOpen}
                    onClose={() => setIsParentBulkMainModalOpen(false)}
                    students={students}
                    feeCategories={feeCategories}
                    schoolId={schoolId}
                    db={db}
                    auth={auth}
                    period={academicPeriods.find(p => p.id === selectedPeriodId) || academicPeriods.find(p => p.isCurrent) || academicPeriods[0]}
                    onSuccess={fetchAccountantData}
                />
            )}

            {/* Void Daily Fee dialog confirmation */}
            {categoryToClear && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="max-w-md w-full border border-slate-250 shadow-2xl p-6 rounded-3xl bg-white text-center">
                        <CardHeader>
                            <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200">
                                <AlertCircle className="w-7 h-7 text-rose-500 animate-pulse" />
                            </div>
                            <CardTitle className="text-rose-600 font-headline text-xl">Confirm Void</CardTitle>
                            <CardDescription className="text-xs text-slate-500 mt-2">
                                This will void all ledger transactions logged for <strong className="text-slate-800">{categoryToClear.categoryName}</strong> on the selected date for this student. Are you sure you want to proceed?
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="flex gap-3 justify-center pt-4">
                            <Button variant="ghost" onClick={() => setCategoryToClear(null)} disabled={isSubmitting} className="font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-xs rounded-xl">Cancel</Button>
                            <Button onClick={handleClearDailyFees} disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold shadow-lg shadow-rose-100 transition-all text-xs rounded-xl h-10">
                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Yes, Void Records'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}
