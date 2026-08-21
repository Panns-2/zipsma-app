'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bell, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { FeeCategory, Student, Parent } from '@/lib/data-store';
import { Card } from '@/components/ui/card';

interface BulkFeeReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    feeCategories: FeeCategory[];
    parents: Parent[];
    schoolId: string | null;
}

export function BulkFeeReminderModal({
    isOpen,
    onClose,
    students,
    feeCategories,
    parents,
    schoolId,
}: BulkFeeReminderModalProps) {
    const { toast } = useToast();
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [customMessage, setCustomMessage] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Filter to main categories since daily might not have strict balances the same way
    const mainCategories = feeCategories.filter(c => !c.isDaily);

    
    // Calculate how many students owe money for the selected category
    const debtors = students.filter(s => {
        if (!selectedCategory) return false;
        
        // Find category name
        const cat = mainCategories.find(c => c.id === selectedCategory);
        if (!cat) return false;

        // Sum up ledger for this category
        const ledger = (s.ledger || []).filter(t => !t.isVoided && (t.categoryId === selectedCategory || t.category?.toLowerCase() === cat.name.toLowerCase()));
        
        const billed = ledger.reduce((sum, t) => sum + (Number(t.debit) || 0), 0);
        const paid = ledger.reduce((sum, t) => sum + (Number(t.credit) || 0), 0);
        
        const balance = billed - paid;
        return balance > 0; // Positive balance means they owe (billed > paid)
    });


    const parentsToMessage = new Set(debtors.map(s => s.parentId).filter(Boolean));

    const handleSendReminders = async () => {
        if (!schoolId || !selectedCategory) return;
        
        setIsSubmitting(true);
        try {
            // Here we would call the /api/sms/send or /api/notifications/register endpoint
            
            const categoryName = mainCategories.find(c => c.id === selectedCategory)?.name || 'Fees';
            const defaultMsg = `Dear Parent, please be reminded of outstanding ${categoryName} for your ward. Kindly settle to avoid interruptions. Thank you.`;
            const finalMessage = customMessage.trim() || defaultMsg;

            const response = await fetch('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolId: schoolId,
                    notificationOnly: false, // Actually send SMS
                    message: finalMessage,
                    recipientList: Array.from(parentsToMessage) // Pass specific parents to message
                }),
            });

            if (response.ok) {
                toast({ title: "Reminders Sent", description: `Successfully dispatched reminders to ${parentsToMessage.size} parents.` });
                onClose();
            } else {
                const res = await response.json();
                toast({ title: "Failed", description: res.error || "Could not send messages.", variant: "destructive" });
            }

        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to send reminders.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            setShowConfirmation(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-primary" /> Send Bulk Fee Reminders
                    </DialogTitle>
                    <DialogDescription>
                        Notify parents with outstanding balances via SMS.
                    </DialogDescription>
                </DialogHeader>

                {!showConfirmation ? (
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label>Select Fee Category</Label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a fee type..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {mainCategories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedCategory && (
                            <div className="p-3 bg-muted/50 rounded-lg border border-primary/10">
                                <p className="text-sm font-medium">
                                    <span className="text-destructive font-bold">{debtors.length}</span> students owe this fee.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Messages will be sent to <span className="font-bold">{parentsToMessage.size}</span> unique parent contacts.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Custom Message (Optional)</Label>
                            <Textarea 
                                placeholder={`Dear Parent, please be reminded of outstanding fees...`}
                                value={customMessage}
                                onChange={e => setCustomMessage(e.target.value)}
                                className="resize-none h-24"
                            />
                            <p className="text-[10px] text-muted-foreground text-right">
                                Leave blank to use the default polite reminder template.
                            </p>
                        </div>

                        <Button 
                            className="w-full h-11" 
                            disabled={!selectedCategory || parentsToMessage.size === 0}
                            onClick={() => setShowConfirmation(true)}
                        >
                            <MessageSquare className="w-4 h-4 mr-2" /> Prepare Messages
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        <Card className="border-destructive/30 bg-destructive/5 p-4 flex flex-col items-center text-center space-y-3">
                            <AlertCircle className="w-8 h-8 text-destructive" />
                            <h3 className="font-bold text-lg text-destructive">Confirm SMS Blast</h3>
                            <p className="text-sm text-muted-foreground">
                                You are about to send <strong>{parentsToMessage.size}</strong> SMS messages. 
                                This will consume SMS credits from your school's balance.
                            </p>
                        </Card>
                        
                        <div className="flex items-center gap-3 w-full">
                            <Button variant="outline" className="w-full" onClick={() => setShowConfirmation(false)}>Back</Button>
                            <Button 
                                variant="destructive" 
                                className="w-full" 
                                onClick={handleSendReminders}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Sending...</> : "Confirm & Send"}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
