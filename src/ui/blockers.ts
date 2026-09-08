import type { Blocker, RoomSchema } from '../engine/types';
import { el } from './dom';
export function renderBlockers(schema: RoomSchema, blockers: Blocker[], changed: Set<string>, select?: (id: string) => void, selected?: string): HTMLElement {
  const open = blockers.filter(b => b.open).length;
  const sec = el('section', { class: 'card blockers' }, el('h2', {}, `Blockers · ${open} open`),
    el('p', { class: 'mute small' }, 'Tracks requirements in the counterparty questionnaire and contract. Cleared means this item\'s recorded conditions are met; it does not approve an entire review stage or authorize signing.'));
  for (const door of schema.doors) {
    const items = blockers.filter(b => b.door === door.id);
    if (!items.length) continue;
    sec.appendChild(el('h3', { class: 'door' }, `Door ${door.id} · ${door.name}`));
    sec.appendChild(el('ul', { class: 'blocker-list' }, ...items.map(b => {
      const rule = schema.blockers.find(r => r.id === b.id)!;
      const title = el(select ? 'button' : 'div', { class: 'blocker-title', ...(select ? { type: 'button', 'aria-pressed': String(selected === b.id) } : {}) }, rule.label ?? b.title);
      if (select) title.addEventListener('click', () => select(b.id));
      return el('li', { class: `blocker ${b.open ? 'open' : 'closed'} ${selected === b.id ? 'selected' : ''} ${changed.has(b.id) ? 'flash' : ''}` },
        el('span', { class: `dot ${b.open ? 'dot-open' : 'dot-closed'}` }),
        el('div', {},
          title,
          el('div', { class: 'mono mute small' }, `${b.open ? 'BLOCKS' : 'cleared'} · Door ${b.door}`),
          el('div', { class: 'small mute' }, rule.owner ?? 'Owner to be assigned')));
    })));
  }
  return sec;
}
