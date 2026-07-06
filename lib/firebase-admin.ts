import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const initFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApp();
  }

  try {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      return initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace literal \n with actual newlines for Vercel env compatibility
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      console.warn('Firebase Admin env vars missing. Initializing default app.');
      return initializeApp();
    }
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.stack);
    return null;
  }
};

const app = typeof window === 'undefined' ? initFirebaseAdmin() : null;

// Ensure we only try to get the auth instance if the app was successfully initialized
const adminAuth = app ? getAuth(app) : ({} as any);

export { adminAuth };
