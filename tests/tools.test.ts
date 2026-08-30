import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTools, type ToolDef } from '../src/webmcp/tools';
import { Store } from '../src/engine/store';
import { loadCase } from '../src/engine/persist';
import { setHardStop, setMaterialState, confirmFact, freezeBrief } from '../src/engine/actions';
import { DISCLAIMER, NOTE_TO_AGENT } from '../src/engine/constants';
import schema from '../config/room-schema.json';
import caseFile from '../config/case-northstar.json';
import type { RoomSchema, CaseFile } from '../src/engine/types';
import * as fs from 'node:fs';
import * as path from 'node:path';

const S = schema as RoomSchema;
const ev = { summary: 'agreement exists; no IP assignment clause found', source_kind: 'docs', location: '~/Desktop/operator-agreement-v2.pdf p.3' };
const sig = { by: 'Dana Whitfield', at: '2026-08-30T00:00:00Z', basis: 'Signature log' };

let store: Store; let tools: Record<string, ToolDef>;
beforeEach(() => {
  store = new Store(S, loadCase(caseFile as CaseFile));
  tools = Object.fromEntries(createTools(store, () => '2026-08-30T00:00:00Z').map(t => [t.name, t]));
});

describe('tool surface', () => {
  it('exposes exactly five tools with the required names', () => {
    expect(Object.keys(tools).sort()).toEqual(['dealroom_get_blockers', 'dealroom_get_brief', 'dealroom_get_room', 'dealroom_propose_fact_evidence', 'dealroom_propose_material']);
  });
  it('propose_material schema enum is exactly pending|nonexistent', () => {
    const schema = tools.dealroom_propose_material!.inputSchema as { properties: { state: { enum: string[] } }; additionalProperties: boolean };
    expect(schema.properties.state.enum).toEqual(['pending', 'nonexistent']);
    expect(schema.additionalProperties).toBe(false);
  });
});

describe('happy path', () => {
  it('propose_material updates state, attaches evidence, reports blockers_changed', async () => {
    const r = await tools.dealroom_propose_material!.execute({ material_id: 'm4', state: 'nonexistent', evidence: ev });
    expect(r.ok).toBe(true);
    expect(store.state.materials.find(m => m.id === 'm4')).toMatchObject({ state: 'nonexistent', confirmedByHuman: false, agentEvidence: { ...ev, at: '2026-08-30T00:00:00Z' } });
    expect(r.blockers_changed).toEqual([]); // b3 already open
    const r2 = await tools.dealroom_propose_material!.execute({ material_id: 'm1', state: 'pending', evidence: { ...ev, source_kind: 'code', location: 'pipeline/lineage.py:12' } });
    expect(r2.ok).toBe(true);
  });
  it('propose_fact_evidence attaches evidence without changing status', async () => {
    const r = await tools.dealroom_propose_fact_evidence!.execute({ fact_id: 'f1', evidence: ev });
    expect(r.ok).toBe(true);
    expect(store.state.facts.find(f => f.id === 'f1')).toMatchObject({ status: 'pending', agentEvidence: { ...ev, at: '2026-08-30T00:00:00Z' } });
  });
  it('get_room / get_blockers / get_brief read', async () => {
    const room = await tools.dealroom_get_room!.execute({});
    expect(room.ok).toBe(true);
    expect((room.materials as unknown[]).length).toBe(12);
    const bl = await tools.dealroom_get_blockers!.execute({});
    expect((bl.blockers as { open: boolean }[]).filter(b => b.open).length).toBeGreaterThan(0);
    const none = await tools.dealroom_get_brief!.execute({});
    expect(none.ok).toBe(true); expect(none.briefs).toEqual([]);
    store.update(s => freezeBrief(s, store.blockers(), '2026-08-30T01:00:00Z'));
    const one = await tools.dealroom_get_brief!.execute({ version: 1 });
    expect((one.brief as { version: number }).version).toBe(1);
    const missing = await tools.dealroom_get_brief!.execute({ version: 9 });
    expect(missing.ok).toBe(false);
  });
});

describe('D1 — provided is refused', () => {
  it('rejects with INVALID_INPUT explaining confirmation is human', async () => {
    const r = await tools.dealroom_propose_material!.execute({ material_id: 'm1', state: 'provided', evidence: ev });
    expect(r.ok).toBe(false);
    expect(r.error).toMatchObject({ code: 'INVALID_INPUT' });
    expect((r.error as { message: string }).message).toMatch(/human|client/i);
    expect(store.state.materials.find(m => m.id === 'm1')!.state).toBe('pending');
  });
});

