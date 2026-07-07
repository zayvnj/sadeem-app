import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { uid, email, name, photoURL } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'UID required' }, { status: 400 });
    }

    if (!email) {
       return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Set a session cookie for server components/actions to use
    // Using a 14 day expiry
    const expiresIn = 60 * 60 * 24 * 14 * 1000;
    const cookieStore = await cookies();
    cookieStore.set('sadeem_session', uid, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    // Sync with Prisma via upsert
    const generatedUsername = email.split('@')[0] + Math.floor(Math.random() * 1000);
    const adminEmails = ["sly86055r@gmail.com", "zainalabdeensalman123@gmail.com"];
    const role = adminEmails.includes(email) ? 'ADMIN' : 'USER';

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        // If user exists, optionally update name/avatar if they are missing
        fullName: name || undefined,
        avatarUrl: photoURL || undefined,
        role: role, // Ensure role is correctly synced
      },
      create: {
        id: uid, // Use Supabase user.id as the primary key
        email,
        username: generatedUsername,
        fullName: name || generatedUsername,
        avatarUrl: photoURL || null,
        role: role,
      }
    });

    return NextResponse.json({ success: true, user });

  } catch (error) {
    console.error('Error in auth sync:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
