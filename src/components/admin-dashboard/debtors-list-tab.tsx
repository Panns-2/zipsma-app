'use client';

import { useState, useMemo } from 'react';
import { Student, AcademicPeriod, FeeCategory, calculateStudentTotalBalance } from '@/lib/data-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Search, AlertTriangle, Phone } from 'lucide-react';
import { exportToCSV } from '@/lib/export-utils';

interface DebtorsListTabProps {
    students: Student[];
    academicPeriods: AcademicPeriod[];
    feeCategories: FeeCategory[];
    selectedPeriodId: string | null;
}

export function DebtorsListTab({ students, academicPeriods, feeCategories, selectedPeriodId }: DebtorsListTabProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('All');
    const [filterType, setFilterType] = useState<'All' | 'Main' | 'Daily'>('All');

    // Calculate balances and filter out non-debtors
    const debtors = useMemo(() => {
        // Find current period
        const currentPeriod = academicPeriods.find(p => p.isCurrent) || academicPeriods[0];
        
        const calculated = students.map(student => {
            const balanceInfo = calculateStudentTotalBalance(student, academicPeriods, selectedPeriodId || undefined, feeCategories);
            
            const mainDebt = balanceInfo.mainData.balance;
            const dailyDebt = balanceInfo.dailyData.balance + balanceInfo.dailyAccruedInfo;
            const totalDebt = balanceInfo.totalOutstanding;

            return {
                ...student,
                mainDebt,
                dailyDebt,
                totalDebt
            };
        }).filter(s => s.totalDebt > 0);

        // Apply filters
        return calculated.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 (s.parentName && s.parentName.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesClass = filterClass === 'All' || s.className === filterClass;
            
            const matchesType = filterType === 'All' || 
                               (filterType === 'Main' && s.mainDebt > 0) || 
                               (filterType === 'Daily' && s.dailyDebt > 0);
                               
            return matchesSearch && matchesClass && matchesType;
        }).sort((a, b) => b.totalDebt - a.totalDebt); // Sort by highest debt
    }, [students, academicPeriods, feeCategories, searchQuery, filterClass, filterType]);

    const uniqueClasses = ['All', ...Array.from(new Set(students.map(s => s.className))).sort()];

    const totalOwed = debtors.reduce((sum, s) => sum + s.totalDebt, 0);

    const handleExport = () => {
        const data = debtors.map(s => ({
            'Student Name': s.name,
            'Class': s.className,
            'Parent Name': s.parentName,
            'Parent Phone': s.parentPhone,
            'Core Fees Debt': s.mainDebt,
            'Daily Recurring Fees Debt': s.dailyDebt,
            'Total Debt': s.totalDebt
        }));
        exportToCSV('Debtors_List.csv', data);
    };

    return (
        <div className="space-y-6">
            <Card className="border-red-500/20 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-red-500/10 to-red-500/5 px-6 py-8 border-b border-red-500/10">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6" /> Debtors List
                            </h2>
                            <p className="text-red-600/80 mt-1 font-medium">Overview of students with outstanding balances</p>
                        </div>
                        <div className="bg-white/50 px-4 py-3 rounded-xl border border-red-500/20 shadow-inner">
                            <p className="text-sm text-red-600/80 font-bold uppercase tracking-wider mb-1">Total Outstanding</p>
                            <p className="text-3xl font-black text-red-600">GHS {totalOwed.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by student or parent name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-11 rounded-xl bg-muted/50 border-transparent focus-visible:ring-red-500/20 focus-visible:border-red-500"
                            />
                        </div>
                        <select 
                            value={filterClass} 
                            onChange={(e) => setFilterClass(e.target.value)}
                            className="h-11 px-4 rounded-xl border border-input bg-background"
                        >
                            {uniqueClasses.map(c => (
                                <option key={c} value={c}>{c === 'All' ? 'All Classes' : c}</option>
                            ))}
                        </select>
                        <select 
                            value={filterType} 
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="h-11 px-4 rounded-xl border border-input bg-background"
                        >
                            <option value="All">All Debts</option>
                            <option value="Main">Core Fees Only</option>
                            <option value="Daily">Daily Recurring Fees Only</option>
                        </select>
                        <Button onClick={handleExport} variant="outline" className="h-11 px-4 rounded-xl gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                            <Download className="w-4 h-4" /> Export CSV
                        </Button>
                    </div>

                    <div className="border rounded-xl overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-semibold text-muted-foreground">Student</TableHead>
                                    <TableHead className="font-semibold text-muted-foreground">Class</TableHead>
                                    <TableHead className="font-semibold text-muted-foreground">Parent/Guardian</TableHead>
                                    <TableHead className="text-right font-semibold text-muted-foreground">Core Fees</TableHead>
                                    <TableHead className="text-right font-semibold text-muted-foreground">Daily Recurring Fees</TableHead>
                                    <TableHead className="text-right font-semibold text-muted-foreground">Total Debt</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {debtors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            No debtors found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    debtors.map(student => (
                                        <TableRow key={student.studentId} className="hover:bg-muted/30">
                                            <TableCell className="font-medium text-foreground">
                                                {student.name}
                                                {student.isArchived && (
                                                    <Badge variant="secondary" className="ml-2 text-[10px] uppercase tracking-wider">Archived</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-normal text-xs">{student.className}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{student.parentName || 'N/A'}</span>
                                                    {student.parentPhone && (
                                                        <a href={`tel:${student.parentPhone}`} className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 hover:text-primary transition-colors">
                                                            <Phone className="w-3 h-3" /> {student.parentPhone}
                                                        </a>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {student.mainDebt > 0 ? (
                                                    <span className="text-red-600 font-semibold">{student.mainDebt.toFixed(2)}</span>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">0.00</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {student.dailyDebt > 0 ? (
                                                    <span className="text-orange-500 font-semibold">{student.dailyDebt.toFixed(2)}</span>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">0.00</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-red-600 bg-red-50/50">
                                                GHS {student.totalDebt.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
