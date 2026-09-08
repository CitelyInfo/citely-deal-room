import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('human security acceptance workflow', () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    await import('../src/main');
  });
  afterEach(() => { document.body.replaceChildren(); localStorage.clear(); });

  const button = (root: ParentNode, text: string) => {
    const result = Array.from(root.querySelectorAll('button')).find(b => b.textContent === text);
    if (!result) throw new Error(`Missing button: ${text}`);
    return result;
  };
  const row = (id: string) => {
    const result = Array.from(document.querySelectorAll('tr')).find(r => r.querySelector('td')?.textContent === id);
    if (!result) throw new Error(`Missing row: ${id}`);
    return result;
  };
  const securityBlocker = () => Array.from(document.querySelectorAll('.blocker')).find(b => b.textContent?.includes('Security questionnaire §7'))!;
  const sign = async (basis: string) => {
    const form = document.querySelector<HTMLFormElement>('.sig-form')!;
    form.querySelector<HTMLInputElement>('[name="by"]')!.value = 'Demo reviewer, Legal Ops';
    form.querySelector<HTMLInputElement>('[name="basis"]')!.value = basis;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
  };

  it('keeps material confirmation separate from signed acceptance and reopens on revocation', async () => {
    button(row('m9'), 'Confirm provided').click();
    await sign('Demo security packet v2');
    expect(securityBlocker().classList.contains('open')).toBe(true);

    button(document, 'Fact ledger').click();
    expect(row('f5').textContent).toContain('current pilot scope');
    button(row('f5'), 'Confirm').click();
    button(document.querySelector('.sig-form')!, 'Cancel').click();
    await Promise.resolve();
    expect(securityBlocker().classList.contains('open')).toBe(true);

    button(row('f5'), 'Confirm').click();
    await sign('Demo approval email, security reviewer, 2026-09-07: packet v2 accepted for the US pilot; no external data');
    expect(securityBlocker().classList.contains('closed')).toBe(true);
    expect(row('f5').textContent).toContain('Demo reviewer, Legal Ops');

    button(row('f5'), 'Unsure').click();
    expect(securityBlocker().classList.contains('open')).toBe(true);
    expect(row('f5').textContent).not.toContain('Demo reviewer, Legal Ops');
  });
});
