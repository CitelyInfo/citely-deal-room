import { describe, it, expect, afterEach } from 'vitest';
import { detectModelContext, registerDealRoomTools } from '../src/webmcp/adapter';
import { createTools } from '../src/webmcp/tools';
import { Store } from '../src/engine/store';
import { loadCase } from '../src/engine/persist';
import schema from '../config/room-schema.json';
import caseFile from '../config/case-northstar.json';
import type { RoomSchema, CaseFile } from '../src/engine/types';

const anyDoc = document as unknown as Record<string, unknown>;
const anyNav = navigator as unknown as Record<string, unknown>;
afterEach(() => { delete anyDoc.modelContext; delete anyNav.modelContext; });

describe('adapter', () => {
  it('returns null without a runtime (W9)', () => expect(detectModelContext()).toBeNull());
  it('prefers document.modelContext, falls back to navigator', () => {
    anyNav.modelContext = { registerTool() {} };
    expect(detectModelContext()?.where).toBe('navigator');
    anyDoc.modelContext = { registerTool() {} };
    expect(detectModelContext()?.where).toBe('document');
  });
  it('registers all five tools and execute is wired to the store', async () => {
    const registered: { name: string; execute: (i: unknown) => Promise<unknown> }[] = [];
    anyDoc.modelContext = { registerTool(d: { name: string; execute: (i: unknown) => Promise<unknown> }) { registered.push(d); } };
    const store = new Store(schema as RoomSchema, loadCase(caseFile as CaseFile));
    const n = registerDealRoomTools(detectModelContext()!.ctx, createTools(store));
    expect(n).toBe(5);
    expect(registered.map(r => r.name)).toContain('dealroom_get_room');
    const r = await registered.find(r => r.name === 'dealroom_get_blockers')!.execute({}) as { ok: boolean };
    expect(r.ok).toBe(true);
  });
});
