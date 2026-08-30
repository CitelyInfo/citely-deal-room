import { describe, it, expect, beforeEach } from 'vitest';
import { loadCase, toPersisted, fromPersisted, saveToStorage, loadFromStorage, clearStorage } from '../src/engine/persist';
import { Store } from '../src/engine/store';
import { setMaterialState, confirmFact, setHardStop } from '../src/engine/actions';
import { STORAGE_KEY } from '../src/engine/constants';
import schema from '../config/room-schema.json';
import caseFile from '../config/case-northstar.json';
import type { RoomSchema, CaseFile } from '../src/engine/types';

const S = schema as RoomSchema;
const fresh = () => loadCase(caseFile as CaseFile);
const ev = { summary: 'x', source_kind: 'docs' as const, location: 'y', at: 'z' };
const sig = { by: 'A', at: 't', basis: 'b' };

beforeEach(() => localStorage.clear());

describe('persistence', () => {
  it('round-trips states/confirmations/hardStop but never evidence', () => {
    let s = setMaterialState(fresh(), 'm4', 'nonexistent', { evidence: ev });
    s = confirmFact(s, 'f1', sig);
    s = setHardStop(s, true);
    const p = toPersisted(s);
    expect(JSON.stringify(p)).not.toContain('"agentEvidence"');
    const r = fromPersisted(fresh(), p);
    expect(r.materials.find(m => m.id === 'm4')!.state).toBe('nonexistent');
    expect(r.materials.find(m => m.id === 'm4')!.agentEvidence).toBeUndefined();
    expect(r.facts.find(f => f.id === 'f1')).toMatchObject({ status: 'confirmed', confirmation: sig });
    expect(r.hardStop).toBe(true);
  });
  it('save/load/clear via localStorage', () => {
    saveToStorage(setHardStop(fresh(), true));
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    expect(loadFromStorage(fresh()).hardStop).toBe(true);
    clearStorage();
    expect(loadFromStorage(fresh()).hardStop).toBe(false);
  });
  it('ignores corrupt storage', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadFromStorage(fresh()).hardStop).toBe(false);
  });
});

describe('Store', () => {
  it('reports blockersChanged and notifies subscribers and persists', () => {
    const saved: string[] = [];
    const store = new Store(S, fresh(), s => saved.push(String(s.hardStop)));
    let seen = 0; store.subscribe(() => seen++);
    const { blockersChanged } = store.update(s => setMaterialState(s, 'm1', 'provided', { confirmation: sig }));
    expect(blockersChanged).toEqual(['b1']);
    expect(seen).toBe(1);
    expect(saved).toHaveLength(1);
    expect(store.blockers().find(b => b.id === 'b1')!.open).toBe(false);
  });
});
