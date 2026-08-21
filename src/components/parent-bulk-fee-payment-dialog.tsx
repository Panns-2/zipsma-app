'use client';

import { useState, useMemo } from "react";
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
import { toast } from "@/hooks/use-toast";
import { Student } from "@/lib/data-store";
import { Landmark } from "lucide-react";

const PayWithHubtel = dynamic(() => import('./pay-with-hubtel'), { ssr: false });

export type ChildWithArrears = Student & { studentArrears: number; mainArrears: number; dailyArrears: number };

interface ParentBulkFeePaymentDialogProps {
  childrenWithArrears: ChildWithArrears[];
  schoolId: string;
  parentId: string;
  parentEmail?: string;
  periodId: string;
  hubtelMerchantNumber?: string;
  totalFamilyArrears: number;
  totalFamilyMainArrears: number;
  totalFamilyDailyArrears: number;
  trigger?: React.ReactNode;
}

export function ParentBulkFeePaymentDialog({
  childrenWithArrears,
  schoolId,
  parentId,
  parentEmail,
  periodId,
  hubtelMerchantNumber,
  totalFamilyArrears,
  totalFamilyMainArrears,
  totalFamilyDailyArrears,
  trigger
}: ParentBulkFeePaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState<number | string>('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const amountToPay = Number(customAmount) || 0;

  const handleToggleItem = (item: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(item)) {
      newSelected.delete(item);
    } else {
      newSelected.add(item);
    }
    setSelectedItems(newSelected);
    
    // Calculate new total from selected items
    let total = 0;
    if (newSelected.has('Core School Fees') && totalFamilyMainArrears > 0) total += totalFamilyMainArrears;
    if (newSelected.has('Daily Recurring Fees') && totalFamilyDailyArrears > 0) total += totalFamilyDailyArrears;
    
    setCustomAmount(total > 0 ? total.toFixed(2) : '');
  };

  const activeFamilyArrears = selectedItems.size > 0 
    ? (selectedItems.has('Core School Fees') ? totalFamilyMainArrears : 0) + (selectedItems.has('Daily Recurring Fees') ? totalFamilyDailyArrears : 0)
    : totalFamilyArrears;

  const previewDistribution = useMemo(() => {
    if (amountToPay <= 0 || childrenWithArrears.length === 0) return [];

    let remaining = amountToPay;
    const distribution = childrenWithArrears.map(c => {
      let activeDebt = c.studentArrears; // Default to total arrears
      if (selectedItems.size > 0) {
        activeDebt = 0;
        if (selectedItems.has('Core School Fees')) activeDebt += c.mainArrears;
        if (selectedItems.has('Daily Recurring Fees')) activeDebt += c.dailyArrears;
      }
      return { 
        studentId: c.studentId, 
        studentName: c.name,
        oldDebt: Math.max(0, activeDebt), 
        payment: 0 
      };
    });

    // Pass 1: clear debts
    for (const item of distribution) {
      if (item.oldDebt > 0 && remaining > 0) {
        const pay = Math.min(item.oldDebt, remaining);
        item.payment += pay;
        remaining -= pay;
      }
    }

    // Pass 2: distribute advance evenly
    if (remaining > 0.01) {
      const advance = remaining / distribution.length;
      distribution.forEach(item => item.payment += advance);
    }

    return distribution;
  }, [amountToPay, childrenWithArrears, selectedItems]);

  const bulkDistributionToHubtel = previewDistribution.map(d => ({
    studentId: d.studentId,
    amount: d.payment
  }));

  const descriptionStr = previewDistribution
    .filter(d => d.payment > 0)
    .map(d => `${d.studentName.split(' ')[0]} (GH¢${d.payment.toFixed(2)})`)
    .join(', ');

  const isInvalidAmount = amountToPay <= 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button style={{ backgroundColor: '#04396d' }} className="w-full text-white py-6 text-lg">
            Pay All Fees
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Family Bulk Fee Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="flex justify-between items-center p-3 rounded-md border border-primary bg-primary/5">
                <span className="text-sm font-semibold text-primary">Total Family Debt</span>
                <span className="font-mono font-bold text-primary">GH¢{totalFamilyArrears.toFixed(2)}</span>
            </div>
            
            <p className="text-xs text-muted-foreground font-medium">
              Your payment will automatically clear existing debts first. Any extra amount will be divided equally as advance credit for all your children.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t">
            {/* CHECKBOXES SECTION */}
            <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase text-muted-foreground">Select what to pay</span>
                
                {(totalFamilyMainArrears > 0) && (
                    <div 
                        onClick={() => handleToggleItem('Core School Fees')}
                        className={`flex justify-between items-center p-3 rounded-md border-2 transition-all cursor-pointer ${
                            selectedItems.has('Core School Fees') ? 'border-primary bg-primary/5' : 'border-transparent bg-background/50'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedItems.has('Core School Fees') ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                {selectedItems.has('Core School Fees') && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <span className="text-sm font-semibold">Core School Fees</span>
                        </div>
                        <span className="font-mono font-bold">GH¢{totalFamilyMainArrears.toFixed(2)}</span>
                    </div>
                )}

                {(totalFamilyDailyArrears > 0) && (
                    <div 
                        onClick={() => handleToggleItem('Daily Recurring Fees')}
                        className={`flex justify-between items-center p-3 rounded-md border-2 transition-all cursor-pointer ${
                            selectedItems.has('Daily Recurring Fees') ? 'border-primary bg-primary/5' : 'border-transparent bg-background/50'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedItems.has('Daily Recurring Fees') ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                {selectedItems.has('Daily Recurring Fees') && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <span className="text-sm font-semibold">Daily Recurring Fees</span>
                        </div>
                        <span className="font-mono font-bold">GH¢{totalFamilyDailyArrears.toFixed(2)}</span>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <Label htmlFor="bulkAmount" className="font-bold text-xs uppercase text-muted-foreground">Amount to Pay (GH¢)</Label>
                <div className="relative mt-2">
                  <Input
                    id="bulkAmount"
                    type="number"
                    placeholder="0.00"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    className="text-lg py-6 font-bold"
                  />
                  {amountToPay > activeFamilyArrears + 0.01 && (
                      <p className="text-[10px] text-emerald-600 mt-1 font-bold">Advance payment of GH¢{(amountToPay - Math.max(0, activeFamilyArrears)).toFixed(2)} will be distributed equally.</p>
                  )}
                </div>
              </div>
            </div>

            {previewDistribution.length > 0 && amountToPay > 0 && (
                <div className="space-y-3 mt-4 animate-in fade-in slide-in-from-top-1">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Landmark className="w-4 h-4" />
                        Distribution Preview
                    </Label>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                                <tr>
                                    <th className="px-3 py-2">Child</th>
                                    <th className="px-3 py-2 text-right">Debt</th>
                                    <th className="px-3 py-2 text-right text-primary">Paying</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {previewDistribution.map((item, idx) => (
                                    <tr key={idx} className="bg-white">
                                        <td className="px-3 py-2 font-bold text-slate-800">{item.studentName.split(' ')[0]}</td>
                                        <td className="px-3 py-2 text-right text-slate-500">{item.oldDebt > 0 ? `GH¢${item.oldDebt.toFixed(2)}` : '0.00'}</td>
                                        <td className="px-3 py-2 text-right font-black text-emerald-600">+GH¢{item.payment.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            <div className="pt-4">
                <PayWithHubtel
                    amount={amountToPay}
                    email={parentEmail || `${parentId}@noemail.com`}
                    studentId={parentId} // Passing parentId as studentId to fulfill required props
                    studentName="Family Bulk Payment"
                    schoolId={schoolId}
                    periodId={periodId}
                    description={`Family Payment: ${descriptionStr}`}
                    isBulk={true}
                    parentId={parentId}
                    bulkDistribution={bulkDistributionToHubtel}
                    onInitialize={() => setIsOpen(false)}
                    disabled={isInvalidAmount}
                    className="w-full py-6 text-lg font-black bg-[#04396d] hover:bg-[#032a52]"
                >
                    Process Bulk Payment
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
