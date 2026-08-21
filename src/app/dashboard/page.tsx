'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase/client-provider';
import { resolveStudentDoc } from '@/lib/data-store';

function DashboardDispatcherContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { db } = useFirebase();

    useEffect(() => {
        const routeUser = async () => {
            const id = searchParams.get('id');
            const schoolId = searchParams.get('schoolId');
            
            if (!id || !schoolId) {
                // If missing params, go back home
                router.replace('/');
                return;
            }
            
            if (!db) return;

            try {
                // Check if it's a student ID
                await resolveStudentDoc(db, id, schoolId);
                router.replace(`/student/dashboard?${searchParams.toString()}`);
            } catch (e) {
                // Not a student ID, assume parent
                router.replace(`/parent/dashboard?${searchParams.toString()}`);
            }
        };

        routeUser();
    }, [searchParams, router, db]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium animate-pulse">Loading your dashboard...</p>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        }>
            <DashboardDispatcherContent />
        </Suspense>
    );
}
