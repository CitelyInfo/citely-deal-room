import type { CaseFile, RoomState } from './types';

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
