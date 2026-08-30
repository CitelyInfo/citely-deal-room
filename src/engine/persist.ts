import { STORAGE_KEY } from './constants';
import type { Brief, CaseFile, Confirmation, FactStatus, MaterialState, RoomState } from './types';

export function loadCase(c: CaseFile): RoomState {
  return {
    event: structuredClone(c.event),
    materials: c.materials.map(m => ({ ...structuredClone(m), confirmedByHuman: m.state === 'provided' })),
    facts: c.facts.map(f => structuredClone(f)),
    actions: c.actions.map(a => structuredClone(a)),
    escalations: c.escalations.map(e => structuredClone(e)),
    hardStop: false,
    briefs: [],
  };
}

export interface Persisted {
  v: 1;
  materials: Record<string, { state: MaterialState; confirmedByHuman: boolean; confirmation?: Confirmation }>;
  facts: Record<string, { status: FactStatus; confirmation?: Confirmation }>;
  actions: Record<string, { status: 'open' | 'done'; doneNote?: string }>;
  hardStop: boolean;
  briefs: Brief[];
}

export function toPersisted(s: RoomState): Persisted {
  return {
    v: 1,
    materials: Object.fromEntries(s.materials.map(m => [m.id, { state: m.state, confirmedByHuman: m.confirmedByHuman, confirmation: m.confirmation }])),
    facts: Object.fromEntries(s.facts.map(f => [f.id, { status: f.status, confirmation: f.confirmation }])),
    actions: Object.fromEntries(s.actions.map(a => [a.id, { status: a.status, doneNote: a.doneNote }])),
    hardStop: s.hardStop,
    briefs: s.briefs,
  };
}

export function fromPersisted(base: RoomState, p: Persisted): RoomState {
  return {
    ...base,
    materials: base.materials.map(m => (p.materials[m.id] ? { ...m, ...p.materials[m.id] } : m)),
    facts: base.facts.map(f => (p.facts[f.id] ? { ...f, ...p.facts[f.id] } : f)),
    actions: base.actions.map(a => (p.actions[a.id] ? { ...a, ...p.actions[a.id] } : a)),
    hardStop: p.hardStop,
    briefs: p.briefs ?? [],
  };
}

export function saveToStorage(s: RoomState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersisted(s))); } catch { /* storage unavailable: demo still works in memory */ }
}

export function loadFromStorage(base: RoomState): RoomState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw) as Persisted;
    if (p?.v !== 1) return base;
    return fromPersisted(base, p);
  } catch { return base; }
}

export function clearStorage(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
