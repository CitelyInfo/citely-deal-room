export type MaterialState = 'provided' | 'pending' | 'nonexistent';
export type FactStatus = 'confirmed' | 'pending' | 'unsure';
export type Door = 1 | 2 | 3;
export type SourceKind = 'code' | 'config' | 'docs' | 'unknown';

export interface Evidence { summary: string; source_kind: SourceKind; location: string; at: string }
export interface Confirmation { by: string; at: string; basis: string }

export interface Material {
  id: string; title: string; note?: string;
  state: MaterialState; confirmedByHuman: boolean;
  confirmation?: Confirmation; agentEvidence?: Evidence;
}
export interface Fact {
  id: string; statement: string; status: FactStatus;
  owner?: string; basis?: string; confirmation?: Confirmation; agentEvidence?: Evidence;
}
export interface Action {
  id: string; task: string; owner: string; due: string;
  status: 'open' | 'done'; evidenceOfCompletion: string; doneNote?: string;
}
export interface Escalation {
  id: string; kind: 'referral' | 'hard_stop'; trigger: string; packet: string[]; handoff: string;
}
export interface EventCard {
  milestones?: { label: string; date: string }[];
  title: string; counterparty: string; deadline: string; passConditions: string[];
  backPlannedDeadline: string; decisionMaker: string; outOfScope: string[];
}

export type Condition =
  | { any_material_not: { ids: string[]; state: MaterialState } }
  | { fact_status_in: { ids: string[]; statuses: FactStatus[] } }
  | { any_of: Condition[] }
  | { all_of: Condition[] };

export interface BlockerRule { id: string; door: Door; title: string; label?: string; owner?: string; priority?: number; action_ids?: string[]; mitigation?: string; open_when: Condition }
export interface RoomSchema { event_type: string; doors: { id: Door; name: string }[]; blockers: BlockerRule[] }
export interface Blocker { id: string; door: Door; title: string; mitigation?: string; open: boolean }

export interface RoomSnapshot {
  event: EventCard; materials: Material[]; facts: Fact[]; actions: Action[];
  escalations: Escalation[]; hardStop: boolean; blockers: Blocker[];
}
export interface Brief { version: number; at: string; snapshot: RoomSnapshot }

export interface RoomState {
  event: EventCard; materials: Material[]; facts: Fact[]; actions: Action[];
  escalations: Escalation[]; hardStop: boolean; briefs: Brief[];
}

export interface CaseFile {
  case_id: string; synthetic: true; event: EventCard;
  materials: Omit<Material, 'confirmedByHuman' | 'agentEvidence'>[];
  facts: Omit<Fact, 'agentEvidence'>[]; actions: Action[]; escalations: Escalation[];
}
