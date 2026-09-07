import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('case study visitor journey', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="case-study"></div>';
    localStorage.clear();
    await import('../src/case-study');
  });
  afterEach(() => { vi.useRealTimers(); });

  const click = async (id: string) => {
    document.getElementById(id)!.click();
    await Promise.resolve();
    await Promise.resolve();
  };

  it('keeps blockers open after agent proposals and resolves lineage only after the visitor confirms', async () => {
    expect(document.getElementById('blocker-count')!.textContent).toBe('07');
    for (let i = 0; i < 4; i++) await click('next');
    expect(document.querySelectorAll('.tool-call')).toHaveLength(3);
    expect(document.getElementById('blocker-count')!.textContent).toBe('07');
    expect(document.getElementById('lineage-status')!.textContent).toBe('待确认');
    expect(document.getElementById('confirm')!.hidden).toBe(false);
    await click('confirm');
    expect(document.getElementById('blocker-count')!.textContent).toBe('06');
    expect(document.getElementById('lineage-status')!.textContent).toBe('已提供');
    await click('reset');
    expect(document.getElementById('blocker-count')!.textContent).toBe('07');
    expect(document.querySelectorAll('.tool-call')).toHaveLength(0);
  });

  it('stops autoplay for human confirmation and cancels queued playback on reset', async () => {
    await click('play');
    await vi.advanceTimersByTimeAsync(10000);
    expect(document.getElementById('confirm')!.hidden).toBe(false);
    expect(document.getElementById('blocker-count')!.textContent).toBe('07');
    await click('reset');
    await click('play');
    await click('reset');
    await vi.advanceTimersByTimeAsync(10000);
    expect(document.querySelectorAll('.tool-call')).toHaveLength(0);
    expect(document.getElementById('step-label')!.textContent).toContain('提出任务');
  });

  it('switches the complete presentation and workflow copy to English', async () => {
    (document.querySelector('[data-lang="en"]') as HTMLButtonElement).click();
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toContain('Bring AI into your business workflow');
    expect(document.body.textContent).toContain('Move work forward as you talk.');
    expect(document.getElementById('step-label')!.textContent).toContain('Give the task');
    expect(document.getElementById('lineage-status')!.textContent).toBe('Pending');
    expect(localStorage.getItem('citely_case_language')).toBe('en');
    await click('next');
    expect(document.querySelector('.tool-call')!.textContent).toContain('Read current business state');
  });
});
