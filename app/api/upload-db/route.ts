import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import initSqlJs from 'sql.js';
import { supabaseAdmin } from '../../lib/supabase/admin';
import path from 'path';

export async function POST(request: Request) {
  // Same auth check pattern as your chat route
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

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!file.name.endsWith('.sqlite') && !file.name.endsWith('.db')) {
    return Response.json({ error: 'Only .sqlite or .db files are allowed' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 1. Upload the raw file to Supabase Storage
  const storagePath = `${session.userId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('sqlite-uploads')
    .upload(storagePath, buffer, {
      contentType: 'application/x-sqlite3',
    });

  if (uploadError) {
    console.error('❌ Storage upload failed:', uploadError);
    return Response.json({ error: 'Failed to upload file' }, { status: 500 });
  }

  // 2. Extract schema by opening the file once, right now
  let schema: { name: string; sql: string }[] = [];
  try {

    const SQL = await initSqlJs({
      locateFile: (file) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    });
    const db = new SQL.Database(buffer);
    const result = db.exec("SELECT name, sql FROM sqlite_master WHERE type='table'");
    schema = result[0]?.values.map(([name, sql]) => ({
      name: name as string,
      sql: sql as string,
    })) ?? [];
    db.close();
  } catch (err) {
    console.error('❌ Failed to read SQLite schema:', err);
    // Clean up the uploaded file since it's not a valid/readable database
    await supabaseAdmin.storage.from('sqlite-uploads').remove([storagePath]);
    return Response.json({ error: 'Could not read this file as a SQLite database' }, { status: 400 });
  }

  // 3. Save the reference row
  const { data: row, error: dbError } = await supabaseAdmin
    .from('uploaded_databases')
    .insert({
      user_id: session.userId,
      file_name: file.name,
      storage_path: storagePath,
      schema_json: schema,
    })
    .select()
    .single();

  if (dbError) {
    console.error('❌ Failed to save database record:', dbError);
    await supabaseAdmin.storage.from('sqlite-uploads').remove([storagePath]);
    return Response.json({ error: 'Failed to save upload record' }, { status: 500 });
  }

  return Response.json({ id: row.id, fileName: row.file_name, schema });
}