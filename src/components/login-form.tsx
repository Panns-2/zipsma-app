
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import { useState } from 'react';
import { Loader2, Users, Building, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/client-provider';
import { verifyLogin } from '@/lib/data-store';

interface LoginFormProps {
  schoolId?: string;
}

export default function LoginForm({ schoolId: initialSchoolId }: LoginFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { db } = useFirebase();
  const [studentId, setStudentId] = useState('');
  const [schoolId, setSchoolId] = useState(initialSchoolId || '');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Determine which button triggered the submit
    const submitter = (event.nativeEvent as any).submitter as HTMLButtonElement;
    const action = submitter?.value === 'pay' ? 'pay' : 'login';

    if (!studentId.trim() || !schoolId.trim() || !pin.trim()) {
      toast({
        title: 'Information Required',
        description: 'Please enter School ID, Student/Parent ID, and PIN.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    const trimmedId = studentId.trim().toUpperCase();
    const trimmedSchoolId = schoolId.trim().toUpperCase();
    
    if (db) {
        try {
            const authResult = await verifyLogin(db, trimmedSchoolId, trimmedId, pin);
            if (authResult) {
                // Set authenticated flag in sessionStorage
                if (authResult.data && (authResult.data.pinChangeRequired || pin === '1234')) {
                    sessionStorage.setItem('pinChangeRequired', 'true');
                } else {
                    sessionStorage.removeItem('pinChangeRequired');
                }
                sessionStorage.setItem(`auth_${trimmedId}`, 'true');
                
                const queryParams = new URLSearchParams({
                    schoolId: trimmedSchoolId,
                    id: trimmedId
                });
                if (action === 'pay') {
                    queryParams.append('action', 'pay');
                }

                if (authResult.type === 'student') {
                    router.push(`/student/dashboard?${queryParams.toString()}`);
                } else {
                    router.push(`/parent/dashboard?${queryParams.toString()}`);
                }
            }
        } catch (e: any) {
            toast({
                title: 'Login Failed',
                description: e.message || 'Invalid ID or PIN.',
                variant: 'destructive',
            });
            setIsLoading(false);
            return;
        }
    } else {
        toast({ title: 'Error', description: 'Database connection failed.', variant: 'destructive' });
        setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                id="schoolId"
                placeholder="School ID"
                required
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                disabled={isLoading}
                className="pl-10"
            />
        </div>


        <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                id="studentId"
                placeholder="Student / Parent ID"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={isLoading}
                className="pl-10"
            />
        </div>
        <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                id="pin"
                type="password"
                placeholder="4-Digit PIN"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                disabled={isLoading}
                className="pl-10 text-lg tracking-widest font-mono"
            />
        </div>

        <div className="flex flex-col gap-3">
            <Button type="submit" name="action" value="login" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-opacity" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging In...</> : 'VIEW DASHBOARD'}
            </Button>
            <Button 
                type="submit" 
                name="action"
                value="pay"
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/5" 
                disabled={isLoading}
            >
              QUICK PAY FEES
            </Button>
        </div>
    </form>
  );
}
