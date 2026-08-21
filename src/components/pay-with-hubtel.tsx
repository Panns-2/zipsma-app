
'use client';

import React, { useState } from 'react';
import { Button, ButtonProps } from "./ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PayWithHubtelProps extends ButtonProps {
  amount: number;
  email: string;
  studentId: string;
  studentName: string;
  schoolId: string;
  periodId: string;
  description?: string;
  feeType?: 'daily' | 'main' | 'mixed'; // indicates what type of fee is being paid
  isBulk?: boolean;
  parentId?: string;
  bulkDistribution?: { studentId: string, amount: number }[];
  onInitialize?: () => void;
  children: React.ReactNode;
}

const PayWithHubtel: React.FC<PayWithHubtelProps> = ({
  amount,
  email,
  studentId,
  studentName,
  schoolId,
  periodId,
  description,
  feeType,
  isBulk,
  parentId,
  bulkDistribution,
  onInitialize,
  children,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    setIsLoading(true);
    
    if (onInitialize) {
        onInitialize();
    }

    try {
      const response = await fetch('/api/hubtel/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          email,
          studentId,
          studentName,
          schoolId,
          periodId,
          description,
          feeType,
          isBulk,
          parentId,
          bulkDistribution,
        }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        // Store the client reference in localStorage for verification later
        if (typeof window !== 'undefined') {
          const refKey = `last_hubtel_ref_${schoolId}_${studentId}`;
          localStorage.setItem(refKey, data.clientReference || '');
        }

        // Redirect to Hubtel checkout page in a new tab
        window.open(data.checkoutUrl, '_blank');
        setIsLoading(false); // Stop loading since the action moved to a new tab
      } else {
        throw new Error(data.error || 'Could not initiate payment');
      }
    } catch (error: any) {
      console.error('Payment Error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to start payment process. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handlePayment} 
      disabled={isLoading || props.disabled} 
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Preparing...
        </>
      ) : (
        children
      )}
    </Button>
  );
};

export default PayWithHubtel;
