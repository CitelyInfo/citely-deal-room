import { describe, it, expect } from 'vitest';
import schema from '../config/room-schema.json';
import caseFile from '../config/case-northstar.json';
import type { RoomSchema, CaseFile, Condition } from '../src/engine/types';

const s = schema as RoomSchema;
const c = caseFile as CaseFile;

function idsIn(cond: Condition): { materials: string[]; facts: string[] } {
  if ('any_material_not' in cond) return { materials: cond.any_material_not.ids, facts: [] };
  if ('fact_status_in' in cond) return { materials: [], facts: cond.fact_status_in.ids };
  return cond.all_of.map(idsIn).reduce((a, b) => ({ materials: [...a.materials, ...b.materials], facts: [...a.facts, ...b.facts] }), { materials: [], facts: [] });
}

describe('config integrity', () => {
  it('case is marked synthetic', () => expect(c.synthetic).toBe(true));
  it('every blocker rule references existing ids', () => {
    const mids = new Set(c.materials.map(m => m.id));
    const fids = new Set(c.facts.map(f => f.id));
    for (const b of s.blockers) {
      const { materials, facts } = idsIn(b.open_when);
      for (const id of materials) expect(mids.has(id), `${b.id}→${id}`).toBe(true);
      for (const id of facts) expect(fids.has(id), `${b.id}→${id}`).toBe(true);
      expect([1, 2, 3]).toContain(b.door);
    }
  });
  it('no blocker title anchors a statute (object test)', () => {
    const banned = /\b(BIPA|COPPA|GDPR|CCPA|HIPAA|statute|violat|illegal|unlawful)\b/i;
    for (const b of s.blockers) expect(b.title).not.toMatch(banned);
  });
  it('confirmed facts carry a signature', () => {
    for (const f of c.facts) if (f.status === 'confirmed') expect(f.confirmation?.by).toBeTruthy();
  });
});
