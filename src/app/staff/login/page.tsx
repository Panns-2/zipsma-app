
'use client';

import StaffLoginForm from '@/components/staff-login-form';
import Link from 'next/link';
import { ZipSMALogo } from '@/components/zipsma-logo';
import { LoginSlideshow } from '@/components/login-slideshow';
import { FeaturesSection } from '@/components/features-section';

export default function StaffLoginPage() {

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-card text-card-foreground shadow-2xl">
         <div className="grid md:grid-cols-2 lg:grid-cols-2">

            {/* Left Panel - Login Form */}
            <div className="p-8 sm:p-12 flex flex-col justify-center">
                <div className="mb-8 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-foreground">STAFF LOGIN</h2>
                    <p className="text-muted-foreground mt-2">
                        Enter your registered email and password to continue.
                    </p>
                </div>
                
                <StaffLoginForm />

                <div className="mt-8 text-center text-sm text-muted-foreground">
                    <p>Are you an administrator? <Link href="/" className="font-semibold text-primary hover:underline">Admin Login</Link></p>
                </div>
            </div>

            {/* Right Panel - Image */}
            <div className="relative h-64 md:h-full">
                <LoginSlideshow />
            </div>
        </div>
      </div>
      
      <FeaturesSection />

       <div className="mt-8 text-center text-sm text-muted-foreground">
        <p className="mt-4 space-x-4">
          <Link href="/privacy-policy" className="text-xs hover:underline">Privacy Policy</Link>
          <span className="text-xs text-muted-foreground/50">|</span>
          <Link href="/billing-policy" className="text-xs hover:underline">Billing Policy</Link>
        </p>
      </div>
    </main>
  );
}
