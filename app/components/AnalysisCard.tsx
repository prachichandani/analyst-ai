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
  high:   { label: 'High confidence',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medium: { label: 'Medium confidence', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  low:    { label: 'Low confidence',    className: 'bg-red-50 text-red-700 border-red-200' },
};


export function AnalysisCard({ data, onFollowUp }: { data: AnalysisData; onFollowUp: (q: string) => void }) {
    const confidence = CONFIDENCE_STYLES[data.confidence] ?? CONFIDENCE_STYLES.medium;
  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      <p className="text-sm font-medium leading-relaxed text-foreground">
        {data.executiveSummary}
      </p>

      <div className="flex items-center justify-end">
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${confidence.className}`}>
          {confidence.label}
        </span>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Key Insights
        </h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {(data.keyInsights ?? []).map((insight, i) => (
            <div key={i} className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-foreground">{insight.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{insight.body}</p>
            </div>
          ))}
        </div>
      </div>

      {data.anomalies && data.anomalies.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
            Anomalies
          </h4>
          <div className="space-y-1.5">
            {(data.anomalies ?? []).map((a, i) => (
              <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs">
                <span className="font-semibold">{a.label}:</span> {a.body}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recommendations && data.recommendations.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recommendations
          </h4>
          <ul className="space-y-1 text-xs text-foreground">
            {(data.recommendations ?? []).map((r, i) => <li key={i}>→ {r}</li>)}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {(data.followUpQuestions ?? []).map((q, i) => (
          <button
            key={i}
            onClick={() => onFollowUp(q)}
            className="rounded-full border px-3 py-1.5 text-xs transition hover:bg-muted"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}