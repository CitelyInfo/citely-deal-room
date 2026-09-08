import type { Material, RoomState } from '../engine/types';
import type { Dispatch } from './app';
import { MAX_SUMMARY } from '../engine/constants';
import { btnEl, clip, el, fmtTime } from './dom';
import { inlineEvidence, relationLinks, type ItemContext } from './relations';

function row(m: Material, d: Dispatch, ctx?: ItemContext): HTMLElement {
  return el('tr', { class: `state-${m.state} ${ctx?.selectedItem === m.id ? 'selected-row' : ''}`, id: `item-${m.id}`, tabindex: '-1' },
    el('td', { class: 'mono mute' }, m.id),
    el('td', {}, el('div', {}, m.title), m.note ? el('div', { class: 'mute small' }, m.note) : null,
      m.agentEvidence ? el('div', { class: 'small evid' }, el('span', { class: 'tag tag-agent' }, 'agent proposed'), ' ', clip(m.agentEvidence.summary, MAX_SUMMARY)) : null,
      inlineEvidence(m.agentEvidence, m.id), relationLinks(ctx, 'materials', m.id)),
    el('td', {}, el('span', { class: `chip chip-${m.state}` }, m.state),
      m.confirmation ? el('div', { class: 'small mute' }, `confirmed by ${m.confirmation.by} · ${fmtTime(m.confirmation.at)} · ${m.confirmation.basis}`) : null),
    el('td', { class: 'acts' },
      m.state !== 'provided' ? btnEl('Confirm provided', 'btn-primary', () => d.confirmMaterialProvided(m.id)) : null,
      m.state !== 'pending' ? btnEl('Pending', '', () => d.setMaterial(m.id, 'pending')) : null,
      m.state !== 'nonexistent' ? btnEl('Nonexistent', '', () => d.setMaterial(m.id, 'nonexistent')) : null));
}

export function renderMaterials(s: RoomState, d: Dispatch, ctx?: ItemContext): HTMLElement {
  const counts = { provided: 0, pending: 0, nonexistent: 0 };
  for (const m of s.materials) counts[m.state]++;
  return el('div', {},
    el('p', { class: 'mute small' }, `${counts.provided} provided · ${counts.pending} pending · ${counts.nonexistent} nonexistent. "Provided" records material availability, not legal sufficiency or counterparty acceptance. Agents can propose pending/nonexistent; only a human reviewer can confirm "provided".`),
    el('table', { class: 'grid' }, el('thead', {}, el('tr', {}, el('th', {}, '#'), el('th', {}, 'Material'), el('th', {}, 'State'), el('th', {}, 'Human actions'))),
      el('tbody', {}, ...s.materials.map(m => row(m, d, ctx)))),
    s.materials.length ? null : el('p', { class: 'empty-state' }, 'No materials match this view. Clear filters to see all materials.'));
}
