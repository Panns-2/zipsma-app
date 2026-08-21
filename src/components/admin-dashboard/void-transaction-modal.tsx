'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle } from 'lucide-react';
import { voidLedgerTransaction } from '@/lib/data-store';
import { useToast } from '@/hooks/use-toast';

interface VoidTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentId: string;
    transactionId: string;
    schoolId: string;
    db: any;
    auth: any;
    onSuccess: () => void;
}

export const VoidTransactionModal: React.FC<VoidTransactionModalProps> = ({
    isOpen,
    onClose,
    studentId,
    transactionId,
    schoolId,
    db,
    auth,
    onSuccess
}) => {
    const { toast } = useToast();
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!reason.trim()) {
            toast({ title: "Reason Required", description: "Please provide a reason for voiding this transaction.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await voidLedgerTransaction(db, auth, studentId, transactionId, reason, schoolId);
            toast({ title: "Transaction Voided", description: "The transaction has been successfully canceled." });
            onSuccess();
            onClose();
            setReason("");
        } catch (error: any) {
            console.error("Error voiding transaction:", error);
            toast({ title: "Error", description: error.message || "Failed to void transaction.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] font-jakarta border-destructive/20 shadow-xl shadow-destructive/10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" /> Cancel Transaction
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to void this transaction? This action cannot be undone, and the amount will be reversed.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Reason for Cancellation</label>
                        <Input 
                            value={reason} 
                            onChange={e => setReason(e.target.value)} 
                            placeholder="e.g. Entered by mistake"
                            className="font-medium"
                            autoFocus
                        />
                    </div>
                </div>
                <DialogFooter className="flex gap-2 sm:justify-between">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                        Back
                    </Button>
                    <Button 
                        type="button" 
                        variant="destructive"
                        onClick={handleConfirm} 
                        disabled={!reason.trim() || isSubmitting}
                        className="font-bold uppercase"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {isSubmitting ? "Voiding..." : "Confirm Void"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
