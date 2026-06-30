// ---------- Number formatting ----------

// Compact number formatting: 300000 -> "300K", 6000000000 -> "$6B"
export function formatCompactNumber(value: number | string, prefix = ''): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num)) return String(value);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 1_000_000_000) return `${sign}${prefix}${(abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}B`;
  if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}${prefix}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return `${sign}${prefix}${abs.toFixed(abs % 1 === 0 ? 0 : 2)}`;
}

// Full precision for tooltips: 300000 -> "$300,000"
export function formatFullNumber(value: number | string, prefix = ''): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num)) return String(value);
  return `${prefix}${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number | string): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num)) return String(value);
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
}

// ---------- Date / quarter detection ----------

// Detects "2021Q3" style quarter strings
export function isQuarterLabel(value: string): boolean {
  return typeof value === 'string' && /^\d{4}Q[1-4]$/.test(value);
}

export function formatQuarterLabel(value: string): string {
  if (!isQuarterLabel(value)) return value;
  const [year, q] = value.split('Q');
  return `Q${q} '${year.slice(2)}`;
}

// Detects ISO date strings "2026-05-15"
export function isDateLabel(value: string): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);
}

export function formatDateLabel(
  value: string,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: '2-digit' }
): string {
  if (!isDateLabel(value)) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', opts);
}

// Auto-formats an axis/category label based on detected type
export function formatCategoryLabel(value: any): string {
  if (typeof value !== 'string') return String(value);
  if (isQuarterLabel(value)) return formatQuarterLabel(value);
  if (isDateLabel(value)) return formatDateLabel(value);
  return value;
}

// ---------- Field-name heuristics ----------

export function isDollarField(key: string): boolean {
  return /usd|aum|value|price|market_cap|cap\b/i.test(key);
}

export function isPercentField(key: string): boolean {
  return /pct|percent|return|alpha|beta|yield|rate/i.test(key);
}

export function formatValueByField(key: string, value: number): string {
  if (isPercentField(key)) return formatPercent(value);
  if (isDollarField(key)) return formatCompactNumber(value, '$');
  return formatCompactNumber(value);
}

export function formatFullValueByField(key: string, value: number): string {
  if (isPercentField(key)) return formatPercent(value);
  if (isDollarField(key)) return formatFullNumber(value, '$');
  return formatFullNumber(value);
}

// ---------- Label humanizing ----------

const LABEL_OVERRIDES: Record<string, string> = {
  aum_usd: 'AUM',
  aum: 'AUM',
  cik: 'CIK',
  pct_of_portfolio: '% of Portfolio',
  estimated_return_pct: 'Estimated Return',
  implied_alpha_pct: 'Implied Alpha',
  cumulative_return_pct: 'Cumulative Return',
  rolling_4q_sharpe: 'Sharpe (4Q)',
  market_cap: 'Market Cap',
  market_beta: 'Market Beta',
  ten_yr_yield: '10Y Yield',
  fed_funds_rate: 'Fed Funds Rate',
  cpi_index: 'CPI Index',
  vix: 'VIX',
  sp500_close: 'S&P 500',
  value_usd_thousands: 'Value (USD)',
  shares: 'Shares',
  fund_name: 'Fund',
  issuer_name: 'Issuer',
  ticker: 'Ticker',
};

// "aum_usd" -> "AUM", "estimated_return_pct" -> "Estimated Return"
export function humanizeFieldName(key: string): string {
  if (!key) return '';
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];

  return (
    key
      .replace(/_usd$/i, '')
      .replace(/_pct$/i, '')
      .split('_')
      .filter(Boolean)
      .map((w) => (w.length <= 3 && w === w.toLowerCase() ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ')
      .trim() || key
  );
}

// Truncate long category labels with ellipsis, e.g. fund names
export function truncateLabel(value: string, maxLen = 14): string {
  if (typeof value !== 'string') return String(value);
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen - 1).trimEnd() + '…';
}