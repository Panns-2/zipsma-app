'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users } from 'lucide-react';
import { Student, FeeCategory, updateStudentDetails } from '@/lib/data-store';
import { useToast } from '@/hooks/use-toast';

interface BulkDailyRatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    feeCategories: FeeCategory[];
    db: any;
    auth: any;
    storage: any;
    schoolId: string | null;
    onSuccess: () => void;
}

export const BulkDailyRatesModal: React.FC<BulkDailyRatesModalProps> = ({
    isOpen,
    onClose,
    students,
    feeCategories,
    db,
    auth,
    storage,
    schoolId,
    onSuccess,
}) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const dailyCategories = React.useMemo(() => feeCategories.filter(c => c.isDaily), [feeCategories]);
    
    const [categoryId, setCategoryId] = useState<string>('');
    const [rateAmount, setRateAmount] = useState<string>('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            setCategoryId(dailyCategories.length > 0 ? dailyCategories[0].id : '');
            setRateAmount('');
            setSelectedStudentIds(new Set());
        }
    }, [isOpen, dailyCategories]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedStudentIds(new Set(students.map(s => s.studentId)));
        } else {
            setSelectedStudentIds(new Set());
        }
    };

    const handleToggleStudent = (studentId: string) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(studentId)) {
            newSet.delete(studentId);
        } else {
            newSet.add(studentId);
        }
        setSelectedStudentIds(newSet);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!categoryId) {
            toast({ title: "Error", description: "Please select a fee category.", variant: "destructive" });
            return;
        }

        const rate = parseFloat(rateAmount);
        if (isNaN(rate) || rate < 0) {
            toast({ title: "Error", description: "Please enter a valid rate amount.", variant: "destructive" });
            return;
        }

        if (selectedStudentIds.size === 0) {
            toast({ title: "Error", description: "Please select at least one student.", variant: "destructive" });
            return;
        }

        if (!schoolId) {
            toast({ title: "Error", description: "School ID is missing.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        
        try {
            const promises = Array.from(selectedStudentIds).map(async (studentId) => {
                const student = students.find(s => s.studentId === studentId);
                if (!student) return;
                
                const updatedDailyFees = [...(student.dailyFees || [])];
                const existingIndex = updatedDailyFees.findIndex(f => f.categoryId === categoryId);
                
                if (existingIndex >= 0) {
                    updatedDailyFees[existingIndex].rate = rate;
                } else {
                    updatedDailyFees.push({ categoryId, rate });
                }

                await updateStudentDetails(db, storage, auth, student.id || studentId, { dailyFees: updatedDailyFees }, null, schoolId);
            });

            await Promise.all(promises);
            
            toast({ title: "Success", description: `Daily rates updated for ${selectedStudentIds.size} student(s).` });
            onSuccess();
            onClose();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to update daily rates.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isAllSelected = students.length > 0 && selectedStudentIds.size === students.length;
    // const isIndeterminate = selectedStudentIds.size > 0 && selectedStudentIds.size < students.length;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
                <div className="bg-primary p-6 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-headline flex items-center gap-3">
                            <Users className="w-6 h-6 text-primary-foreground/70" />
                            Bulk Set Daily Rates
                        </DialogTitle>
                        <DialogDescription className="text-primary-foreground/80 font-medium">
                            Set the daily recurring fee rate for multiple students in this class at once.
                        </DialogDescription>
                    </DialogHeader>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-gray-50/50">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Fee Category</Label>
                            <Select value={categoryId} onValueChange={setCategoryId} disabled={isSubmitting}>
                                <SelectTrigger className="h-11 border-primary/20 bg-white">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dailyCategories.length === 0 ? (
                                        <SelectItem value="none" disabled>No daily categories found</SelectItem>
                                    ) : (
                                        dailyCategories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id} className="font-bold">
                                                {cat.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Daily Rate (GH¢)</Label>
                            <Input 
                                type="number" 
                                placeholder="0.00" 
                                value={rateAmount} 
                                onChange={e => setRateAmount(e.target.value)} 
                                required 
                                min="0"
                                step="0.01"
                                className="h-11 border-primary/20 bg-white font-black text-numeric"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Students</Label>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="select-all" 
                                    checked={isAllSelected}
                                    onCheckedChange={handleSelectAll}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <Label htmlFor="select-all" className="text-xs font-bold cursor-pointer">
                                    Select All ({students.length})
                                </Label>
                            </div>
                        </div>
                        
                        <ScrollArea className="h-[250px] rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                            {students.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-sm text-muted-foreground italic">
                                    No students in this class.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {students.map((student) => (
                                        <div key={student.studentId} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                            <Checkbox 
                                                id={`student-${student.studentId}`} 
                                                checked={selectedStudentIds.has(student.studentId)}
                                                onCheckedChange={() => handleToggleStudent(student.studentId)}
                                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                            <Label htmlFor={`student-${student.studentId}`} className="flex-1 cursor-pointer font-semibold text-sm">
                                                {student.name}
                                            </Label>
                                            <span className="text-xs font-mono text-muted-foreground">{student.studentId}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    <DialogFooter className="pt-4 border-t gap-3 sm:gap-0">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onClose} 
                            disabled={isSubmitting}
                            className="rounded-full font-bold h-11 px-8"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting || selectedStudentIds.size === 0 || !categoryId || !rateAmount}
                            className="bg-primary hover:bg-primary/90 text-white rounded-full font-bold h-11 px-8 shadow-lg shadow-primary/20"
                        >
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                            Apply Rates
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
