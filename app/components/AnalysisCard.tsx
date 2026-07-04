// components/AnalysisCard.tsx
'use client';

interface AnalysisData {
  executiveSummary: string;
  confidence: 'low' | 'medium' | 'high';
  keyInsights: { label: string; body: string }[];
  anomalies?: { label: string; body: string; severity?: 'low' | 'medium' | 'high' }[];
  recommendations?: string[];
  followUpQuestions: string[];
}

const CONFIDENCE_STYLES = {
  high:   { label: 'High confidence',   className: 'bg-success/10 text-success' },
  medium: { label: 'Medium confidence', className: 'bg-warning/10 text-warning' },
  low:    { label: 'Low confidence',    className: 'bg-destructive/10 text-destructive' },
};

export function AnalysisCard({ data, onFollowUp }: { data: AnalysisData; onFollowUp: (q: string) => void }) {
  const confidence = CONFIDENCE_STYLES[data.confidence] ?? CONFIDENCE_STYLES.medium;

  return (
    <div className="space-y-4 rounded-2xl bg-card/30 p-5 font-sans">
      <div className="space-y-2">
        <p className="text-base font-normal leading-relaxed text-foreground">
          {data.executiveSummary}
        </p>

        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${confidence.className}`}
        >
          {confidence.label}
        </span>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Key insights</h4>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {(data.keyInsights ?? []).map((insight, i) => (
            <div key={i}>
              <p className="text-sm font-semibold text-foreground">{insight.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{insight.body}</p>
            </div>
          ))}
        </div>
      </div>

      {data.anomalies && data.anomalies.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold text-warning">Anomalies</h4>
          <div className="space-y-1.5">
            {(data.anomalies ?? []).map((a, i) => (
              <div key={i} className="rounded-lg bg-warning/10 p-2.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                    {a.severity ? `${a.severity} severity` : 'Anomaly'}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{a.label}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recommendations && data.recommendations.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Recommendations</h4>
          <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
            {(data.recommendations ?? []).map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 text-muted-foreground">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {(data.followUpQuestions ?? []).map((q, i) => (
          <button
            key={i}
            onClick={() => onFollowUp(q.trim())}
            className="rounded-full border border-border/70 bg-muted/55 px-3 py-1.5 text-sm transition hover:bg-muted/70"
          >
            {q.trim()}
          </button>
        ))}
      </div>
    </div>
  );
}