import type { Fact, RoomState } from '../engine/types';
import type { Dispatch } from './app';
import { MAX_SUMMARY } from '../engine/constants';
import { btnEl, clip, el, fmtTime } from './dom';

function row(f: Fact, d: Dispatch): HTMLElement {
  return el('tr', { class: `status-${f.status}` },
    el('td', { class: 'mono mute' }, f.id),
    el('td', {}, el('div', {}, f.statement), el('div', { class: 'mute small' }, `Owner: ${f.owner ?? '—'} · Basis: ${f.basis ?? '—'}`),
      f.agentEvidence ? el('div', { class: 'small evid' }, el('span', { class: 'tag tag-agent' }, 'agent evidence'), ' ', clip(f.agentEvidence.summary, MAX_SUMMARY)) : null),
    el('td', {}, el('span', { class: `chip chip-${f.status}` }, f.status)),
    el('td', { class: 'sig' }, f.confirmation ? el('div', { class: 'small' }, el('strong', {}, f.confirmation.by), el('div', { class: 'mono mute' }, fmtTime(f.confirmation.at)), el('div', { class: 'mute' }, f.confirmation.basis)) : el('span', { class: 'mute' }, f.status === 'unsure' ? 'nobody can sign this — that is the finding' : '—')),
    el('td', { class: 'acts' },
      f.status !== 'confirmed' ? btnEl('Confirm', 'btn-primary', () => d.confirmFact(f.id)) : null,
      f.status !== 'pending' ? btnEl('Pending', '', () => d.setFact(f.id, 'pending')) : null,
      f.status !== 'unsure' ? btnEl('Unsure', '', () => d.setFact(f.id, 'unsure')) : null));
}

export function renderFacts(s: RoomState, d: Dispatch): HTMLElement {
  return el('div', {},
    el('p', { class: 'mute small' }, 'Facts are confirmed by the client only. A confirmation is a signature: who, when, on what basis. Agents can attach evidence but never change status.'),
    el('table', { class: 'grid' }, el('thead', {}, el('tr', {}, el('th', {}, '#'), el('th', {}, 'Fact'), el('th', {}, 'Status'), el('th', {}, 'Signature'), el('th', {}, 'Human actions'))),
      el('tbody', {}, ...s.facts.map(f => row(f, d)))));
}
