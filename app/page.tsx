import Chat from './components/Chat';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { supabase } from './lib/supabase/client';

interface DatabaseFile {
  id: string;
  file_name: string;
  created_at: string;
}

export default async function Home() {
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

  let messages = [];
  let reasoningLevel = "low";
  let activeDatabaseId: string | null = null;
  let activeDatabaseFileName: string | null = null;
  let initialDatabases: DatabaseFile[] = [];

  if (session.userId) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: true });

    messages = data ?? [];

    const { data: userSettings } = await supabase
      .from('users')
      .select('reasoning_level, active_database_id')
      .eq('id', session.userId)
      .single();

    reasoningLevel = userSettings?.reasoning_level ?? "low";
    activeDatabaseId = userSettings?.active_database_id ?? null;

    // Fetch the full list of uploaded files (for the dropdown) in the same
    // pass, so Chat.tsx doesn't need a separate client-side fetch on mount
    const { data: databases } = await supabase
      .from('uploaded_databases')
      .select('id, file_name, created_at')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });

    initialDatabases = databases ?? [];

    if (activeDatabaseId) {
      const activeRecord = initialDatabases.find((db) => db.id === activeDatabaseId);
      if (activeRecord) {
        activeDatabaseFileName = activeRecord.file_name;
      } else {
        activeDatabaseId = null; // stale reference, reset
      }
    }
  }

  return (
    <Chat
      initialMessages={messages}
      reasoningLevel={reasoningLevel}
      activeDatabaseId={activeDatabaseId}
      activeDatabaseFileName={activeDatabaseFileName}
      initialDatabases={initialDatabases}
    />
  );
}