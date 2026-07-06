import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/app/lib/supabase/admin';

export async function PATCH(request: Request) {
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

  const { activeDatabaseId } = await request.json();

  // Verify ownership before saving — prevents someone tampering with the
  // request to point at another user's uploaded file
  if (activeDatabaseId) {
    const { data: owned, error: ownedErr } = await supabaseAdmin
      .from('uploaded_databases')
      .select('id')
      .eq('id', activeDatabaseId)
      .eq('user_id', session.userId)
      .single();

    if (ownedErr || !owned) {
      return Response.json({ error: 'Database not found' }, { status: 404 });
    }
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ active_database_id: activeDatabaseId })
    .eq('id', session.userId);

  if (error) {
    console.error('❌ Failed to update active database:', error);
    return Response.json({ error: 'Failed to update' }, { status: 500 });
  }

  return Response.json({ success: true });
}