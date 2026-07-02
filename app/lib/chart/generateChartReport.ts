import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  formatCategoryLabel,
  formatCompactNumber,
  humanizeFieldName,
  isDollarField,
  isPercentField,
  formatPercent,
} from '../../components/chartFormat';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportOptions {
  chartElement: HTMLElement;
  title: string;
  description?: string;
  data: Record<string, string | number>[];
  xKey: string;
  yKeys: string[];
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'table';
  sourceNote?: string;
  /** Max appendix rows to render, so the report reliably stays to 2 pages. Default 15. */
  maxAppendixRows?: number;
}

interface KPIData {
  topAssetName: string;
  topAssetValue: string;
  totalAUM: string;
  avgAUM: string;
  fundCount: number;
  concentration: string;
  concentrationLabel: string;
}

interface InsightItem {
  label: string;
  body: string;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_W - MARGIN * 2;

// 8pt-based spacing scale — every gap in the doc pulls from here so nothing
// is a one-off magic number.
const SP = { xs: 4, sm: 8, md: 12, lg: 20, xl: 28, xxl: 40 };

const C = {
  ink:         [17, 24, 39]    as [number, number, number], // near-black, headers
  slate700:    [55, 65, 81]    as [number, number, number], // body text
  slate500:    [107, 114, 128] as [number, number, number], // secondary text
  slate400:    [156, 163, 175] as [number, number, number], // tertiary / labels
  slate200:    [229, 231, 235] as [number, number, number], // borders
  slate100:    [243, 244, 246] as [number, number, number], // table header bg
  slate50:     [249, 250, 251] as [number, number, number], // card / alt-row bg
  shadow:      [235, 236, 240] as [number, number, number], // faux drop shadow
  white:       [255, 255, 255] as [number, number, number],
  accent:      [79, 70, 229]   as [number, number, number], // indigo-600
  accentLight: [238, 242, 255] as [number, number, number], // indigo-50
};

// ─── PDF primitives ───────────────────────────────────────────────────────────

function tc(pdf: jsPDF, rgb: [number, number, number]) { pdf.setTextColor(rgb[0], rgb[1], rgb[2]); }
function fc(pdf: jsPDF, rgb: [number, number, number]) { pdf.setFillColor(rgb[0], rgb[1], rgb[2]); }
function dc(pdf: jsPDF, rgb: [number, number, number]) { pdf.setDrawColor(rgb[0], rgb[1], rgb[2]); }

/** A very light offset rect behind a card gives the illusion of elevation
 *  without needing alpha compositing (which older jsPDF builds don't support). */
function shadowRect(pdf: jsPDF, x: number, y: number, w: number, h: number, r = 4) {
  fc(pdf, C.shadow);
  pdf.roundedRect(x + 1.5, y + 2, w, h, r, r, 'F');
}

function sectionHeader(pdf: jsPDF, text: string, y: number, pageWidth: number): number {
  fc(pdf, C.accent);
  pdf.circle(MARGIN, y - 3, 2.5, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  tc(pdf, C.accent);
  pdf.text(text.toUpperCase(), MARGIN + 9, y);

  dc(pdf, C.slate200);
  pdf.setLineWidth(0.5);
  const labelWidth = pdf.getTextWidth(text.toUpperCase()) + 18;
  pdf.line(MARGIN + labelWidth, y - 3, pageWidth - MARGIN, y - 3);

  return y + SP.lg;
}

function formatTableValue(col: string, raw: string | number): string {
  if (typeof raw === 'number') {
    if (isDollarField(col)) return formatCompactNumber(raw, '$');
    if (isPercentField(col)) return formatPercent(raw);
    return formatCompactNumber(raw);
  }
  return formatCategoryLabel(String(raw ?? ''));
}

// ─── SVG capture ─────────────────────────────────────────────────────────────

async function captureChart(element: HTMLElement): Promise<string | null> {
  if (!element) return null;

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,           // retina-sharp output for print
    useCORS: true,
    logging: false,
  });

  return canvas.toDataURL('image/png');
}

// ─── Claude API calls — all 3 in parallel ────────────────────────────────────

async function generateExecutiveSummary(title: string, data: Record<string, string | number>[], xKey: string, yKeys: string[]): Promise<string> {
  try {
    const res = await fetch('/api/report-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'summary', title, data, xKey, yKeys }),
    });
    const { summary } = await res.json();
    return summary ?? '';
  } catch { return ''; }
}

