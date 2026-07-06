'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Paperclip } from 'lucide-react';
import { ThoughtBlock, getThoughtParts } from './ThoughtBlock';
import { ChartRenderer } from './ChartRenderer';
import { AnalysisCard } from './AnalysisCard';
import { DCACalculator } from './DSACalculator';
import { CompoundInterestCalculator } from './CompoundInterestCalculator';

const MessageItem = memo(({ message, isLast, isBusy, onFollowUp }: {
  message: any; isLast: boolean; isBusy: boolean; onFollowUp: (q: string) => void;
}) => {
  const isLive = isLast && message.role === 'assistant' && isBusy;
  const { reasoning, tools } = getThoughtParts(message);
  const textPart = message.parts?.find((p: any) => p.type === 'text');
  const hasText = textPart && 'text' in textPart && textPart.text.trim();
  const calculatorParts = message.parts?.filter(
    (p: any) => p.type === 'tool-renderDcaCalculator' && p.output
  ) ?? [];
  const compoundInterestParts = message.parts?.filter(
    (p: any) => p.type === 'tool-renderCompoundInterestCalculator' && p.output
  ) ?? [];

  const hasPriorAssistantContent =
    Boolean(reasoning && reasoning.trim()) ||
    (tools?.length ?? 0) > 0 ||
    Boolean(hasText);

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

  const analysisFromMetadata = toolData?.filter(
    (t: any) => t.toolName === 'presentAnalysis' && t.args
  ).map((t: any) => ({ type: 'tool-presentAnalysis', input: t.args })) ?? [];
  const analysisFromParts = message.parts?.filter(
    (p: any) => p.type === 'tool-presentAnalysis' && p.input
  ) ?? [];
  const analysisFromTools = tools
    .filter((t: any) => t.name === 'presentAnalysis' && t.input)
    .map((t: any) => ({ type: 'tool-presentAnalysis', input: t.input })) ?? [];
  const analysisParts = analysisFromParts.length > 0 ? analysisFromParts :
                        analysisFromTools.length > 0 ? analysisFromTools :
                        analysisFromMetadata;
  const validAnalysisParts = analysisParts.filter(
    (p: any) =>
      p.input?.executiveSummary &&
      Array.isArray(p.input?.keyInsights) &&
      Array.isArray(p.input?.followUpQuestions)
  );

  return (
    <div className={`mb-6 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] ${
          message.role === 'user'
            ? 'rounded-3xl bg-muted px-5 py-4 text-foreground shadow-sm'
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
        {message.role === 'assistant' &&
          calculatorParts.map((p: any, i: number) => (
            <DCACalculator
              key={`${message.id}-calc-${i}`}
              title={p.output.title}
              keyInsight={p.output.keyInsight}
              defaults={p.output.defaults}
            />
          ))}
        {message.role === 'assistant' &&
          compoundInterestParts.map((p: any, i: number) => (
            <CompoundInterestCalculator
              key={`${message.id}-ci-${i}`}
              title={p.output.title}
              keyInsight={p.output.keyInsight}
              defaults={p.output.defaults}
            />
          ))}

        {message.role === 'assistant' &&
          validAnalysisParts.map((p: any, i: number) => (
            <div
              key={`${message.id}-analysis-${i}`}
              className={i === 0 ? (hasPriorAssistantContent ? 'mt-4' : '') : 'mt-4'}
            >
              <AnalysisCard data={p.input} onFollowUp={onFollowUp} />
            </div>
          ))}
        {message.role === 'assistant' && hasText && (
          <div className="rounded-3xl border border-border/60 bg-transparent px-5 py-4">
            <div className="prose max-w-none font-sans dark:prose-invert prose-p:leading-relaxed prose-p:mt-3 prose-p:mb-0 prose-ul:mt-3 prose-ul:mb-0 prose-ol:mt-3 prose-ol:mb-0 prose-a:font-medium">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  ul: ({ children }) => (
                    <ul className="my-3 space-y-2 pl-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-3 space-y-2 pl-5 list-decimal">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="flex gap-2 text-sm leading-relaxed text-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                      <span>{children}</span>
                    </li>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mt-5 mb-2 text-base font-semibold text-foreground first:mt-0">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mt-4 mb-1.5 text-sm font-semibold text-foreground">{children}</h3>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
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
                      <code className="bg-muted px-1.5 py-0.5 rounded text-[0.9rem] font-mono">
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

        {message.role === 'user' && message.metadata?.attachedFileName && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            <span className="font-mono">{message.metadata.attachedFileName}</span>
          </div>
        )}

        {message.role === 'user' &&
          message.parts?.map((part: any, index: number) =>
            part.type === 'text' ? (
              <p key={index} className="whitespace-pre-wrap leading-relaxed">
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