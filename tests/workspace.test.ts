import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { references, nextRequirements, nearestMilestone } from '../src/engine/workflow';
import { loadCase } from '../src/engine/persist';
import schema from '../config/room-schema.json';
import caseFile from '../config/case-northstar.json';
import type { RoomSchema, CaseFile } from '../src/engine/types';
const S = schema as RoomSchema;
const fresh = () => loadCase(caseFile as CaseFile);

it('links valid items and actions, prioritizes new evidence, and removes resolved requirements', () => {
  const state = fresh();
  for (const rule of S.blockers) {
    const refs = references(rule.open_when);
    expect(refs.materials.every(id => state.materials.some(m => m.id === id))).toBe(true);
    expect(refs.facts.every(id => state.facts.some(f => f.id === id))).toBe(true);
    expect((rule.action_ids ?? []).every(id => state.actions.some(a => a.id === id))).toBe(true);
  }
  expect(references(S.blockers.find(b => b.id === 'b5')!.open_when)).toEqual({ materials: ['m2'], facts: ['f1'] });
  expect(nextRequirements(S, state).slice(0, 3).map(b => b.id)).toEqual(['b2', 'b5', 'b3']);
  const m1 = state.materials.find(m => m.id === 'm1')!;
  m1.agentEvidence = { summary: 'Lineage export', source_kind: 'code', location: 'demo', at: '2026-09-08T00:00:00Z' };
  expect(nextRequirements(S, state)[0]!.id).toBe('b1');
  m1.state = 'provided';
  expect(nextRequirements(S, state).some(b => b.id === 'b1')).toBe(false);
});
it('selects upcoming milestones and labels passed dates honestly', () => {
  expect(nearestMilestone(fresh(), '2026-09-08')).toMatchObject({ date: '2026-09-30', elapsed: false });
  expect(nearestMilestone(fresh(), '2026-10-01')).toMatchObject({ date: '2026-10-15', elapsed: false });
  expect(nearestMilestone(fresh(), '2026-11-01')).toMatchObject({ elapsed: true });
});

describe('review workspace navigation', () => {
  beforeEach(async () => {
    vi.resetModules(); localStorage.clear();
    const root = document.createElement('div'); root.id = 'app'; document.body.replaceChildren(root);
    await import('../src/main');
  });
  afterEach(() => { document.body.replaceChildren(); localStorage.clear(); });
  const click = (text: string, root: ParentNode = document) => {
    const b = Array.from(root.querySelectorAll('button')).find(b => b.textContent === text);
    expect(b, text).toBeTruthy(); b!.click();
  };
  it('opens a priority requirement and follows its material, fact and action links', () => {
    expect(document.querySelector<HTMLDetailsElement>('#event-context')!.open).toBe(false);
    expect(document.querySelectorAll('.gate')).toHaveLength(3);
    document.querySelector<HTMLButtonElement>('.next-item')!.click();
    expect(document.querySelector('#requirement-title')?.textContent).toContain('Security questionnaire');
    expect(document.querySelectorAll('.panel tbody tr')).toHaveLength(1);
    expect(document.querySelector('#item-m9')).not.toBeNull();
    const detail = document.querySelector('[aria-label="Selected requirement"]')!;
    const fact = Array.from(detail.querySelectorAll('button')).find(b => b.textContent?.startsWith('f5 ·'))!;
    fact.click();
    expect(document.activeElement?.id).toBe('item-f5');
    click('Action board');
    expect(document.querySelector('#item-a3')).not.toBeNull();
    expect(document.querySelectorAll('.panel tbody tr')).toHaveLength(1);
    click('Clear filters'); click('Materials');
    expect(document.querySelectorAll('.panel tbody tr')).toHaveLength(12);
  });
  it('removes a confirmed item from the pending filter while retaining safe keyboard focus', async () => {
    document.querySelector<HTMLInputElement>('#confirmation-filter')!.click();
    const row = document.querySelector('#item-m1')!;
    const confirm = Array.from(row.querySelectorAll('button')).find(b => b.textContent === 'Confirm provided')!;
    confirm.focus(); confirm.click();
    const form = document.querySelector<HTMLFormElement>('.sig-form')!;
    form.querySelector<HTMLInputElement>('[name="by"]')!.value = 'Demo reviewer';
    form.querySelector<HTMLInputElement>('[name="basis"]')!.value = 'Demo lineage export';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    expect(document.querySelector('#item-m1')).toBeNull();
    expect(document.activeElement?.id).toBe('workspace-title');
    expect(document.querySelector('[role="status"][aria-live]')?.textContent).toContain('6 blockers');
    click('Clear filters');
    click('Pending', document.querySelector('#item-m1')!);
    expect(document.querySelector('[role="status"][aria-live]')?.textContent).toContain('7 blockers');
  });
});