describe('D2 — hard stop', () => {
  beforeEach(() => store.update(s => setHardStop(s, true)));
  it('refuses both propose tools with HARD_STOP; get tools still read', async () => {
    const a = await tools.dealroom_propose_material!.execute({ material_id: 'm4', state: 'nonexistent', evidence: ev });
    const b = await tools.dealroom_propose_fact_evidence!.execute({ fact_id: 'f1', evidence: ev });
    for (const r of [a, b]) { expect(r.ok).toBe(false); expect(r.room_status).toBe('hard_stop'); expect(r.error).toMatchObject({ code: 'HARD_STOP' }); }
    expect((await tools.dealroom_get_room!.execute({})).ok).toBe(true);
    expect((await tools.dealroom_get_blockers!.execute({})).ok).toBe(true);
    expect(store.state.materials.find(m => m.id === 'm4')!.agentEvidence).toBeUndefined();
  });
  it('guard ordering: hard stop wins over invalid input', async () => {
    const r = await tools.dealroom_propose_material!.execute({ material_id: 'm1', state: 'provided', evidence: ev });
    expect(r.ok).toBe(false);
    expect(r.error).toMatchObject({ code: 'HARD_STOP' });
  });
});

describe('D3 — disclaimer verbatim on every response', () => {
  it('all five tools, success and failure', async () => {
    const calls: Promise<Record<string, unknown>>[] = [
      tools.dealroom_get_room!.execute({}),
      tools.dealroom_get_blockers!.execute({}),
      tools.dealroom_get_brief!.execute({}),
      tools.dealroom_propose_material!.execute({ material_id: 'm4', state: 'nonexistent', evidence: ev }),
      tools.dealroom_propose_material!.execute({ material_id: 'm4', state: 'provided', evidence: ev }),
      tools.dealroom_propose_fact_evidence!.execute({ fact_id: 'f1', evidence: ev }),
      tools.dealroom_propose_fact_evidence!.execute('garbage'),
    ];
    for (const r of await Promise.all(calls)) {
      expect(r.disclaimer).toBe(DISCLAIMER);
      expect(r.note_to_agent).toBe(NOTE_TO_AGENT);
      expect(['open', 'hard_stop']).toContain(r.room_status);
    }
  });
});

describe('D4 — zero network', () => {
  const originalFetch = globalThis.fetch; const originalXHR = globalThis.XMLHttpRequest;
  beforeEach(() => {
    globalThis.fetch = (() => { throw new Error('network call attempted'); }) as typeof fetch;
    globalThis.XMLHttpRequest = class { constructor() { throw new Error('network call attempted'); } } as unknown as typeof XMLHttpRequest;
  });
  afterEach(() => { globalThis.fetch = originalFetch; globalThis.XMLHttpRequest = originalXHR; });
  it('full round trip makes no network call', async () => {
    const r1 = await tools.dealroom_get_room!.execute({});
    const r2 = await tools.dealroom_propose_material!.execute({ material_id: 'm5', state: 'nonexistent', evidence: ev });
    const r3 = await tools.dealroom_propose_fact_evidence!.execute({ fact_id: 'f4', evidence: ev });
    const r4 = await tools.dealroom_get_blockers!.execute({});
    const r5 = await tools.dealroom_get_brief!.execute({});
    for (const r of [r1, r2, r3, r4, r5]) expect(r.ok).toBe(true);
  });
});

describe('D4 — static assertion: no network-shaped identifiers in src/', () => {
  const NETWORK_PATTERN = /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|EventSource|navigator\.sendBeacon)\b|new Image\(|import\(/;
  const srcDir = path.resolve(process.cwd(), 'src');

  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full));
      else out.push(full);
    }
    return out;
  }

  it('no file under src/ references fetch/XHR/WebSocket/etc.', () => {
    const offenders: string[] = [];
    for (const file of walk(srcDir)) {
      const contents = fs.readFileSync(file, 'utf8');
      if (NETWORK_PATTERN.test(contents)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

describe('D6 — human confirmation cannot be overridden', () => {
  it('material confirmed by human', async () => {
    store.update(s => setMaterialState(s, 'm1', 'provided', { confirmation: sig }));
    const r = await tools.dealroom_propose_material!.execute({ material_id: 'm1', state: 'pending', evidence: ev });
    expect(r.ok).toBe(false); expect(r.error).toMatchObject({ code: 'HUMAN_CONFIRMED' });
    expect(store.state.materials.find(m => m.id === 'm1')!.state).toBe('provided');
  });
  it('fact confirmed by human', async () => {
    store.update(s => confirmFact(s, 'f1', sig));
    const r = await tools.dealroom_propose_fact_evidence!.execute({ fact_id: 'f1', evidence: ev });
    expect(r.ok).toBe(false); expect(r.error).toMatchObject({ code: 'HUMAN_CONFIRMED' });
    expect(store.state.facts.find(f => f.id === 'f1')!.agentEvidence).toBeUndefined();
  });
});

describe('execute error boundary — a throwing subscriber does not crash the tool response', () => {
  it('propose_material still returns a well-formed response, and the state change is not lost', async () => {
    store.subscribe(() => { throw new Error('listener boom'); });
    const r = await tools.dealroom_propose_material!.execute({ material_id: 'm4', state: 'nonexistent', evidence: ev });
    expect(r.ok).toBe(false);
    expect(r.error).toMatchObject({ code: 'INTERNAL' });
    expect(r.disclaimer).toBe(DISCLAIMER);
    expect(r.note_to_agent).toBe(NOTE_TO_AGENT);
    expect(['open', 'hard_stop']).toContain(r.room_status);
    expect(store.state.materials.find(m => m.id === 'm4')!.state).toBe('nonexistent');
  });
});