async function generateKPIs(data: Record<string, string | number>[], xKey: string, yKeys: string[]): Promise<KPIData | null> {
  try {
    const res = await fetch('/api/report-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'kpis', title: '', data, xKey, yKeys }),
    });
    const { kpis } = await res.json();
    return kpis ?? null;
  } catch { return null; }
}

async function generateDeepInsights(title: string, data: Record<string, string | number>[], xKey: string, yKeys: string[]): Promise<InsightItem[]> {
  try {
    const res = await fetch('/api/report-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'insights', title, data, xKey, yKeys }),
    });
    const { insights } = await res.json();
    return insights ?? [];
  } catch { return []; }
}

// ─── KPI card row ─────────────────────────────────────────────────────────────

function drawKPICards(pdf: jsPDF, kpis: KPIData, y: number): number {
  const gap   = SP.sm;
  const cardW = (CONTENT_WIDTH - gap * 3) / 4;
  const cardH = 64;

  const cards = [
    { label: 'LARGEST ASSET',                        value: kpis.topAssetValue,       sub: kpis.topAssetName },
    { label: 'TOTAL AUM',                            value: kpis.totalAUM,           sub: `${kpis.fundCount} funds combined` },
    { label: kpis.concentrationLabel.toUpperCase(),  value: `${kpis.concentration}%`, sub: 'share of total AUM' },
    { label: 'AVERAGE AUM',                          value: kpis.avgAUM,             sub: 'per fund' },
  ];

  cards.forEach((card, i) => {
    const x = MARGIN + i * (cardW + gap);

    shadowRect(pdf, x, y, cardW, cardH, 4);

    fc(pdf, C.white);
    dc(pdf, C.slate200);
    pdf.setLineWidth(0.6);
    pdf.roundedRect(x, y, cardW, cardH, 4, 4, 'FD');

    // Indigo top accent bar, inset so it respects the card's rounded corners
    fc(pdf, C.accent);
    pdf.roundedRect(x, y, cardW, 4, 4, 4, 'F');
    fc(pdf, C.white);
    pdf.rect(x, y + 2, cardW, 2, 'F');
    fc(pdf, C.accent);
    pdf.rect(x + 3, y, cardW - 6, 4, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    tc(pdf, C.slate400);
    pdf.text(card.label, x + SP.sm + 2, y + 18);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16.5);
    tc(pdf, C.ink);
    pdf.text(card.value, x + SP.sm + 2, y + 38);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    tc(pdf, C.slate500);
    const sub = pdf.splitTextToSize(card.sub, cardW - SP.sm * 2 - 4)[0];
    pdf.text(sub, x + SP.sm + 2, y + 53);
  });

  return y + cardH + SP.xl;
}

// ─── Insight cards — 2-column grid, height-matched per row ──────────────────

const INSIGHT_MARKERS = ['①', '②', '③', '④', '⑤', '⑥'];

/** Accepts either the current { label, body } shape or a legacy
 *  "Label — body" string (in case an older API response is cached/deployed),
 *  and always returns safe, non-undefined strings so jsPDF never chokes. */
function normalizeInsight(raw: unknown): InsightItem {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return {
      label: typeof obj.label === 'string' && obj.label.trim() ? obj.label : 'Insight',
      body:  typeof obj.body  === 'string' && obj.body.trim()  ? obj.body  : (typeof obj.text === 'string' ? obj.text : ''),
    };
  }
  if (typeof raw === 'string') {
    const dashIdx = raw.indexOf(' — ');
    if (dashIdx !== -1) {
      return { label: raw.slice(0, dashIdx), body: raw.slice(dashIdx + 3) };
    }
    return { label: 'Insight', body: raw };
  }
  return { label: 'Insight', body: '' };
}

