import type { ToolDef } from './tools';

export interface ModelContextLike {
  registerTool(def: { name: string; description: string; inputSchema: Record<string, unknown>; execute: (input: unknown) => Promise<unknown> }): unknown;
}
declare global {
  interface Document { modelContext?: ModelContextLike }
  interface Navigator { modelContext?: ModelContextLike }
}

export function detectModelContext(): { ctx: ModelContextLike; where: 'document' | 'navigator' } | null {
  const d = document.modelContext;
  if (d && typeof d.registerTool === 'function') return { ctx: d, where: 'document' };
  const n = navigator.modelContext;
  if (n && typeof n.registerTool === 'function') return { ctx: n, where: 'navigator' };
  return null;
}

export function registerDealRoomTools(ctx: ModelContextLike, tools: ToolDef[]): number {
  let n = 0;
  for (const t of tools) {
    try {
      ctx.registerTool({ name: t.name, description: t.description, inputSchema: t.inputSchema, execute: t.execute });
      n++;
    } catch (e) {
      console.warn(`[dealroom] failed to register ${t.name}`, e);
    }
  }
  return n;
}
