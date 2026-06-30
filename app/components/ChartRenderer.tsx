'use client';

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7'];

export function ChartRenderer({ spec }: { spec: any }) {
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

  if (chartType === 'table') {
    return (
      <div className="my-4 rounded-xl border bg-card p-4">
        <h4 className="mb-3 font-semibold">{title}</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>{Object.keys(data[0] || {}).map((k) => <th key={k} className="px-3 py-2 text-left">{k}</th>)}</tr>
            </thead>
            <tbody>
              {data.map((row: any, i: number) => (
                <tr key={i} className="border-t">
                  {Object.values(row).map((v: any, j) => <td key={j} className="px-3 py-2">{String(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl border bg-card p-4">
      <h4 className="mb-1 font-semibold">{title}</h4>
      {description && <p className="mb-3 text-sm text-muted-foreground">{description}</p>}
      <ResponsiveContainer width="100%" height={300}>
        {chartType === 'bar' ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((k: string, i: number) => <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} />)}
          </BarChart>
        ) : chartType === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((k: string, i: number) => (
              <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} />
            ))}
          </LineChart>
        ) : chartType === 'area' ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            {yKeys.map((k: string, i: number) => (
              <Area key={k} type="monotone" dataKey={k} fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} />
            ))}
          </AreaChart>
        ) : chartType === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey={yKeys[0]} nameKey={xKey} outerRadius={100} label>
              {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        ) : (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis dataKey={yKeys[0]} />
            <Tooltip />
            <Scatter data={data} fill={COLORS[0]} />
          </ScatterChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}