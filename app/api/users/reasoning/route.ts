import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase/client';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
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

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reasoningLevel } = body;

    // Validate input
    if (!['low', 'medium', 'high'].includes(reasoningLevel)) {
      return NextResponse.json(
        { error: 'Invalid reasoning level' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('users')
      .update({ reasoning_level: reasoningLevel })
      .eq('id', session.userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update reasoning level: ${error.message}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating reasoning level:', error);

    return NextResponse.json(
      { error: 'Failed to update reasoning level' },
      { status: 500 }
    );
  }
}