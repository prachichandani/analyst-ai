import { convertToModelMessages, streamText, UIMessage, stepCountIs } from 'ai';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { chatModel } from '@/app/actions';
import { SystemPrompt } from '@/app/lib/prompts/systemprompt';
import { executeQuery } from "../../lib/db/executeQuery";

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
    system: SystemPrompt,
    tools: {
      query_database: {
        description: 'Execute a read-only PostgreSQL query against the hedge fund database and return the results',
        inputSchema: z.object({
          sql: z.string().describe('The SQL query to execute'),
        }),
        execute: async ({ sql }) => {
          const result = await executeQuery(sql);
          return result;
      }
      },
    },
    stopWhen: stepCountIs(20),
    providerOptions: {
      openai: {
        reasoningEffort: 'high',
        reasoningSummary: 'detailed'
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
