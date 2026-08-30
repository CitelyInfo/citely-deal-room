import type { Blocker, Confirmation, Evidence, FactStatus, MaterialState, RoomState } from './types';

const mapById = <T extends { id: string }>(xs: T[], id: string, f: (x: T) => T) => xs.map(x => (x.id === id ? f(x) : x));

export function setMaterialState(
  s: RoomState, id: string, state: MaterialState,
  opts: { confirmation?: Confirmation; evidence?: Evidence },
): RoomState {
  return { ...s, materials: mapById(s.materials, id, m => ({
    ...m, state,
    confirmedByHuman: opts.confirmation !== undefined,
    confirmation: opts.confirmation,
    agentEvidence: opts.evidence ?? m.agentEvidence,
  })) };
}

export function attachFactEvidence(s: RoomState, id: string, evidence: Evidence): RoomState {
  return { ...s, facts: mapById(s.facts, id, f => ({ ...f, agentEvidence: evidence })) };
}

export function confirmFact(s: RoomState, id: string, confirmation: Confirmation): RoomState {
  return { ...s, facts: mapById(s.facts, id, f => ({ ...f, status: 'confirmed', confirmation })) };
}

export function setFactStatus(s: RoomState, id: string, status: Exclude<FactStatus, 'confirmed'>): RoomState {
  return { ...s, facts: mapById(s.facts, id, f => ({ ...f, status, confirmation: undefined })) };
}

export function setHardStop(s: RoomState, on: boolean): RoomState {
  return { ...s, hardStop: on };
}

export function toggleAction(s: RoomState, id: string, doneNote?: string): RoomState {
  return { ...s, actions: mapById(s.actions, id, a =>
    a.status === 'done' ? { ...a, status: 'open', doneNote: undefined } : { ...a, status: 'done', doneNote }) };
}

export function freezeBrief(s: RoomState, blockers: Blocker[], now: string): RoomState {
  const strip = <T extends { agentEvidence?: Evidence }>(x: T): T => { const { agentEvidence: _e, ...rest } = x; return rest as T; };
  const snapshot = structuredClone({
    event: s.event, materials: s.materials.map(strip), facts: s.facts.map(strip),
    actions: s.actions, escalations: s.escalations, hardStop: s.hardStop, blockers,
  });
  return { ...s, briefs: [...s.briefs, { version: s.briefs.length + 1, at: now, snapshot }] };
}
