'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Numpad } from '@/components/ui/numpad';
import { Loader2, CheckCircle2, User, Users } from 'lucide-react';
import { useFirebase } from '@/firebase/client-provider';
import { getStudentsByParentId, getStudentById, getStudents, postLedgerTransaction, Student, getAcademicPeriods, getFeeCategories, calculateStudentTotalBalance, getSchoolDetails } from '@/lib/data-store';
import { useToast } from '@/hooks/use-toast';
import { generateThermalReceipt } from '@/lib/receipt-utils';
import { Search } from 'lucide-react';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    schoolId: string;
    studentId: string | null;
    staffId: string;
    staffName: string;
    sendSmsReceipt?: boolean;
}

type Step = 'searchStudent' | 'feeType' | 'students' | 'amount' | 'momoDetails' | 'processing' | 'momoPending' | 'success';

export default function PaymentModal({ isOpen, onClose, schoolId, studentId, staffId, staffName, sendSmsReceipt }: PaymentModalProps) {
    const { db, auth } = useFirebase();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('feeType');
    const [feeType, setFeeType] = useState<'main' | 'daily' | null>(null);
    
    const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
    const [siblings, setSiblings] = useState<Student[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    
    const [amount, setAmount] = useState('');
    const [momoNumber, setMomoNumber] = useState('');
    const [momoNetwork, setMomoNetwork] = useState('mtn-gh');
    const [isFetching, setIsFetching] = useState(true);
    
    // For manual MoMo request
    const [searchQuery, setSearchQuery] = useState('');
    const [allStudents, setAllStudents] = useState<Student[]>([]);

    useEffect(() => {
        if (isOpen) {
            setFeeType(null);
            setAmount('');
            setMomoNumber('');
            setSearchQuery('');
            if (studentId) {
                setStep('feeType');
                setSelectedStudentIds([studentId]);
                fetchStudentData(studentId);
            } else {
                setStep('searchStudent');
                setSelectedStudentIds([]);
                setScannedStudent(null);
                setSiblings([]);
                fetchAllStudents();
            }
        }
    }, [isOpen, studentId]);

    const fetchAllStudents = async () => {
        setIsFetching(true);
        try {
            const students = await getStudents(db, schoolId);
            setAllStudents(students.filter(s => !s.isArchived));
        } catch (error) {
            console.error("Error fetching students:", error);
            toast({ title: "Error", description: "Could not fetch students list", variant: "destructive" });
        } finally {
            setIsFetching(false);
        }
    };

    const fetchStudentData = async (sid: string) => {
        setIsFetching(true);
        try {
            const student = await getStudentById(db, schoolId, sid);
            if (student) {
                setScannedStudent(student);
                if (student.parentId) {
                    const allSiblings = await getStudentsByParentId(db, schoolId, student.parentId);
                    // Filter out the scanned student from siblings list
                    setSiblings(allSiblings.filter(s => s.id !== student.id && s.studentId !== student.studentId));
                } else {
                    setSiblings([]);
                }
            }
        } catch (error) {
            console.error("Error fetching student:", error);
            toast({ title: "Error", description: "Could not fetch student details", variant: "destructive" });
            onClose();
        } finally {
            setIsFetching(false);
        }
    };

    const handleSelectAll = () => {
        const allIds = [scannedStudent?.id || scannedStudent?.studentId, ...siblings.map(s => s.id || s.studentId)].filter(Boolean) as string[];
        setSelectedStudentIds(allIds);
    };

    const toggleStudent = (id: string) => {
        if (selectedStudentIds.includes(id)) {
            // Prevent deselecting if it's the only one
            if (selectedStudentIds.length > 1) {
                setSelectedStudentIds(selectedStudentIds.filter(sid => sid !== id));
            }
        } else {
            setSelectedStudentIds([...selectedStudentIds, id]);
        }
    };

    const handleSendSTKPush = async () => {
        if (!momoNumber || momoNumber.length < 9) {
            toast({ title: "Invalid Number", description: "Please enter a valid mobile number.", variant: "destructive" });
            return;
        }

        setStep('processing');
        try {
            const totalAmount = parseFloat(amount);
            const categoryName = feeType === 'daily' ? 'Daily Recurring Fee Payment' : 'Core School Fees';
            const allPeriods = await getAcademicPeriods(db, schoolId);
            const currentPeriod = allPeriods.find(p => p.isCurrent);
            
            let bulkDistribution: any[] = [];
            if (selectedStudentIds.length > 1) {
                const amountPerStudent = Number((totalAmount / selectedStudentIds.length).toFixed(2));
                const difference = Number((totalAmount - (amountPerStudent * selectedStudentIds.length)).toFixed(2));
                bulkDistribution = selectedStudentIds.map((id, i) => ({
                    studentId: id,
                    amount: i === 0 ? Number((amountPerStudent + difference).toFixed(2)) : amountPerStudent
                }));
            }
            
            const response = await fetch('/api/hubtel/stk-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolId,
                    studentId: selectedStudentIds.length === 1 ? selectedStudentIds[0] : '',
                    parentId: scannedStudent?.parentId || scannedStudent?.studentId || '',
                    isBulk: selectedStudentIds.length > 1,
                    bulkDistribution,
                    amount: totalAmount,
                    momoNumber,
                    channel: momoNetwork,
                    feeType: feeType || 'main',
                    description: `Smart Payment - ${categoryName}`,
                    periodId: currentPeriod ? currentPeriod.id : 'U'
                })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to send prompt');
            }

            setStep('momoPending');

        } catch (error: any) {
            console.error("STK Push error:", error);
            toast({ title: "Request Failed", description: error.message, variant: "destructive" });
            setStep('momoDetails');
        }
    };

    const handleProcessPayment = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
            return;
        }

        setStep('processing');
        try {
            const totalAmount = parseFloat(amount);
            const numStudents = selectedStudentIds.length;
            
            // Determine amount per student based on user choice: split evenly
            const amountPerStudent = Number((totalAmount / numStudents).toFixed(2));

            // Fix any rounding difference on the last student
            const totalCalculated = amountPerStudent * numStudents;
            const difference = Number((totalAmount - totalCalculated).toFixed(2));

            const categoryName = feeType === 'daily' ? 'Daily Recurring Fee Payment' : 'Core School Fees';
            const categoryId = feeType === 'daily' ? 'daily_fee' : 'fees_payment';
            
            const allPeriods = await getAcademicPeriods(db, schoolId);
            const currentPeriod = allPeriods.find(p => p.isCurrent);
            const periodId = currentPeriod ? currentPeriod.id : undefined;

            for (let i = 0; i < selectedStudentIds.length; i++) {
                const sid = selectedStudentIds[i];
                let studentAmount = amountPerStudent;
                
                // Add the tiny difference to the first student if it doesn't divide perfectly
                if (i === 0 && difference !== 0) {
                    studentAmount = Number((studentAmount + difference).toFixed(2));
                }

                const transactionData: any = {
                    date: new Date().toISOString().split('T')[0],
                    type: 'payment' as const,
                    category: categoryName,
                    categoryId: categoryId,
                    description: `Smart Payment - ${categoryName}`,
                    debit: 0,
                    credit: studentAmount,
                    recordedBy: staffName,
                    periodId: periodId
                };

                await postLedgerTransaction(db, null, sid, transactionData, schoolId);
            }

            let updatedStudent: Student | null = null;
            let newBalance = 0;
            let balanceText = '';

            if (scannedStudent) {
                try {
                    const studentIdToFetch = scannedStudent.id || scannedStudent.studentId || '';
                    updatedStudent = await getStudentById(db, schoolId, studentIdToFetch);
                    const feeCategories = await getFeeCategories(db, schoolId);
                    
                    if (updatedStudent) {
                        const balanceInfo = calculateStudentTotalBalance(updatedStudent, allPeriods, periodId, feeCategories);
                        newBalance = Math.max(0, balanceInfo.totalOutstanding);
                        balanceText = ` Remaining Balance: GHS ${newBalance.toFixed(2)}.`;
                    }
                } catch (e) {
                    console.error("Error fetching updated balance:", e);
                }
            }

            if (sendSmsReceipt && scannedStudent) {
                try {
                    await fetch('/api/sms/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            schoolId,
                            message: `Payment Received: GHS ${totalAmount} towards ${categoryName} for ${scannedStudent.name}${numStudents > 1 ? ' & sibling(s)' : ''}.${balanceText} Thank you.`,
                            recipient: 'specific',
                            specificParent: scannedStudent.parentId || scannedStudent.studentId,
                            notificationOnly: false
                        })
                    });
                } catch (e) {
                    console.error("SMS Error:", e);
                }
            }

            // Always trigger thermal printing for payments made through this portal
            if (scannedStudent && updatedStudent) {
                try {
                    const schoolDetails = await getSchoolDetails(db, schoolId);
                    if (schoolDetails) {
                        generateThermalReceipt(
                            schoolDetails, 
                            updatedStudent, 
                            { id: Date.now().toString(), amount: totalAmount, date: new Date().toISOString(), categoryId } as any, 
                            newBalance
                        );
                    }
                } catch (e) {
                    console.error("Receipt Error:", e);
                }
            }

            setStep('success');
            
            // Close automatically after 2 seconds
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (error: any) {
            console.error("Payment error:", error);
            toast({ title: "Payment Failed", description: error.message, variant: "destructive" });
            setStep('amount');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 bg-primary text-primary-foreground">
                    <DialogTitle className="text-xl font-bold text-center">Smart Payment</DialogTitle>
                    {scannedStudent && (
                        <DialogDescription className="text-primary-foreground/80 text-center font-medium">
                            {scannedStudent.name} {siblings.length > 0 ? `+ ${siblings.length} Sibling(s)` : ''}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="p-6 flex-1 overflow-y-auto bg-slate-50">
                    {isFetching ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground font-medium">Loading details...</p>
                        </div>
                    ) : (
                        <>
                            {step === 'searchStudent' && (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <h3 className="font-bold text-center text-lg mb-4 text-gray-800">Search Student</h3>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Enter student name..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto space-y-2 mt-4">
                                        {allStudents
                                            .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                            .slice(0, 20)
                                            .map(student => (
                                            <div 
                                                key={student.id || student.studentId}
                                                className="p-3 rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer flex justify-between items-center"
                                                onClick={() => {
                                                    const idToFetch = student.id || student.studentId;
                                                    if (idToFetch) {
                                                        setSelectedStudentIds([idToFetch]);
                                                        fetchStudentData(idToFetch);
                                                        setStep('feeType');
                                                    }
                                                }}
                                            >
                                                <div>
                                                    <p className="font-bold text-gray-900">{student.name}</p>
                                                    <p className="text-xs text-gray-500">{student.studentId || 'No ID'}</p>
                                                </div>
                                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                                    <User className="w-4 h-4" />
                                                </div>
                                            </div>
                                        ))}
                                        {searchQuery && allStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                            <p className="text-center text-gray-500 py-4">No student found matching "{searchQuery}"</p>
                                        )}
                                    </div>
                                    <div className="pt-2">
                                        <Button variant="ghost" onClick={onClose} className="w-full rounded-xl">Cancel</Button>
                                    </div>
                                </div>
                            )}

                            {step === 'feeType' && (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <h3 className="font-bold text-center text-lg mb-6 text-gray-800">Select Fee Type</h3>
                                    <div className="grid gap-4">
                                        <Button 
                                            variant="outline" 
                                            className="h-20 text-lg font-bold rounded-2xl border-primary/20 hover:bg-primary/5 hover:border-primary"
                                            onClick={() => {
                                                setFeeType('main');
                                                setStep('students');
                                            }}
                                        >
                                            Core Fees
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="h-20 text-lg font-bold rounded-2xl border-orange-500/20 hover:bg-orange-500/5 hover:border-orange-500 text-orange-600"
                                            onClick={() => {
                                                setFeeType('daily');
                                                setStep('students');
                                            }}
                                        >
                                            Daily Recurring Fee
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {step === 'students' && (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <h3 className="font-bold text-center text-lg mb-4 text-gray-800">Who is paying?</h3>
                                    
                                    {siblings.length > 0 && (
                                        <Button 
                                            variant="secondary" 
                                            className="w-full mb-4 h-12 rounded-xl font-bold bg-blue-100 text-blue-700 hover:bg-blue-200"
                                            onClick={handleSelectAll}
                                        >
                                            <Users className="w-4 h-4 mr-2" />
                                            Select All Children
                                        </Button>
                                    )}

                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                        {scannedStudent && (
                                            <div 
                                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedStudentIds.includes(scannedStudent.id || scannedStudent.studentId) ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                                onClick={() => toggleStudent(scannedStudent.id || scannedStudent.studentId)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedStudentIds.includes(scannedStudent.id || scannedStudent.studentId) ? 'bg-primary text-white' : 'bg-gray-100 text-transparent'}`}>
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{scannedStudent.name}</p>
                                                        <p className="text-xs text-gray-500">Scanned Student</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {siblings.map(sibling => (
                                            <div 
                                                key={sibling.id || sibling.studentId}
                                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedStudentIds.includes(sibling.id || sibling.studentId) ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                                onClick={() => toggleStudent(sibling.id || sibling.studentId)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedStudentIds.includes(sibling.id || sibling.studentId) ? 'bg-primary text-white' : 'bg-gray-100 text-transparent'}`}>
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{sibling.name}</p>
                                                        <p className="text-xs text-gray-500">Sibling</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-4 mt-2 border-t flex gap-3">
                                        <Button variant="ghost" onClick={() => setStep('feeType')} className="flex-1 rounded-xl">Back</Button>
                                        <Button onClick={() => setStep('amount')} className="flex-1 rounded-xl shadow-md font-bold text-white bg-primary">Next</Button>
                                    </div>
                                </div>
                            )}

                            {step === 'amount' && (
                                <div className="space-y-3 animate-in slide-in-from-right-4 duration-300 flex flex-col items-center">
                                    <h3 className="font-bold text-center text-lg text-gray-800">
                                        Enter Amount
                                        <span className="block text-sm font-normal text-gray-500">
                                            For {selectedStudentIds.length} student(s) - {feeType === 'daily' ? 'Daily Recurring Fee' : 'Core Fees'}
                                        </span>
                                    </h3>

                                    <div className="text-center w-full">
                                        <div className="text-5xl font-black text-gray-900 tracking-tighter h-12 flex items-center justify-center">
                                            {amount ? `GH₵ ${amount}` : <span className="text-gray-300">GH₵ 0.00</span>}
                                        </div>
                                        {selectedStudentIds.length > 1 && amount && (
                                            <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 py-1 px-3 rounded-full inline-block mt-1">
                                                ~ GH₵ {(parseFloat(amount) / selectedStudentIds.length).toFixed(2)} per student
                                            </p>
                                        )}
                                    </div>

                                    <Numpad value={amount} onChange={setAmount} />

                                    <div className="w-full flex flex-col gap-2 mt-2">
                                        {!studentId && (
                                                <Button 
                                                    variant="outline"
                                                    onClick={() => setStep('momoDetails')} 
                                                    disabled={!amount || parseFloat(amount) <= 0}
                                                    className="w-full rounded-xl h-14 font-bold text-lg border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                                                >
                                                    Request Mobile Money
                                                </Button>
                                        )}
                                        {studentId && (
                                            <>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" onClick={() => setStep('students')} className="flex-1 rounded-xl h-14 font-bold">Back</Button>
                                                    <Button 
                                                        onClick={handleProcessPayment} 
                                                        disabled={!amount || parseFloat(amount) <= 0}
                                                        className="flex-[2] rounded-xl h-14 shadow-lg font-bold text-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    >
                                                        Pay Cash
                                                    </Button>
                                                </div>
                                                <Button 
                                                    variant="outline"
                                                    onClick={() => setStep('momoDetails')} 
                                                    disabled={!amount || parseFloat(amount) <= 0}
                                                    className="w-full rounded-xl h-14 font-bold text-lg border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                                                >
                                                    Request Mobile Money
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}



                            {step === 'momoDetails' && (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <h3 className="font-bold text-center text-lg mb-4 text-gray-800">Mobile Money Details</h3>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Network Provider</label>
                                            <select 
                                                value={momoNetwork}
                                                onChange={(e) => setMomoNetwork(e.target.value)}
                                                className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 font-medium"
                                            >
                                                <option value="mtn-gh">MTN Mobile Money</option>
                                                <option value="vodafone-gh">Telecel (Vodafone) Cash</option>
                                                <option value="tigo-gh">AT (AirtelTigo) Money</option>
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                                            <input 
                                                type="tel"
                                                value={momoNumber}
                                                onChange={(e) => setMomoNumber(e.target.value)}
                                                placeholder="e.g. 024XXXXXXX"
                                                className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 font-bold text-lg tracking-wider"
                                            />
                                        </div>
                                    </div>

                                    <div className="w-full flex gap-3 mt-6">
                                        <Button variant="ghost" onClick={() => setStep('amount')} className="flex-1 rounded-xl h-14 font-bold">Back</Button>
                                        <Button 
                                            onClick={handleSendSTKPush} 
                                            disabled={!momoNumber || momoNumber.length < 9}
                                            className="flex-[2] rounded-xl h-14 shadow-lg font-bold text-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                                        >
                                            Send Prompt
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {step === 'processing' && (
                                <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in-95 duration-300">
                                    <div className="relative">
                                        <div className="w-20 h-20 border-4 border-primary/20 rounded-full"></div>
                                        <div className="w-20 h-20 border-4 border-primary rounded-full border-t-transparent animate-spin absolute inset-0"></div>
                                    </div>
                                    <h3 className="text-xl font-bold mt-6 text-gray-900">Processing Payment...</h3>
                                    <p className="text-gray-500 mt-2 text-center text-sm">Please wait while we record the transaction.</p>
                                </div>
                            )}

                            {step === 'momoPending' && (
                                <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in-95 duration-300">
                                    <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                        <Loader2 className="w-12 h-12 animate-spin" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Prompt Sent!</h3>
                                    <p className="text-gray-500 font-medium mb-6 text-center px-4">
                                        Waiting for the parent to authorize the payment on their phone. The ledger will automatically update once confirmed.
                                    </p>
                                    <Button onClick={onClose} className="w-full max-w-[200px] h-12 rounded-xl font-bold border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100">
                                        Close Window
                                    </Button>
                                </div>
                            )}

                            {step === 'success' && (
                                <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in-95 duration-300">
                                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                        <CheckCircle2 className="w-12 h-12" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
                                    <p className="text-gray-500 font-medium mb-6">Transaction recorded securely.</p>
                                    <Button onClick={onClose} className="w-full max-w-[200px] h-12 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200">
                                        Done
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
