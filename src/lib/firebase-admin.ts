import { getApps, initializeApp, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

/**
 * Robust Firebase Admin Database fetcher.
 * Handles both local development (with service account) and 
 * production (with default cloud credentials).
 */
export function getAdminDb() {
  const apps = getApps();
  let app;

  if (apps.length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zip-sma';
    
    // 1. Try to use service account if available (usually local dev)
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('Firebase Admin: Initializing with Service Account Credentials');
      try {
        app = initializeApp({
          credential: cert({
            projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n'),
          }),
        });
      } catch (err: any) {
        console.error('Firebase Admin initialization error:', err);
        try {
          app = getApp();
        } catch (e) {
          throw new Error('Firebase Admin SDK failed to initialize with Service Account. Original error: ' + err.message);
        }
      }
    } else {
      // 2. Default initialization (Works automatically in Firebase Cloud Functions / GCP)
      // On local dev, this will fail if GOOGLE_APPLICATION_CREDENTIALS is not set.
      if (process.env.NODE_ENV === 'development' && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
         console.warn('Firebase Admin: No credentials found for local development. Please add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to your .env.local file.');
      }
      
      console.log('Firebase Admin: Initializing with Default Credentials');
      try {
        app = initializeApp({ projectId });
      } catch (err) {
        try {
          app = getApp();
        } catch (e) {
          throw new Error('Firebase Admin SDK failed to initialize. If you are running locally, ensure you have added FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to your .env.local file.');
        }
      }
    }
  } else {
    app = apps[0];
  }

  return getFirestore(app);
}

export function getAdminMessaging() {
  if (getApps().length === 0) {
      // This will initialize the app if it hasn't been already
      getAdminDb();
  }
  return getMessaging(getApps()[0]);
}

export function getAdminAuth() {
  if (getApps().length === 0) {
      getAdminDb();
  }
  return getAuth(getApps()[0]);
}
