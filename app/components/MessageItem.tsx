'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThoughtBlock, getThoughtParts } from './ThoughtBlock';
import { ChartRenderer } from './ChartRenderer';

const MessageItem = memo(({ message, isLast, isBusy }: { message: any; isLast: boolean; isBusy: boolean }) => {
  const isLive = isLast && message.role === 'assistant' && isBusy;
  const { reasoning, tools } = getThoughtParts(message);
  const textPart = message.parts?.find((p: any) => p.type === 'text');
  const hasText = textPart && 'text' in textPart && textPart.text.trim();

  const toolData = message.metadata?.toolData as any[] | undefined;
  const chartPartsFromMetadata = toolData?.filter(
    (t: any) => t.toolName === 'renderChart' && t.result
  ).map((t: any) => ({ type: 'tool-renderChart', output: t.result })) ?? [];
  const chartPartsFromParts = message.parts?.filter(
    (p: any) => p.type === 'tool-renderChart' && p.output
  ) ?? [];
  const chartPartsFromTools = tools
    .filter((t: any) => t.name === 'renderChart' && t.output)
    .map((t: any) => ({ type: 'tool-renderChart', output: t.output })) ?? [];
  const chartParts = chartPartsFromParts.length > 0 ? chartPartsFromParts :
                     chartPartsFromTools.length > 0 ? chartPartsFromTools :
                     chartPartsFromMetadata;

  return (
    <div
      className={`mb-6 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] ${
          message.role === 'user'
            ? 'rounded-3xl bg-primary px-5 py-4 text-primary-foreground shadow-sm'
            : 'w-full'
        }`}
      >
        {message.role === 'assistant' && (
          <ThoughtBlock reasoning={reasoning} tools={tools} live={isLive} />
        )}

        {message.role === 'assistant' &&
          chartParts.map((p: any, i: number) => (
            <ChartRenderer key={`${message.id}-chart-${i}`} spec={p.output} />
          ))}

        {message.role === 'assistant' && hasText && (
          <div className="rounded-3xl border bg-card px-5 py-4 shadow-sm">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border-collapse border border-border">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                  tbody: ({ children }) => <tbody>{children}</tbody>,
                  tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
                  th: ({ children }) => (
                    <th className="px-4 py-2 text-left font-semibold text-sm">{children}</th>
                  ),
                  td: ({ children }) => <td className="px-4 py-2 text-sm">{children}</td>,
                  code: ({ children, className }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4">
                        <code className={className}>{children}</code>
                      </pre>
                    ) : (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {textPart.text}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {message.role === 'user' &&
          message.parts?.map((part: any, index: number) =>
            part.type === 'text' ? (
              <p key={index} className="whitespace-pre-wrap leading-7">
                {part.text}
              </p>
            ) : null
          )}
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
