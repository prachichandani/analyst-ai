import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

import { chatModel } from '@/app/actions';


export async function POST(request: Request) {
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
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await request.json();
  
  const result = streamText({
    model: chatModel,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
