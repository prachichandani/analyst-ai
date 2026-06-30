'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';

function getThoughtParts(message: any) {
  if (!message?.parts && !message?.metadata) return { reasoning: '', tools: [] as any[] };

  const reasoningPart = message.parts?.find((p: any) => p.type === 'reasoning');
  const reasoningFromParts = reasoningPart && 'text' in reasoningPart ? reasoningPart.text : '';
  const reasoningFromMetadata = message.metadata?.reasoning || '';
  const reasoning = reasoningFromParts || reasoningFromMetadata;

  const toolsFromParts = message.parts
    ?.filter((p: any) => p.type && p.type.startsWith('tool-'))
    .map((p: any) => ({
      name: p.type.replace('tool-', ''),
      input: p.input,
      output: p.output,
      state: p.state,
    })) || [];

  const toolsFromMetadata = (message.metadata?.toolData as any[])?.map((t: any) => ({
    name: t.toolName,
    input: t.args,
    output: t.result,
    state: 'output-available',
  })) || [];

  const tools = toolsFromParts.length > 0 ? toolsFromParts : toolsFromMetadata;

  return { reasoning, tools };
}

interface ThoughtBlockProps {
  reasoning: string;
  tools: any[];
  live: boolean;
}

export function ThoughtBlock({ reasoning, tools, live }: ThoughtBlockProps) {
  const [userOpen, setUserOpen] = useState(false);
  const open = live || userOpen;

  if (!reasoning && tools.length === 0) return null;

  const toolNames = tools.map((t) => t.name);
  const summary = live
    ? tools.length > 0
      ? `Calling ${tools[tools.length - 1].name}...`
      : 'Thinking...'
    : `Thought process${tools.length ? ` · ${tools.length} tool call${tools.length > 1 ? 's' : ''}` : ''}`;

  return (
    <div className="mb-3 text-sm">
      <button
        type="button"
        onClick={() => setUserOpen((o) => !o)}
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
        <div className="mt-2 pl-6 space-y-2">
          {tools.map((tool, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-green-500">✓</span>
              <span className="font-mono text-xs">{tool.name}</span>
            </div>
          ))}
          {reasoning && (
            <div className="whitespace-pre-wrap text-muted-foreground pt-2">{reasoning}</div>
          )}
        </div>
      )}
    </div>
  );
}

export { getThoughtParts };
