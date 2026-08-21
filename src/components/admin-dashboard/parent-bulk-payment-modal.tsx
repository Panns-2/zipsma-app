'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Landmark, Loader2, CheckCircle2, Search } from 'lucide-react';
import { Student, FeeCategory, AcademicPeriod, postBulkParentAutoDistributedPayment, calculateStudentTotalBalance } from '@/lib/data-store';
import { useToast } from '@/hooks/use-toast';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface ParentBulkPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    feeCategories: FeeCategory[];
    schoolId: string;
    db: Firestore;
    auth: Auth;
    periodId?: string;
    periods: AcademicPeriod[];
    onSuccess: () => void;
}

export const ParentBulkPaymentModal: React.FC<ParentBulkPaymentModalProps> = ({
    isOpen,
    onClose,
    students,
    feeCategories,
    schoolId,
    db,
    auth,
    periodId,
    periods,
    onSuccess
}) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [selectedParentId, setSelectedParentId] = useState<string>('');
    const [amountStr, setAmountStr] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    const dailyCategories = useMemo(() => feeCategories.filter(c => c.isDaily), [feeCategories]);

    useEffect(() => {
        if (isOpen) {
            setAmountStr('');
            setSelectedParentId('');
            setSearchQuery('');
        }
    }, [isOpen]);

    // Extract unique parents
    const parents = useMemo(() => {
        const parentMap = new Map<string, { id: string, phone: string, name: string, childrenCount: number }>();
        const normalizeStr = (str?: string | null) => str ? str.trim().toLowerCase() : '';
        students.forEach(s => {
            const pId = normalizeStr(s.parentPhone) || normalizeStr(s.parentId) || normalizeStr(s.parentName);
            if (pId) {
                if (!parentMap.has(pId)) {
                    parentMap.set(pId, { id: pId, phone: s.parentPhone || '', name: s.parentName || `Parent of ${s.name}`, childrenCount: 1 });
                } else {
                    const p = parentMap.get(pId)!;
                    p.childrenCount++;
                    if (!s.parentName && p.name.startsWith('Parent of ') && !p.name.includes(' and Sibling(s)')) {
                        p.name += ' and Sibling(s)';
                    }
                }
            }
        });
        return Array.from(parentMap.values())
            .filter(p => p.childrenCount > 1 || true) // Show all parents, even single child for convenience
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [students]);

    const searchResults = useMemo(() => {
        if (!searchQuery) {
            return parents.map(p => ({
                id: p.id,
                parentId: p.id,
                type: 'parent',
                name: p.name,
                subtext: p.phone,
                childrenCount: p.childrenCount
            }));
        }

        const q = searchQuery.toLowerCase();
        const results: { id: string, parentId: string, type: string, name: string, subtext: string, childrenCount: number }[] = [];
        const addedParentIds = new Set<string>();

        // 1. Search Parents
        parents.forEach(p => {
            if (p.name.toLowerCase().includes(q) || p.phone.toLowerCase().includes(q)) {
                results.push({
                    id: p.id,
                    parentId: p.id,
                    type: 'parent',
                    name: p.name,
                    subtext: p.phone,
                    childrenCount: p.childrenCount
                });
                addedParentIds.add(p.id);
            }
        });

        // 2. Search Students
        const normalizeStr = (str?: string | null) => str ? str.trim().toLowerCase() : '';
        students.forEach(s => {
            if (s.name.toLowerCase().includes(q) || (s.studentId && s.studentId.toLowerCase().includes(q))) {
                const pId = normalizeStr(s.parentPhone) || normalizeStr(s.parentId) || normalizeStr(s.parentName);
                if (pId && !addedParentIds.has(pId)) {
                    const p = parents.find(parent => parent.id === pId);
                    if (p) {
                        results.push({
                            id: `student-${s.id || s.studentId}`,
                            parentId: p.id,
                            type: 'student',
                            name: `${s.name} (Student)`,
                            subtext: `Parent: ${p.name} • ${p.phone}`,
                            childrenCount: p.childrenCount
                        });
                        addedParentIds.add(p.id);
                    }
                }
            }
        });

        return results;
    }, [parents, searchQuery, students]);

    const selectedChildren = useMemo(() => {
        if (!selectedParentId) return [];
        const normalizeStr = (str?: string | null) => str ? str.trim().toLowerCase() : '';
        return students.filter(s => {
            const pId = normalizeStr(s.parentPhone) || normalizeStr(s.parentId) || normalizeStr(s.parentName);
            return pId === selectedParentId;
        });
    }, [students, selectedParentId]);

    const childrenDebts = useMemo(() => {
        if (selectedChildren.length === 0) return [];
        const debts: { student: Student, categoryId: string, categoryName: string, debt: number, dailyRate: number }[] = [];
        
        selectedChildren.forEach(student => {
            const studentDailyCategories = feeCategories.filter(c => c.isDaily);
            const balanceInfo = calculateStudentTotalBalance(student, periods, periodId, feeCategories);
            
            studentDailyCategories.forEach(cat => {
                const rateObj = (student.dailyFees || []).find(f => f.categoryId === cat.id || f.categoryId === cat.id.toLowerCase());
                const rate = Number(rateObj?.rate) || 0;
                
                const debt = balanceInfo.dailyDebtByCategory[cat.id] || 0;
                if (debt > 0 || rate > 0) {
                    debts.push({ student, categoryId: cat.id, categoryName: cat.name, debt, dailyRate: rate });
                }
            });
        });
        return debts;
    }, [selectedChildren, feeCategories, periods, periodId]);

    const totalDebt = useMemo(() => childrenDebts.reduce((sum, item) => sum + Math.max(0, item.debt), 0), [childrenDebts]);

    const previewDistribution = useMemo(() => {
        const amount = parseFloat(amountStr) || 0;
        if (amount <= 0 || childrenDebts.length === 0) return [];

        let remaining = amount;
        const distribution = childrenDebts.map(c => ({ 
            student: c.student, 
            categoryId: c.categoryId,
            categoryName: c.categoryName,
            oldDebt: c.debt, 
            payment: 0,
            dailyRate: c.dailyRate
        }));

        // Pass 1: clear debts
        for (const item of distribution) {
            if (item.oldDebt > 0 && remaining > 0) {
                const pay = Math.min(item.oldDebt, remaining);
                item.payment += pay;
                remaining -= pay;
            }
        }

        // Pass 2: advance using proportional distribution
        if (remaining > 0.01) {
            const totalDailyRates = distribution.reduce((sum, item) => sum + item.dailyRate, 0);
            
            if (totalDailyRates > 0) {
                distribution.forEach(item => {
                    const proportion = item.dailyRate / totalDailyRates;
                    item.payment += remaining * proportion;
                });
            } else {
                const advance = remaining / distribution.length;
                distribution.forEach(item => item.payment += advance);
            }
        }

        return distribution;
    }, [amountStr, childrenDebts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(amountStr);
        if (!selectedParentId || isNaN(amount) || amount <= 0 || previewDistribution.length === 0) return;

        setIsSubmitting(true);
        try {
            const distributionsToPost = previewDistribution.map(item => ({
                studentId: item.student.studentId,
                student: item.student,
                categoryId: item.categoryId,
                categoryName: item.categoryName,
                amount: item.payment
            })).filter(d => d.amount > 0);

            await postBulkParentAutoDistributedPayment(
                db, auth, schoolId, distributionsToPost, periodId
            );
            toast({ title: "Payment Recorded", description: `Successfully recorded and distributed GH¢${amount.toFixed(2)}.` });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Bulk Parent Auto-Distribution Error:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl font-sans">
                <DialogHeader className="bg-indigo-600 text-white p-8">
                    <DialogTitle className="text-2xl font-black flex items-center gap-3">
                        <Users className="w-8 h-8" />
                        Parent Bulk Payment
                    </DialogTitle>
                    <DialogDescription className="text-indigo-100 font-medium">
                        Record a lump sum payment from a parent. The system will automatically distribute it across all their children to clear daily recurring fee debts.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Parent Selection */}
                    <div className="space-y-3">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Select Parent</Label>
                        {!selectedParentId ? (
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <Input
                                        placeholder="Search parent or student name..."
                                        className="pl-9 h-11 bg-slate-50 border-slate-200"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-sm scrollbar-thin scrollbar-thumb-slate-200">
                                    {searchResults.slice(0, 10).map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setSelectedParentId(item.parentId)}
                                            className="w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                                        >
                                            <div>
                                                <p className="font-bold text-sm text-slate-800">{item.name}</p>
                                                <p className="text-xs text-slate-500">{item.subtext}</p>
                                            </div>
                                            <Badge variant="secondary" className="bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-700">
                                                {item.childrenCount} {item.childrenCount === 1 ? 'Child' : 'Children'}
                                            </Badge>
                                        </button>
                                    ))}
                                    {searchResults.length === 0 && (
                                        <div className="p-4 text-center text-sm text-slate-500 italic">No results found.</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-4 border-2 border-indigo-100 bg-indigo-50/50 rounded-xl">
                                <div>
                                    <p className="font-black text-sm text-indigo-900">{parents.find(p => p.id === selectedParentId)?.name}</p>
                                    <p className="text-xs text-indigo-600/70 font-semibold">{parents.find(p => p.id === selectedParentId)?.phone}</p>
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedParentId('')} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 text-xs font-bold">
                                    Change
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Form Controls */}
                    {selectedParentId && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Amount Received (GH¢)</Label>
                                    <Input 
                                        type="number" 
                                        placeholder="0.00" 
                                        value={amountStr} 
                                        onChange={e => setAmountStr(e.target.value)} 
                                        required 
                                        min="0.1"
                                        step="0.01"
                                        className="h-12 border-slate-200 bg-slate-50 text-numeric text-lg font-black text-indigo-600"
                                    />
                                </div>
                            </div>

                            {/* Total Debt Info */}
                            {totalDebt > 0 && (
                                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between">
                                    <span className="text-xs font-bold text-rose-700 uppercase tracking-widest">Combined Debt:</span>
                                    <span className="font-black text-rose-700">GH¢{totalDebt.toFixed(2)}</span>
                                </div>
                            )}

                            {/* Distribution Preview */}
                            {previewDistribution.length > 0 && (
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <Landmark className="w-4 h-4" />
                                        Payment Distribution Preview
                                    </Label>
                                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                                                <tr>
                                                    <th className="px-4 py-3">Child</th>
                                                    <th className="px-4 py-3">Fee Category</th>
                                                    <th className="px-4 py-3 text-right">Current Debt</th>
                                                    <th className="px-4 py-3 text-right text-indigo-600">Payment Assigned</th>
                                                    <th className="px-4 py-3 text-right">New Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {previewDistribution.map((item, idx) => {
                                                    const newBal = item.oldDebt - item.payment;
                                                    return (
                                                        <tr key={idx} className="bg-white">
                                                            <td className="px-4 py-3 font-bold text-slate-800">{item.student.name}</td>
                                                            <td className="px-4 py-3 font-bold text-slate-600">{item.categoryName}</td>
                                                            <td className="px-4 py-3 text-right text-slate-500">{item.oldDebt > 0 ? `GH¢${item.oldDebt.toFixed(2)}` : '0.00'}</td>
                                                            <td className="px-4 py-3 text-right font-black text-emerald-600">+GH¢{item.payment.toFixed(2)}</td>
                                                            <td className="px-4 py-3 text-right font-bold">
                                                                {newBal > 0.01 ? (
                                                                    <span className="text-rose-600">GH¢{newBal.toFixed(2)}</span>
                                                                ) : newBal < -0.01 ? (
                                                                    <span className="text-emerald-600">Credit GH¢{Math.abs(newBal).toFixed(2)}</span>
                                                                ) : (
                                                                    <span className="text-slate-400">0.00</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium italic">
                                        * Payments are applied to debts first. Any leftover amount is distributed proportionally based on each child's daily recurring fee rates.
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-xl font-bold uppercase text-slate-500 bg-slate-100 hover:bg-slate-200">Cancel</Button>
                                <Button 
                                    type="submit" 
                                    disabled={isSubmitting || parseFloat(amountStr) <= 0 || previewDistribution.length === 0}
                                    className="flex-1 h-12 rounded-xl font-bold uppercase text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Post'}
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
            </DialogContent>
        </Dialog>
    );
};
