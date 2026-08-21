'use client';

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Printer, MessageCircle, Loader2 } from 'lucide-react';
import { Student, School, AcademicPeriod, FeeCategory, Parent } from '@/lib/data-store';
import { generateTermBills } from '@/lib/bill-utils';

interface GenerateTermBillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    school: School | null;
    students: Student[];
    initialStudentId?: string | null;
    initialClassName?: string | null;
    currentPeriodId?: string | null;
    periods?: AcademicPeriod[];
    feeCategories?: FeeCategory[];
    parents?: Parent[];
}

export function GenerateTermBillsModal({
    isOpen,
    onClose,
    school,
    students,
    initialStudentId,
    initialClassName,
    currentPeriodId,
    periods,
    feeCategories,
    parents = [],
}: GenerateTermBillsModalProps) {
    const { toast } = useToast();
    const [targetType, setTargetType] = useState<'student' | 'class'>(initialStudentId ? 'student' : 'class');
    const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId || '');
    const [selectedClass, setSelectedClass] = useState<string>(initialClassName || '');
    
    const [termLabel, setTermLabel] = useState<string>('1st Term');
    const [dueDate, setDueDate] = useState<string>('');
    const [isSending, setIsSending] = useState(false);
    const [progressText, setProgressText] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTargetType(initialStudentId ? 'student' : 'class');
            setSelectedStudentId(initialStudentId || '');
            setSelectedClass(initialClassName || '');
        }
    }, [isOpen, initialStudentId, initialClassName]);

    const uniqueClasses = useMemo(() => {
        const standardClasses = [
            'Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2',
            'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
            'JHS 1', 'JHS 2', 'JHS 3'
        ];
        const classNames = new Set([
            ...standardClasses,
            ...students.map(s => s.className).filter(Boolean)
        ]);
        return Array.from(classNames).sort((a, b) => {
            const indexA = standardClasses.indexOf(a);
            const indexB = standardClasses.indexOf(b);
            
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [students]);

    const handleAddFeeRow = () => {
        // no-op: manual fee rows removed
    };

    const handleRemoveFeeRow = (id: string) => {
        // no-op: manual fee rows removed
    };

    const handleUpdateFee = (id: string, field: 'description' | 'amount', value: string) => {
        // no-op: manual fee rows removed
    };

    const handleGenerate = () => {
        if (!school) {
            toast({ title: 'Error', description: 'School details not found.', variant: 'destructive' });
            return;
        }

        let targetStudents: Student[] = [];
        
        if (targetType === 'student') {
            if (!selectedStudentId) {
                toast({ title: 'Error', description: 'Please select a student.', variant: 'destructive' });
                return;
            }
            const student = students.find(s => s.studentId === selectedStudentId);
            if (student) targetStudents = [student];
        } else {
            if (!selectedClass) {
                toast({ title: 'Error', description: 'Please select a class.', variant: 'destructive' });
                return;
            }
            targetStudents = students.filter(s => s.className === selectedClass);
        }

        if (targetStudents.length === 0) {
            toast({ title: 'Error', description: 'No students found for the selected target.', variant: 'destructive' });
            return;
        }

        if (!termLabel.trim()) {
            toast({ title: 'Error', description: 'Please enter a term label.', variant: 'destructive' });
            return;
        }

        try {
            generateTermBills(school, targetStudents, termLabel, currentPeriodId || undefined, dueDate || undefined, periods, feeCategories);
            toast({ title: 'Bills Generated', description: `Opening printable document for ${targetStudents.length} student(s).` });
            onClose();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to generate bills.', variant: 'destructive' });
        }
    };

    const handleSend = async (deliveryMethod: 'whatsapp' | 'sms' = 'whatsapp') => {
        if (!school) {
            toast({ title: 'Error', description: 'School details not found.', variant: 'destructive' });
            return;
        }

        let targetStudents: Student[] = [];
        if (targetType === 'student') {
            if (!selectedStudentId) {
                toast({ title: 'Error', description: 'Please select a student.', variant: 'destructive' });
                return;
            }
            const student = students.find(s => s.studentId === selectedStudentId);
            if (student) targetStudents = [student];
        } else {
            if (!selectedClass) {
                toast({ title: 'Error', description: 'Please select a class.', variant: 'destructive' });
                return;
            }
            targetStudents = students.filter(s => s.className === selectedClass);
        }

        if (targetStudents.length === 0) {
            toast({ title: 'Error', description: 'No students found for the selected target.', variant: 'destructive' });
            return;
        }

        if (!termLabel.trim()) {
            toast({ title: 'Error', description: 'Please enter a term label.', variant: 'destructive' });
            return;
        }

        setIsSending(true);
        try {
            const { getFirebaseConfig } = await import('@/firebase/config');
            const { initializeFirebase } = await import('@/firebase/index');
            const { app } = initializeFirebase(getFirebaseConfig());
            const { getStorage } = await import('firebase/storage');
            const storage = getStorage(app);
            const { uploadTermBillPdf } = await import('@/lib/data-store');
            const { generateSingleTermBillHtmlString } = await import('@/lib/bill-utils');
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < targetStudents.length; i++) {
                const student = targetStudents[i];
                const prefix = targetStudents.length > 1 ? `[${i + 1}/${targetStudents.length}] ` : '';
                
                try {
                    // 1. Generate HTML string
                    setProgressText(`${prefix}Generating PDF...`);
                    const htmlString = generateSingleTermBillHtmlString(school, student, termLabel, currentPeriodId || undefined, dueDate || undefined, periods, feeCategories, true);
                    
                    // 2. Inject into hidden DOM element securely (using Arial override for correct html2canvas baselines)
                    const container = document.createElement('div');
                    container.style.position = 'fixed';
                    container.style.left = '-9999px';
                    container.style.top = '0';
                    container.style.opacity = '1'; 
                    container.style.zIndex = '9999';
                    container.innerHTML = htmlString;
                    document.body.appendChild(container);
                    
                    // Wait for fonts to be ready
                    await document.fonts.ready;
                    
                    // Wait for all images to fully load
                    const images = Array.from(container.querySelectorAll('img'));
                    await Promise.all(images.map(img => {
                        if (img.complete) return Promise.resolve();
                        return new Promise((resolve) => {
                            img.onload = resolve;
                            img.onerror = resolve; // Resolve even on error so it doesn't hang forever
                        });
                    }));

                    await new Promise(r => setTimeout(r, 150));
                    
                    const firstChild = container.firstElementChild as HTMLElement;
                    if (!firstChild) throw new Error("Template failed to render");

                    // 3. Snapshot
                    const canvas = await html2canvas(firstChild, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff'
                    });
                    
                    document.body.removeChild(container);
                    
                    // 4. Create PDF
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                    const customPdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfWidth, pdfHeight] });
                    customPdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    const pdfBlob = customPdf.output('blob');
                    
                    // 5. Upload
                    setProgressText(`${prefix}Uploading to Cloud...`);
                    const downloadUrl = await uploadTermBillPdf(storage, school.id, termLabel, student.studentId, pdfBlob);
                    
                    // 6. Use raw long link
                    let finalUrl = downloadUrl;
                    const message = `Hello! Please find the term bill (${termLabel}) for *${student.name}* at *${school.name}* here:\n\n${finalUrl}`;
                    
                    // 7. Route Delivery
                    setProgressText(`${prefix}Sending ${deliveryMethod === 'whatsapp' ? 'WhatsApp' : 'SMS'}...`);
                    if (deliveryMethod === 'whatsapp') {
                        // WhatsApp
                        let rawPhone = student.parentPhone || '';
                        if (!rawPhone && student.parentId && parents) {
                            const pDoc = parents.find(p => p.id === student.parentId);
                            if (pDoc) {
                                rawPhone = pDoc.phone || '';
                            }
                        }

                        let cleanPhone = rawPhone.replace(/\D/g, '');
                        if (!cleanPhone) {
                            throw new Error("No parent phone number found for this student.");
                        }
                        if (cleanPhone.startsWith('0')) cleanPhone = '233' + cleanPhone.substring(1);
                        const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
                        
                        // For a single student, opening a new tab is standard for WhatsApp intents.
                        window.open(whatsappUrl, '_blank');
                        successCount++;
                    } else {
                        // SMS via API
                        const res = await fetch('/api/sms/send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                schoolId: school.id,
                                message: message,
                                recipient: 'specific',
                                specificParent: student.parentId || student.id || student.studentId
                            })
                        });
                        if (res.ok) {
                            successCount++;
                        } else {
                            const errData = await res.json().catch(() => ({}));
                            throw new Error(errData.error || 'SMS API returned error');
                        }
                    }
                } catch (err: any) {
                    console.error('Failed to process student:', student.name, err);
                    const errorMessage = err.message || 'Unknown error';
                    (window as any)._lastSendError = errorMessage;
                    errorCount++;
                    // If it's a single student, we can just throw or show the error immediately
                    if (targetStudents.length === 1) {
                        throw new Error(`Failed for ${student.name}: ${errorMessage}`);
                    }
                }
            }
            
            toast({
                title: 'Sending Complete',
                description: `Successfully sent ${successCount} bill(s). ${errorCount > 0 ? `Failed: ${errorCount}` : ''}`,
                variant: errorCount > 0 ? 'destructive' : 'default'
            });
            if (errorCount === 0) onClose();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to process bills.', variant: 'destructive' });
        } finally {
            setIsSending(false);
            setProgressText('');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="w-5 h-5 text-primary" /> Generate Term Bills
                    </DialogTitle>
                    <DialogDescription>
                        Create printable invoices showing new term fees combined with any existing arrears.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Target Selection */}
                    <div className="space-y-4">
                        <div className="flex gap-4 p-1 bg-muted rounded-lg">
                            <Button 
                                variant={targetType === 'student' ? 'default' : 'ghost'} 
                                className="flex-1"
                                onClick={() => setTargetType('student')}
                            >
                                Single Student
                            </Button>
                            <Button 
                                variant={targetType === 'class' ? 'default' : 'ghost'} 
                                className="flex-1"
                                onClick={() => setTargetType('class')}
                            >
                                Entire Class
                            </Button>
                        </div>

                        {targetType === 'student' && (
                            <div className="space-y-2">
                                <Label>Select Student</Label>
                                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a student..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map(s => (
                                            <SelectItem key={s.studentId} value={s.studentId}>{s.name} ({s.studentId})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {targetType === 'class' && (
                            <div className="space-y-2">
                                <Label>Select Class</Label>
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a class..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueClasses.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold">Bill Details</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Term Label</Label>
                                <Input 
                                    placeholder="e.g. 1st Term 2026" 
                                    value={termLabel}
                                    onChange={e => setTermLabel(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Due Date (Optional)</Label>
                                <Input 
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Fees charged to students this term will automatically appear on the bill.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 mt-4">
                        <Button 
                            className="w-full h-12 text-lg" 
                            onClick={handleGenerate}
                            disabled={isSending}
                        >
                            <Printer className="w-5 h-5 mr-2" /> Generate Printable Bills
                        </Button>
                        
                        {targetType === 'student' ? (
                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    variant="secondary"
                                    className="w-full h-12 text-md bg-green-600 hover:bg-green-700 text-white" 
                                    onClick={() => handleSend('whatsapp')}
                                    disabled={isSending}
                                >
                                    {isSending ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin flex-shrink-0" />
                                            <span className="truncate text-sm">{progressText || 'Sending...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <MessageCircle className="w-5 h-5 mr-2" />
                                            Send via WhatsApp
                                        </>
                                    )}
                                </Button>
                                <Button 
                                    variant="secondary"
                                    className="w-full h-12 text-md bg-blue-600 hover:bg-blue-700 text-white" 
                                    onClick={() => handleSend('sms')}
                                    disabled={isSending}
                                >
                                    {isSending ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin flex-shrink-0" />
                                            <span className="truncate text-sm">{progressText || 'Sending...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <MessageCircle className="w-5 h-5 mr-2" />
                                            Send via SMS
                                        </>
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <Button 
                                variant="secondary"
                                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white" 
                                onClick={() => handleSend('sms')}
                                disabled={isSending}
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        {progressText || 'Processing...'}
                                    </>
                                ) : (
                                    <>
                                        <MessageCircle className="w-5 h-5 mr-2" /> 
                                        Send to Class via SMS
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
