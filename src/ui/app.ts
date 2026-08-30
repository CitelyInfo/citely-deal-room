import type { Store } from '../engine/store';
import { renderBanner } from './banner';
import { renderEventCard } from './eventCard';
import { renderBlockers } from './blockers';
import { renderMaterials } from './materials';
import { renderFacts } from './facts';
import { renderActions } from './actions';
import { renderEscalations } from './escalations';
import { renderBrief } from './brief';
import { renderEvidencePanel } from './evidencePanel';
import { clear, el } from './dom';

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

type Tab = 'materials' | 'facts' | 'actions';

export function mountApp(root: HTMLElement, ctx: UiCtx): void {
  let tab: Tab = 'materials';
  let briefSel: number | null = null;
  const flash = new Set<string>();

  const render = () => {
    const s = ctx.store.state;
    clear(root);
    const resetBtn = el('button', { type: 'button', class: 'btn small' }, 'Reset demo');
    resetBtn.addEventListener('click', () => ctx.dispatch.reset());
    const tabBtn = (t: Tab, label: string) => { const b = el('button', { type: 'button', class: `tab ${tab === t ? 'active' : ''}` }, label); b.addEventListener('click', () => { tab = t; render(); }); return b; };
    const panel = tab === 'materials' ? renderMaterials(s, ctx.dispatch) : tab === 'facts' ? renderFacts(s, ctx.dispatch) : renderActions(s, ctx.dispatch);
    const evidence = el('section', { class: 'card evidence' }); renderEvidencePanel(evidence, s);

    root.append(
      renderBanner(ctx.agentStatus),
      el('header', { class: 'topbar' }, el('div', { class: 'brand' }, el('span', { class: 'logo' }), 'Citely Deal Room'), el('div', { class: 'mono mute small' }, 'the agent gathers evidence · the client confirms facts · judgment stays human'), resetBtn),
      el('main', { class: 'layout' },
        el('aside', { class: 'left' },
          renderEventCard(s.event),
          renderBlockers(ctx.store.schema, ctx.store.blockers(), flash),
          renderEscalations(s, ctx.dispatch),
          renderBrief(s, ctx.dispatch, briefSel, v => { briefSel = v; render(); })),
        el('section', { class: 'right' },
          el('nav', { class: 'tabs' }, tabBtn('materials', 'Materials'), tabBtn('facts', 'Fact ledger'), tabBtn('actions', 'Action board')),
          el('section', { class: 'card panel' }, panel),
          evidence)));
  };
  ctx.store.subscribe((_s, changed) => { flash.clear(); changed.forEach(id => flash.add(id)); render(); });
  render();
}
