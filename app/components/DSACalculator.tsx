// components/DCACalculator.tsx
'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FREQUENCY_PER_YEAR: Record<string, number> = {
  weekly: 52,
  'twice-weekly': 104,
  monthly: 12,
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  'twice-weekly': 'Twice a week',
  monthly: 'Monthly',
};

interface DCAProps {
  title: string;
  keyInsight: string;
  defaults: {
    amount: number;
    frequency?: string;
    annualReturnPct: number;
    years: number;
  };
}

export function DCACalculator({ title, keyInsight, defaults }: DCAProps) {
  const [amount, setAmount] = useState(defaults.amount);
  const [frequency, setFrequency] = useState(defaults.frequency ?? 'twice-weekly');
  const [annualReturn, setAnnualReturn] = useState(defaults.annualReturnPct);
  const [years, setYears] = useState(defaults.years);

  const frequencies = Object.keys(FREQUENCY_PER_YEAR);
  const freqIndex = frequencies.indexOf(frequency);

  const { chartData, totalValue, totalProfit } = useMemo(() => {
    const periodsPerYear = FREQUENCY_PER_YEAR[frequency];
    const ratePerPeriod = annualReturn / 100 / periodsPerYear;
    const totalPeriods = periodsPerYear * years;

    const data: { year: number; principal: number; totalValue: number }[] = [];
    let value = 0;
    let principal = 0;

    for (let p = 0; p <= totalPeriods; p++) {
      value = value * (1 + ratePerPeriod) + amount;
      principal += amount;

      if (p % periodsPerYear === 0) {
        data.push({ year: p / periodsPerYear, principal, totalValue: value });
      }
    }

    return {
      chartData: data,
      totalValue: value,
      totalProfit: value - principal,
    };
  }, [amount, frequency, annualReturn, years]);

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="my-4 rounded-xl border border-border bg-card p-5">
      <h4 className="font-semibold text-foreground mb-1">{title}</h4>

      <div className="mt-4 h-64">
        <AreaChart width={480} height={256} data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="dca-principal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--muted-foreground)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--muted-foreground)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
          <YAxis
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(v) => typeof v === 'number' ? fmt(v) : ''}
            contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          />
          <Area type="monotone" dataKey="principal" stroke="var(--muted-foreground)" strokeDasharray="4 3" fill="url(#dca-principal)" name="Principal" />
          <Line type="monotone" dataKey="totalValue" stroke="var(--primary)" strokeWidth={2.5} dot={false} name="Total value" />
        </AreaChart>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-y border-border py-4">
        <div>
          <p className="text-xs text-muted-foreground">Total value</p>
          <p className="mt-1 font-mono text-lg text-foreground">{fmt(totalValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total profit</p>
          <p className="mt-1 font-mono text-lg text-success">{fmt(totalProfit)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-muted-foreground w-28 shrink-0">Amount ($)</label>
          <input
            type="range" min={5} max={500} step={5}
            value={amount} onChange={(e) => setAmount(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="w-14 shrink-0 rounded-md bg-muted px-2 py-1 text-center font-mono text-sm">{amount}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-muted-foreground w-28 shrink-0">Frequency</label>
          <div className="flex flex-1 items-center justify-between rounded-lg bg-muted px-2 py-1.5">
            <button onClick={() => setFrequency(frequencies[Math.max(0, freqIndex - 1)])} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-sm">{FREQUENCY_LABELS[frequency]}</span>
            <button onClick={() => setFrequency(frequencies[Math.min(frequencies.length - 1, freqIndex + 1)])} className="text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-muted-foreground w-28 shrink-0">Annual return (%)</label>
          <input
            type="range" min={0} max={20} step={0.5}
            value={annualReturn} onChange={(e) => setAnnualReturn(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="w-14 shrink-0 rounded-md bg-muted px-2 py-1 text-center font-mono text-sm">{annualReturn}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-muted-foreground w-28 shrink-0">Years</label>
          <input
            type="range" min={1} max={30} step={1}
            value={years} onChange={(e) => setYears(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="w-14 shrink-0 rounded-md bg-muted px-2 py-1 text-center font-mono text-sm">{years}</span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Key insight: </span>
        {keyInsight}
      </p>
    </div>
  );
}