import { describe, it, expect } from 'vitest';
import { computeBlockers, blockerDiff, evalCondition } from '../src/engine/rules';
import { loadCase } from '../src/engine/persist';
import { setMaterialState, attachFactEvidence, confirmFact, setFactStatus, setHardStop, toggleAction, freezeBrief } from '../src/engine/actions';
import schema from '../config/room-schema.json';
import caseFile from '../config/case-northstar.json';
import type { RoomSchema, CaseFile, MaterialState, FactStatus } from '../src/engine/types';

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
  describe.each([
    { blocker: 'b5', material: 'm2', fact: 'f1' },
    { blocker: 'b2', material: 'm9', fact: 'f5' },
  ])('$blocker requires both material and fact confirmation', ({ blocker, material, fact }) => {
    const materialStates: MaterialState[] = ['pending', 'nonexistent', 'provided'];
    const factStatuses: FactStatus[] = ['pending', 'unsure', 'confirmed'];
    it.each(materialStates.flatMap(m => factStatuses.map(f => ({ m, f }))))(
      'material=$m, fact=$f', ({ m, f }) => {
        let st = setMaterialState(fresh(), material, m, m === 'provided' ? { confirmation: sig } : {});
        st = f === 'confirmed' ? confirmFact(st, fact, sig) : setFactStatus(st, fact, f);
        expect(computeBlockers(S, st).find(b => b.id === blocker)!.open).toBe(m !== 'provided' || f !== 'confirmed');
      },
    );
    it('reopens when either prerequisite is revoked', () => {
      const closed = confirmFact(setMaterialState(fresh(), material, 'provided', { confirmation: sig }), fact, sig);
      const before = computeBlockers(S, closed);
      for (const st of [setMaterialState(closed, material, 'pending', {}), setFactStatus(closed, fact, 'unsure')]) {
        const after = computeBlockers(S, st);
        expect(after.find(b => b.id === blocker)!.open).toBe(true);
        expect(blockerDiff(before, after)).toContain(blocker);
      }
    });
    it('does not clear if the required fact is missing', () => {
      const st = setMaterialState(fresh(), material, 'provided', { confirmation: sig });
      st.facts = st.facts.filter(f => f.id !== fact);
      expect(computeBlockers(S, st).find(b => b.id === blocker)!.open).toBe(true);
    });
  });
  it('a completed negotiation task does not establish counterparty acceptance', () => {
    const st = toggleAction(setMaterialState(fresh(), 'm9', 'provided', { confirmation: sig }), 'a3');
    expect(computeBlockers(S, st).find(b => b.id === 'b2')!.open).toBe(true);
  });
  it('preserves all_of semantics alongside any_of', () => {
    const cond = { all_of: [
      { any_material_not: { ids: ['m2'], state: 'provided' as const } },
      { fact_status_in: { ids: ['f1'], statuses: ['pending' as const] } },
    ] };
    expect(evalCondition(cond, fresh())).toBe(true);
    expect(evalCondition(cond, confirmFact(fresh(), 'f1', sig))).toBe(false);
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

const ev = { summary: 'lineage logging found', source_kind: 'code' as const, location: 'pipeline/lineage.py:12', at: '2026-08-30T00:00:00Z' };
const sig = { by: 'Dana Whitfield', at: '2026-08-30T00:00:00Z', basis: 'Pipeline export' };

describe('actions', () => {
  it('setMaterialState with confirmation marks confirmedByHuman; with evidence does not', () => {
    const a = setMaterialState(fresh(), 'm1', 'provided', { confirmation: sig });
    expect(a.materials.find(m => m.id === 'm1')).toMatchObject({ state: 'provided', confirmedByHuman: true, confirmation: sig });
    const b = setMaterialState(fresh(), 'm4', 'nonexistent', { evidence: ev });
    expect(b.materials.find(m => m.id === 'm4')).toMatchObject({ state: 'nonexistent', confirmedByHuman: false, agentEvidence: ev });
  });
  it('does not mutate input', () => {
    const s = fresh(); setMaterialState(s, 'm1', 'provided', { confirmation: sig });
    expect(s.materials.find(m => m.id === 'm1')!.state).toBe('pending');
  });
  it('attachFactEvidence never changes status', () => {
    const s = attachFactEvidence(fresh(), 'f1', ev);
    expect(s.facts.find(f => f.id === 'f1')).toMatchObject({ status: 'pending', agentEvidence: ev });
  });
  it('confirmFact sets confirmed + signature; setFactStatus clears signature', () => {
    const s = confirmFact(fresh(), 'f1', sig);
    expect(s.facts.find(f => f.id === 'f1')).toMatchObject({ status: 'confirmed', confirmation: sig });
    const t = setFactStatus(s, 'f1', 'unsure');
    expect(t.facts.find(f => f.id === 'f1')!.confirmation).toBeUndefined();
  });
  it('hard stop, action toggle', () => {
    expect(setHardStop(fresh(), true).hardStop).toBe(true);
    const s = toggleAction(fresh(), 'a1', 'signed');
    expect(s.actions.find(a => a.id === 'a1')).toMatchObject({ status: 'done', doneNote: 'signed' });
    expect(toggleAction(s, 'a1').actions.find(a => a.id === 'a1')!.status).toBe('open');
  });
  it('freezeBrief snapshots without evidence and is immutable to later changes', () => {
    let s = setMaterialState(fresh(), 'm4', 'nonexistent', { evidence: ev });
    s = freezeBrief(s, computeBlockers(S, s), '2026-08-30T01:00:00Z');
    expect(s.briefs).toHaveLength(1);
    expect(s.briefs[0]!.version).toBe(1);
    expect(s.briefs[0]!.snapshot.materials.find(m => m.id === 'm4')!.agentEvidence).toBeUndefined();
    const t = setMaterialState(s, 'm4', 'pending', { evidence: ev });
    expect(t.briefs[0]!.snapshot.materials.find(m => m.id === 'm4')!.state).toBe('nonexistent');
  });
});
