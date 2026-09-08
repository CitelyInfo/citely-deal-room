import type { RoomState } from '../engine/types';
import type { Dispatch } from './app';
import { el } from './dom';
import { relationLinks, type ItemContext } from './relations';
export function renderActions(s: RoomState, d: Dispatch, ctx?: ItemContext): HTMLElement {
  return el('div', {},
    el('p', { class: 'mute small' }, 'Every task names its evidence of completion up front. Toggling is human-only.'),
    el('table', { class: 'grid' }, el('thead', {}, el('tr', {}, el('th', {}, 'Task'), el('th', {}, 'Owner'), el('th', {}, 'Due'), el('th', {}, 'Evidence of completion'), el('th', {}, 'Status'))),
      el('tbody', {}, ...s.actions.map(a => {
        const box = el('input', { type: 'checkbox' }) as HTMLInputElement; box.checked = a.status === 'done';
        box.addEventListener('change', () => d.toggleAction(a.id));
        return el('tr', { class: `${a.status} ${ctx?.selectedItem === a.id ? 'selected-row' : ''}`, id: `item-${a.id}`, tabindex: '-1' }, el('td', {}, a.task, relationLinks(ctx, 'actions', a.id)), el('td', {}, a.owner), el('td', { class: 'mono' }, a.due), el('td', { class: 'small' }, a.evidenceOfCompletion), el('td', {}, el('label', {}, box, ' ', a.status)));
      }))),
    s.actions.length ? null : el('p', { class: 'empty-state' }, 'No actions match this view. See the selected requirement for its next step.'));
}
