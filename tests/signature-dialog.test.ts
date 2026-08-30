import { describe, it, expect } from 'vitest';
import { askSignature } from '../src/ui/signatureDialog';

describe('askSignature — fixed-overlay signature form', () => {
  it('renders a scrim with a role=dialog modal inside', async () => {
    const promise = askSignature('t', 'b');
    const scrim = document.querySelector('.sig-scrim');
    expect(scrim).not.toBeNull();
    const modal = scrim!.querySelector('[role="dialog"]');
    expect(modal).not.toBeNull();
    // cancel to clean up
    (scrim!.querySelector('[data-act=cancel]') as HTMLButtonElement).click();
    await promise;
  });

  it('resolves with the signature on submit and removes the scrim', async () => {
    const promise = askSignature('Confirm', 'default-basis');
    const scrim = document.querySelector('.sig-scrim')!;
    const nameInput = scrim.querySelector('input[name="by"]') as HTMLInputElement;
    const basisInput = scrim.querySelector('input[name="basis"]') as HTMLInputElement;
    nameInput.value = 'Jane Doe, counsel';
    basisInput.value = 'reviewed the NDA';
    const form = scrim.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const result = await promise;
    expect(result).toEqual({ by: 'Jane Doe, counsel', at: expect.any(String), basis: 'reviewed the NDA' });
    expect(document.querySelector('.sig-scrim')).toBeNull();
  });

  it('resolves null on Escape and removes the scrim', async () => {
    const promise = askSignature('Confirm', 'basis');
    expect(document.querySelector('.sig-scrim')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    const result = await promise;
    expect(result).toBeNull();
    expect(document.querySelector('.sig-scrim')).toBeNull();
  });
});
