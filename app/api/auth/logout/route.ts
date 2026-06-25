import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const session = await getIronSession<{ userId: string; email: string }>(
      await cookies(),
      {
        password: process.env.SESSION_SECRET!,
        cookieName: 'session',
        cookieOptions: {
          secure: process.env.NODE_ENV === 'production',
        },
      }
    );

    // Clear session
    session.userId = '';
    session.email = '';
    await session.destroy();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
