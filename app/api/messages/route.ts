import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase/client';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in messages GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { role, content } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: 'role and content are required' },
        { status: 400 }
      );
    }

    if (role !== 'user' && role !== 'assistant') {
      return NextResponse.json(
        { error: 'role must be either "user" or "assistant"' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([{ role, content, user_id: session.userId }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save message: ${error.message}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in messages POST:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('user_id', session.userId);

    if (error) {
      throw new Error(`Failed to clear messages: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in messages DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to clear messages' },
      { status: 500 }
    );
  }
}
