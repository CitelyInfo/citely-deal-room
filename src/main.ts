import schema from '../config/room-schema.json';
import caseFile from '../config/case-northstar.json';
import type { CaseFile, RoomSchema } from './engine/types';
import { Store } from './engine/store';
import { loadCase, loadFromStorage, saveToStorage, clearStorage } from './engine/persist';
import { confirmFact, freezeBrief, setFactStatus, setHardStop, setMaterialState, toggleAction } from './engine/actions';
import { createTools } from './webmcp/tools';
import { detectModelContext, registerDealRoomTools } from './webmcp/adapter';
import { mountApp, type Dispatch, type UiCtx } from './ui/app';
import { askSignature } from './ui/signatureDialog';
import { downloadText } from './ui/download';
import { briefFilename, briefToMarkdown } from './engine/briefMarkdown';

const S = schema as RoomSchema;
const base = loadCase(caseFile as CaseFile);
const store = new Store(S, loadFromStorage(base), saveToStorage);

const dispatch: Dispatch = {
  async confirmMaterialProvided(id) {
    const m = store.state.materials.find(x => x.id === id)!;
    const sig = await askSignature(`Confirm provided: ${m.title}`, '');
    if (sig) store.update(s => setMaterialState(s, id, 'provided', { confirmation: sig }));
  },
  setMaterial(id, state) { store.update(s => setMaterialState(s, id, state, {})); },
  async confirmFact(id) {
    const f = store.state.facts.find(x => x.id === id)!;
    const sig = await askSignature(`Confirm fact: ${f.statement}`, f.basis ?? '');
    if (sig) store.update(s => confirmFact(s, id, sig));
  },
  setFact(id, status) { store.update(s => setFactStatus(s, id, status)); },
  toggleAction(id) { store.update(s => toggleAction(s, id)); },
  setHardStop(on) { store.update(s => setHardStop(s, on)); },
  freeze() {
    store.update(s => freezeBrief(s, store.blockers(), new Date().toISOString()));
    const brief = store.state.briefs[store.state.briefs.length - 1];
    if (brief) downloadText(briefFilename(brief), briefToMarkdown(brief));
  },
  reset() { clearStorage(); store.update(() => structuredClone(base)); },
};

const rt = detectModelContext();
let agentStatus = 'No agent runtime detected — the board works standalone. Open in ChatGPT desktop or Chrome 149+ with WebMCP enabled to expose tools.';
if (rt) {
  const n = registerDealRoomTools(rt.ctx, createTools(store));
  agentStatus = `WebMCP: ${n} tools registered via ${rt.where}.modelContext`;
}

const ctx: UiCtx = { store, dispatch, agentStatus };
mountApp(document.getElementById('app')!, ctx);
