import type { Metadata } from 'next';
import { Outfit, Roboto_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FloatingChatWidget } from '@/components/floating-chat-widget';
import { InstallPWA } from '@/components/install-pwa';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-sans' });
const robotoMono = Roboto_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'ZipSMA',
  description: 'School Management App',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${robotoMono.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=3" />
        <meta name="theme-color" content="#1e3a8a" />
      </head>
      <body className="font-sans antialiased">
        <FirebaseClientProvider>
          <FirebaseErrorListener />
          {children}
          <FloatingChatWidget />
          <InstallPWA />
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
