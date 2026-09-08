import type { BlockerRule, Condition, RoomState } from '../engine/types';
import { evalCondition } from '../engine/rules';
import { btnEl, el } from './dom';

export type ItemTab = 'materials' | 'facts' | 'actions';

function conditionView(c: Condition, s: RoomState, show: (tab: ItemTab, id: string) => void): HTMLElement {
  if ('any_material_not' in c) return el('ul', { class: 'requirements-list' }, ...c.any_material_not.ids.map(id => {
    const m = s.materials.find(m => m.id === id);
    return el('li', {}, el('span', { class: `chip chip-${m?.state ?? 'pending'}` }, m?.state ?? 'missing'),
      btnEl(`${id} · ${m?.title ?? 'Material unavailable'}`, 'text-button', () => show('materials', id)));
  }));
  if ('fact_status_in' in c) return el('ul', { class: 'requirements-list' }, ...c.fact_status_in.ids.map(id => {
    const f = s.facts.find(f => f.id === id);
    return el('li', {}, el('span', { class: `chip chip-${f?.status ?? 'pending'}` }, f?.status ?? 'missing'),
      btnEl(`${id} · ${f?.statement ?? 'Fact unavailable'}`, 'text-button', () => show('facts', id)));
  }));
  const allNeeded = 'any_of' in c;
  const children = 'any_of' in c ? c.any_of : c.all_of;
  return el('div', { class: 'condition-group' }, el('p', { class: 'small mute' }, allNeeded ? 'All requirements below must be satisfied.' : 'Resolve at least one group below.'),
    ...children.map(child => conditionView(child, s, show)));
}

export function renderRequirement(rule: BlockerRule, state: RoomState, show: (tab: ItemTab, id: string) => void, close: () => void): HTMLElement {
  const open = evalCondition(rule.open_when, state);
  const actions = state.actions.filter(a => rule.action_ids?.includes(a.id));
  return el('section', { class: `card requirement-detail ${open ? '' : 'resolved'}`, 'aria-label': 'Selected requirement' },
    el('div', { class: 'section-heading' }, el('span', { class: 'eyebrow' }, `DOOR ${rule.door} / ${open ? 'OPEN REQUIREMENT' : 'TRACKED ITEM CLEARED'}`), btnEl('Back to all items', '', close)),
    el('h2', { id: 'requirement-title', tabindex: '-1' }, rule.label ?? rule.title),
    el('p', { class: 'small mute' }, rule.title),
    el('p', {}, el('strong', {}, 'Responsible team: '), rule.owner ?? 'To be assigned'),
    el('h3', {}, 'Conditions to clear'), conditionView(rule.open_when, state, show),
    el('h3', {}, open ? 'Next step' : 'Review record'), el('p', {}, open ? (rule.mitigation ?? 'Review the linked evidence with the responsible team.') : 'Keep the confirmation basis and linked materials available for review. Reopen the item if a prerequisite changes.'),
    el('h3', {}, 'Linked actions'),
    ...actions.map(a => btnEl(`${a.task} · ${a.owner} · ${a.due} · ${a.status}`, 'linked-action', () => show('actions', a.id))),
    actions.length ? el('p', { class: 'small mute' }, 'Action completion does not confirm a fact or clear a requirement automatically.') : el('p', { class: 'small mute' }, 'No action has been assigned on the board. Coordinate the next step with the responsible team.'),
    open ? null : el('p', { class: 'success-note' }, 'The recorded prerequisites are met. This does not approve the entire review stage or authorize signing.'));
}
