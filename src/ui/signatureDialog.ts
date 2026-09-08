import { el } from './dom';
import type { Confirmation } from '../engine/types';

export function askSignature(title: string, defaultBasis: string): Promise<Confirmation | null> {
  const previousFocus = document.activeElement as HTMLElement | null;
  return new Promise(resolve => {
    const name = el('input', { type: 'text', name: 'by', required: 'true', placeholder: 'Your name and role', autocomplete: 'off' }) as HTMLInputElement;
    const basis = el('input', { type: 'text', name: 'basis', required: 'true', placeholder: 'Basis (which material / record)', value: defaultBasis, autocomplete: 'off' }) as HTMLInputElement;
    const form = el('form', { class: 'sig-form' },
      el('h3', {}, title),
      el('p', { class: 'mute small' }, 'A fact is a signature, not a checkbox: who confirmed it, when, on what basis. Stored only in this browser.'),
      el('label', {}, 'Confirmed by', name),
      el('label', {}, 'Basis', basis),
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn', 'data-act': 'cancel' }, 'Cancel'),
        el('button', { type: 'submit', class: 'btn btn-primary' }, 'Sign & confirm')));
    const modal = el('div', { class: 'sig-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, form);
    const scrim = el('div', { class: 'sig-scrim', role: 'presentation' }, modal);
    document.body.appendChild(scrim);
    const app = document.getElementById('app');
    app?.setAttribute('inert', '');

    let finished = false;
    const onKeydown = (e: KeyboardEvent) => { if (e.key === 'Escape') done(null); };
    const done = (c: Confirmation | null) => {
      if (finished) return;
      finished = true;
      document.removeEventListener('keydown', onKeydown);
      scrim.remove();
      app?.removeAttribute('inert');
      previousFocus?.focus({ preventScroll: true });
      resolve(c);
    };

    form.addEventListener('submit', e => { e.preventDefault(); if (!name.value.trim() || !basis.value.trim()) return; done({ by: name.value.trim(), at: new Date().toISOString(), basis: basis.value.trim() }); });
    form.querySelector('[data-act=cancel]')!.addEventListener('click', () => done(null));
    scrim.addEventListener('click', e => { if (e.target === scrim) done(null); });
    document.addEventListener('keydown', onKeydown);

    name.focus();
  });
}
