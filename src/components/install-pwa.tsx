'use client';

import { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function InstallPWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) {
      return; // Already installed, do nothing
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      setIsInstallable(true);
    }

    // Listen for the native install prompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Show iOS instruction modal
      setShowIOSPrompt(true);
    } else if (deferredPrompt) {
      // Show the native install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      // We've used the prompt, and can't use it again, throw it away
      setDeferredPrompt(null);
    }
  };

  if (!isInstallable || isStandalone || dismissed) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {!showIOSPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative flex flex-col items-center gap-4 bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-100"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                onClick={() => setDismissed(true)}
              >
                <X className="w-5 h-5" />
              </Button>

              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mt-2 mb-1">
                <Download className="w-8 h-8 text-primary" />
              </div>
              
              <div className="text-center space-y-2 mb-2">
                <h3 className="font-bold text-xl text-slate-800">Install ZipSMA App</h3>
                <p className="text-sm text-slate-500 leading-relaxed px-4">
                  Add this application to your home screen for a faster, offline-capable experience.
                </p>
              </div>

              <Button
                onClick={handleInstallClick}
                className="w-full bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/30 py-6 rounded-xl"
              >
                <span className="font-bold tracking-wide">INSTALL APP</span>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showIOSPrompt} onOpenChange={setShowIOSPrompt}>
        <DialogContent className="sm:max-w-md text-center flex flex-col items-center p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-slate-800">Install ZipSMA App</DialogTitle>
            <DialogDescription className="text-center text-sm text-amber-700 bg-amber-50 p-3 rounded-lg mt-2 border border-amber-200 font-medium">
              Apple requires you to use the Safari menu below to install this app. Please follow the guide.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center w-full mt-2">
            <div className="relative w-full border-l-2 border-dashed border-slate-300 ml-4 py-4 space-y-8">
              
              {/* Step 1 */}
              <div className="relative pl-8 text-left w-full">
                <div className="absolute -left-[17px] top-1 bg-white p-1 rounded-full border-2 border-blue-500 shadow-sm">
                  <Share className="w-5 h-5 text-blue-500" />
                </div>
                <h4 className="font-bold text-slate-800 text-lg">1. Tap Share</h4>
                <p className="text-sm text-slate-500 mt-1">Tap the share icon located at the very bottom edge of your Safari browser.</p>
              </div>

              {/* Step 2 */}
              <div className="relative pl-8 text-left w-full">
                <div className="absolute -left-[17px] top-1 bg-white p-1 rounded-full border-2 border-slate-700 shadow-sm">
                  <PlusSquare className="w-5 h-5 text-slate-700" />
                </div>
                <h4 className="font-bold text-slate-800 text-lg">2. Add to Home Screen</h4>
                <p className="text-sm text-slate-500 mt-1">Scroll down in the Safari menu and select "Add to Home Screen".</p>
              </div>
            </div>

            {/* Downward pointing animated arrow */}
            <div className="mt-8 mb-2 flex flex-col items-center text-blue-500 animate-bounce">
              <span className="text-xs font-bold uppercase tracking-wider mb-1">Look Down Here</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
            </div>
          </div>
          
          <Button onClick={() => setShowIOSPrompt(false)} className="w-full mt-2" variant="outline">
            Close Guide
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
