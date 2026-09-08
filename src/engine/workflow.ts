import type { BlockerRule, Condition, RoomSchema, RoomState } from './types';
import { computeBlockers } from './rules';

export function references(condition: Condition): { materials: string[]; facts: string[] } {
  if ('any_material_not' in condition) return { materials: condition.any_material_not.ids, facts: [] };
  if ('fact_status_in' in condition) return { materials: [], facts: condition.fact_status_in.ids };
  const children = ('any_of' in condition ? condition.any_of : condition.all_of).map(references);
  return { materials: [...new Set(children.flatMap(c => c.materials))], facts: [...new Set(children.flatMap(c => c.facts))] };
}

export function relatedRules(schema: RoomSchema, kind: 'materials' | 'facts', id: string): BlockerRule[] {
  return schema.blockers.filter(b => references(b.open_when)[kind].includes(id));
}

export function reviewCount(rule: BlockerRule, state: RoomState): number {
  const refs = references(rule.open_when);
  return state.materials.filter(m => refs.materials.includes(m.id) && m.state !== 'provided' && m.agentEvidence).length
    + state.facts.filter(f => refs.facts.includes(f.id) && f.status !== 'confirmed' && f.agentEvidence).length;
}

export function nextRequirements(schema: RoomSchema, state: RoomState): BlockerRule[] {
  const open = new Set(computeBlockers(schema, state).filter(b => b.open).map(b => b.id));
  return schema.blockers.filter(b => open.has(b.id)).sort((a, b) =>
    Number(reviewCount(b, state) > 0) - Number(reviewCount(a, state) > 0) || (a.priority ?? 100) - (b.priority ?? 100));
}

export function nearestMilestone(state: RoomState, today: string): { label: string; date: string; elapsed: boolean } | undefined {
  const milestones = [...(state.event.milestones ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const milestone = milestones.find(m => m.date >= today) ?? milestones.at(-1);
  return milestone ? { ...milestone, elapsed: milestone.date < today } : undefined;
}
