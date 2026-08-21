'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase/client-provider';
import { ZipSMALogo } from '@/components/zipsma-logo';
import { Loader2, QrCode } from 'lucide-react';

export default function GatekeeperLoginPage() {
  const router = useRouter();
  const { db } = useFirebase();
  const { toast } = useToast();
  
  const [schoolId, setSchoolId] = useState('');
  const [gatekeeperId, setGatekeeperId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId.trim() || !gatekeeperId.trim()) {
      toast({ title: 'Error', description: 'Please enter both School ID and Gatekeeper ID.', variant: 'destructive' });
      return;
    }

    if (!db) {
      toast({ title: 'Error', description: 'Database not initialized.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Find the staff document via secure API route
      const upperSchoolId = schoolId.trim().toUpperCase();
      
      const res = await fetch('/api/staff/login-by-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: upperSchoolId,
          staffId: gatekeeperId.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials.');
      }

      const { id: actualStaffId, name, role, schoolId: returnedSchoolId } = data;

      if (returnedSchoolId !== upperSchoolId) {
        throw new Error('Invalid credentials or school ID mismatch.');
      }

      if (role !== 'Gatekeeper' && role !== 'Security') {
        throw new Error('You do not have gatekeeper privileges.');
      }

      // Save session locally to persist forever
      localStorage.setItem('gatekeeper_session', JSON.stringify({
        schoolId: upperSchoolId,
        staffId: actualStaffId,
        name: name,
        role: role
      }));

      toast({ title: 'Success', description: `Welcome back, ${name}!` });
      router.push('/gate');
    } catch (error: any) {
      toast({ title: 'Login Failed', description: error.message || 'Unable to verify credentials.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <ZipSMALogo className="h-12 w-12 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Gatekeeper Portal</h1>
          <p className="text-gray-500 text-sm text-center mt-2">
            Securely log in to access the QR Check-In kiosk.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="schoolId">School ID</Label>
            <Input 
              id="schoolId" 
              placeholder="e.g. SCH123" 
              value={schoolId}
              onChange={e => setSchoolId(e.target.value)}
              disabled={isLoading}
              required
              className="h-12 uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gatekeeperId">Gatekeeper ID</Label>
            <Input 
              id="gatekeeperId" 
              placeholder="Enter your assigned Staff ID" 
              value={gatekeeperId}
              onChange={e => setGatekeeperId(e.target.value)}
              disabled={isLoading}
              required
              className="h-12"
            />
          </div>
          
          <Button type="submit" className="w-full h-12 text-lg font-semibold mt-4" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><QrCode className="mr-2 h-5 w-5" /> Launch Scanner</>}
          </Button>
        </form>
      </div>
    </main>
  );
}
