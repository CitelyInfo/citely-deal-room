import { describe, it, expect } from 'vitest';
describe('toolchain', () => {
  it('runs in jsdom', () => {
    document.body.textContent = 'ok';
    expect(document.body.textContent).toBe('ok');
  });
});
