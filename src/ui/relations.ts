import type { Evidence, RoomSchema } from '../engine/types';
import { relatedRules } from '../engine/workflow';
import { btnEl, el, fmtTime } from './dom';

export interface ItemContext { schema: RoomSchema; selectBlocker: (id: string) => void; selectedItem?: string }

export function relationLinks(ctx: ItemContext | undefined, kind: 'materials' | 'facts' | 'actions', id: string): HTMLElement | null {
  if (!ctx) return null;
  const rules = kind === 'actions' ? ctx.schema.blockers.filter(b => b.action_ids?.includes(id)) : relatedRules(ctx.schema, kind, id);
  return el('div', { class: 'relation-links', 'aria-label': 'Related requirements' },
    ...rules.map(b => btnEl(`Door ${b.door} · ${b.label ?? b.id}`, 'text-button', () => ctx.selectBlocker(b.id))),
    rules.length ? null : el('span', { class: 'small mute' }, 'No tracked blocker linked'));
}

export function inlineEvidence(e: Evidence | undefined, id: string): HTMLElement | null {
  if (!e) return null;
  return el('details', { class: 'inline-evidence', id: `evidence-${id}` }, el('summary', {}, 'Review agent evidence'),
    el('p', { class: 'evidence-summary' }, e.summary),
    el('p', { class: 'small mute' }, `${e.source_kind} · ${fmtTime(e.at)} · proposed, not confirmed`),
    el('div', { class: 'mono evidence-loc' }, e.location));
}
