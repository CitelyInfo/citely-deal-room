import type { Blocker, RoomSchema } from '../engine/types';
import { el } from './dom';
export function renderBlockers(schema: RoomSchema, blockers: Blocker[], changed: Set<string>): HTMLElement {
  const open = blockers.filter(b => b.open).length;
  const sec = el('section', { class: 'card blockers' }, el('h2', {}, `Blockers · ${open} open`),
    el('p', { class: 'mute small' }, 'Anchored to the questionnaire and warranty clauses you are asked to sign — never to a statute. Recomputed live from materials and facts.'));
  for (const door of schema.doors) {
    const items = blockers.filter(b => b.door === door.id);
    if (!items.length) continue;
    sec.appendChild(el('h3', { class: 'door' }, `Door ${door.id} · ${door.name}`));
    sec.appendChild(el('ul', { class: 'blocker-list' }, ...items.map(b =>
      el('li', { class: `blocker ${b.open ? 'open' : 'closed'} ${changed.has(b.id) ? 'flash' : ''}` },
        el('span', { class: `dot ${b.open ? 'dot-open' : 'dot-closed'}` }),
        el('div', {},
          el('div', { class: 'blocker-title' }, b.title),
          el('div', { class: 'mono mute small' }, `${b.open ? 'BLOCKS' : 'cleared'} · Door ${b.door}`),
          b.open && b.mitigation ? el('div', { class: 'small' }, 'Mitigation: ', b.mitigation) : null)))));
  }
  return sec;
}
