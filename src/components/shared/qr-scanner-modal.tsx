'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useFirebase, useAuth } from '@/firebase/client-provider';
import { processQRScan } from '@/lib/qr-attendance-service';
import { useToast } from '@/hooks/use-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle2, Loader2, UserCheck, UserMinus, XCircle, Banknote } from 'lucide-react';

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    schoolId: string;
}

export default function QRScannerModal({ isOpen, onClose, schoolId }: QRScannerModalProps) {
    const { db, auth } = useFirebase();
    const { toast } = useToast();
    const [scanMode, setScanMode] = useState<'in' | 'out'>('in');
    const [continuousMode, setContinuousMode] = useState(true);
    const [enforceFeeClearance, setEnforceFeeClearance] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Feedback states
    const [lastScanResult, setLastScanResult] = useState<{success: boolean, message: string, name?: string} | null>(null);

    // Audio feedback
    const playBeep = () => {
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
            console.error("Audio playback failed", e);
        }
    };

    // Need a ref to store the current processing state to avoid duplicate scans
    const isProcessingRef = useRef(isProcessing);
    useEffect(() => {
        isProcessingRef.current = isProcessing;
    }, [isProcessing]);

    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Slight delay to ensure DOM element is ready
            const timer = setTimeout(() => {
                const scanner = new Html5QrcodeScanner(
                    "qr-reader",
                    { 
                        fps: 10, 
                        qrbox: { width: 180, height: 180 },
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
                        playBeep();
                        
                        // Pause scanner briefly in continuous mode to avoid rapid-fire scans
                        if (continuousMode && scannerRef.current) {
                            scannerRef.current.pause(true);
                        }

                        const result = await processQRScan(db, auth as any, decodedText, schoolId, scanMode, undefined, enforceFeeClearance);
                        
                        setLastScanResult({
                            success: result.success,
                            message: result.message,
                            name: result.studentName
                        });

                        if (result.success) {
                            toast({
                                title: "Scan Successful",
                                description: result.message,
                                variant: "default",
                            });
                        } else {
                            toast({
                                title: "Scan Failed",
                                description: result.message,
                                variant: "destructive",
                            });
                        }

                        if (continuousMode) {
                            // Resume after 2 seconds
                            setTimeout(() => {
                                setLastScanResult(null);
                                setIsProcessing(false);
                                if (scannerRef.current) {
                                    scannerRef.current.resume();
                                }
                            }, 2000);
                        } else {
                            setIsProcessing(false);
                            // Keep the result visible, let them manually resume or close
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
        } else {
            setLastScanResult(null);
        }
    }, [isOpen, db, auth, schoolId, scanMode, continuousMode, enforceFeeClearance, toast]);

    const handleClose = () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
            scannerRef.current = null;
        }
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>QR Check-In Scanner</DialogTitle>
                    <DialogDescription>
                        Scan student ID cards to mark attendance and notify parents.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 bg-muted/50 p-3 rounded-lg border sm:justify-between">
                    <div className="flex items-center space-x-2">
                        <Switch 
                            id="scan-mode" 
                            checked={scanMode === 'in'} 
                            onCheckedChange={(checked) => setScanMode(checked ? 'in' : 'out')} 
                        />
                        <Label htmlFor="scan-mode" className="font-semibold flex items-center gap-1.5">
                            {scanMode === 'in' ? <UserCheck className="w-4 h-4 text-green-600" /> : <UserMinus className="w-4 h-4 text-orange-600" />}
                            {scanMode === 'in' ? 'Check-In Mode' : 'Check-Out Mode'}
                        </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch 
                            id="continuous-mode" 
                            checked={continuousMode} 
                            onCheckedChange={setContinuousMode} 
                        />
                        <Label htmlFor="continuous-mode" className="text-sm">Continuous</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch 
                            id="fee-check-mode" 
                            checked={enforceFeeClearance} 
                            onCheckedChange={setEnforceFeeClearance} 
                        />
                        <Label htmlFor="fee-check-mode" className="font-semibold flex items-center gap-1.5 text-sm">
                            <Banknote className="w-4 h-4 text-primary" />
                            Check Fees
                        </Label>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto mt-4 flex flex-col items-center">
                    {/* The QR Scanner UI will be injected here by html5-qrcode */}
                    <div 
                        id="qr-reader" 
                        className="w-full max-w-[260px] mx-auto rounded-lg overflow-hidden border-2 shadow-sm pb-2 [&_video]:max-h-[260px] [&_video]:object-cover"
                        style={{ display: lastScanResult && !continuousMode ? 'none' : 'block' }}
                    ></div>

                    {isProcessing && continuousMode && (
                        <div className="mt-4 flex items-center text-primary">
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Processing...
                        </div>
                    )}

                    {lastScanResult && (
                        <div className={`mt-4 w-full max-w-[300px] p-4 rounded-xl border flex flex-col items-center text-center ${lastScanResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            {lastScanResult.success ? (
                                <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
                            ) : (
                                <XCircle className="w-12 h-12 text-red-500 mb-2" />
                            )}
                            <h3 className="text-xl font-bold mb-1">
                                {lastScanResult.name || (lastScanResult.success ? "Success" : "Error")}
                            </h3>
                            <p className={`text-sm ${lastScanResult.success ? 'text-green-700' : 'text-red-700'}`}>
                                {lastScanResult.message}
                            </p>
                            
                            {!continuousMode && (
                                <Button 
                                    className="mt-6" 
                                    variant={lastScanResult.success ? "default" : "destructive"}
                                    onClick={() => {
                                        setLastScanResult(null);
                                        if (scannerRef.current) scannerRef.current.resume();
                                    }}
                                >
                                    Scan Next Student
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}


