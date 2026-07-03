import { convertToModelMessages, streamText, UIMessage, stepCountIs } from 'ai';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { chatModel } from '@/app/actions';
import { SystemPrompt } from '@/app/lib/prompts/systemprompt';
import { executeQuery } from "../../lib/db/executeQuery";
import { tvly } from '../../lib/tavily/tavily';

import { tool } from 'ai';
// import { openai } from '@ai-sdk/openai';

export const presentAnalysis = tool({
  description:
    'Use this tool to present the analytical findings after any required data retrieval or visualization has been completed. This tool does not replace other tools such as renderChart. If a chart would help answer the question, call renderChart first, then call presentAnalysis to summarize and explain the findings.',
    inputSchema: z.object({
      executiveSummary: z.string(),
      confidence: z.enum(['low', 'medium', 'high']).describe(
        'How confident this analysis is, based on data completeness and sample size. ' +
        'Use "low" when the dataset is small, has gaps, or the finding is speculative. ' +
        'Use "high" only when the data clearly and directly supports the conclusion.'
      ),
      keyInsights: z.array(z.object({
        label: z.string(),
        body: z.string(),
      })).min(1).max(3), // was 5 — smaller cap, less delta volume
      anomalies: z.array(z.object({
        label: z.string(),
        body: z.string(),
        severity: z.enum(['low', 'medium', 'high']).optional(),
      })).max(2).optional(), // add a cap here too
      recommendations: z.array(z.string()).max(3).optional(), // was 4
      followUpQuestions: z.array(z.string()).min(2).max(3).optional(), // was 4
    }),
  execute: async (input) => input,
});
export const webSearch = tool({
  description:
    'Search the web for current, real-world information — e.g. recent news about a fund/company, ' +
    'market events, regulatory filings, recent performance commentary, or anything not present in the ' +
    'internal database. Use this to supplement, not replace, queryDatabase — database numbers are ground truth, ' +
    'web search is for context, recency, and qualitative info.',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
    searchDepth: z.enum(['basic', 'advanced']).optional().describe(
      'Use "advanced" for research-heavy queries needing deeper content, "basic" for quick lookups.'
    ),
    topic: z.enum(['general', 'news', 'finance']).optional().describe(
      'Use "finance" or "news" for fund/market-related queries.'
    ),
    maxResults: z.number().min(1).max(10).optional(),
  }),
  execute: async ({ query, searchDepth, topic, maxResults }) => {
    console.log('🔧 [webSearch] input:', { query, searchDepth, topic, maxResults });
    try {
      const response = await tvly.search(query, {
        searchDepth: searchDepth || 'basic',
        topic: topic || 'general',
        maxResults: maxResults || 5,
        includeAnswer: true,
      });
      console.log('✅ [webSearch] result:', JSON.stringify(response).slice(0, 500));
      return response;
    } catch (err) {
      console.error('❌ [webSearch] failed:', err);
      return { error: 'Web search failed right now.' };
    }
  },
});

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
    purpose: z.string().describe(
      'A short, plain-English description (max ~10 words) of what this query is fetching, ' +
      'e.g. "Fetching top 10 funds by AUM" or "Looking up NVIDIA holdings across funds". ' +
      'This is shown to the user in the UI, so keep it human-readable, not technical.'
    ),
  }),
  execute: async ({ sql, purpose }) => {
    console.log('🔧 [queryDatabase] purpose:', purpose, '| sql:', sql);
    try {
      const result = await executeQuery(sql);
      console.log('✅ [queryDatabase] result:', JSON.stringify(result).slice(0, 500));
      return result;
    } catch (err) {
      console.error('❌ [queryDatabase] failed:', err);
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
      presentAnalysis,
      webSearch,
      // web_search: openai.tools.webSearch({}),
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
