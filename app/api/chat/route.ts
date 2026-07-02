import { convertToModelMessages, streamText, UIMessage, stepCountIs } from 'ai';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { chatModel } from '@/app/actions';
import { SystemPrompt } from '@/app/lib/prompts/systemprompt';
import { executeQuery } from "../../lib/db/executeQuery";


import { tool } from 'ai';

export const renderChart = tool({
  description:
    "Render a chart to visually represent data for the user. Use this whenever showing trends, comparisons, distributions, or rankings would help — e.g. AUM by fund, holdings breakdown, performance over time. Choose the chart type that best fits the data shape.When naming fields in chart data, use clear suffixes so values render correctly: dollar amounts should include 'usd', 'aum', or 'value' in the key name (e.g. aum_usd, value_usd); percentages should include 'pct', 'return', 'alpha', or 'rate' (e.g. estimated_return_pct); dates should stay in ISO format (YYYY-MM-DD); quarters should stay in 'YYYYQ#' format (e.g. 2021Q3).",
  inputSchema: z.object({
    chartType: z.enum(['bar', 'line', 'pie', 'area', 'scatter', 'table']),
    title: z.string(),
    data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
    xKey: z.string().describe('Field name to use for the x-axis / category'),
    yKeys: z.array(z.string()).describe('Field name(s) to plot as values'),
    description: z.string().optional(),
  }),
  execute: async (input) => {
    try {
      // basic sanity check before handing off to frontend
      if (!input.data?.length) {
        return { error: 'No data available to chart.' };
      }
      return input;
    } catch (err) {
      return { error: 'Failed to prepare chart data.' };
    }
  },
});
export const queryDatabase = tool({
  description: 'Execute a read-only PostgreSQL query against the hedge fund database and return the results',
  inputSchema: z.object({
    sql: z.string().describe('The SQL query to execute'),
  }),
  execute: async ({ sql }) => {
    try {
      const result = await executeQuery(sql);
      return result;
    } catch (err) {
      console.error(' queryDatabase failed:', err);
      return { error: 'Could not fetch data right now.' };
    }
  },
});

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

  const {
    messages,
    reasoningLevel,
  }: {
    messages: UIMessage[];
    reasoningLevel: 'low' | 'medium' | 'high';
  } = await request.json();

  const result = streamText({
    model: chatModel,
    messages: await convertToModelMessages(messages),
    system: SystemPrompt,
    tools: {
      queryDatabase,
      renderChart,
    },
    stopWhen: stepCountIs(50),
    providerOptions: {
      openai: {
        reasoningEffort: reasoningLevel || 'low',
        reasoningSummary: 'detailed'
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
