'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';

function getThoughtParts(message: any) {
  if (!message?.parts) return { reasoning: '', tools: [] as any[] };

  const reasoningPart = message.parts.find((p: any) => p.type === 'reasoning');
  const reasoning = reasoningPart && 'text' in reasoningPart ? reasoningPart.text : '';

  const tools = message.parts
    .filter((p: any) => p.type && p.type.startsWith('tool-'))
    .map((p: any) => ({
      name: p.type.replace('tool-', ''),
      input: p.input,
      output: p.output,
      state: p.state, // 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
    }));

  return { reasoning, tools };
}

interface ThoughtBlockProps {
  reasoning: string;
  tools: any[];
  live: boolean;
}

export function ThoughtBlock({ reasoning, tools, live }: ThoughtBlockProps) {
  const [open, setOpen] = useState(false);

  // keep it open while live, collapse when done
  useEffect(() => {
    if (live) setOpen(true);
    if (!live) setOpen(false);
  }, [live]);

  if (!reasoning && tools.length === 0) return null;

  const summary = live
    ? tools.length > 0
      ? `Calling ${tools[tools.length - 1].name}...`
      : 'Thinking...'
    : `Thought process${tools.length ? ` · ${tools.length} tool call${tools.length > 1 ? 's' : ''}` : ''}`;

  return (
    <div className="mb-3 text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-left text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2">
          {live && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {summary}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-3 mt-2 pl-6">
          {reasoning && (
            <div className="whitespace-pre-wrap text-muted-foreground">{reasoning}</div>
          )}

          {tools.map((tool, i) => (
            <div key={i} className="rounded-lg border bg-background p-2">
              <div className="font-mono text-xs font-medium text-foreground">
                {tool.name}
                {tool.state && tool.state !== 'output-available' && (
                  <span className="ml-2 text-muted-foreground">({tool.state})</span>
                )}
              </div>
              {tool.input && (
                <pre className="mt-1 overflow-x-auto text-xs text-muted-foreground">
                  {typeof tool.input === 'string' ? tool.input : JSON.stringify(tool.input, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { getThoughtParts };