function drawInsightGrid(pdf: jsPDF, rawInsights: unknown[], y: number, pageWidth: number, pageHeight: number): number {
  const insights = rawInsights.map(normalizeInsight).filter(i => i.body.trim().length > 0);
  if (insights.length === 0) return y;

  const gap    = SP.md;
  const cardW  = (CONTENT_WIDTH - gap) / 2;
  const textW  = cardW - 44;
  const rowPad = 18;

  for (let row = 0; row * 2 < insights.length; row++) {
    const pair = insights.slice(row * 2, row * 2 + 2);

    const wrapped = pair.map(item => pdf.setFontSize(9.5) && pdf.splitTextToSize(item.body, textW));
    const rowH = Math.max(...wrapped.map(lines => lines.length * 13), 1) + rowPad + 20;

    // A row must fully fit above the footer zone, or it goes to a new page —
    // this is what was missing before, letting row 2 collide with the footer.
    if (y + rowH > pageHeight - MARGIN - 32) {
      pdf.addPage();
      y = MARGIN;
      y = sectionHeader(pdf, 'Analyst Insights (cont.)', y, pageWidth);
    }

    pair.forEach((item, col) => {
      const x = MARGIN + col * (cardW + gap);

      shadowRect(pdf, x, y, cardW, rowH, 4);

      fc(pdf, C.slate50);
      dc(pdf, C.slate200);
      pdf.setLineWidth(0.6);
      pdf.roundedRect(x, y, cardW, rowH, 4, 4, 'FD');

      fc(pdf, C.accent);
      pdf.roundedRect(x, y, 3, rowH, 1.5, 1.5, 'F');
      pdf.rect(x + 1.5, y, 1.5, rowH, 'F');

      fc(pdf, C.accentLight);
      pdf.circle(x + 22, y + 21, 11, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      tc(pdf, C.accent);
      const marker = INSIGHT_MARKERS[row * 2 + col] ?? String(row * 2 + col + 1);
      pdf.text(marker, x + 22, y + 25, { align: 'center' });

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      tc(pdf, C.ink);
      pdf.text(item.label || 'Insight', x + 40, y + 19);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      tc(pdf, C.slate700);
      pdf.text(wrapped[col], x + 40, y + 34);
    });

    y += rowH + gap;
  }

  return y + SP.sm;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateChartReportPDF({
  chartElement,
  title,
  description,
  data,
  xKey,
  yKeys,
  chartType,
  sourceNote = 'Generated by Analyst AI · Internal fund database',
  maxAppendixRows = 15,
}: ReportOptions) {

  const [chartImage, executiveSummary, kpis, insights] = await Promise.all([
    captureChart(chartElement),
    generateExecutiveSummary(title, data, xKey, yKeys),
    generateKPIs(data, xKey, yKeys),
    generateDeepInsights(title, data, xKey, yKeys),
  ]);

  const pdf        = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth  = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = 0;

  const checkBreak = (needed: number) => {
    if (y + needed > pageHeight - MARGIN - 32) {
      pdf.addPage();
      y = MARGIN;
    }
  };

  // ══════════════════════════════════════════════════════
  // PAGE 1 — Overview: headline, summary, KPIs, chart
  // ══════════════════════════════════════════════════════

  fc(pdf, C.ink);
  pdf.rect(0, 0, pageWidth, 54, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  tc(pdf, C.white);
  pdf.text('Analyst AI', MARGIN, 33);

  fc(pdf, C.accent);
  const brandW = pdf.getTextWidth('Analyst AI');
  pdf.circle(MARGIN + brandW + 6, 29, 2.5, 'F');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  tc(pdf, C.slate400);
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  pdf.text(`Generated ${dateStr}`, pageWidth - MARGIN, 33, { align: 'right' });

  y = 82;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  tc(pdf, C.ink);
  const titleLines = pdf.splitTextToSize(title, CONTENT_WIDTH);
  pdf.text(titleLines, MARGIN, y);
  y += titleLines.length * 27 + SP.sm;

  fc(pdf, C.accent);
  pdf.rect(MARGIN, y, 40, 3, 'F');
  y += SP.lg;

  const summaryText = executiveSummary || description || '';
  if (summaryText) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10.5);
    tc(pdf, C.slate700);
    const summaryLines = pdf.splitTextToSize(summaryText, CONTENT_WIDTH);
    pdf.text(summaryLines, MARGIN, y);
    y += summaryLines.length * 15 + SP.xl;
  }

  if (kpis) {
    y = drawKPICards(pdf, kpis, y);
  }

  if (chartImage) {
    const imgWidth = CONTENT_WIDTH;
    const tempImg  = new Image();
    await new Promise<void>((res) => { tempImg.onload = () => res(); tempImg.src = chartImage; });
    const imgHeight = Math.min((tempImg.height / tempImg.width) * imgWidth, 250);

    checkBreak(imgHeight + SP.lg);

    shadowRect(pdf, MARGIN - 10, y - 10, imgWidth + 20, imgHeight + 20, 6);
    fc(pdf, C.white);
    dc(pdf, C.slate200);
    pdf.setLineWidth(0.6);
    pdf.roundedRect(MARGIN - 10, y - 10, imgWidth + 20, imgHeight + 20, 6, 6, 'FD');
    pdf.addImage(chartImage, 'PNG', MARGIN, y, imgWidth, imgHeight);
    y += imgHeight + SP.xl;
  }

  // ══════════════════════════════════════════════════════
  // PAGE 2 — Insights + Appendix
  // (no forced addPage — the content naturally starts a new
  //  page via checkBreak once page 1 is full, keeping the
  //  report to exactly 2 pages for typical dataset sizes)
  // ══════════════════════════════════════════════════════

  if (insights.length > 0) {
    checkBreak(120);
    y = sectionHeader(pdf, 'Analyst Insights', y, pageWidth);
    y = drawInsightGrid(pdf, insights, y, pageWidth, pageHeight);
  }

  if (chartType !== 'table') {
    checkBreak(80);
    y = sectionHeader(pdf, 'Appendix — Underlying Data', y, pageWidth);

    const primaryKey = yKeys[0];
    const total = data.reduce((sum, row) => {
      const val = row[primaryKey];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
    const hasTotal = total > 0;

    // Cap + sort so the appendix stays compact and shows the entries that
    // matter most, rather than truncating arbitrarily mid-list.
    const sorted = hasTotal
      ? [...data].sort((a, b) => {
          const av = typeof a[primaryKey] === 'number' ? (a[primaryKey] as number) : -Infinity;
          const bv = typeof b[primaryKey] === 'number' ? (b[primaryKey] as number) : -Infinity;
          return bv - av;
        })
      : data;
    const shown    = sorted.slice(0, maxAppendixRows);
    const hidden   = sorted.length - shown.length;

    const RANK_W  = 26;
    const PCT_W   = hasTotal ? 60 : 0;
    const dataW   = CONTENT_WIDTH - RANK_W - PCT_W;
    const allCols = [xKey, ...yKeys];
    const colW    = dataW / allCols.length;
    const ROW_H   = 20;

    fc(pdf, C.slate100);
    dc(pdf, C.slate200);
    pdf.setLineWidth(0.5);
    pdf.rect(MARGIN, y, CONTENT_WIDTH, ROW_H, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    tc(pdf, C.slate500);
    pdf.text('#', MARGIN + 8, y + 13.5);

    allCols.forEach((col, i) => {
      const label = humanizeFieldName(col);
      const trunc = pdf.splitTextToSize(label, colW - 8)[0];
      pdf.text(trunc, MARGIN + RANK_W + i * colW + 6, y + 13.5);
    });
    if (hasTotal) {
      pdf.text('% of Total', MARGIN + RANK_W + dataW + 6, y + 13.5);
    }

    y += ROW_H;

    shown.forEach((row, rowIdx) => {
      checkBreak(ROW_H);

      if (rowIdx % 2 === 1) {
        fc(pdf, C.slate50);
        pdf.rect(MARGIN, y, CONTENT_WIDTH, ROW_H, 'F');
      }

      dc(pdf, C.slate200);
      pdf.setLineWidth(0.3);
      pdf.line(MARGIN, y + ROW_H, pageWidth - MARGIN, y + ROW_H);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      tc(pdf, C.accent);
      pdf.text(String(rowIdx + 1), MARGIN + 8, y + 13.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      tc(pdf, C.slate700);

      allCols.forEach((col, i) => {
        const raw       = row[col];
        const formatted = formatTableValue(col, raw);
        const trunc     = pdf.splitTextToSize(formatted, colW - 8)[0] ?? '';
        pdf.text(trunc, MARGIN + RANK_W + i * colW + 6, y + 13.5);
      });

      if (hasTotal) {
        const val = row[primaryKey];
        const pct = typeof val === 'number'
          ? ((val / total) * 100).toFixed(1) + '%'
          : '—';
        tc(pdf, C.slate500);
        pdf.text(pct, MARGIN + RANK_W + dataW + 6, y + 13.5);
      }

      y += ROW_H;
    });

    if (hidden > 0) {
      y += SP.xs;
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7.5);
      tc(pdf, C.slate400);
      pdf.text(`+ ${hidden} additional ${hidden === 1 ? 'entry' : 'entries'} not shown`, MARGIN, y + 8);
    }
  }

  // ── Footer on every page ──
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    const footerY = pageHeight - 20;

    dc(pdf, C.slate200);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN, footerY - 10, pageWidth - MARGIN, footerY - 10);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    tc(pdf, C.slate400);
    pdf.text(sourceNote, MARGIN, footerY);
    tc(pdf, C.slate500);
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth - MARGIN, footerY, { align: 'right' });
  }

  // ── Save ──
  const filename = `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)}.pdf`;

  pdf.save(filename);
}