
import Chat from './components/Chat';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { supabase } from './lib/supabase/client';

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

  if (session.userId) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: true });

    messages = data ?? [];
  }

  return <Chat initialMessages={messages} />;
}
