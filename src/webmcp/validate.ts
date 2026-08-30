import { MAX_LOCATION, MAX_SUMMARY } from '../engine/constants';
import type { Evidence, SourceKind } from '../engine/types';

export type Result<T> = { ok: true; value: T } | { ok: false; code: 'INVALID_INPUT' | 'UNKNOWN_ID'; message: string };
type EvidenceIn = Omit<Evidence, 'at'>;

const SOURCE_KINDS: SourceKind[] = ['code', 'config', 'docs', 'unknown'];
const PROPOSABLE = ['pending', 'nonexistent'] as const;

const fail = (code: 'INVALID_INPUT' | 'UNKNOWN_ID', message: string): Result<never> => ({ ok: false, code, message });
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

function onlyKeys(x: Record<string, unknown>, allowed: string[]): string | null {
  const extra = Object.keys(x).filter(k => !allowed.includes(k));
  return extra.length ? `Unknown field(s): ${extra.join(', ')}` : null;
}

export function validateEvidence(x: unknown): Result<EvidenceIn> {
  if (!isObj(x)) return fail('INVALID_INPUT', 'evidence must be an object');
  const extra = onlyKeys(x, ['summary', 'source_kind', 'location']); if (extra) return fail('INVALID_INPUT', `evidence: ${extra}`);
  const { summary, source_kind, location } = x;
  if (typeof summary !== 'string' || summary.length === 0 || summary.length > MAX_SUMMARY) return fail('INVALID_INPUT', `evidence.summary must be a string of 1–${MAX_SUMMARY} chars`);
  if (typeof location !== 'string' || location.length > MAX_LOCATION) return fail('INVALID_INPUT', `evidence.location must be a string of ≤${MAX_LOCATION} chars`);
  if (typeof source_kind !== 'string' || !SOURCE_KINDS.includes(source_kind as SourceKind)) return fail('INVALID_INPUT', `evidence.source_kind must be one of ${SOURCE_KINDS.join('|')}`);
  return { ok: true, value: { summary, source_kind: source_kind as SourceKind, location } };
}

export function validateProposeMaterial(x: unknown, ids: string[]) : Result<{ material_id: string; state: 'pending' | 'nonexistent'; evidence: EvidenceIn }> {
  if (!isObj(x)) return fail('INVALID_INPUT', 'input must be an object');
  const extra = onlyKeys(x, ['material_id', 'state', 'evidence']); if (extra) return fail('INVALID_INPUT', extra);
  const { material_id, state } = x;
  if (typeof material_id !== 'string') return fail('INVALID_INPUT', 'material_id must be a string');
  if (!ids.includes(material_id)) return fail('UNKNOWN_ID', `Unknown material_id "${material_id}". Call dealroom_get_room for valid ids.`);
  if (state === 'provided') return fail('INVALID_INPUT', "state 'provided' is not available to agents by design: whether a material exists is a fact, and facts are confirmed by the client (a human) in the UI. Propose 'pending' with your evidence instead.");
  if (typeof state !== 'string' || !(PROPOSABLE as readonly string[]).includes(state)) return fail('INVALID_INPUT', `state must be one of ${PROPOSABLE.join('|')}`);
  const ev = validateEvidence(x.evidence); if (!ev.ok) return ev;
  return { ok: true, value: { material_id, state: state as 'pending' | 'nonexistent', evidence: ev.value } };
}

export function validateProposeFactEvidence(x: unknown, ids: string[]): Result<{ fact_id: string; evidence: EvidenceIn }> {
  if (!isObj(x)) return fail('INVALID_INPUT', 'input must be an object');
  const extra = onlyKeys(x, ['fact_id', 'evidence']); if (extra) return fail('INVALID_INPUT', `${extra}. Note: fact status cannot be set by agents; only evidence can be attached.`);
  const { fact_id } = x;
  if (typeof fact_id !== 'string') return fail('INVALID_INPUT', 'fact_id must be a string');
  if (!ids.includes(fact_id)) return fail('UNKNOWN_ID', `Unknown fact_id "${fact_id}". Call dealroom_get_room for valid ids.`);
  const ev = validateEvidence(x.evidence); if (!ev.ok) return ev;
  return { ok: true, value: { fact_id, evidence: ev.value } };
}

export function validateGetBrief(x: unknown): Result<{ version?: number }> {
  if (x === undefined || x === null) return { ok: true, value: {} };
  if (!isObj(x)) return fail('INVALID_INPUT', 'input must be an object');
  const extra = onlyKeys(x, ['version']); if (extra) return fail('INVALID_INPUT', extra);
  if (x.version === undefined) return { ok: true, value: {} };
  if (typeof x.version !== 'number' || !Number.isInteger(x.version) || x.version < 1) return fail('INVALID_INPUT', 'version must be a positive integer');
  return { ok: true, value: { version: x.version } };
}
