import { getApps, initializeApp, credential, auth } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin globally to avoid Next.js hot reload / duplicate init issues
if (typeof window === 'undefined') {
  if (!getApps().length) {
    try {
      if (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        initializeApp({
          credential: credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'placeholder@example.com',
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nplaceholder\n-----END PRIVATE KEY-----').replace(/\\n/g, '\n'),
          }),
        });
      } else {
        initializeApp();
      }
    } catch (error: any) {
      console.error('Firebase admin initialization error', error.stack);
    }
  }
}

// Only export auth if we are on the server side
const adminAuth = typeof window === 'undefined' ? getAuth() : {} as any;

export { adminAuth };
