import React, { useEffect } from 'react';
import { School, Student, Expenditure, FeeCategory, isDailyTransaction, LedgerTransaction } from '@/lib/data-store';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PrintableMonthlyReportProps {
    month: number; // 0-11
    year: number;
    schoolDetails: School | null;
    students: Student[];
    expenditures: Expenditure[];
    feeCategories: FeeCategory[];
    onClose: () => void;
}

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export function PrintableMonthlyReport({
    month,
    year,
    schoolDetails,
    students,
    expenditures,
    feeCategories,
    onClose
}: PrintableMonthlyReportProps) {

    // Helper to check if a date string falls in the selected month/year
    const isInSelectedMonth = (dateStr: string | Date | undefined) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getMonth() === month && d.getFullYear() === year;
    };

    // Calculate Income
    // Income comes from student ledger payments (type === 'payment' or credit > 0)
    let totalIncome = 0;
    const incomeByCategory: Record<string, number> = {};

    students.forEach(student => {
        (student.ledger || []).forEach(t => {
            if (t.isVoided) return;
            // Only count actual payments (credits)
            const amountPaid = Number(t.credit) || 0;
            if (amountPaid > 0 && isInSelectedMonth(t.date)) {
                totalIncome += amountPaid;
                const catName = t.category || 'Uncategorized';
                incomeByCategory[catName] = (incomeByCategory[catName] || 0) + amountPaid;
            }
        });
    });

    // Calculate Expenditures
    let totalExpenditures = 0;
    const expendituresByCategory: Record<string, number> = {};

    const monthExpenditures = expenditures.filter(e => isInSelectedMonth(e.date));
    monthExpenditures.forEach(e => {
        const amt = Number(e.amount) || 0;
        totalExpenditures += amt;
        const catName = e.category || 'General';
        expendituresByCategory[catName] = (expendituresByCategory[catName] || 0) + amt;
    });

    const netBalance = totalIncome - totalExpenditures;

    // Trigger print dialog when component mounts (optional, or let user click button)
    useEffect(() => {
        // Optional: auto-trigger print
        // window.print();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 print:bg-white text-black p-4 md:p-8 font-sans">
            {/* Action Bar (Hidden in Print) */}
            <div className="print:hidden flex justify-between items-center mb-8 max-w-4xl mx-auto bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <Button variant="ghost" onClick={onClose} className="gap-2">
                    <X className="w-4 h-4" /> Cancel & Return
                </Button>
                <Button onClick={() => window.print()} className="gap-2">
                    <Printer className="w-4 h-4" /> Print Document
                </Button>
            </div>

            {/* A4 Printable Container */}
            <div className="max-w-4xl mx-auto bg-white print:shadow-none print:border-none shadow-xl border border-gray-200 p-8 md:p-12 min-h-[1056px]">
                
                {/* Header */}
                <div className="text-center border-b-2 border-gray-200 pb-8 mb-8">
                    {schoolDetails?.logoUrl ? (
                        <img src={schoolDetails.logoUrl} alt="School Logo" className="h-20 mx-auto mb-4 object-contain" />
                    ) : (
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl font-bold text-primary">{schoolDetails?.name?.charAt(0) || 'S'}</span>
                        </div>
                    )}
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{schoolDetails?.name || 'School Name'}</h1>
                    <p className="text-gray-500">{schoolDetails?.schoolPhone || 'Phone Not Set'} | {schoolDetails?.schoolEmail || 'Email Not Set'}</p>
                    
                    <h2 className="text-2xl font-bold text-primary mt-8 uppercase tracking-widest">
                        Monthly Financial Report
                    </h2>
                    <p className="text-lg font-medium text-gray-600 mt-2">
                        For the month of {MONTH_NAMES[month]} {year}
                    </p>
                </div>

                {/* Executive Summary */}
                <div className="grid grid-cols-3 gap-6 mb-10">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase">Total Income</p>
                        <p className="text-2xl font-black text-emerald-600 mt-1">GHA₵{totalIncome.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase">Total Expenditure</p>
                        <p className="text-2xl font-black text-rose-600 mt-1">GHA₵{totalExpenditures.toFixed(2)}</p>
                    </div>
                    <div className={`rounded-xl p-4 border ${netBalance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                        <p className={`text-xs font-bold uppercase ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            Net Balance
                        </p>
                        <p className={`text-2xl font-black mt-1 ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            GHA₵{netBalance.toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Income Breakdown */}
                <div className="mb-10">
                    <h3 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">Income Breakdown</h3>
                    {Object.keys(incomeByCategory).length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-bold">Fee Category</TableHead>
                                    <TableHead className="text-right font-bold">Amount Collected</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(incomeByCategory).sort((a,b) => b[1] - a[1]).map(([cat, amt]) => (
                                    <TableRow key={cat}>
                                        <TableCell>{cat}</TableCell>
                                        <TableCell className="text-right font-medium">GHA₵{amt.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-gray-500 italic text-sm py-4">No income recorded for this month.</p>
                    )}
                </div>

                {/* Expenditure Breakdown */}
                <div className="mb-10">
                    <h3 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">Expenditure Breakdown</h3>
                    {Object.keys(expendituresByCategory).length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-bold">Expense Category</TableHead>
                                    <TableHead className="text-right font-bold">Amount Spent</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(expendituresByCategory).sort((a,b) => b[1] - a[1]).map(([cat, amt]) => (
                                    <TableRow key={cat}>
                                        <TableCell>{cat}</TableCell>
                                        <TableCell className="text-right font-medium text-rose-600">GHA₵{amt.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-gray-500 italic text-sm py-4">No expenditures recorded for this month.</p>
                    )}
                </div>

                {/* Signatures */}
                <div className="mt-20 pt-10 border-t-2 border-dashed border-gray-200 grid grid-cols-2 gap-20">
                    <div className="text-center">
                        <div className="border-b border-black mb-2 h-10"></div>
                        <p className="font-bold text-sm">Accountant Signature</p>
                        <p className="text-xs text-gray-500 mt-1">Date: ________________</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-black mb-2 h-10"></div>
                        <p className="font-bold text-sm">Administrator Signature</p>
                        <p className="text-xs text-gray-500 mt-1">Date: ________________</p>
                    </div>
                </div>

                <div className="mt-10 text-center text-[10px] text-gray-400">
                    Generated by ZipSMA Financial System on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}
