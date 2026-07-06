// components/CompoundInterestCalculator.tsx
'use client';

import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Line } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const COMPOUNDING_FREQUENCY: Record<string, number> = {
  annually: 1,
  quarterly: 4,
  monthly: 12,
  daily: 365,
};

const FREQUENCY_LABELS: Record<string, string> = {
  annually: 'Annually',
  quarterly: 'Quarterly',
  monthly: 'Monthly',
  daily: 'Daily',
};

interface CompoundInterestProps {
  title: string;
  keyInsight: string;
  defaults: {
    principal: number;
    annualContribution: number;
    annualReturnPct: number;
    years: number;
    compoundingFrequency?: string;
  };
}

export function CompoundInterestCalculator({ title, keyInsight, defaults }: CompoundInterestProps) {
  const [principal, setPrincipal] = useState(defaults.principal);
  const [annualContribution, setAnnualContribution] = useState(defaults.annualContribution);
  const [annualReturn, setAnnualReturn] = useState(defaults.annualReturnPct);
  const [years, setYears] = useState(defaults.years);
  const [compoundingFrequency, setCompoundingFrequency] = useState(defaults.compoundingFrequency ?? 'annually');

  const frequencies = Object.keys(COMPOUNDING_FREQUENCY);
  const freqIndex = frequencies.indexOf(compoundingFrequency);

  const { chartData, totalValue, totalInterest } = useMemo(() => {
    const n = COMPOUNDING_FREQUENCY[compoundingFrequency];
    const r = annualReturn / 100;
    const totalPeriods = n * years;

    const data: { year: number; principal: number; totalValue: number }[] = [];
    let value = principal;
    let totalPrincipal = principal;

    for (let p = 0; p <= totalPeriods; p++) {
      const contributionPerPeriod = annualContribution / n;
      value = value * (1 + r / n) + contributionPerPeriod;
      totalPrincipal += contributionPerPeriod;

      if (p % n === 0) {
        data.push({ year: p / n, principal: totalPrincipal, totalValue: value });
      }
    }

    return {
      chartData: data,
      totalValue: value,
      totalInterest: value - totalPrincipal,
    };
  }, [principal, annualContribution, annualReturn, years, compoundingFrequency]);

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="my-4 rounded-xl border border-border bg-card p-5">
      <h4 className="font-semibold text-foreground mb-1">{title}</h4>

      <div className="mt-4 h-64">
        <AreaChart width={480} height={256} data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ci-principal" x1="0" y1="0" x2="0" y2="1">
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
          <Area type="monotone" dataKey="principal" stroke="var(--muted-foreground)" strokeDasharray="4 3" fill="url(#ci-principal)" name="Principal" />
          <Line type="monotone" dataKey="totalValue" stroke="var(--primary)" strokeWidth={2.5} dot={false} name="Total value" />
        </AreaChart>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-y border-border py-4">
        <div>
          <p className="text-xs text-muted-foreground">Total value</p>
          <p className="mt-1 font-mono text-lg text-foreground">{fmt(totalValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total interest</p>
          <p className="mt-1 font-mono text-lg text-success">{fmt(totalInterest)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-muted-foreground w-28 shrink-0">Principal ($)</label>
          <input
            type="range" min={100} max={100000} step={100}
            value={principal} onChange={(e) => setPrincipal(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="w-20 shrink-0 rounded-md bg-muted px-2 py-1 text-center font-mono text-sm">{fmt(principal)}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-muted-foreground w-28 shrink-0">Annual contribution ($)</label>
          <input
            type="range" min={0} max={50000} step={100}
            value={annualContribution} onChange={(e) => setAnnualContribution(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="w-20 shrink-0 rounded-md bg-muted px-2 py-1 text-center font-mono text-sm">{fmt(annualContribution)}</span>
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
            type="range" min={1} max={50} step={1}
            value={years} onChange={(e) => setYears(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="w-14 shrink-0 rounded-md bg-muted px-2 py-1 text-center font-mono text-sm">{years}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-muted-foreground w-28 shrink-0">Compounding</label>
          <div className="flex flex-1 items-center justify-between rounded-lg bg-muted px-2 py-1.5">
            <button onClick={() => setCompoundingFrequency(frequencies[Math.max(0, freqIndex - 1)])} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-sm">{FREQUENCY_LABELS[compoundingFrequency]}</span>
            <button onClick={() => setCompoundingFrequency(frequencies[Math.min(frequencies.length - 1, freqIndex + 1)])} className="text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Key insight: </span>
        {keyInsight}
      </p>
    </div>
  );
}
