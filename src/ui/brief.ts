import type { RoomState, Brief } from '../engine/types';
import type { Dispatch } from './app';
import { el, fmtTime } from './dom';

function snapshotView(b: Brief): HTMLElement {
  const s = b.snapshot;
  return el('div', { class: 'brief-view' },
    el('h3', {}, `Founder Risk Brief · v${b.version}`), el('div', { class: 'mono mute small' }, `frozen ${fmtTime(b.at)} · read-only`),
    el('h4', {}, 'Open blockers'), el('ul', {}, ...s.blockers.filter(x => x.open).map(x => el('li', {}, `Door ${x.door}: ${x.title}`))),
    el('h4', {}, 'Materials'), el('ul', {}, ...s.materials.map(m => el('li', {}, `${m.state.toUpperCase()} — ${m.title}${m.confirmation ? ` (confirmed by ${m.confirmation.by})` : ''}`))),
    el('h4', {}, 'Facts'), el('ul', {}, ...s.facts.map(f => el('li', {}, `${f.status.toUpperCase()} — ${f.statement}${f.confirmation ? ` (signed ${f.confirmation.by})` : ''}`))),
    el('h4', {}, 'Actions'), el('ul', {}, ...s.actions.map(a => el('li', {}, `[${a.status}] ${a.task} — ${a.owner}, ${a.due}`))));
}

export function renderBrief(s: RoomState, d: Dispatch, selected: number | null, onSelect: (v: number | null) => void): HTMLElement {
  const btn = el('button', { class: 'btn btn-primary', type: 'button' }, 'Freeze Brief');
  btn.addEventListener('click', () => d.freeze());
  const sel = el('select', { class: 'mono' }, el('option', { value: '' }, 'Board (live)'), ...s.briefs.map(b => el('option', { value: String(b.version) }, `v${b.version} · ${fmtTime(b.at)}`))) as HTMLSelectElement;
  sel.value = selected === null ? '' : String(selected);
  sel.addEventListener('change', () => onSelect(sel.value === '' ? null : Number(sel.value)));
  const chosen = selected === null ? undefined : s.briefs.find(b => b.version === selected);
  return el('section', { class: 'card brief' },
    el('h2', {}, 'Founder Risk Brief'),
    el('p', { class: 'mute small' }, 'The board is the authority; a Brief is a frozen, versioned snapshot of it. Human-only — there is no tool for this.'),
    el('div', { class: 'row' }, btn, sel),
    chosen ? snapshotView(chosen) : null);
}
