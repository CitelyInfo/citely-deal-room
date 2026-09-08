import type { Door, RoomSchema, RoomState } from '../engine/types';
import { computeBlockers } from '../engine/rules';
import { nearestMilestone, nextRequirements, reviewCount } from '../engine/workflow';
import { el } from './dom';

export function renderOverview(schema: RoomSchema, state: RoomState, door: Door | null, selectDoor: (door: Door) => void, selectBlocker: (id: string) => void): HTMLElement {
  const blockers = computeBlockers(schema, state);
  const next = nextRequirements(schema, state).slice(0, 3);
  const milestone = nearestMilestone(state, new Date().toLocaleDateString('en-CA'));
  return el('section', { class: 'overview', 'aria-label': 'Deal overview' },
    el('div', { class: 'deal-heading' }, el('div', {}, el('div', { class: 'eyebrow' }, 'DATA PARTNERSHIP / VENDOR REVIEW'), el('h1', {}, state.event.title)),
      milestone ? el('div', { class: 'milestone' }, el('span', { class: 'mute' }, milestone.elapsed ? 'Latest milestone · date passed' : 'Next milestone'), el('strong', {}, `${milestone.date} · ${milestone.label}`)) : null),
    el('div', { class: 'gate-grid' }, ...schema.doors.map(d => {
      const items = blockers.filter(b => b.door === d.id);
      const count = items.filter(b => b.open).length;
      const button = el('button', { type: 'button', class: `gate ${door === d.id ? 'selected' : ''}`, 'aria-pressed': String(door === d.id), 'aria-label': `Filter ${d.name}` },
        el('span', { class: 'eyebrow' }, `0${d.id} / ${d.name}`),
        el('strong', {}, `${count} open`), el('span', { class: 'mute' }, `${items.length - count} of ${items.length} tracked items cleared`));
      button.addEventListener('click', () => selectDoor(d.id)); return button;
    })),
    el('div', { class: 'section-heading' }, el('h2', {}, 'Next to resolve'), el('span', { class: 'small mute' }, 'New evidence first, then deal priority · all reviewers')),
    state.hardStop ? el('p', { class: 'hard-msg', role: 'status' }, 'Automation paused · Legal claim received. Coordinate next steps with Legal.') : null,
    el('div', { class: 'next-grid' }, ...next.map((b, i) => {
      const count = reviewCount(b, state);
      const button = el('button', { type: 'button', class: 'next-item', 'aria-label': `Resolve ${b.label ?? b.title}` },
        el('span', { class: 'next-index' }, `0${i + 1}`), el('span', {},
          el('strong', {}, b.label ?? b.title), el('span', { class: 'small mute' }, b.owner ?? 'Owner to be assigned'),
          el('span', { class: 'next-reason' }, count ? `${count} evidence item${count === 1 ? '' : 's'} awaiting review →` : `Review missing requirements · Door ${b.door} →`)));
      button.addEventListener('click', () => selectBlocker(b.id)); return button;
    }), next.length ? null : el('p', { class: 'empty-state' }, 'All tracked requirements are clear. Final review and signing remain with the responsible decision makers.')));
}
