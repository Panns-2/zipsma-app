
'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LedgerTransaction, Student, AcademicPeriod, FeeCategory } from '@/lib/data-store';
import { Button } from '@/components/ui/button';
import { Receipt, Edit, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LedgerTableProps {
    ledger: LedgerTransaction[];
    onVoid: (id: string) => void;
    onEdit: (transaction: LedgerTransaction) => void;
    generateReceipt: any;
    schoolDetails: any;
    student: Student;
    academicPeriods: AcademicPeriod[];
    feeCategories: FeeCategory[];
    hideDailyAmounts?: boolean;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ 
    ledger, 
    onVoid, 
    onEdit, 
    generateReceipt, 
    schoolDetails, 
    student, 
    academicPeriods, 
    feeCategories,
    hideDailyAmounts = false
}) => {
    if (ledger.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl font-jakarta font-medium">
                No transactions found for this student.
            </div>
        );
    }

    return (
        <div className="border border-primary/10 rounded-xl overflow-hidden bg-card/30 backdrop-blur-sm shadow-xl">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-primary/5">
                        <TableRow className="hover:bg-transparent border-primary/10">
                            <TableHead className="w-[160px] font-bold text-primary text-sm uppercase tracking-wider font-jakarta">Date</TableHead>
                            <TableHead className="font-bold text-primary text-sm uppercase tracking-wider font-jakarta">Category (Description)</TableHead>
                            <TableHead className="text-right font-bold text-primary text-sm uppercase tracking-wider font-jakarta">{hideDailyAmounts ? 'Amount' : 'Charges'}</TableHead>
                            <TableHead className="text-right font-bold text-primary text-sm uppercase tracking-wider font-jakarta">{hideDailyAmounts ? 'Credit Balance' : 'Balance'}</TableHead>
                            <TableHead className="text-right font-bold text-primary text-sm uppercase tracking-wider font-jakarta">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ledger.map((t, idx) => {
                            const rawBalance = ledger.slice(0, idx + 1).reduce((sum, curr) => sum + (curr.isVoided ? 0 : (Number(curr.debit) || 0) - (Number(curr.credit) || 0)), 0);
                            const runningBalance = hideDailyAmounts ? -rawBalance : rawBalance;
                            
                            return (
                                <TableRow key={t.id} className={cn("transition-colors hover:bg-primary/5 border-primary/5", t.isVoided && "opacity-50 grayscale bg-muted/20")}>
                                    <TableCell className="text-sm font-medium text-numeric">{t.date ? t.date.split('-').reverse().join('/') : ''}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            {(() => {
                                                // Resolve category name for color assignment
                                                const catObj = feeCategories.find(c => c.id === t.category || c.name === t.category);
                                                const catName = (catObj ? catObj.name : t.category || '').toLowerCase();
                                                
                                                let colorClass = "bg-primary shadow-[0_0_6px_var(--tw-shadow-color)] shadow-primary/40";
                                                
                                                if (catName.includes('feeding') || catName.includes('food')) {
                                                    colorClass = "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]";
                                                } else if (catName.includes('transport') || catName.includes('bus')) {
                                                    colorClass = "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]";
                                                } else if (catName.includes('general') || catName.includes('tuition')) {
                                                    colorClass = "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]";
                                                } else if (catName.includes('pta')) {
                                                    colorClass = "bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.6)]";
                                                } else if (catName.includes('exam')) {
                                                    colorClass = "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]";
                                                } else if (catName.includes('uniform') || catName.includes('book')) {
                                                    colorClass = "bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.6)]";
                                                } else {
                                                    // Assign a consistent fallback color based on the category name
                                                    const hash = catName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                                    const fallbackColors = [
                                                        "bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.6)]",
                                                        "bg-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.6)]",
                                                        "bg-teal-500 shadow-[0_0_6px_rgba(20,184,166,0.6)]",
                                                        "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]"
                                                    ];
                                                    colorClass = fallbackColors[hash % fallbackColors.length] || colorClass;
                                                }
                                                
                                                let displayDesc = '';
                                                if (catObj && catObj.name) {
                                                    displayDesc = catObj.name;
                                                } else {
                                                    const rawVal = t.category || t.description || 'Transaction';
                                                    // Format nicely if it's just a string like 'payment'
                                                    displayDesc = rawVal.charAt(0).toUpperCase() + rawVal.slice(1);
                                                }
                                                
                                                if (displayDesc.toLowerCase() === 'feeding') displayDesc = 'Feeding Fee';
                                                else if (displayDesc.toLowerCase() === 'transportation') displayDesc = 'Transportation';
                                                else if (displayDesc.toLowerCase() === 'general') displayDesc = 'General Fee';
                                                
                                                if (t.description === 'Daily Recurring Fee Deduction' && catObj) {
                                                    displayDesc = `Daily ${catObj.name}`;
                                                } else if (t.description === 'Daily Recurring Fee Deduction' && t.category !== 'daily' && t.category !== 'feeding') {
                                                    displayDesc = `Daily Recurring Fee: ${t.category ? t.category.charAt(0).toUpperCase() + t.category.slice(1).replace(/_/g, ' ') : ''}`;
                                                }
                                                
                                                // Append description if it adds useful context and isn't redundant
                                                if (t.description && t.description !== t.category && t.description !== displayDesc && t.description.toLowerCase() !== 'class fee' && t.description.toLowerCase() !== 'fees payment' && t.description !== 'Daily Recurring Fee Deduction') {
                                                    displayDesc = `${displayDesc} (${t.description})`;
                                                } else if (t.type === 'payment' && !catObj && t.description) {
                                                    displayDesc = t.description;
                                                }
                                                
                                                displayDesc = displayDesc || 'Transaction';

                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("h-2 w-2 rounded-full flex-shrink-0", colorClass)} />
                                                        <span className="font-bold text-sm">
                                                            {displayDesc}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                            {t.isVoided && (
                                                <div className="flex items-center gap-1.5 mt-1 ml-4">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                                                    <span className="text-xs text-destructive uppercase font-black tracking-tighter">Cancelled: {t.voidedReason}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-numeric text-sm font-semibold">
                                        {(() => {
                                            if (t.debit <= 0 && t.credit <= 0) return <span className="text-muted-foreground/30">-</span>;
                                            
                                            if (t.credit > 0) {
                                                return <span className="text-emerald-600 dark:text-emerald-400 font-bold">-GH¢{t.credit.toFixed(2)}</span>;
                                            }

                                            return <span className="text-primary font-bold">GH¢{t.debit.toFixed(2)}</span>;
                                        })()}
                                    </TableCell>
                                    <TableCell className="text-right font-black text-numeric text-sm">
                                        <span className={cn(
                                            hideDailyAmounts 
                                                ? (runningBalance < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400 font-black")
                                                : (runningBalance > 0 ? "text-destructive" : "text-primary font-bold")
                                        )}>
                                            GH¢{(runningBalance || 0).toFixed(2)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            {t.credit > 0 && !t.isVoided && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-primary hover:bg-primary/10 transition-all active:scale-90" 
                                                                onClick={() => {
                                                                    const categoryMap: Record<string, string> = {
                                                                        'general': 'General',
                                                                        'feeding': 'Feeding',
                                                                        'transportation': 'Transportation'
                                                                    };
                                                                    const displayCategory = categoryMap[t.category] || (t.category.charAt(0).toUpperCase() + t.category.slice(1));
                                                                    generateReceipt(schoolDetails, student, { id: t.id as any, amount: t.credit, date: t.date, notes: t.description, periodId: t.periodId }, displayCategory as any, academicPeriods);
                                                                }}
                                                            >
                                                                <Receipt className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Download Receipt</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                            {!t.isVoided && (
                                                <>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all active:scale-90" 
                                                                    onClick={() => onEdit(t)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Edit Transaction</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 transition-all active:scale-90" 
                                                                    onClick={() => onVoid(t.id)}
                                                                >
                                                                    <XCircle className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Cancel Transaction</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
