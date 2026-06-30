export const handleChatFinish = async (response: any, reasoningLevel?: string) => {
  if (response.message.role !== 'assistant') return;

  const textPart = response.message.parts.find((p: any) => p.type === 'text');
  const content = textPart && 'text' in textPart ? textPart.text : '';
  if (!content.trim()) return;

  const toolParts = response.message.parts.filter((p: any) => p.type && p.type.startsWith('tool-'));
  const toolData: any[] = toolParts.map((toolPart: any) => ({
    toolName: toolPart.type.replace('tool-', ''),
    args: toolPart.input,
    result: toolPart.output,
  }));

  const reasoningPart = response.message.parts.find((p: any) => p.type === 'reasoning') as any;
  const reasoning = reasoningPart?.text || null;

  try {
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'assistant',
        content,
        tool_data: toolData.length > 0 ? toolData : undefined,
        metadata: reasoning ? { reasoning, reasoningLevel } : undefined,
      }),
    });
  } catch (error) {
    console.error('Failed to save assistant message:', error);
  }
};
