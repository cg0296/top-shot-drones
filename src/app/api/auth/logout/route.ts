import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (token) {
    try {
      await deleteSession(token);
    } catch {
      // Graceful degradation — still clear the cookie and return 200
    }
  }

  cookieStore.set('session_token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return NextResponse.json({ success: true });
}
