import { DISCLAIMER } from './constants';
import type { Brief, Confirmation } from './types';

const time = (iso: string) => iso.replace('T', ' ').replace(/\.\d+Z$/, 'Z');
const signed = (c?: Confirmation) => (c ? ` — signed ${c.by}, ${time(c.at)}, basis: ${c.basis}` : '');

export function briefFilename(b: Brief): string {
  return `founder-risk-brief-v${b.version}.md`;
}

export function briefToMarkdown(b: Brief): string {
  const s = b.snapshot;
  const doors = new Map<number, string>([[1, 'Security review'], [2, 'Privacy & data compliance'], [3, 'Legal & license terms']]);
  const lines: string[] = [];
  lines.push(`# Founder Risk Brief · v${b.version}`, '', `Frozen ${time(b.at)} · read-only snapshot of the deal room board`, '');
  lines.push(`## Event`, '', `**${s.event.title}**`, '',
    `- Counterparty: ${s.event.counterparty}`,
    `- Deadline: ${s.event.deadline}`,
    `- Pass conditions: ${s.event.passConditions.join('; ')}`,
    `- Back-planned deadline: ${s.event.backPlannedDeadline}`,
    `- Decision maker: ${s.event.decisionMaker}`,
    `- Out of scope: ${s.event.outOfScope.join('; ')}`, '');
  if (s.hardStop) lines.push(`> **HARD STOP active** — a legal claim was flagged; automated actions were suspended when this brief was frozen.`, '');
  lines.push(`## Blockers (${s.blockers.filter(x => x.open).length} open)`, '');
  for (const door of [1, 2, 3]) {
    const items = s.blockers.filter(x => x.door === door);
    if (!items.length) continue;
    lines.push(`### Door ${door} · ${doors.get(door)}`, '');
    for (const x of items) lines.push(`- ${x.open ? 'OPEN' : 'cleared'} — ${x.title}${x.open && x.mitigation ? `\n  - Mitigation: ${x.mitigation}` : ''}`);
    lines.push('');
  }
  lines.push(`## Materials`, '');
  for (const m of s.materials) lines.push(`- ${m.state.toUpperCase()} — ${m.id} ${m.title}${signed(m.confirmation)}`);
  lines.push('', `## Facts`, '');
  for (const f of s.facts) lines.push(`- ${f.status.toUpperCase()} — ${f.id} ${f.statement}${signed(f.confirmation)}`);
  lines.push('', `## Actions`, '');
  for (const a of s.actions) lines.push(`- [${a.status}] ${a.task} — ${a.owner}, ${a.due}; evidence of completion: ${a.evidenceOfCompletion}`);
  lines.push('', `## Escalations`, '');
  for (const e of s.escalations) lines.push(`- ${e.kind}: ${e.trigger} Handoff: ${e.handoff}`);
  lines.push('', '---', '', DISCLAIMER, '');
  return lines.join('\n');
}
