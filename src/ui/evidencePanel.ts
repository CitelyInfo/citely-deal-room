import { MAX_LOCATION, MAX_SUMMARY } from '../engine/constants';
import type { Evidence, RoomState } from '../engine/types';
import { clear, clip, el, fmtTime } from './dom';

function row(kind: 'Material' | 'Fact', id: string, title: string, e: Evidence): HTMLElement {
  return el('li', { class: 'evidence-row' },
    el('div', { class: 'evidence-head' },
      el('span', { class: 'tag tag-agent' }, 'agent proposed · not confirmed'),
      el('span', { class: 'mono mute' }, `${kind} ${id} · ${e.source_kind} · ${fmtTime(e.at)}`)),
    el('div', { class: 'evidence-title' }, title),
    el('p', { class: 'evidence-summary' }, clip(e.summary, MAX_SUMMARY)),
    el('div', { class: 'mono evidence-loc' }, clip(e.location, MAX_LOCATION)));
}

export function renderEvidencePanel(container: HTMLElement, state: RoomState): void {
  clear(container);
  const items: HTMLElement[] = [];
  for (const m of state.materials) if (m.agentEvidence) items.push(row('Material', m.id, m.title, m.agentEvidence));
  for (const f of state.facts) if (f.agentEvidence) items.push(row('Fact', f.id, f.statement, f.agentEvidence));
  container.appendChild(el('h3', {}, 'Agent evidence'));
  container.appendChild(el('p', { class: 'mute small' }, 'Proposals only. Rendered as plain text, kept in memory, never sent anywhere. Confirmation is yours.'));
  container.appendChild(items.length ? el('ul', { class: 'evidence-list' }, ...items) : el('p', { class: 'mute' }, 'No agent evidence yet.'));
}
