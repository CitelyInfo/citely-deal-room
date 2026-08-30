import { describe, it, expect } from 'vitest';
import { computeBlockers, blockerDiff } from '../src/engine/rules';
import { loadCase } from '../src/engine/persist';
import { setMaterialState, attachFactEvidence, confirmFact, setFactStatus, setHardStop, toggleAction, freezeBrief } from '../src/engine/actions';
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
