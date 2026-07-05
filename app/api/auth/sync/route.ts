import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const { uid, email, name, photoURL } = await request.json();

    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Token mismatch' }, { status: 401 });
    }

    if (!email) {
       return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Set a session cookie for server components/actions to use
    // Using a 14 day expiry
    const expiresIn = 60 * 60 * 24 * 14 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const cookieStore = await cookies();
    cookieStore.set('session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    // Sync with Prisma
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Create new user in Prisma
      const generatedUsername = email.split('@')[0] + Math.floor(Math.random() * 1000);
      user = await prisma.user.create({
        data: {
          id: uid, // Use Firebase UID as the primary key
          email,
          username: generatedUsername,
          fullName: name || generatedUsername,
          avatarUrl: photoURL || null,
        }
      });
    } else {
      // Update existing user with Firebase UID if it doesn't match
      if (user.id !== uid) {
          // In a fresh start scenario this shouldn't happen much, but good to handle
          // Actually changing the ID of an existing user is complicated in Prisma due to foreign keys.
          // Since we start fresh, we can assume the user was created with the Firebase UID.
          // Let's just update the avatar or name if needed.
      }
    }

    // Auto-upgrade admins
    const adminEmails = ["sly86055r@gmail.com", "zainalabdeensalman123@gmail.com"];
    if (adminEmails.includes(email) && user.role !== 'ADMIN') {
       user = await prisma.user.update({
         where: { email },
         data: { role: 'ADMIN' }
       });
    }

    return NextResponse.json({ success: true, user });

  } catch (error) {
    console.error('Error in auth sync:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
