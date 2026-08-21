'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase, useAuth } from '@/firebase/client-provider';
import { StaffId, getSchoolDetails, School } from '@/lib/data-store';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { LogOut, QrCode } from 'lucide-react';
import { ZipSMALogo } from '@/components/zipsma-logo';
import QRScannerModal from '@/components/shared/qr-scanner-modal';

export default function GatekeeperDashboard() {
  const router = useRouter();
  const { db } = useFirebase();
  const { toast } = useToast();

  const [staffMember, setStaffMember] = useState<any>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  useEffect(() => {
    if (!db) return;

    const fetchGatekeeperData = async () => {
      try {
        const sessionData = localStorage.getItem('gatekeeper_session');
        if (!sessionData) {
          router.replace('/gate/login');
          return;
        }

        const session = JSON.parse(sessionData);
        
        // Optionally verify against DB again to ensure they weren't archived
        const staffDocRef = doc(db, 'staff', session.staffId);
        const staffSnap = await getDoc(staffDocRef);

        if (staffSnap.exists()) {
          const data = staffSnap.data();
          if (data.isArchived || (data.role !== 'Gatekeeper' && data.role !== 'Security') || data.schoolId !== session.schoolId) {
            localStorage.removeItem('gatekeeper_session');
            toast({ title: 'Session Expired', description: 'Your access has been revoked or archived.', variant: 'destructive' });
            router.replace('/gate/login');
            return;
          }

          const schoolData = await getSchoolDetails(db, data.schoolId);
          if (schoolData?.isLocked) {
            toast({ title: 'Access Denied', description: "This school's account is locked.", variant: 'destructive' });
            router.replace('/gate/login');
            return;
          }

          setStaffMember({ ...data, id: staffSnap.id });
          setSchoolDetails(schoolData);
          setIsQRScannerOpen(true); // Open scanner by default
        } else {
          localStorage.removeItem('gatekeeper_session');
          router.replace('/gate/login');
        }
      } catch (error) {
        console.error("Error fetching gatekeeper data:", error);
        localStorage.removeItem('gatekeeper_session');
        router.replace('/gate/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGatekeeperData();
  }, [db, router, toast]);

  const handleLogout = async () => {
    localStorage.removeItem('gatekeeper_session');
    router.replace('/gate/login');
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
            <p className="text-xs text-gray-500 uppercase tracking-widest">Gatekeeper Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium hidden sm:block text-gray-600">
            {staffMember.name}
          </span>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
            <LogOut className="h-5 w-5 text-gray-500 hover:text-red-600 transition-colors" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <QrCode className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">QR Check-In Kiosk</h2>
          <p className="text-gray-500 mb-8">
            Scan student ID cards to instantly log their attendance and notify parents.
          </p>
          
          <Button 
            size="lg" 
            className="w-full text-lg h-14 rounded-xl"
            onClick={() => setIsQRScannerOpen(true)}
          >
            Launch Scanner
          </Button>
        </div>
      </main>

      <QRScannerModal 
        isOpen={isQRScannerOpen} 
        onClose={() => setIsQRScannerOpen(false)} 
        schoolId={staffMember.schoolId} 
      />
    </div>
  );
}
