import type { RoomState } from '../engine/types';
import type { Dispatch } from './app';
import { el } from './dom';
export function renderActions(s: RoomState, d: Dispatch): HTMLElement {
  return el('div', {},
    el('p', { class: 'mute small' }, 'Every task names its evidence of completion up front. Toggling is human-only.'),
    el('table', { class: 'grid' }, el('thead', {}, el('tr', {}, el('th', {}, 'Task'), el('th', {}, 'Owner'), el('th', {}, 'Due'), el('th', {}, 'Evidence of completion'), el('th', {}, 'Status'))),
      el('tbody', {}, ...s.actions.map(a => {
        const box = el('input', { type: 'checkbox' }) as HTMLInputElement; box.checked = a.status === 'done';
        box.addEventListener('change', () => d.toggleAction(a.id));
        return el('tr', { class: a.status }, el('td', {}, a.task), el('td', {}, a.owner), el('td', { class: 'mono' }, a.due), el('td', { class: 'small' }, a.evidenceOfCompletion), el('td', {}, el('label', {}, box, ' ', a.status)));
      }))));
}
