'use client';

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

import {
  formatCategoryLabel,
  formatValueByField,
  formatFullValueByField,
  humanizeFieldName,
  truncateLabel,
} from '@/app/components/chartFormat';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#14b8a6'];

interface ChartSpec {
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'table';
  title: string;
  data: Record<string, string | number>[];
  xKey: string;
  yKeys: string[];
  description?: string;
  error?: string;
}

function CustomTooltip({ active, payload, label, xKey }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const title = label ?? row?.[xKey] ?? '—';

  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-sm">
      <p className="mb-1 font-medium text-foreground">{formatCategoryLabel(title)}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name || entry.dataKey || 'Value'}:</span>
          <span className="font-medium text-foreground">
            {entry.value !== undefined && entry.value !== null
              ? formatFullValueByField(entry.dataKey, entry.value)
              : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

function YAxisTick({ x, y, payload, dataKey }: any) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill="hsl(var(--muted-foreground))">
      {formatValueByField(dataKey, payload.value)}
    </text>
  );
}

function XAxisTick({ x, y, payload }: any) {
  const label = truncateLabel(formatCategoryLabel(payload.value), 12);
  // Don't rotate short labels like quarters (Q3 '21) or single words
  const shouldRotate = label.length > 8;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        dy={10}
        textAnchor={shouldRotate ? 'end' : 'middle'}
        fontSize={12}
        fill="hsl(var(--muted-foreground))"
        transform={shouldRotate ? 'rotate(-35)' : undefined}
      >
        {label}
      </text>
    </g>
  );
}

const chartMargin = { top: 8, right: 16, left: 8, bottom: 36 };
const xAxisProps = {
  tick: <XAxisTick />,
  interval: 0 as const,
  height: 56,
  axisLine: { stroke: 'hsl(var(--border))' },
  tickLine: false,
};

export function ChartRenderer({ spec }: { spec: ChartSpec }) {
  if (!spec) return null;

  if (spec.error) {
    return (
      <div className="my-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Couldn't render chart: {spec.error}
      </div>
    );
  }

  const { chartType, title, data, xKey, yKeys, description } = spec;

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="my-4 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
        No data available for "{title || 'this chart'}".
      </div>
    );
  }

  // For pie charts, convert string values to numbers for proper rendering
  const processedData = chartType === 'pie' ? data.map(row => {
    const newRow = { ...row };
    yKeys.forEach(key => {
      const val = row[key];
      if (typeof val === 'string') {
        // Remove common currency symbols and commas, then parse
        const numVal = parseFloat(val.replace(/[$,]/g, ''));
        newRow[key] = isNaN(numVal) ? val : numVal;
      }
    });
    return newRow;
  }) : data;

  // ---------- Table ----------
  if (chartType === 'table') {
    const columns = Object.keys(data[0]);
    return (
      <div className="my-4 overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h4 className="font-semibold">{title}</h4>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((k) => (
                  <th key={k} className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                    {humanizeFieldName(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                  {columns.map((k) => (
                    <td key={k} className="px-4 py-2.5">
                      {typeof row[k] === 'number'
                        ? formatFullValueByField(k, row[k] as number)
                        : formatCategoryLabel(row[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl border bg-card p-5">
      <div className="mb-4">
        <h4 className="font-semibold">{title}</h4>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>

      <ResponsiveContainer width="100%" height={340}>
        {chartType === 'bar' ? (
          <BarChart data={processedData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} {...xAxisProps} />
            <YAxis
              tick={(p: any) => <YAxisTick {...p} dataKey={yKeys[0]} />}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<CustomTooltip xKey={xKey} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 13, paddingTop: 10 }} formatter={(v: string) => humanizeFieldName(v)} />
            {yKeys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                name={humanizeFieldName(k)}
                fill={COLORS[i % COLORS.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            ))}
          </BarChart>
        ) : chartType === 'line' ? (
          <LineChart data={processedData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} {...xAxisProps} />
            <YAxis
              tick={(p: any) => <YAxisTick {...p} dataKey={yKeys[0]} />}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<CustomTooltip xKey={xKey} />} />
            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 13, paddingTop: 10 }} formatter={(v: string) => humanizeFieldName(v)} />
            {yKeys.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                name={humanizeFieldName(k)}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        ) : chartType === 'area' ? (
          <AreaChart data={processedData} margin={chartMargin}>
            <defs>
              {yKeys.map((k, i) => (
                <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} {...xAxisProps} />
            <YAxis
              tick={(p: any) => <YAxisTick {...p} dataKey={yKeys[0]} />}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<CustomTooltip xKey={xKey} />} />
            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 13, paddingTop: 10 }} formatter={(v: string) => humanizeFieldName(v)} />
            {yKeys.map((k, i) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                name={humanizeFieldName(k)}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2.5}
                fill={`url(#grad-${k})`}
              />
            ))}
          </AreaChart>
        ) : chartType === 'pie' ? (
          <PieChart margin={{ top: 8, right: 16, left: 8, bottom: 36 }}>
            <Pie
              data={processedData}
              dataKey={yKeys[0]}
              nameKey={xKey}
              outerRadius={110}
              innerRadius={60}
              paddingAngle={2}
              label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip xKey={xKey} />} />
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: 13, paddingTop: 10 }}
              formatter={(value: string) => truncateLabel(formatCategoryLabel(value), 22)}
            />
          </PieChart>
        ) : (
          <ScatterChart margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} {...xAxisProps} />
            <YAxis
              dataKey={yKeys[0]}
              tick={(p: any) => <YAxisTick {...p} dataKey={yKeys[0]} />}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<CustomTooltip xKey={xKey} />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={processedData} name={humanizeFieldName(yKeys[0])} fill={COLORS[0]} />
          </ScatterChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

