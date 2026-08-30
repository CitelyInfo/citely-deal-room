import { el } from './dom';
export function renderBanner(agentStatus: string): HTMLElement {
  return el('div', { class: 'banner', role: 'note' },
    el('strong', {}, 'Demo with a synthetic case — not a live service. '),
    'Do not enter real company data. ',
    el('span', { class: 'mono banner-agent' }, agentStatus));
}
