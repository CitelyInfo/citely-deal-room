import { describe, it, expect, vi, afterEach } from 'vitest';
import { briefToMarkdown, briefFilename } from '../src/engine/briefMarkdown';
import { downloadText } from '../src/ui/download';
import { loadCase } from '../src/engine/persist';
import { computeBlockers } from '../src/engine/rules';
import { confirmFact, freezeBrief, setMaterialState } from '../src/engine/actions';
import { DISCLAIMER } from '../src/engine/constants';
import schema from '../config/room-schema.json';
import caseFile from '../config/case-northstar.json';
import type { CaseFile, RoomSchema } from '../src/engine/types';

const S = schema as RoomSchema;
const sig = { by: 'Dana Whitfield, Head of Operations', at: '2026-08-30T10:00:00Z', basis: 'Lineage log sample export' };
const ev = { summary: 'SECRET-AGENT-TEXT lineage logging found', source_kind: 'code' as const, location: 'pipeline/lineage.py', at: '2026-08-30T09:00:00Z' };

function frozen() {
  let s = loadCase(caseFile as CaseFile);
  s = setMaterialState(s, 'm1', 'provided', { confirmation: sig });
  s = setMaterialState(s, 'm4', 'nonexistent', { evidence: ev });
  s = confirmFact(s, 'f4', { ...sig, by: 'Sam Okafor, Engineering Lead', basis: 'Training logs 2026-07' });
  s = freezeBrief(s, computeBlockers(S, s), '2026-08-30T12:34:56Z');
  return s.briefs[0]!;
}

describe('briefToMarkdown', () => {
  const md = briefToMarkdown(frozen());
  it('has a versioned title, timestamp and the event card', () => {
    expect(md).toContain('# Founder Risk Brief · v1');
    expect(md).toContain('2026-08-30 12:34:56Z');
    expect(md).toContain('Northstar Capture Labs');
    expect(md).toContain('Counterparty');
  });
  it('lists open blockers by door and marks cleared ones', () => {
    expect(md).toMatch(/## Blockers/);
    expect(md).toContain('Door 1');
    expect(md).toMatch(/OPEN.*SOC 2 Type II/);
    expect(md).toMatch(/cleared.*per-record provenance/);
  });
  it('lists materials with state and signature, facts with signature', () => {
    expect(md).toMatch(/PROVIDED.*Data lineage records.*Dana Whitfield/);
    expect(md).toMatch(/NONEXISTENT.*Operator likeness/);
    expect(md).toMatch(/CONFIRMED.*Demo models.*Sam Okafor/);
    expect(md).toMatch(/UNSURE.*No minors/);
  });
  it('lists actions and carries the disclaimer, never agent evidence', () => {
    expect(md).toContain('Countersign IP-assignment addendum');
    expect(md).toContain(DISCLAIMER);
    expect(md).not.toContain('SECRET-AGENT-TEXT');
  });
  it('names the file by version', () => {
    expect(briefFilename(frozen())).toBe('founder-risk-brief-v1.md');
  });
});

describe('downloadText', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  afterEach(() => { URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke; });
  it('creates a blob URL, clicks a download anchor with the filename, and revokes the URL', () => {
    const create = vi.fn(() => 'blob:mock');
    const revoke = vi.fn();
    URL.createObjectURL = create as typeof URL.createObjectURL;
    URL.revokeObjectURL = revoke as typeof URL.revokeObjectURL;
    const clicked: HTMLAnchorElement[] = [];
    const spy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked.push(this); });
    downloadText('x.md', '# hi');
    expect(create).toHaveBeenCalledTimes(1);
    expect(clicked).toHaveLength(1);
    expect(clicked[0]!.getAttribute('download')).toBe('x.md');
    expect(clicked[0]!.getAttribute('href')).toBe('blob:mock');
    expect(revoke).toHaveBeenCalledWith('blob:mock');
    expect(document.querySelector('a[download]')).toBeNull();
    spy.mockRestore();
  });
});
