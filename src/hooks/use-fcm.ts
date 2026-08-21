'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { getToken, onMessage } from 'firebase/messaging';
import { useToast } from './use-toast';

export function useFCM(userId: string | null, schoolId: string | null) {
    const services = useFirebase();
    const { toast } = useToast();
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = useCallback(async () => {
        if (!userId || typeof window === 'undefined') return false;
        
        try {
            const { getMessaging, isSupported: checkSupport } = await import('firebase/messaging');
            const supported = await checkSupport();
            
            if (!supported) {
                toast({
                    title: "Not Supported",
                    description: "Push notifications require a secure context (HTTPS) or Safari PWA (Add to Home Screen) on mobile devices.",
                    variant: "destructive"
                });
                return false;
            }

            const messaging = getMessaging(services.app);
            const status = await Notification.requestPermission();
            setPermission(status);
            
            if (status === 'granted') {
                console.log('Notification permission granted.');
                const token = await getToken(messaging, {
                    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
                });

                if (token) {
                    setFcmToken(token);
                    await fetch('/api/notifications/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, token, schoolId }),
                    });
                    toast({
                        title: "Notifications Enabled",
                        description: "You will now receive alerts for announcements and fee updates.",
                    });
                    return true;
                }
            } else if (status === 'denied') {
                console.warn('Notification permission denied');
                toast({
                    title: "Notifications Blocked",
                    description: "Please enable notifications in your browser settings to receive alerts.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('An error occurred while retrieving token:', error);
            // Reset permission state so the button reappears and the user can try again
            setPermission('default');
            toast({
                title: "Error",
                description: "There was a problem enabling notifications. Please try again.",
                variant: "destructive"
            });
        }
        return false;
    }, [services, userId, schoolId, toast]);

    useEffect(() => {
        if (!userId || typeof window === 'undefined') return;

        let unsubscribe: (() => void) | undefined;

        const setupFCM = async () => {
            try {
                const { getMessaging, isSupported: checkSupport } = await import('firebase/messaging');
                const supported = await checkSupport();
                if (!supported) return;

                const messaging = getMessaging(services.app);

                // Auto-initialize if already granted
                if (Notification.permission === 'granted') {
                    requestPermission();
                }

                // Handle foreground messages
                unsubscribe = onMessage(messaging, (payload) => {
                    console.log('Foreground message received:', payload);
                    
                    toast({
                        title: payload.notification?.title || 'New Message',
                        description: payload.notification?.body || '',
                    });
                    
                    try {
                        const audio = new Audio('/notification-sound.mp3');
                        audio.play().catch(e => console.log('Audio autoplay blocked', e));
                    } catch (e) {
                        console.log('Audio playback failed', e);
                    }

                    if (Notification.permission === 'granted') {
                        new Notification(payload.notification?.title || 'New Message', {
                            body: payload.notification?.body || '',
                            icon: '/logo.png',
                        });
                    }
                });
            } catch (e) {
                console.error("Error setting up FCM foreground listener:", e);
            }
        };

        setupFCM();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [services, userId, schoolId, toast, requestPermission]);

    return { fcmToken, permission, requestPermission };
}
