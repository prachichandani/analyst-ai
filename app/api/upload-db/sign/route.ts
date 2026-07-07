import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/app/lib/supabase/admin';

export async function POST(request: Request) {
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

  const { fileName } = await request.json();

  if (!fileName || (!fileName.endsWith('.sqlite') && !fileName.endsWith('.db'))) {
    return Response.json({ error: 'Only .sqlite or .db files are allowed' }, { status: 400 });
  }

  const storagePath = `${session.userId}/${Date.now()}-${fileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from('sqlite-uploads')
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    console.error('❌ Failed to create signed upload URL:', error);
    return Response.json({ error: 'Could not prepare upload' }, { status: 500 });
  }

  return Response.json({
    signedUrl: data.signedUrl,
    token: data.token,
    storagePath,
  });
}