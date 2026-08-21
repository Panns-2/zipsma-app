'use client';

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import dynamic from 'next/dynamic';
const PayWithHubtel = dynamic(() => import('./pay-with-hubtel'), { ssr: false });
import { toast } from "@/hooks/use-toast";

interface FeePaymentDialogProps {
  outstandingBalance: number;
  studentId: string;
  studentName: string;
  schoolId: string;
  email?: string;
  hubtelMerchantNumber?: string;
  periodId: string;
  mainFeesBalance: number;
  dailyFeesBalance: number;
  dailyFeeEstimate: number;
  dailyAccrued: number;
  defaultOpen?: boolean;
}

export function FeePaymentDialog({
  children,
  outstandingBalance,
  studentId,
  studentName,
  schoolId,
  email,
  hubtelMerchantNumber,
  periodId,
  mainFeesBalance,
  dailyFeesBalance,
  dailyFeeEstimate,
  dailyAccrued,
  defaultOpen = false,
}: FeePaymentDialogProps & { children?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [customAmount, setCustomAmount] = useState<number | string>('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isVerifying, setIsVerifying] = useState(false);
  const [showManualVerify, setShowManualVerify] = useState(false);
  const [manualTxId, setManualTxId] = useState('');

  const refKey = `last_hubtel_ref_${schoolId}_${studentId}`;
  const lastRef = typeof window !== 'undefined' ? localStorage.getItem(refKey) : null;

  const netDailyOwed = dailyAccrued + dailyFeesBalance;
  const netDailyDisplay = Math.max(0, netDailyOwed);

  const handleToggleItem = (item: string, amount: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(item)) {
      newSelected.delete(item);
    } else {
      newSelected.add(item);
    }
    setSelectedItems(newSelected);
    
    // Calculate new total from selected items
    let total = 0;
    if (newSelected.has('Core School Fees') && mainFeesBalance > 0) total += mainFeesBalance;
    if (newSelected.has('Daily Recurring Fees') && netDailyDisplay > 0) total += netDailyDisplay;
    
    setCustomAmount(total > 0 ? total.toFixed(2) : '');
  };

  const handleVerify = async (refToUse?: string) => {
    const reference = refToUse || manualTxId;
    if (!reference) return;

    setIsVerifying(true);
    try {
        const isReference = reference.startsWith('REF') || reference.startsWith('PAY');
        const url = `/api/hubtel/status?schoolId=${schoolId}&studentId=${studentId}&periodId=${periodId}&${isReference ? `clientReference=${reference}` : `transactionId=${reference}`}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 'success') {
            toast({
                title: "Success",
                description: data.message,
            });
            // If it was successful, we can clear the last ref
            if (reference === lastRef) localStorage.removeItem(refKey);
            setIsOpen(false); // Close dialog to refresh ledger
            window.location.reload(); // Refresh to show new ledger entry
        } else {
            toast({
                title: "Payment Status",
                description: data.message || "We couldn't confirm this payment yet. If you just paid, please wait 1-2 minutes.",
                variant: data.status === 'not_found' ? "destructive" : "default"
            });
        }
    } catch (error) {
        toast({
            title: "Error",
            description: "Failed to connect to verification service.",
            variant: "destructive"
        });
    } finally {
        setIsVerifying(false);
    }
  };

  const amountToPay = Number(customAmount);
  const maxAllowedPayment = mainFeesBalance + Math.max(dailyFeesBalance, dailyFeeEstimate);
  const isInvalidAmount = amountToPay <= 0 || (customAmount !== '' && amountToPay > maxAllowedPayment + 0.01); // Small buffer for float math
  const canPay = amountToPay > 0 && !isInvalidAmount;

  // Prepare display items
  const displayDescription = selectedItems.size > 0 
    ? `${studentName.split(' ')[0]} - ${Array.from(selectedItems).join(', ')}`
    : `Fee Payment: ${studentName}`;

  // Determine fee type so the webhook credits the correct ledger bucket
  const hasDailySelected = selectedItems.has('Daily Recurring Fees');
  const hasMainSelected = selectedItems.has('Core School Fees');
  const feeType: 'daily' | 'main' | 'mixed' =
    hasDailySelected && hasMainSelected ? 'mixed'
    : hasDailySelected ? 'daily'
    : 'main';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button style={{ backgroundColor: '#04396d' }} className="w-full text-white py-6 text-lg">
            Pay Fees Online
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>School Fees Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Fee Selection Section */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Select Fees to Pay</h3>
            
            <div className="space-y-2">
                    <div 
                        onClick={() => handleToggleItem('Core School Fees', mainFeesBalance)}
                        className={`flex justify-between items-center p-3 rounded-md border-2 cursor-pointer transition-all ${
                            selectedItems.has('Core School Fees') ? 'border-primary bg-primary/5' : 'border-transparent bg-background/50'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedItems.has('Core School Fees') ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                {selectedItems.has('Core School Fees') && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <span className="text-sm font-semibold">Core School Fees</span>
                        </div>
                        <span className="font-mono font-bold">GH¢{Math.max(0, mainFeesBalance).toFixed(2)}</span>
                    </div>

                    <div 
                        onClick={() => handleToggleItem('Daily Recurring Fees', netDailyDisplay > 0 ? netDailyDisplay : 0)}
                        className={`flex justify-between items-center p-3 rounded-md border-2 cursor-pointer transition-all ${
                            selectedItems.has('Daily Recurring Fees') ? 'border-primary bg-primary/5' : 'border-transparent bg-background/50'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedItems.has('Daily Recurring Fees') ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                {selectedItems.has('Daily Recurring Fees') && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold">Daily Recurring Fee</span>
                                {dailyFeeEstimate > 0 && (
                                    <span className="text-[10px] text-muted-foreground">Term Estimate: GH¢{dailyFeeEstimate.toFixed(2)}</span>
                                )}
                            </div>
                        </div>
                        <span className="font-mono font-bold">GH¢{netDailyDisplay > 0 ? netDailyDisplay.toFixed(2) : '0.00'}</span>
                    </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t font-bold">
                <span className="text-sm">Total Selected</span>
                <span className="text-lg text-primary">GH¢{amountToPay.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex flex-col gap-4">
              <div>
                <Label htmlFor="amount" className="font-bold text-xs uppercase text-muted-foreground">Or Enter Custom Amount (GH¢)</Label>
                <div className="relative mt-2">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    className="text-lg py-6 font-bold"
                  />
                  {isInvalidAmount && customAmount !== '' && amountToPay > maxAllowedPayment + 0.01 && (
                      <p className="text-sm text-destructive mt-2 font-bold bg-destructive/10 p-2 rounded-md">Amount exceeds maximum allowed payment (GH¢{maxAllowedPayment.toFixed(2)})</p>
                  )}
                  {!isInvalidAmount && customAmount !== '' && amountToPay > Math.max(0, outstandingBalance) + 0.01 && (
                      <p className="text-sm text-emerald-600 mt-2 font-bold bg-emerald-50 p-2 border border-emerald-200 rounded-md">Advance payment of GH¢{(amountToPay - Math.max(0, outstandingBalance)).toFixed(2)} will be credited for future {feeType === 'daily' ? 'daily recurring fees' : feeType === 'mixed' ? 'fees' : 'core school fees'}.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="pt-2">
                <PayWithHubtel
                    amount={amountToPay}
                    email={email || `${studentId}@noemail.com`}
                    studentId={studentId}
                    studentName={studentName}
                    schoolId={schoolId}
                    periodId={periodId}
                    description={displayDescription}
                    feeType={feeType}
                    onInitialize={() => setIsOpen(false)}
                    disabled={!canPay}
                    className="w-full py-6 text-lg font-black"
                >
                    Process Payment: GH¢{amountToPay > 0 ? amountToPay.toFixed(2) : '0.00'}
                </PayWithHubtel>
                <div className="mt-4 flex flex-wrap justify-center gap-3 text-[10px] text-muted-foreground font-medium uppercase tracking-wider opacity-70">
                    <span>Mobile Money</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30 self-center" />
                    <span>Cards</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30 self-center" />
                    <span>Bank Account</span>
                </div>
            </div>
          </div>

          {/* Verification Section */}
          <div className="pt-4 border-t mt-4 opacity-80">
            <div className="flex flex-col gap-3">
                {lastRef && (
                    <Button 
                        variant="outline" 
                        onClick={() => handleVerify(lastRef)}
                        disabled={isVerifying}
                        className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/5 h-10 text-xs font-bold"
                    >
                        {isVerifying ? "Verifying..." : "Verify My Last Payment"}
                    </Button>
                )}

                <button 
                    onClick={() => setShowManualVerify(!showManualVerify)}
                    className="text-[10px] text-center text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 font-bold uppercase tracking-tight"
                >
                    {showManualVerify ? "Hide manual verification" : "Already paid? Verify with Transaction ID"}
                </button>

                {showManualVerify && (
                    <div className="space-y-3 p-3 bg-muted/30 rounded-md animate-in fade-in slide-in-from-top-1">
                        <Label htmlFor="txId" className="text-xs font-bold">Hubtel Transaction ID</Label>
                        <div className="flex gap-2">
                            <Input 
                                id="txId" 
                                placeholder="e.g. 1234567" 
                                value={manualTxId}
                                onChange={e => setManualTxId(e.target.value)}
                                className="h-8 text-xs font-mono"
                            />
                            <Button 
                                size="sm" 
                                className="h-8 text-xs px-4"
                                onClick={() => handleVerify()}
                                disabled={isVerifying || !manualTxId}
                            >
                                {isVerifying ? "..." : "Verify"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
