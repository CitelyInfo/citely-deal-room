import { computeBlockers, blockerDiff } from './rules';
import type { Blocker, RoomSchema, RoomState } from './types';

export class Store {
  private listeners = new Set<(s: RoomState, blockersChanged: string[]) => void>();
  constructor(
    public readonly schema: RoomSchema,
    private _state: RoomState,
    private persist?: (s: RoomState) => void,
  ) {}
  get state(): RoomState { return this._state; }
  blockers(): Blocker[] { return computeBlockers(this.schema, this._state); }
  update(fn: (s: RoomState) => RoomState): { blockersChanged: string[] } {
    const before = this.blockers();
    this._state = fn(this._state);
    const blockersChanged = blockerDiff(before, this.blockers());
    this.persist?.(this._state);
    for (const l of this.listeners) l(this._state, blockersChanged);
    return { blockersChanged };
  }
  subscribe(fn: (s: RoomState, blockersChanged: string[]) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
