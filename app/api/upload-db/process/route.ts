import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import initSqlJs from 'sql.js';
import { supabaseAdmin } from '@/app/lib/supabase/admin';
import path from 'path';

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

  const { storagePath, fileName } = await request.json();

  if (!storagePath || !fileName) {
    return Response.json({ error: 'Missing storage path or file name' }, { status: 400 });
  }

  // Download the file back server-side (small internal transfer, not through
  // the original client request) to extract its schema
  const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
    .from('sqlite-uploads')
    .download(storagePath);

  if (downloadError || !fileBlob) {
    console.error('❌ Failed to download uploaded file for processing:', downloadError);
    return Response.json({ error: 'Could not read the uploaded file' }, { status: 500 });
  }

  const buffer = Buffer.from(await fileBlob.arrayBuffer());

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
    await supabaseAdmin.storage.from('sqlite-uploads').remove([storagePath]);
    return Response.json({ error: 'Could not read this file as a SQLite database' }, { status: 400 });
  }

  const { data: row, error: dbError } = await supabaseAdmin
    .from('uploaded_databases')
    .insert({
      user_id: session.userId,
      file_name: fileName,
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