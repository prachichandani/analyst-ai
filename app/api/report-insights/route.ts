import { generateObject, generateText } from "ai";
import { z } from "zod";
import { chatModel } from "@/app/actions";

// Shared formatting discipline — every prose-generating prompt below pulls
// this in. Without it, the model tends to echo raw JSON values verbatim
// (full-precision floats, un-compacted dollar strings, and unit words
// borrowed straight from a field name like "..._usd_thousands" even when
// that's not what the number represents). The KPI task already avoided this
// because its prompt gave a compact-format example ("$192B") — this block
// generalizes that same discipline to the summary and insights prompts,
// which previously had no such instruction.
const FORMATTING_RULES = `
Formatting rules — follow these exactly:
- Every dollar figure must be compact: use K / M / B / T suffixes (e.g. "$255.2B", "$1.4M"). Never write a raw comma-separated digit string like "$255,249,925,935" in prose.
- Never append a unit word (like "thousand" or "million") onto a number that is already compact or already a full figure. State the actual dollar amount once, correctly scaled, with the right suffix — don't stack a suffix and a unit word together.
- Every percentage must be rounded to exactly 1 decimal place (e.g. "4.0%"). Never output more than 1 decimal digit on a percentage — a value like "4.046126421640324%" is a hard error.
- If a field name suggests a unit (e.g. contains "thousands"), do not assume the raw values are actually scaled that way unless the numbers only make real-world sense under that scaling — a single security cannot realistically represent tens of trillions of dollars in hedge-fund holdings. When in doubt, treat the numeric values as already being in their face-value dollar amount and format them accordingly, rather than blindly multiplying by a unit implied by a column name.
`.trim();

export async function POST(req: Request) {
  const { task, title, data, xKey, yKeys } = await req.json();

  // ── Executive Summary ──
  if (task === 'summary') {
    const { text } = await generateText({
      model: chatModel,
      prompt: `You are a senior financial analyst writing an executive summary for a professional report.

Chart: "${title}"
Category field: ${xKey}
Metrics: ${yKeys.join(', ')}
Data: ${JSON.stringify(data.slice(0, 20), null, 2)}

${FORMATTING_RULES}

Write exactly 2-3 sentences of flowing prose (no bullet points, no headers) that:
1. States what this data shows and why it matters
2. Highlights the single most important finding with a specific number, computed directly from the data above
3. Notes one meaningful implication or trend

Do not use vague qualifiers like "significant," "notable," or "substantial" unless immediately followed by the number that justifies them.

Respond with ONLY the prose paragraph.`,
    });
    return Response.json({ summary: text.trim() });
  }

  // ── KPI Cards ──
  if (task === 'kpis') {
    const { object } = await generateObject({
      model: chatModel,
      schema: z.object({
        topAssetName:        z.string(),
        topAssetValue:       z.string(),
        totalAUM:           z.string(),
        avgAUM:             z.string(),
        fundCount:          z.number(),
        concentration:      z.string(),
        concentrationLabel: z.string(),
      }),
      prompt: `You are a financial data analyst. Calculate these KPIs from the dataset below. Every value must be computed from the actual data — do not estimate or invent numbers.

Category field: ${xKey}
Primary value field: ${yKeys[0]}
Data: ${JSON.stringify(data, null, 2)}

${FORMATTING_RULES}

Return:
- topAssetName: short name of the item with the highest value in ${yKeys[0]} (max 18 chars, truncate if needed)
- topAssetValue: that item's value, compactly formatted, e.g. "$192B" or "45.2%"
- totalAUM: sum of ${yKeys[0]} across all rows, compactly formatted, e.g. "$826B"
- avgAUM: totalAUM divided by row count, compactly formatted, e.g. "$82.6B"
- fundCount: exact number of rows in the dataset
- concentration: the combined share held by the top 3 items, as a percentage string with exactly one decimal, e.g. "51.2" (no % sign)
- concentrationLabel: a short label for that stat, e.g. "Top 3 Concentration"`,
    });
    return Response.json({ kpis: object });
  }

  // ── Deep Insights ──
  const { object } = await generateObject({
    model: chatModel,
    schema: z.object({
      insights: z.array(
        z.object({
          label: z
            .string()
            .describe('2-4 word headline in Title Case, no trailing punctuation, e.g. "Top-Heavy Distribution"'),
          body: z
            .string()
            .describe(
              'One to two sentences. Must name at least one specific item from the data by name and include at least one number computed from the dataset (a ratio, delta, percentage, or rank comparison) — never a vague qualifier on its own. All dollar figures compact, all percentages rounded to 1 decimal.'
            ),
        })
      ).length(4),
    }),
    prompt: `You are a senior financial analyst writing the insights section of a professional report titled "${title}".

Category field: ${xKey}
Metrics: ${yKeys.join(', ')}
Full dataset: ${JSON.stringify(data, null, 2)}

${FORMATTING_RULES}

Write exactly 4 insights, one for each of these angles — cover all four, in this order:
1. Concentration / dominance — how much of the total sits with the top handful of entries. Name them and give the share.
2. Dispersion / spread — how unevenly values are distributed across the full set (e.g. gap between top and bottom, or how far entries sit from the mean).
3. Outlier or notable anomaly — a specific entry that breaks the pattern the rest of the data follows, and by how much.
4. Strategic implication — what the pattern in 1-3 suggests for someone using this data to make a decision (risk, opportunity, or trend to watch).

Hard requirements for every insight:
- Name at least one specific entry from ${xKey} by its actual value in the data — never write generically about "the data" without naming something.
- Include at least one number you calculated yourself from the dataset (a ratio, percentage, multiple, or difference) — do not just restate a raw value that's already visible on the chart.
- Never use "significant," "notable," "substantial," or "considerable" unless the very next words are the number that earns it.
- Do not repeat the same entry as the headline example in more than one insight.

Bad example (too vague, reject this style): "Concentration — The top fund holds a significant share of total AUM, indicating a concentrated market."
Bad example (formatting violation, reject this style): "NDQ leads with $255,249,925,935 thousand invested value, representing 4.046126421640324% of the portfolio."
Good example (specific, numeric, named, properly formatted): "Concentration — [Entity A] alone accounts for 41.3% of total AUM, more than the bottom 12 entries combined."`,
  });
  return Response.json({ insights: object.insights });
}