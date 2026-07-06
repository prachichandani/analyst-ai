// app/api/databases/[id]/route.ts
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/app/lib/supabase/admin';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  // 1. Verify this file belongs to the requesting user, and get its storage path
  const { data: database, error: fetchError } = await supabaseAdmin
    .from('uploaded_databases')
    .select('storage_path, user_id')
    .eq('id', id)
    .single();

  if (fetchError || !database) {
    return Response.json({ error: 'Database not found' }, { status: 404 });
  }

  if (database.user_id !== session.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // 2. Clear the foreign key reference FIRST, if this file is currently active —
  //    otherwise step 4's row deletion will fail the FK constraint
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('active_database_id')
    .eq('id', session.userId)
    .single();

  if (userData?.active_database_id === id) {
    const { error: clearError } = await supabaseAdmin
      .from('users')
      .update({ active_database_id: null })
      .eq('id', session.userId);

    if (clearError) {
      console.error('❌ Failed to clear active database reference:', clearError);
      return Response.json({ error: 'Failed to clear active reference' }, { status: 500 });
    }
  }

  // 3. Delete the actual file from Storage
  const { error: storageError } = await supabaseAdmin.storage
    .from('sqlite-uploads')
    .remove([database.storage_path]);

  if (storageError) {
    console.error('❌ Failed to delete from storage:', storageError);
    return Response.json({ error: 'Failed to delete file from storage' }, { status: 500 });
  }

  // 4. Delete the tracking row — safe now that no FK references it
  const { error: deleteError } = await supabaseAdmin
    .from('uploaded_databases')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('❌ Failed to delete database record:', deleteError);
    return Response.json({ error: 'Failed to delete database record' }, { status: 500 });
  }

  return Response.json({ success: true });
}