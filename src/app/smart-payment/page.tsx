'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/client-provider';
import { getSchoolDetails, School } from '@/lib/data-store';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { ZipSMALogo } from '@/components/zipsma-logo';
import SmartPaymentScanner from '@/components/smart-payment/smart-payment-scanner';

export default function SmartPaymentDashboard() {
  const router = useRouter();
  const { db } = useFirebase();
  const { toast } = useToast();

  const [staffMember, setStaffMember] = useState<any>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const fetchSessionData = async () => {
      try {
        const sessionData = localStorage.getItem('smart_payment_session');
        if (!sessionData) {
          router.replace('/smart-payment/login');
          return;
        }

        const session = JSON.parse(sessionData);
        
        // Verify against DB again
        const staffDocRef = doc(db, 'staff', session.staffId);
        const staffSnap = await getDoc(staffDocRef);

        if (staffSnap.exists()) {
          const data = staffSnap.data();
          const allowedRoles = ['Cashier', 'Administrator', 'Accountant'];

          if (data.isArchived || !allowedRoles.includes(data.role) || data.schoolId !== session.schoolId) {
            localStorage.removeItem('smart_payment_session');
            toast({ title: 'Session Expired', description: 'Your access has been revoked or archived.', variant: 'destructive' });
            router.replace('/smart-payment/login');
            return;
          }

          const schoolData = await getSchoolDetails(db, data.schoolId);
          if (schoolData?.isLocked) {
            toast({ title: 'Access Denied', description: "This school's account is locked.", variant: 'destructive' });
            router.replace('/smart-payment/login');
            return;
          }

          setStaffMember({ ...data, id: staffSnap.id });
          setSchoolDetails(schoolData);
        } else {
          localStorage.removeItem('smart_payment_session');
          router.replace('/smart-payment/login');
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
        localStorage.removeItem('smart_payment_session');
        router.replace('/smart-payment/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionData();
  }, [db, router, toast]);

  const handleLogout = async () => {
    localStorage.removeItem('smart_payment_session');
    router.replace('/smart-payment/login');
  };

  if (isLoading || !staffMember || !schoolDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ZipSMALogo className="h-8 w-8" />
          <div>
            <h1 className="font-bold text-gray-900">{schoolDetails.name}</h1>
            <p className="text-xs text-emerald-600 uppercase tracking-widest font-bold">Smart Payment</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium hidden sm:block text-gray-600">
            {staffMember.name} <span className="text-gray-400">({staffMember.role})</span>
          </span>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
            <LogOut className="h-5 w-5 text-gray-500 hover:text-red-600 transition-colors" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-6">
        <SmartPaymentScanner 
            schoolId={staffMember.schoolId} 
            staffId={staffMember.id} 
            staffName={staffMember.name} 
        />
      </main>
    </div>
  );
}
