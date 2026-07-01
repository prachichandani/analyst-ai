import { generateObject, generateText } from "ai";
import { z } from "zod";
import { chatModel } from "@/app/actions";

export async function POST(req: Request) {
  const { task, title, data, xKey, yKeys } = await req.json();

  // ── Executive Summary ──
  if (task === 'summary') {
    const { text } = await generateText({
      model: chatModel,
      prompt: `You are a senior financial analyst writing an executive summary for a professional report.

Chart: "${title}"
Category: ${xKey}
Metrics: ${yKeys.join(', ')}
Data: ${JSON.stringify(data.slice(0, 20), null, 2)}

Write exactly 2-3 sentences of flowing prose (no bullet points, no headers) that:
1. States what this data shows and why it matters
2. Highlights the single most important finding with a specific number
3. Notes one meaningful implication or trend

Respond with ONLY the prose paragraph.`,
    });
    return Response.json({ summary: text.trim() });
  }

  // ── KPI Cards ──
  if (task === 'kpis') {
    const { object } = await generateObject({
      model: chatModel,
      schema: z.object({
        topFundName:          z.string(),
        topFundValue:         z.string(),
        totalAUM:             z.string(),
        avgAUM:               z.string(),
        fundCount:            z.number(),
        concentration:        z.string(),
        concentrationLabel:   z.string(),
      }),
      prompt: `You are a financial data analyst. Calculate these KPIs from the dataset.

Category field: ${xKey}
Primary value field: ${yKeys[0]}
Data: ${JSON.stringify(data, null, 2)}

Return:
- topFundName: short name of item with highest value (max 18 chars)
- topFundValue: compact formatted e.g. $192B or 45.2%
- totalAUM: sum of all primary values compact e.g. $826B
- avgAUM: average compact e.g. $82.6B
- fundCount: number of rows
- concentration: % held by top 3 as string e.g. "51.2"
- concentrationLabel: e.g. "Top 3 Concentration"`,
    });
    return Response.json({ kpis: object });
  }

  // ── Deep Insights (default — keeps your existing behaviour) ──
  const { object } = await generateObject({
    model: chatModel,
    schema: z.object({
      insights: z.array(z.string()).min(4).max(4),
    }),
    prompt: `You are a senior financial analyst writing insights for a professional report titled "${title}".

Category: ${xKey}
Metrics: ${yKeys.join(', ')}
Data: ${JSON.stringify(data.slice(0, 20), null, 2)}

Write exactly 4 analytical insights. Each must:
- Start with a bold 2-4 word label followed by " — " e.g. "Market Concentration —"
- Include at least one specific number, ratio, or % calculation
- Go beyond describing the visible: include comparison, implication, or trend
- Be 1-2 sentences max

Cover: concentration/dominance, dispersion/spread, clustering patterns, strategic implication.`,
  });
  return Response.json({ insights: object.insights });
}