
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Student, LedgerTransaction, AcademicPeriod, FeeCategory, isDailyTransaction, isDailyCategory, calculateInstallmentExpectedAmount, calculateStudentTotalBalance } from '@/lib/data-store';
import { cn } from '@/lib/utils';
import { Landmark, TrendingUp, TrendingDown, Receipt, Utensils, UtensilsCrossed, ChevronDown, ChevronUp } from 'lucide-react';

interface StudentLedgerViewProps {
    student: Student;
    periods: AcademicPeriod[];
    selectedPeriodId: string;
    feeCategories: FeeCategory[];
    schoolId?: string;
    feeDiscount?: number;
}

export const StudentLedgerView: React.FC<StudentLedgerViewProps> = ({ student, periods, selectedPeriodId, feeCategories, schoolId, feeDiscount }) => {
    const [isStatementExpanded, setIsStatementExpanded] = useState(false);
    const { totals, displayLedger, balanceBF, feeBreakdown, dailyFeeBreakdown } = useMemo(() => {
        const balanceInfo = calculateStudentTotalBalance(student, periods, selectedPeriodId, feeCategories);
        const { mainData, dailyData, dailyAccruedInfo, totalOutstanding } = balanceInfo;

        const currentPeriod = periods.find(p => p.id === selectedPeriodId);
        
        let accruedFeeding = 0;
        const dailyFeeBreakdown: Record<string, number> = {};

        const attendance = student.attendance || [];
        const daysPresentInPeriod = attendance.filter(a => a.attended && (!selectedPeriodId || a.periodId === selectedPeriodId)).length;

        // Process all dynamic daily recurring fee categories using the official category list and legacy markers
        feeCategories.filter(isDailyCategory).forEach(cat => {
            const normName = cat.name.toLowerCase().trim();
            const normId = cat.id;
            
            // Find student's assigned rate for this category
            const studentRate = (student.dailyFees || []).find(f => 
                f.categoryId === normId || f.categoryId === normId.toLowerCase()
            )?.rate || 0;

            const amount = daysPresentInPeriod * Number(studentRate);
            if (amount > 0) {
                dailyFeeBreakdown[cat.name] = (dailyFeeBreakdown[cat.name] || 0) + amount;

                // Track feeding specifically for the info boxes if this is the feeding category
                if (normName === 'feeding fee' || normName === 'feeding' || normId === 'feeding') {
                    accruedFeeding += amount;
                }
            }
        });

        // Calculate Term Feeding Total (from ledger debits - for info only)
        const termFeedingTotalLedger = [...dailyData.currentTransactions, ...mainData.currentTransactions]
            .filter(t => t.debit > 0 && (
                t.category === 'feeding' || 
                t.category?.toLowerCase() === 'feeding fee' || 
                t.description?.toLowerCase().includes('feeding')
            ))
            .reduce((sum, t) => sum + (Number(t.debit) || 0), 0);

        const feeBreakdown = mainData.currentTransactions
            .filter(t => t.debit > 0)
            .reduce((acc, t) => {
                let catName = t.description || 'General';
                if (t.category) {
                    if (t.category === 'feeding' || t.category.toLowerCase() === 'feeding fee') {
                        catName = 'Feeding Fee';
                    } else if (t.category.toLowerCase() !== 'general' && t.category.toLowerCase() !== 'transportation') {
                        const foundCat = feeCategories.find(c => c.id === t.category);
                        if (foundCat) catName = foundCat.name;
                    } else {
                        catName = t.category.charAt(0).toUpperCase() + t.category.slice(1);
                    }
                }
                acc[catName] = (acc[catName] || 0) + t.debit;
                return acc;
            }, {} as Record<string, number>);

        // Installment Logic
        const termExpectedAmount = currentPeriod ? calculateInstallmentExpectedAmount(student, currentPeriod, feeCategories) : mainData.billed;
        const adminExpectedBilled = (mainData.bf > 0 ? mainData.bf : 0) + termExpectedAmount;
        const adminPaidMain = (mainData.bf < 0 ? Math.abs(mainData.bf) : 0) + mainData.paid;
        const mainOutstandingAtDeadline = Math.max(0, adminExpectedBilled - adminPaidMain);


        return {
            balanceBF: mainData.bf + dailyData.bf,
            displayLedger: [...dailyData.currentTransactions, ...mainData.currentTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            feeBreakdown,
            dailyFeeBreakdown,
            currentPeriod,
            totals: {
                billed: mainData.billed + dailyData.billed,
                paid: mainData.paid + dailyData.paid,
                outstanding: totalOutstanding,
                mainOutstanding: mainData.balance,
                dailyOutstanding: dailyData.balance,
                dailyAccrued: dailyAccruedInfo,
                accruedFeeding: accruedFeeding,
                termFeedingTotal: termFeedingTotalLedger,
                expectedAmount: adminExpectedBilled,
                mainOutstandingAtDeadline
            }
        };
    }, [student.ledger, student.attendance, student.dailyFees, periods, selectedPeriodId, feeCategories, schoolId]);

    return (
        <div className="space-y-6">
            {/* High-Contrast Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp className="w-24 h-24 rotate-12" />
                    </div>
                    <CardContent className="p-4 md:p-6 relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-100">Installment Due Today</p>
                            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-blue-100" />
                        </div>
                        <p className="text-2xl md:text-3xl font-black font-sans drop-shadow-sm">GH¢{totals.mainOutstandingAtDeadline.toFixed(2)}</p>
                        <p className="text-[9px] md:text-[11px] mt-2 text-blue-100 font-medium tracking-wide">Remaining amount you need to pay today to stay on track</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Receipt className="w-24 h-24 rotate-12" />
                    </div>
                    <CardContent className="p-4 md:p-6 relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-purple-100">Unpaid Daily Recurring Fees</p>
                            <Receipt className="w-4 h-4 md:w-5 md:h-5 text-purple-100" />
                        </div>
                        <p className="text-2xl md:text-3xl font-black font-sans drop-shadow-sm">
                            GH¢{Math.max(0, totals.dailyOutstanding + totals.dailyAccrued).toFixed(2)}
                        </p>
                        <p className="text-[9px] md:text-[11px] mt-2 text-purple-100 font-medium tracking-wide">Outstanding balance for daily recurring fees (e.g., feeding)</p>
                    </CardContent>
                </Card>

                <Card className={cn(
                    "border-none shadow-lg text-white overflow-hidden relative",
                    totals.outstanding > 0 ? "bg-gradient-to-br from-red-500 to-rose-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"
                )}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Landmark className="w-24 h-24 rotate-12" />
                    </div>
                    <CardContent className="p-4 md:p-6 relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <p className={cn("text-[10px] md:text-xs font-bold uppercase tracking-widest", totals.outstanding > 0 ? "text-red-100" : "text-emerald-100")}>Total Balance</p>
                            <Landmark className={cn("w-4 h-4 md:w-5 md:h-5", totals.outstanding > 0 ? "text-red-100" : "text-emerald-100")} />
                        </div>
                        <p className="text-2xl md:text-3xl font-black font-sans drop-shadow-sm">
                            GH¢{totals.outstanding.toFixed(2)}
                        </p>
                        <p className={cn("text-[9px] md:text-[11px] mt-2 font-medium tracking-wide", totals.outstanding > 0 ? "text-red-100" : "text-emerald-100")}>The exact total debt currently owed (Core Fee + Daily Recurring Fees)</p>
                    </CardContent>
                </Card>
            </div>

            {feeDiscount && feeDiscount > 0 ? (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <TrendingDown className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-emerald-800 uppercase tracking-tight">Active Fee Discount: {feeDiscount}%</p>
                            <p className="text-[10px] text-emerald-600 font-medium italic">This student receives a {feeDiscount}% reduction on all core school fees.</p>
                        </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white font-bold uppercase tracking-widest text-[9px]">Applied</Badge>
                </div>
            ) : null}
            
            {/* Fee Breakdown Summary */}
            {(Object.keys(feeBreakdown).length > 0 || Object.keys(dailyFeeBreakdown).length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(feeBreakdown).length > 0 && (
                        <div className="p-4 bg-muted/20 border-2 border-dashed rounded-xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" /> Term Fee Breakdown
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(feeBreakdown).map(([desc, amount], i) => (
                                    <Badge key={i} variant="outline" className="bg-background text-primary border-primary/20 py-1.5 px-3 shadow-sm font-sans">
                                        <span className="font-medium mr-2">{desc}:</span>
                                        <span className="font-black">GH¢{amount.toFixed(2)}</span>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {Object.keys(dailyFeeBreakdown).length > 0 && (
                        <div className="p-4 bg-indigo-50/50 border-2 border-dashed border-indigo-400 rounded-xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900/70 mb-3 flex items-center gap-2">
                                <Receipt className="w-3 h-3" /> Total Cost of Daily Services Consumed (Based on Attendance)
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(dailyFeeBreakdown).map(([desc, amount], i) => (
                                    <Badge key={i} variant="outline" className="bg-white text-indigo-950 border-indigo-300 py-1.5 px-3 shadow-sm font-sans">
                                        <span className="font-medium mr-2">{desc}:</span>
                                        <span className="font-black">GH¢{amount.toFixed(2)}</span>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Ledger Table */}
            <Card className="border-2 shadow-sm overflow-hidden">
                <CardHeader 
                    className="bg-muted/30 pb-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setIsStatementExpanded(!isStatementExpanded)}
                >
                    <CardTitle className="text-lg font-sans font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Receipt className="w-5 h-5" /> Detailed Statement
                        </div>
                        {isStatementExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                    </CardTitle>
                </CardHeader>
                {isStatementExpanded && (
                    <CardContent className="p-0 border-t">
                        <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="font-bold">Date</TableHead>
                                <TableHead className="font-bold">Description</TableHead>
                                <TableHead className="font-bold text-right">Amount Billed</TableHead>
                                <TableHead className="font-bold text-right">Amount Paid</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {balanceBF !== 0 && (
                                <TableRow className="bg-primary/5 italic">
                                    <TableCell className="font-medium text-xs">-</TableCell>
                                    <TableCell className="font-bold text-xs uppercase tracking-tight">Balance Brought Forward</TableCell>
                                    <TableCell className="text-right text-numeric font-bold text-xs">{balanceBF > 0 ? `GH¢${balanceBF.toFixed(2)}` : '-'}</TableCell>
                                    <TableCell className="text-right text-numeric font-bold text-xs">{balanceBF < 0 ? `GH¢${Math.abs(balanceBF).toFixed(2)}` : '-'}</TableCell>
                                </TableRow>
                            )}
                            {Object.entries(dailyFeeBreakdown).map(([desc, amount], i) => (
                                <TableRow key={`synthetic-daily-${i}`} className="bg-indigo-50/50">
                                    <TableCell className="text-xs whitespace-nowrap">-</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm tracking-tight">{desc}</span>
                                            <span className="text-[10px] uppercase font-bold text-indigo-500">Daily Recurring Fee (Auto-Accrued)</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-numeric font-bold text-destructive">
                                        GH¢{amount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right text-numeric font-bold text-success">
                                        -
                                    </TableCell>
                                </TableRow>
                            ))}
                            {displayLedger.length === 0 && Object.keys(dailyFeeBreakdown).length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                                        No transactions recorded for this term.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                displayLedger.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell className="text-xs whitespace-nowrap">{new Date(t.date).toLocaleDateString('en-GB')}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                {(() => {
                                                    let displayDesc = t.description;
                                                    if (displayDesc === 'Daily Recurring Fee Deduction' && t.category) {
                                                        const catObj = feeCategories.find(c => c.id === t.category || c.name === t.category);
                                                        if (catObj) {
                                                            displayDesc = `Daily ${catObj.name}`;
                                                        } else if (t.category !== 'daily' && t.category !== 'feeding') {
                                                            displayDesc = `Daily Recurring Fee: ${t.category.charAt(0).toUpperCase() + t.category.slice(1).replace(/_/g, ' ')}`;
                                                        }
                                                    }
                                                    
                                                    const discountPercent = feeDiscount ?? 0;
                                                    if (discountPercent > 0 && t.type === 'fee' && !displayDesc.includes('Discount')) {
                                                        displayDesc = `${displayDesc} (${discountPercent}% Discount)`;
                                                    }

                                                    return <span className="font-bold text-sm tracking-tight">{displayDesc}</span>;
                                                })()}
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                                    {t.credit > 0 ? 'Payment Received' : 
                                                     t.type === 'adjustment' ? 'Adjustment' :
                                                     isDailyTransaction(t, feeCategories) ? 'Daily Recurring Fee' : 'Term Fee'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right text-numeric font-bold text-destructive">
                                            {t.debit > 0 ? `GH¢${t.debit.toFixed(2)}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-numeric font-bold text-success">
                                            {t.credit > 0 ? `GH¢${t.credit.toFixed(2)}` : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                )}
            </Card>
        </div>
    );
};
