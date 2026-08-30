import type { EventCard } from '../engine/types';
import { el } from './dom';
const kv = (k: string, v: Node | string) => el('div', { class: 'kv' }, el('div', { class: 'k' }, k), el('div', { class: 'v' }, v));
export function renderEventCard(e: EventCard): HTMLElement {
  return el('section', { class: 'card event-card' },
    el('h2', {}, e.title),
    kv('Counterparty', e.counterparty),
    kv('Deadline', e.deadline),
    kv('Pass conditions', el('ol', {}, ...e.passConditions.map(p => el('li', {}, p)))),
    kv('Back-planned deadline', el('span', { class: 'warn' }, e.backPlannedDeadline)),
    kv('Decision maker', e.decisionMaker),
    kv('Out of scope', el('ul', {}, ...e.outOfScope.map(o => el('li', {}, o)))));
}
