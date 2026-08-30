import { describe, it, expect } from 'vitest';
import { computeBlockers, blockerDiff } from '../src/engine/rules';
import { loadCase } from '../src/engine/persist';
import schema from '../config/room-schema.json';
import caseFile from '../config/case-northstar.json';
import type { RoomSchema, CaseFile } from '../src/engine/types';

const S = schema as RoomSchema;
const fresh = () => loadCase(caseFile as CaseFile);

describe('computeBlockers', () => {
  it('opens b1 while m1 is not provided, closes when provided', () => {
    const st = fresh();
    expect(computeBlockers(S, st).find(b => b.id === 'b1')!.open).toBe(true);
    st.materials.find(m => m.id === 'm1')!.state = 'provided';
    expect(computeBlockers(S, st).find(b => b.id === 'b1')!.open).toBe(false);
  });
  it('b3 stays open if any of m4/m5 is missing', () => {
    const st = fresh();
    st.materials.find(m => m.id === 'm4')!.state = 'provided';
    expect(computeBlockers(S, st).find(b => b.id === 'b3')!.open).toBe(true);
    st.materials.find(m => m.id === 'm5')!.state = 'provided';
    expect(computeBlockers(S, st).find(b => b.id === 'b3')!.open).toBe(false);
  });
  it('b5 (all_of) closes when either leg is satisfied', () => {
    const st = fresh();
    expect(computeBlockers(S, st).find(b => b.id === 'b5')!.open).toBe(true);
    st.facts.find(f => f.id === 'f1')!.status = 'confirmed';
    expect(computeBlockers(S, st).find(b => b.id === 'b5')!.open).toBe(false);
  });
  it('b6 opens on unsure fact and closes on confirmed', () => {
    const st = fresh();
    expect(computeBlockers(S, st).find(b => b.id === 'b6')!.open).toBe(true);
    st.facts.find(f => f.id === 'f3')!.status = 'confirmed';
    expect(computeBlockers(S, st).find(b => b.id === 'b6')!.open).toBe(false);
  });
  it('is sorted by door', () => {
    const doors = computeBlockers(S, fresh()).map(b => b.door);
    expect(doors).toEqual([...doors].sort());
  });
  it('blockerDiff lists ids whose open flag changed', () => {
    const a = computeBlockers(S, fresh());
    const st = fresh(); st.materials.find(m => m.id === 'm1')!.state = 'provided';
    expect(blockerDiff(a, computeBlockers(S, st))).toEqual(['b1']);
  });
});
