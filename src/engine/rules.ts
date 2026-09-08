import type { Blocker, Condition, RoomSchema, RoomState } from './types';

export function evalCondition(cond: Condition, state: RoomState): boolean {
  if ('any_material_not' in cond) {
    const { ids, state: want } = cond.any_material_not;
    return ids.some(id => state.materials.find(m => m.id === id)?.state !== want);
  }
  if ('fact_status_in' in cond) {
    const { ids, statuses } = cond.fact_status_in;
    return ids.some(id => {
      const f = state.facts.find(x => x.id === id);
      // Missing facts must not silently clear a requirement (e.g. older room data).
      return f === undefined || statuses.includes(f.status);
    });
  }
  if ('any_of' in cond) return cond.any_of.some(c => evalCondition(c, state));
  return cond.all_of.every(c => evalCondition(c, state));
}

export function computeBlockers(schema: RoomSchema, state: RoomState): Blocker[] {
  return schema.blockers
    .map(rule => ({ id: rule.id, door: rule.door, title: rule.title, mitigation: rule.mitigation, open: evalCondition(rule.open_when, state) }))
    .sort((a, b) => a.door - b.door);
}

export function blockerDiff(before: Blocker[], after: Blocker[]): string[] {
  const prev = new Map(before.map(b => [b.id, b.open]));
  return after.filter(b => prev.get(b.id) !== b.open).map(b => b.id);
}
