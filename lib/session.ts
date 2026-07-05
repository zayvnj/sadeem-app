import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';
import prisma from '@/lib/prisma';

export async function auth() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);

    // We fetch the latest user info from DB
    const user = await prisma.user.findUnique({
      where: { id: decodedClaims.uid },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        isVerified: true
      }
    });

    if (!user) return null;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        username: user.username,
        role: user.role,
        isVerified: user.isVerified,
        avatarUrl: user.avatarUrl
      }
    };
  } catch (error) {
    console.error('Session verification failed', error);
    return null;
  }
}
