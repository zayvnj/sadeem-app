import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function auth() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('sadeem_session')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    // TODO: Re-implement secure token verification once Turbopack/ESM server issues are resolved.
    // We fetch the latest user info from DB directly using the uid from the cookie
    const user = await prisma.user.findUnique({
      where: { id: sessionCookie },
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
