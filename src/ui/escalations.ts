import type { RoomState } from '../engine/types';
import type { Dispatch } from './app';
import { el } from './dom';
export function renderEscalations(s: RoomState, d: Dispatch): HTMLElement {
  const box = el('input', { type: 'checkbox', id: 'hardstop' }) as HTMLInputElement;
  box.checked = s.hardStop;
  box.addEventListener('change', () => d.setHardStop(box.checked));
  return el('section', { class: `card escalations ${s.hardStop ? 'hard' : ''}` },
    el('h2', {}, 'Escalation record'),
    ...s.escalations.map(e => el('div', { class: 'esc' },
      el('span', { class: 'tag' }, e.kind === 'referral' ? 'Referral · project continues' : 'Hard stop'),
      el('p', {}, e.trigger),
      el('div', { class: 'small' }, 'Packet handed over: ', el('ul', {}, ...e.packet.map(p => el('li', {}, p)))),
      el('div', { class: 'small mute' }, 'Handoff: ', e.handoff))),
    el('label', { class: 'hardstop-toggle' }, box, ' Legal claim received (hard stop) — agents are refused until cleared here'),
    s.hardStop ? el('p', { class: 'hard-msg' }, 'HARD STOP active: automated actions do not apply in an adversarial situation. Only a human can clear this.') : null);
}
