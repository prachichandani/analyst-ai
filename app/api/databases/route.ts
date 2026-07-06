// app/api/databases/route.ts
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/app/lib/supabase/admin';

export async function GET() {
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
    return new Response('Unauthorized', { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('uploaded_databases')
    .select('id, file_name, created_at')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch databases:', error);
    return Response.json({ error: 'Failed to fetch databases' }, { status: 500 });
  }

  return Response.json({ databases: data ?? [] });
}   