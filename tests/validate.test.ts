import { describe, it, expect } from 'vitest';
import { validateProposeMaterial, validateProposeFactEvidence, validateGetBrief } from '../src/webmcp/validate';

const ev = { summary: 's', source_kind: 'docs', location: 'l' };
const ids = ['m1', 'm2'];

describe('validateProposeMaterial', () => {
  it('accepts pending/nonexistent', () => {
    expect(validateProposeMaterial({ material_id: 'm1', state: 'pending', evidence: ev }, ids).ok).toBe(true);
    expect(validateProposeMaterial({ material_id: 'm1', state: 'nonexistent', evidence: ev }, ids).ok).toBe(true);
  });
  it('rejects provided with a message about human confirmation', () => {
    const r = validateProposeMaterial({ material_id: 'm1', state: 'provided', evidence: ev }, ids);
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.code).toBe('INVALID_INPUT'); expect(r.message).toMatch(/human|client/i); }
  });
  it('rejects unknown id, unknown fields, long strings, bad source_kind, non-object', () => {
    expect(validateProposeMaterial({ material_id: 'zz', state: 'pending', evidence: ev }, ids)).toMatchObject({ ok: false, code: 'UNKNOWN_ID' });
    expect(validateProposeMaterial({ material_id: 'm1', state: 'pending', evidence: ev, extra: 1 }, ids)).toMatchObject({ ok: false, code: 'INVALID_INPUT' });
    expect(validateProposeMaterial({ material_id: 'm1', state: 'pending', evidence: { ...ev, summary: 'x'.repeat(281) } }, ids)).toMatchObject({ ok: false });
    expect(validateProposeMaterial({ material_id: 'm1', state: 'pending', evidence: { ...ev, location: 'x'.repeat(121) } }, ids)).toMatchObject({ ok: false });
    expect(validateProposeMaterial({ material_id: 'm1', state: 'pending', evidence: { ...ev, source_kind: 'web' } }, ids)).toMatchObject({ ok: false });
    expect(validateProposeMaterial('nope', ids)).toMatchObject({ ok: false });
    expect(validateProposeMaterial({ material_id: 'm1', state: 'pending', evidence: { ...ev, extra: 1 } }, ids)).toMatchObject({ ok: false });
  });
});

describe('validateProposeFactEvidence / validateGetBrief', () => {
  it('works', () => {
    expect(validateProposeFactEvidence({ fact_id: 'f1', evidence: ev }, ['f1']).ok).toBe(true);
    expect(validateProposeFactEvidence({ fact_id: 'f1', status: 'confirmed', evidence: ev }, ['f1'])).toMatchObject({ ok: false });
    expect(validateGetBrief({}).ok).toBe(true);
    expect(validateGetBrief(undefined).ok).toBe(true);
    expect(validateGetBrief({ version: 2 })).toMatchObject({ ok: true, value: { version: 2 } });
    expect(validateGetBrief({ version: 'x' })).toMatchObject({ ok: false });
  });
});
