
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Banknote, FilePlus, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Student, AcademicPeriod, FeeCategory, postLedgerTransaction, updateLedgerTransaction, LedgerTransaction } from '@/lib/data-store';
import { useToast } from '@/hooks/use-toast';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';

interface RecordTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
    academicPeriods: AcademicPeriod[];
    feeCategories: FeeCategory[];
    selectedPeriodId?: string;
    db: any; // Firestore
    auth: any; // Auth
    onSuccess: () => void;
    initialType?: 'fee' | 'payment' | 'adjustment';
    initialCategoryId?: string;
    transactionToEdit?: LedgerTransaction | null;
    filterType?: 'main' | 'daily' | 'all';
}


export const RecordTransactionModal: React.FC<RecordTransactionModalProps> = ({
    isOpen,
    onClose,
    student,
    academicPeriods,
    feeCategories,
    selectedPeriodId,
    db,
    auth,
    onSuccess,
    initialType = 'payment',
    initialCategoryId,
    transactionToEdit,
    filterType = 'all'
}) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredCategories = React.useMemo(() => {
        if (filterType === 'daily') return feeCategories.filter(c => c.isDaily);
        if (filterType === 'main') return feeCategories.filter(c => !c.isDaily);
        return feeCategories;
    }, [feeCategories, filterType]);
    
    const [form, setForm] = useState({
        type: initialType as 'fee' | 'payment' | 'adjustment',
        category: initialType === 'payment' ? 'fees_payment' : 'General',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        periodId: selectedPeriodId || ''
    });

    const [wasDiscountApplied, setWasDiscountApplied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (transactionToEdit) {
                const resolvedCategory = feeCategories.find(c => c.id === transactionToEdit.categoryId || c.id === transactionToEdit.category || c.name === transactionToEdit.category);
                const isPayment = transactionToEdit.type === 'payment' || transactionToEdit.credit > 0 || (transactionToEdit.debit === 0 && transactionToEdit.credit === 0 && transactionToEdit.category?.toLowerCase().includes('payment'));
                setForm({
                    type: isPayment ? 'payment' : (transactionToEdit.debit > 0 ? 'fee' : 'adjustment'),
                    category: resolvedCategory ? resolvedCategory.id : (transactionToEdit.categoryId || (isPayment ? 'fees_payment' : (transactionToEdit.category as string || 'General'))),
                    amount: (transactionToEdit.debit || transactionToEdit.credit).toString(),
                    date: transactionToEdit.date,
                    periodId: transactionToEdit.periodId || ''
                });
            } else {
                setWasDiscountApplied(false);
                setForm(prev => ({
                    ...prev,
                    type: initialType,
                    periodId: selectedPeriodId || prev.periodId || (academicPeriods[0]?.id || ''),
                    category: initialType === 'payment' ? 'fees_payment' : (initialCategoryId || (filteredCategories.length > 0 ? filteredCategories[0].id : 'General'))
                }));
            }
        }
    }, [isOpen, initialType, selectedPeriodId, academicPeriods, transactionToEdit, filteredCategories, initialCategoryId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student) return;

        setIsSubmitting(true);
        try {
            const amountValue = parseFloat(form.amount);
            const selectedCategory = feeCategories.find(c => c.id === form.category);
            let categoryName = '';
            let categoryId = '';
            let finalDescription = '';

            if (form.type === 'payment') {
                if (form.category === 'fees_payment') {
                    categoryName = 'Fees Payment';
                    categoryId = 'fees_payment';
                    finalDescription = 'Fees Payment';
                } else {
                    const selectedCategory = feeCategories.find(c => c.id === form.category);
                    categoryName = selectedCategory ? selectedCategory.name : form.category;
                    categoryId = selectedCategory?.id || form.category;
                    finalDescription = `${categoryName} Payment`;
                }
            } else {
                const selectedCategory = feeCategories.find(c => c.id === form.category);
                categoryName = selectedCategory ? selectedCategory.name : form.category;
                categoryId = selectedCategory?.id || form.category;
                finalDescription = wasDiscountApplied 
                    ? `${categoryName || 'Fee'} (${student.feeDiscount}% Discount)`
                    : (categoryName || 'Transaction');
            }
                
            const transactionData: any = {
                date: form.date,
                category: categoryName, // Store the human-readable name
                categoryId: categoryId, // Store the strict ID reference
                description: finalDescription,
                debit: form.type === 'fee' ? amountValue : 0,
                credit: form.type === 'payment' ? amountValue : 0,
                periodId: form.periodId || undefined
            };

            if (form.type === 'adjustment') {
                if (amountValue >= 0) {
                    transactionData.debit = amountValue;
                    transactionData.credit = 0;
                } else {
                    transactionData.debit = 0;
                    transactionData.credit = Math.abs(amountValue);
                }
            }

            console.log("[RecordTransactionModal] Starting submission...", transactionData);
            if (transactionToEdit) {
                await updateLedgerTransaction(db, auth, student.id || student.studentId, transactionToEdit.id, transactionData, student.schoolId);
                toast({ title: "Transaction Updated", description: "The transaction has been updated in the ledger." });
            } else {
                await postLedgerTransaction(db, auth, student.id || student.studentId, transactionData, student.schoolId);
                toast({ title: "Transaction Recorded", description: "The transaction has been added to the ledger." });
            }
            onSuccess();
            onClose();
            setForm(prev => ({ ...prev, amount: '' }));
        } catch (error: any) {
            console.error("[RecordTransactionModal] Submission Error:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!student) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl font-jakarta">
                <DialogHeader className={cn(
                    "p-8 transition-colors duration-300",
                    form.type === 'payment' ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground"
                )}>
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <DialogTitle className="text-2xl font-bold flex items-center gap-3 font-headline">
                                {form.type === 'payment' ? <Banknote className="w-8 h-8" /> : <FilePlus className="w-8 h-8" />}
                                {transactionToEdit ? 'Edit Transaction' : form.type === 'payment' ? 'Record Payment' : form.type === 'fee' ? 'Add Fee Charge' : 'New Transaction'}
                            </DialogTitle>
                            <DialogDescription className={cn(
                                "font-medium",
                                form.type === 'payment' ? "text-emerald-50" : "text-primary-foreground/80"
                            )}>
                                {form.type === 'payment' ? 'Record money received from' : 'Add a new fee for'} {student.name}.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Type</Label>
                            <Select value={form.type} onValueChange={(val: any) => {
                                setForm({
                                    ...form,
                                    type: val,
                                    category: val === 'payment' ? 'fees_payment' : (filteredCategories.length > 0 ? filteredCategories[0].id : 'General')
                                });
                            }}>
                                <SelectTrigger className="h-12 border-primary/20 focus:ring-primary shadow-sm bg-muted/30">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fee" className="font-bold text-primary">Fee Added (+)</SelectItem>
                                    <SelectItem value="payment" className="font-bold text-emerald-600">Payment Received (-)</SelectItem>
                                    <SelectItem value="adjustment" className="font-bold">Manual Adjustment</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Category</Label>
                            <Select 
                                value={form.category} 
                                onValueChange={(val: any) => setForm({...form, category: val})}
                            >
                                <SelectTrigger className="h-12 border-primary/20 focus:ring-primary shadow-sm bg-muted/30">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {form.type === 'payment' ? (
                                        <>
                                            <SelectItem value="fees_payment" className="font-bold text-emerald-600">
                                                Fees Payment (General)
                                            </SelectItem>
                                            {filteredCategories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id} className="font-bold text-emerald-600">
                                                    {cat.name} Payment {cat.isDaily ? '(Daily)' : ''}
                                                </SelectItem>
                                            ))}
                                        </>
                                    ) : (
                                        filteredCategories.length === 0 ? (
                                            <SelectItem value="none" disabled>No categories found</SelectItem>
                                        ) : (
                                            filteredCategories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id} className="font-bold">
                                                    {cat.name} {cat.isDaily ? '(Daily)' : ''}
                                                </SelectItem>
                                            ))
                                        )
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Amount (GH¢)</Label>
                            <Input 
                                type="number" 
                                placeholder="0.00" 
                                value={form.amount} 
                                onChange={e => setForm({...form, amount: e.target.value})} 
                                required 
                                className="h-12 border-primary/20 shadow-sm bg-muted/30 text-numeric text-lg font-black"
                            />
                            {form.type === 'fee' && (student.feeDiscount || 0) > 0 && (
                                <div className="mt-2 p-2 bg-primary/5 rounded-lg border border-primary/20 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-300">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-primary font-black uppercase tracking-tighter">Discount Available</span>
                                        <span className="text-xs font-bold text-primary/80">{student.feeDiscount}% reduction</span>
                                    </div>
                                    <Button 
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                            const base = Number(form.amount) || 0;
                                            const discounted = base * (1 - ((student.feeDiscount || 0) / 100));
                                            setForm({...form, amount: discounted.toFixed(2)});
                                            setWasDiscountApplied(true);
                                            toast({ title: "Discount Applied", description: `${student.feeDiscount}% discount applied.` });
                                        }}
                                        className="h-7 text-[10px] font-black bg-primary text-white"
                                    >
                                        Apply
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className="w-full h-12 justify-start text-left border-primary/20 bg-muted/30">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {form.date ? form.date.split('-').reverse().join('/') : <span>Pick date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={form.date ? new Date(form.date + 'T00:00:00') : undefined}
                                        onSelect={(date) => date && setForm({ ...form, date: date.toISOString().split('T')[0] })}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Academic Term</Label>
                        <Select value={form.periodId} onValueChange={(val: any) => setForm({...form, periodId: val})}>
                            <SelectTrigger className="h-12 border-primary/20 focus:ring-primary shadow-sm bg-muted/30 font-bold">
                                <SelectValue placeholder="Select Term" />
                            </SelectTrigger>
                            <SelectContent>
                                {academicPeriods.map(p => (
                                    <SelectItem key={p.id} value={p.id} className="font-bold">{p.year} - {p.term}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-xl font-bold uppercase text-muted-foreground">Cancel</Button>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className={cn(
                                "flex-1 h-12 rounded-xl font-bold uppercase text-white shadow-lg",
                                form.type === 'payment' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "bg-primary hover:bg-primary/90 shadow-primary/20"
                            )}
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Post'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
