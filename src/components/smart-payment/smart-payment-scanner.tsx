'use client';

import { useState, useEffect, useRef } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { useToast } from '@/hooks/use-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Loader2, QrCode, MessageSquare } from 'lucide-react';
import { resolveStudentDoc } from '@/lib/data-store';
import PaymentModal from './payment-modal';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface SmartPaymentScannerProps {
    schoolId: string;
    staffId: string;
    staffName: string;
}

export default function SmartPaymentScanner({ schoolId, staffId, staffName }: SmartPaymentScannerProps) {
    const { db, auth } = useFirebase();
    const { toast } = useToast();
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [scannedStudentId, setScannedStudentId] = useState<string | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [sendSmsReceipt, setSendSmsReceipt] = useState(true);

    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const isProcessingRef = useRef(isProcessing);
    
    useEffect(() => {
        isProcessingRef.current = isProcessing;
    }, [isProcessing]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const scanner = new Html5QrcodeScanner(
                "smart-payment-qr-reader",
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1,
                    rememberLastUsedCamera: true,
                    supportedScanTypes: [0] // QR Code only
                },
                false
            );
            
            scannerRef.current = scanner;

            scanner.render(
                async (decodedText) => {
                    if (isProcessingRef.current) return;
                    setIsProcessing(true);

                    try {
                        // Pause scanner briefly
                        if (scannerRef.current) {
                            scannerRef.current.pause(true);
                        }

                        // Play beep
                        try {
                            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                            const oscillator = audioCtx.createOscillator();
                            const gainNode = audioCtx.createGain();
                            oscillator.connect(gainNode);
                            gainNode.connect(audioCtx.destination);
                            oscillator.type = 'sine';
                            oscillator.frequency.value = 800;
                            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                            oscillator.start();
                            oscillator.stop(audioCtx.currentTime + 0.1);
                        } catch (e) {
                            // ignore audio error
                        }

                        // Try to fetch the student
                        const { snap } = await resolveStudentDoc(db, decodedText, schoolId);
                        
                        if (snap.exists()) {
                            setScannedStudentId(snap.id);
                            setIsPaymentModalOpen(true);
                        } else {
                            toast({
                                title: "Student Not Found",
                                description: `No student found with ID: ${decodedText}`,
                                variant: "destructive",
                            });
                            // Resume scanner
                            if (scannerRef.current) {
                                scannerRef.current.resume();
                            }
                        }
                    } catch (error: any) {
                        console.error("Scan error:", error);
                        toast({
                            title: "Scan Failed",
                            description: error.message || "Failed to process QR code.",
                            variant: "destructive",
                        });
                        if (scannerRef.current) {
                            scannerRef.current.resume();
                        }
                    } finally {
                        setIsProcessing(false);
                    }
                },
                (errorMessage) => {
                    // ignore background read errors
                }
            );
        }, 100);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            }
        };
    }, [db, schoolId, toast]);

    const handleModalClose = () => {
        setIsPaymentModalOpen(false);
        setScannedStudentId(null);
        if (scannerRef.current) {
            scannerRef.current.resume();
        }
    };

    const handleManualMoMoRequest = () => {
        setScannedStudentId(null);
        setIsPaymentModalOpen(true);
        if (scannerRef.current) {
            scannerRef.current.pause(true);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                    <QrCode className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Scan Student ID</h2>
                
                <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border mb-6 w-full justify-center">
                    <Switch 
                        id="sms-receipt-mode" 
                        checked={sendSmsReceipt} 
                        onCheckedChange={setSendSmsReceipt} 
                    />
                    <Label htmlFor="sms-receipt-mode" className="font-semibold flex items-center gap-1.5 text-sm cursor-pointer">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        Send SMS Receipt
                    </Label>
                </div>

                <div className="w-full relative min-h-[300px]">
                    <div 
                        id="smart-payment-qr-reader" 
                        className="w-full rounded-2xl overflow-hidden border-2 shadow-inner [&_video]:object-cover"
                    ></div>
                    
                    {isProcessing && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl border-2">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-2" />
                            <p className="font-medium text-primary">Processing...</p>
                        </div>
                    )}
                </div>

                <div className="w-full mt-6 pt-6 border-t border-gray-100">
                    <Button 
                        onClick={handleManualMoMoRequest}
                        variant="outline"
                        className="w-full h-14 rounded-xl font-bold text-lg border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center gap-2"
                    >
                        <MessageSquare className="w-5 h-5" />
                        Remote MoMo Request
                    </Button>
                    <p className="text-center text-xs text-gray-400 mt-2">
                        For parents paying from home (no ID card required)
                    </p>
                </div>
            </div>

            {isPaymentModalOpen && (
                <PaymentModal 
                    isOpen={isPaymentModalOpen}
                    onClose={handleModalClose}
                    schoolId={schoolId}
                    studentId={scannedStudentId}
                    staffId={staffId}
                    staffName={staffName}
                    sendSmsReceipt={sendSmsReceipt}
                />
            )}
        </div>
    );
}
