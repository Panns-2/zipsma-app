
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import RegisterSchoolForm from '@/components/register-school-form';
import Link from 'next/link';
import imageData from '@/lib/placeholder-images.json';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const [currentImage, setCurrentImage] = useState(0);
  const images = imageData.loginCarousel;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prevImage) => (prevImage + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-card text-card-foreground shadow-2xl">
        <div className="grid md:grid-cols-2">
          {/* Left Panel - Image Carousel */}
          <div className="relative h-64 md:h-[600px]">
            {images.map((image, index) => (
              <Image
                key={image.src}
                src={image.src}
                alt={image.alt}
                fill
                priority={index === 0}
                className={cn(
                  'object-cover transition-opacity duration-1000',
                  index === currentImage ? 'opacity-100' : 'opacity-0'
                )}
                data-ai-hint={image.hint}
              />
            ))}
             <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/40 to-transparent p-8 text-primary-foreground flex flex-col justify-end">
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                  Join ZipSMA Today
                </h1>
                <p className="mt-4 text-base md:text-lg text-primary-foreground/80">
                  Register your school and unlock a new era of digital management.
                </p>
            </div>
          </div>

          {/* Right Panel */}
          <div className="p-8 sm:p-12 flex flex-col justify-center">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">INITIAL SETUP</h2>
              <p className="text-muted-foreground mt-2">
                Create your school's admin account.
              </p>
            </div>
            
            {/* <RegisterSchoolForm /> */}
            <div className="bg-primary/10 border border-primary text-primary p-6 rounded-xl text-center shadow-sm">
              <h3 className="text-xl font-bold mb-2">New school registration opening soon!</h3>
              <p className="text-muted-foreground text-sm">We are preparing the system for public access. Please check back later.</p>
            </div>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>Already have an account? <Link href="/" className="font-semibold text-primary hover:underline">Admin Login</Link></p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
