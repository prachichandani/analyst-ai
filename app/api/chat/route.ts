import { convertToModelMessages, streamText, UIMessage, stepCountIs } from 'ai';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { chatModel } from '@/app/actions';
import { buildSystemPrompt} from '@/app/lib/prompts/systemprompt';
import { executeQuery } from "../../lib/db/executeQuery";
import { tvly } from '../../lib/tavily/tavily';
import { supabaseAdmin } from '@/app/lib/supabase/admin';
import initSqlJs from 'sql.js';
import path from 'path';

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
      })).min(1).max(3),
      anomalies: z.array(z.object({
        label: z.string(),
        body: z.string(),
        severity: z.enum(['low', 'medium', 'high']).optional(),
      })).max(2).optional(),
      recommendations: z.array(z.string()).max(3).optional(),
      followUpQuestions: z.array(z.string()).min(2).max(3).optional(),
    }),
  execute: async (input) => input,
});

export const renderDcaCalculator = tool({
  description:
    'Render an interactive financial calculator widget when the user would benefit from ' +
    'exploring different scenarios (e.g. "what if I invest more/less", "what if returns are higher"). ' +
    'Use this when the user should be able to adjust inputs themselves and even if user doesn\'t ask for it and you feel the need do it, ' +
    'not just view a static result when talked about dca just render it okay.',
  inputSchema: z.object({
    title: z.string(),
    defaults: z.object({
      amount: z.number().describe('Starting contribution/principal amount'),
      frequency: z.enum(['weekly', 'twice-weekly', 'monthly']).optional(),
      annualReturnPct: z.number().describe('Expected annual return, e.g. 7 for 7%'),
      years: z.number(),
    }),
    keyInsight: z.string().describe('One sentence explaining the core takeaway'),
  }),
  execute: async (input) => input,
});

export const renderCompoundInterestCalculator = tool({
  description:
    'Render an interactive compound interest calculator widget when the user would benefit from ' +
    'exploring different scenarios (e.g. "what if I invest more/less", "what if returns are higher"). ' +
    'Use this when the user should be able to adjust inputs themselves and even if user doesn\'t ask for it and you feel the need do it, ' +
    'not just view a static result when talked about compound interest just render it okay. eg-Calculate the future value of a $50,000 investment over 15 years',
  inputSchema: z.object({
    title: z.string(),
    defaults: z.object({
      principal: z.number().describe('Starting principal amount'),
      annualContribution: z.number().describe('Annual contribution amount'),
      annualReturnPct: z.number().describe('Expected annual return, e.g. 7 for 7%'),
      years: z.number(),
      compoundingFrequency: z.enum(['annually', 'quarterly', 'monthly', 'daily']).optional(),
    }),
    keyInsight: z.string().describe('One sentence explaining the core takeaway'),
  }),
  execute: async (input) => input,
});

export const webSearch = tool({
  description:
    'Search the web for current, real-world information . use this to get extra information about the database if you find missing data or need more context for both uploaded database and the data we have in our system',
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
    "Render a chart to visually represent data for the user. Use this whenever showing trends, comparisons, distributions, or rankings would help — e.g. AUM by fund, holdings breakdown, performance over time. Choose the chart type that best fits the data shape. Use this also for the uploaded database file. Always render a chart if the data can be visualized .",
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
    uploadedDatabaseId,
  }: {
    messages: UIMessage[];
    reasoningLevel: 'low' | 'medium' | 'high';
    uploadedDatabaseId: string | null;
  } = await request.json();

  let activeStoragePath: string | null = null;
  let uploadedDatabase: {
    fileName: string;
    schema: unknown;
  } | null = null;

  if (uploadedDatabaseId) {
    const { data: dbRecord, error } = await supabaseAdmin
      .from('uploaded_databases')
      .select('file_name, storage_path, schema_json')
      .eq('id', uploadedDatabaseId)
      .eq('user_id', session.userId) // enforce ownership at the app level
      .single();

    if (error || !dbRecord) {
      console.error('❌ Could not load uploaded database:', error);
    } else {
      activeStoragePath = dbRecord.storage_path;
      uploadedDatabase = {
        fileName: dbRecord.file_name,
        schema: dbRecord.schema_json,
      };
    }
  }
  let openUploadedDb: any = null;

  const queryUploadedDatabase = tool({
    description:
      'Execute a read-only SQL query against the SQLite database the user has uploaded. ' +
      'Use this only for questions about the uploaded file — not the internal hedge fund database.',
    inputSchema: z.object({
      sql: z.string().describe('The SELECT query to run'),
      purpose: z.string().describe(
        'A short, plain-English description of what this query is fetching, ' +
        'shown to the user in the UI.'
      ),
    }),
    execute: async ({ sql, purpose }) => {
      console.log('🔧 [queryUploadedDatabase] purpose:', purpose, '| sql:', sql);

      // Only allow SELECT — same read-only principle as queryDatabase
      if (!/^\s*SELECT/i.test(sql)) {
        return { error: 'Only SELECT queries are allowed on the uploaded database.' };
      }

      try {
        // Download + open only if we haven't already done so in this request
        if (!openUploadedDb) {
          if (!activeStoragePath) {
            return { error: 'No uploaded database is currently active.' };
          }

          const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
            .from('sqlite-uploads')
            .download(activeStoragePath);

          if (downloadError || !fileBlob) {
            console.error('❌ Failed to download uploaded database:', downloadError);
            return { error: 'Could not access the uploaded database.' };
          }

          const buffer = Buffer.from(await fileBlob.arrayBuffer());
          const SQL = await initSqlJs({
            locateFile: (file) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
          });
          openUploadedDb = new SQL.Database(buffer);
        }

        const result = openUploadedDb.exec(sql);
        console.log(result);

        if (!result.length) {
          return { columns: [], rows: [] };
        }

        const { columns, values } = result[0];
        const rows = values.map((row: any[]) =>
          Object.fromEntries(row.map((v, i) => [columns[i], v]))
        );

        console.log('✅ [queryUploadedDatabase] returned', rows.length, 'rows');
        return { columns, rows };
      } catch (err) {
        console.error('❌ [queryUploadedDatabase] failed:', err);
        return { error: 'Could not run this query on the uploaded database.' };
      }
    },
  });

  const result = streamText({
    model: chatModel,
    messages: await convertToModelMessages(messages),
    system: buildSystemPrompt(uploadedDatabase),
    tools: {
      ...(activeStoragePath
        ? { queryUploadedDatabase }
        : { queryDatabase }),
      renderChart,
      presentAnalysis,
      webSearch,
      renderDcaCalculator,
      renderCompoundInterestCalculator,
      // queryUploadedDatabase — added in Step 6
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