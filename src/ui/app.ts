import type { Store } from '../engine/store';
import type { Door } from '../engine/types';
import { references, relatedRules } from '../engine/workflow';
import { renderBanner } from './banner';
import { renderEventCard } from './eventCard';
import { renderBlockers } from './blockers';
import { renderMaterials } from './materials';
import { renderFacts } from './facts';
import { renderActions } from './actions';
import { renderEscalations } from './escalations';
import { renderBrief } from './brief';
import { renderEvidencePanel } from './evidencePanel';
import { renderOverview } from './overview';
import { renderRequirement, type ItemTab } from './requirement';
import { btnEl, clear, el } from './dom';

export interface Dispatch {
  confirmMaterialProvided(id: string): void | Promise<void>;
  setMaterial(id: string, state: 'pending' | 'nonexistent'): void;
  confirmFact(id: string): void | Promise<void>;
  setFact(id: string, status: 'pending' | 'unsure'): void;
  toggleAction(id: string): void;
  setHardStop(on: boolean): void;
  freeze(): void;
  reset(): void;
}
export interface UiCtx { store: Store; dispatch: Dispatch; agentStatus: string }

export function mountApp(root: HTMLElement, ctx: UiCtx): void {
  let tab: ItemTab = 'materials';
  let briefSel: number | null = null;
  let door: Door | null = null;
  let selected: string | undefined;
  let selectedItem: string | undefined;
  let needsConfirmation = false;
  let updateMessage = '';
  const flash = new Set<string>();
  const focus = (id: string) => {
    const target = document.getElementById(id);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView?.({ block: 'nearest' });
  };
  const clearFilters = () => { selected = undefined; selectedItem = undefined; door = null; needsConfirmation = false; render(); focus('workspace-title'); };
  const selectBlocker = (id: string) => {
    selected = id; selectedItem = undefined; needsConfirmation = false;
    const rule = ctx.store.schema.blockers.find(b => b.id === id)!;
    door = rule.door;
    tab = references(rule.open_when).materials.length ? 'materials' : 'facts';
    render(); focus('requirement-title');
  };
  const showItem = (kind: ItemTab, id: string) => { tab = kind; selectedItem = id; needsConfirmation = false; render(); focus(`item-${id}`); };
  const selectDoor = (id: Door) => { door = door === id ? null : id; selected = undefined; selectedItem = undefined; render(); focus('workspace-title'); };

  const render = () => {
    const s = ctx.store.state;
    const schema = ctx.store.schema;
    const active = document.activeElement as HTMLElement | null;
    const activeId = active && root.contains(active) ? active.id : '';
    const activeRow = active?.closest('tr');
    const controlText = active?.tagName === 'BUTTON' ? active.textContent : null;
    const controlIndex = activeRow && active ? Array.from(activeRow.querySelectorAll('button,input')).indexOf(active) : -1;
    const expanded = Array.from(root.querySelectorAll<HTMLDetailsElement>('details[id][open]')).map(d => d.id);
    const rule = schema.blockers.find(b => b.id === selected);
    const refs = rule ? references(rule.open_when) : null;
    const inDoor = (kind: 'materials' | 'facts', id: string) => door === null || relatedRules(schema, kind, id).some(b => b.door === door);
    const scoped = {
      ...s,
      materials: s.materials.filter(m => (refs ? refs.materials.includes(m.id) : inDoor('materials', m.id)) && (!needsConfirmation || m.state !== 'provided')),
      facts: s.facts.filter(f => (refs ? refs.facts.includes(f.id) : inDoor('facts', f.id)) && (!needsConfirmation || f.status !== 'confirmed')),
      actions: s.actions.filter(a => rule ? rule.action_ids?.includes(a.id) : door === null || schema.blockers.some(b => b.door === door && b.action_ids?.includes(a.id))),
    };
    const itemCtx = { schema, selectBlocker, selectedItem };
    const panel = tab === 'materials' ? renderMaterials(scoped, ctx.dispatch, itemCtx) : tab === 'facts' ? renderFacts(scoped, ctx.dispatch, itemCtx) : renderActions(scoped, ctx.dispatch, itemCtx);
    const evidence = el('section', { class: 'card evidence' }); renderEvidencePanel(evidence, scoped);
    const stage = el('select', { id: 'stage-filter' }, el('option', { value: '' }, 'All review stages'), ...schema.doors.map(d => el('option', { value: String(d.id) }, d.name))) as HTMLSelectElement;
    stage.value = door === null ? '' : String(door);
    stage.addEventListener('change', () => { door = stage.value ? Number(stage.value) as Door : null; selected = undefined; selectedItem = undefined; render(); });
    const pending = el('input', { type: 'checkbox', id: 'confirmation-filter' }) as HTMLInputElement;
    pending.checked = needsConfirmation; pending.disabled = tab === 'actions';
    pending.addEventListener('change', () => { needsConfirmation = pending.checked; selectedItem = undefined; render(); });
    const tabBtn = (t: ItemTab, label: string) => {
      const b = el('button', { type: 'button', id: `tab-${t}`, class: `tab ${tab === t ? 'active' : ''}`, 'aria-pressed': String(tab === t) }, label);
      b.addEventListener('click', () => { tab = t; selectedItem = undefined; render(); }); return b;
    };
    const resetBtn = btnEl('Reset demo', 'small', () => {
      tab = 'materials'; selected = undefined; selectedItem = undefined; door = null; needsConfirmation = false; briefSel = null;
      ctx.dispatch.reset();
    });
    clear(root);
    root.append(
      renderBanner(ctx.agentStatus),
      el('header', { class: 'topbar' }, el('div', { class: 'brand' }, el('img', { src: '/brand/citely-mark.png', alt: '', width: '24', height: '24' }), 'Citely Deal Room'), el('div', { class: 'mute small' }, 'Legal · Legal Ops · Data Partnerships'), resetBtn),
      el('main', { class: 'workspace-shell' },
        renderOverview(schema, s, door, selectDoor, selectBlocker),
        el('details', { class: 'event-context', id: 'event-context' }, el('summary', {}, 'Deal background, scope & decision owners'), renderEventCard(s.event)),
        el('div', { class: 'layout' },
          el('aside', { class: 'left' }, renderBlockers(schema, ctx.store.blockers().filter(b => door === null || b.door === door), flash, selectBlocker, selected)),
          el('section', { class: 'right', 'aria-label': 'Review workspace' },
            el('div', { class: 'section-heading' }, el('h2', { id: 'workspace-title', tabindex: '-1' }, rule ? 'Requirement workspace' : 'Review workspace'), btnEl('Clear filters', '', clearFilters)),
            rule ? renderRequirement(rule, s, showItem, clearFilters) : null,
            el('div', { class: 'filter-bar' }, el('label', {}, 'Review stage', stage), el('label', { class: 'check-label' }, pending, ' Needs confirmation'),
              el('span', { class: 'small mute' }, rule ? `Linked to ${rule.label ?? rule.id}` : 'All reviewers · not a personal assignment list')),
            el('nav', { class: 'tabs', 'aria-label': 'Workspace views' }, tabBtn('materials', 'Materials'), tabBtn('facts', 'Fact ledger'), tabBtn('actions', 'Action board')),
            el('section', { class: 'card panel', 'aria-label': `${tab} results` }, panel), evidence)),
        el('div', { class: 'support-grid' }, renderEscalations(s, ctx.dispatch), renderBrief(s, ctx.dispatch, briefSel, v => { briefSel = v; render(); })),
        el('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' }, updateMessage)));
    for (const id of expanded) document.getElementById(id)?.setAttribute('open', '');
    const rowAfter = activeRow?.id ? document.getElementById(activeRow.id) : null;
    const restored = activeId ? document.getElementById(activeId) : controlIndex >= 0 && rowAfter ?
      (controlText ? Array.from(rowAfter.querySelectorAll<HTMLElement>('button')).find(b => b.textContent === controlText) ?? rowAfter : rowAfter.querySelectorAll<HTMLElement>('button,input')[controlIndex]) : null;
    if (restored) restored.focus({ preventScroll: true });
    else if (active && active !== document.body && (activeId || activeRow)) document.getElementById('workspace-title')?.focus({ preventScroll: true });
  };
  ctx.store.subscribe((_s, changed) => {
    flash.clear(); changed.forEach(id => flash.add(id));
    updateMessage = changed.length ? `${changed.length} requirement status updated. ${ctx.store.blockers().filter(b => b.open).length} blockers remain open.` : 'Board updated. Requirement status unchanged.';
    render();
  });
  render();
}
