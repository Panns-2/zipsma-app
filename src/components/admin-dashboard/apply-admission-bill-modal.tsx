'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Student, getAdmissionBill, postLedgerTransaction, FeeCategory } from '@/lib/data-store';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ApplyAdmissionBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
    schoolId: string;
    db: any; // Firestore
    auth: any; // Auth
    onSuccess: () => void;
    feeCategories: FeeCategory[];
    periodId: string;
}

export const ApplyAdmissionBillModal: React.FC<ApplyAdmissionBillModalProps> = ({
    isOpen,
    onClose,
    student,
    schoolId,
    db,
    auth,
    onSuccess,
    feeCategories,
    periodId
}) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [billConfig, setBillConfig] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBill = async () => {
            if (!isOpen || !student || !schoolId || !db) return;
            
            setIsLoading(true);
            setError(null);
            setBillConfig(null);
            
            try {
                const bill = await getAdmissionBill(db, schoolId, student.className);
                if (bill) {
                    setBillConfig(bill);
                } else {
                    setError(`No Admission Bill is configured for ${student.className}. Please configure it in the Class settings first.`);
                }
            } catch (err: any) {
                console.error("Error fetching admission bill:", err);
                setError(err.message || "Failed to load admission bill for this class.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchBill();
    }, [isOpen, student, schoolId, db]);

    const handleApply = async () => {
        if (!student || !billConfig || !db || !auth) return;
        
        setIsApplying(true);
        try {
            const allItems: { name: string; amount: number; categoryGroup: string }[] = [];
            
            // Collect items from main categories
            if (billConfig.categories && Array.isArray(billConfig.categories)) {
                billConfig.categories.forEach((cat: any) => {
                    if (cat.items && Array.isArray(cat.items)) {
                        cat.items.forEach((item: any) => {
                            if (item.amount > 0) {
                                allItems.push({
                                    name: item.name,
                                    amount: item.amount,
                                    categoryGroup: cat.title || 'Admission Fee'
                                });
                            }
                        });
                    }
                });
            }
            
            // Collect extra items
            if (billConfig.extraItems && Array.isArray(billConfig.extraItems)) {
                billConfig.extraItems.forEach((item: any) => {
                    if (item.amount > 0) {
                        allItems.push({
                            name: item.name,
                            amount: item.amount,
                            categoryGroup: 'Extra Item'
                        });
                    }
                });
            }

            if (allItems.length === 0) {
                toast({ title: "No Fees to Apply", description: "The admission bill has no items with an amount greater than 0.", variant: "destructive" });
                setIsApplying(false);
                return;
            }

            const today = new Date().toISOString().split('T')[0];
            const studentIdToFetch = student.id || student.studentId;

            // Apply each fee as a ledger transaction sequentially to avoid race conditions
            for (const item of allItems) {
                // Try to find a matching generic fee category by name (e.g. "Tuition")
                const matchedCategory = feeCategories.find(c => 
                    item.name.toLowerCase().includes(c.name.toLowerCase()) || 
                    item.categoryGroup.toLowerCase().includes(c.name.toLowerCase())
                );
                
                const categoryName = matchedCategory ? matchedCategory.name : item.categoryGroup;
                const categoryId = matchedCategory ? matchedCategory.id : 'general';
                
                let amountToCharge = item.amount;
                // Apply student fee discount if applicable and not explicitly excluded 
                // (assuming discounts apply to all admission fees here, or could be customized)
                if (student.feeDiscount && student.feeDiscount > 0) {
                     amountToCharge = amountToCharge * (1 - (student.feeDiscount / 100));
                }

                const transactionData: any = {
                    type: 'fee',
                    date: today,
                    category: categoryName,
                    categoryId: categoryId,
                    description: `Admission: ${item.name}`,
                    debit: parseFloat(amountToCharge.toFixed(2)),
                    credit: 0,
                    periodId: periodId || undefined
                };

                await postLedgerTransaction(db, auth, studentIdToFetch, transactionData, schoolId);
            }
            
            toast({ 
                title: "Admission Bill Applied", 
                description: `Successfully applied ${allItems.length} charges to ${student.name}'s account.` 
            });
            
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error applying admission bill:", err);
            toast({ title: "Error", description: err.message || "Failed to apply admission bill.", variant: "destructive" });
        } finally {
            setIsApplying(false);
        }
    };

    if (!student) return null;

    let totalAmount = 0;
    if (billConfig) {
        if (billConfig.categories) {
            billConfig.categories.forEach((cat: any) => {
                if (cat.items) {
                    cat.items.forEach((item: any) => { totalAmount += (Number(item.amount) || 0); });
                }
            });
        }
        if (billConfig.extraItems) {
            billConfig.extraItems.forEach((item: any) => { totalAmount += (Number(item.amount) || 0); });
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl font-jakarta max-h-[90vh] flex flex-col">
                <DialogHeader className="p-8 bg-primary text-primary-foreground shrink-0">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                        <FileText className="w-8 h-8" /> Load Admission Bill
                    </DialogTitle>
                    <DialogDescription className="text-primary-foreground/80 font-medium">
                        Automatically populate standard fees for {student.name} ({student.className}).
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 flex-1 overflow-hidden flex flex-col min-h-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                            <p className="text-sm text-muted-foreground font-medium">Loading admission bill for {student.className}...</p>
                        </div>
                    ) : error ? (
                        <Alert variant="destructive" className="border-2 rounded-xl mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="font-bold">Cannot Load Bill</AlertTitle>
                            <AlertDescription className="font-medium mt-1">{error}</AlertDescription>
                        </Alert>
                    ) : billConfig ? (
                        <div className="flex flex-col h-full overflow-hidden">
                            <div className="mb-4">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Fees to be Applied</h3>
                            </div>
                            <ScrollArea className="flex-1 border rounded-xl bg-muted/20">
                                <div className="p-4 space-y-6">
                                    {billConfig.categories?.map((cat: any, i: number) => (
                                        <div key={i} className="space-y-2">
                                            <h4 className="text-xs font-black text-primary uppercase tracking-widest">{cat.title}</h4>
                                            <div className="space-y-1">
                                                {cat.items?.map((item: any, j: number) => (
                                                    item.amount > 0 && (
                                                        <div key={j} className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                                                            <div className="flex items-center gap-2">
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                                <span className="text-sm font-medium">{item.name}</span>
                                                            </div>
                                                            <span className="text-sm font-bold text-numeric text-primary">GH¢{Number(item.amount).toFixed(2)}</span>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {billConfig.extraItems && billConfig.extraItems.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-black text-primary uppercase tracking-widest">Extra Items</h4>
                                            <div className="space-y-1">
                                                {billConfig.extraItems.map((item: any, j: number) => (
                                                    item.amount > 0 && (
                                                        <div key={j} className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                                                            <div className="flex items-center gap-2">
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                                <span className="text-sm font-medium">{item.name}</span>
                                                            </div>
                                                            <span className="text-sm font-bold text-numeric text-primary">GH¢{Number(item.amount).toFixed(2)}</span>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20 flex justify-between items-center shrink-0">
                                <span className="font-bold text-primary">Total Bill Amount</span>
                                <span className="text-2xl font-black text-numeric text-primary">GH¢{totalAmount.toFixed(2)}</span>
                            </div>
                            
                            {(student.feeDiscount || 0) > 0 && (
                                <div className="mt-2 text-xs text-amber-600 font-bold bg-amber-50 p-2 rounded-lg text-center">
                                    Note: Student has a {student.feeDiscount}% discount which will be applied to these charges.
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                <DialogFooter className="p-6 bg-muted/30 border-t shrink-0 flex gap-3">
                    <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-xl font-bold uppercase text-muted-foreground">Cancel</Button>
                    <Button 
                        onClick={handleApply} 
                        disabled={isApplying || isLoading || !!error || !billConfig}
                        className="flex-1 h-12 rounded-xl font-bold uppercase text-white shadow-lg bg-primary hover:bg-primary/90"
                    >
                        {isApplying ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                        {isApplying ? 'Applying...' : 'Apply Charges'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
