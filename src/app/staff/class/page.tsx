
'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const ClassDashboardContent = dynamic(() => import('@/components/class-dashboard-content'), { 
    ssr: false,
    loading: () => (
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    )
});


export default function ClassDashboardPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full flex items-center justify-center bg-background">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        }>
            <ClassDashboardContent />
        </Suspense>
    )
}
