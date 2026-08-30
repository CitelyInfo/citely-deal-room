import type { Material, RoomState } from '../engine/types';
import type { Dispatch } from './app';
import { MAX_SUMMARY } from '../engine/constants';
import { btnEl, clip, el, fmtTime } from './dom';

function row(m: Material, d: Dispatch): HTMLElement {
  return el('tr', { class: `state-${m.state}` },
    el('td', { class: 'mono mute' }, m.id),
    el('td', {}, el('div', {}, m.title), m.note ? el('div', { class: 'mute small' }, m.note) : null,
      m.agentEvidence ? el('div', { class: 'small evid' }, el('span', { class: 'tag tag-agent' }, 'agent proposed'), ' ', clip(m.agentEvidence.summary, MAX_SUMMARY)) : null),
    el('td', {}, el('span', { class: `chip chip-${m.state}` }, m.state),
      m.confirmation ? el('div', { class: 'small mute' }, `confirmed by ${m.confirmation.by} · ${fmtTime(m.confirmation.at)} · ${m.confirmation.basis}`) : null),
    el('td', { class: 'acts' },
      m.state !== 'provided' ? btnEl('Confirm provided', 'btn-primary', () => d.confirmMaterialProvided(m.id)) : null,
      m.state !== 'pending' ? btnEl('Pending', '', () => d.setMaterial(m.id, 'pending')) : null,
      m.state !== 'nonexistent' ? btnEl('Nonexistent', '', () => d.setMaterial(m.id, 'nonexistent')) : null));
}

export function renderMaterials(s: RoomState, d: Dispatch): HTMLElement {
  const counts = { provided: 0, pending: 0, nonexistent: 0 };
  for (const m of s.materials) counts[m.state]++;
  return el('div', {},
    el('p', { class: 'mute small' }, `Three states. "Nonexistent" means it must be created, usually by counsel — count these first. ${counts.provided} provided · ${counts.pending} pending · ${counts.nonexistent} nonexistent. Agents can propose pending/nonexistent; only you can confirm "provided".`),
    el('table', { class: 'grid' }, el('thead', {}, el('tr', {}, el('th', {}, '#'), el('th', {}, 'Material'), el('th', {}, 'State'), el('th', {}, 'Human actions'))),
      el('tbody', {}, ...s.materials.map(m => row(m, d)))));
}
