# Citely Deal Room — WebMCP demo

> **Demo with a synthetic case — not a live service. Do not enter real company data.**
> Live: **https://citely-deal-room.vercel.app** · Repo: https://github.com/web3yaso/citely-deal-room-demo · License: MIT · Built for the OpenAI WebMCP Challenge (Aug 25 – Sep 3, 2026).

A Deal Room is a case workbench opened for one business event — here, a teleoperation data vendor (**Northstar Capture Labs**, fictional) trying to pass a frontier lab's vendor review: three doors (security, privacy, legal), one deadline, warranties the founder has to be able to sign.

**The agent gathers evidence. The client confirms facts. Judgment stays human.**

## What people and agents do together

- Evidence lives where it lives: contracts on a desktop, code on GitHub, and some things nowhere at all. The agent goes wherever it needs to read.
- The board is the only place it writes — through **five constrained verbs** exposed with WebMCP.
- Blockers open and close live as material and fact states change; the human signs confirmations, flags hard stops, and freezes the Brief.

## The five tools

| Tool | Writes? | Constraint |
|---|---|---|
| `dealroom_get_room` | no | read the six zones |
| `dealroom_propose_material(material_id, state, evidence)` | yes | `state ∈ {pending, nonexistent}` — **`provided` does not exist for agents**; refused if a human already confirmed |
| `dealroom_propose_fact_evidence(fact_id, evidence)` | evidence only | never changes fact status; refused if confirmed |
| `dealroom_get_blockers` | no | each blocker says which door it blocks |
| `dealroom_get_brief(version?)` | no | freezing is human-only; no tool exists |

Every response carries `disclaimer` and `note_to_agent` verbatim. When a human flags **"Legal claim received"**, every `propose_*` call is refused (`HARD_STOP`) until a human clears it — automation does not apply in an adversarial situation.

### Three tiers of confirmation rights

| Statement type | Who confirms |
|---|---|
| Fact — "is it so?" | the client |
| Status — "is the evidence enough against the counterparty's checklist?" | Citely (in production, a person who signs) |
| Decision — "do we proceed?" | the client |

The agent sits below all three: it can only gather and propose. Blockers are anchored to the counterparty's questionnaire and warranty clauses, never to statutes.

## Try it

1. Open the live URL in the **ChatGPT desktop app's in-app browser** (WebMCP on by default) or **Chrome 149+** with `chrome://flags/#enable-webmcp-testing` enabled.
2. Copy `demo-materials/operator-agreement-v2.pdf` to your desktop.
3. Attach `operator-agreement-v2.pdf` to the chat (most agent runtimes cannot read your desktop on their own) and tell the agent: **"Read the attached operator agreement and the pipeline/ directory of this repo on GitHub, then update the deal room."** If the agent cannot browse GitHub, attach `pipeline/lineage.py` too.
4. Watch the blockers; then confirm m1 as provided yourself (signature dialog) and watch the Door 1 lineage blocker clear.
5. The PDF's last clause tries to instruct the reviewer to mark everything provided. Nothing happens — there is no such verb.
6. Tick "Legal claim received" and ask the agent to propose again: refused. Untick, click **Freeze Brief** — the board is snapshotted as v1 and a `founder-risk-brief-v1.md` downloads (generated in the browser; nothing leaves the page).

Without a WebMCP runtime the page works standalone and says so in the banner.

## How WebMCP is implemented

`src/webmcp/adapter.ts` detects `document.modelContext ?? navigator.modelContext` and calls `registerTool({ name, description, inputSchema, execute })` for each tool built by `src/webmcp/tools.ts`. Tools call the same pure state transitions the UI uses (`src/engine/actions.ts`) with three extra guards: hard stop → JSON-schema-shaped whitelist validation (`additionalProperties: false`, id enums generated from the case file) → human-confirmation lock. Blocker rules are data in `config/room-schema.json`; a different event type is one config file away.

## Zero backend, by design

No server, no network requests (a test stubs `fetch`/`XMLHttpRequest` to throw and runs every tool), no analytics, no runtime dependencies, CSP `default-src 'self'`. Agent evidence is rendered with `textContent` only and never persisted; `localStorage` holds only enum states, signatures and frozen briefs — **Reset demo** clears it. A production Deal Room needs accounts, roles, an audit log and server-side status judgments signed by a person; none of that belongs in an open demo, so none of it is here.

## Develop

### Website case study

Open `/case-study/` for the standalone Chinese client-facing case study. It pairs a simulated Codex conversation with a live, isolated copy of the Deal Room state. Visitors can advance manually, play/pause, reset, and simulate the final human confirmation. The scripted calls reuse the existing tool implementations; this presentation does not connect to Codex, register tools, read files, or persist demo state. The original interactive Deal Room remains at `/`.

```
npm install
npm run dev        # http://localhost:5173
npm test           # engine + D1–D6 acceptance tests
npm run build      # static output in dist/ (CSP meta injected)
python3 demo-materials/build-pdfs.py   # rebuild PDF props
```

Acceptance tests: **D1** `provided` refused · **D2** hard stop refuses proposes, reads still work · **D3** disclaimer verbatim on every response · **D4** zero network (including a static scan of `src/` for network-shaped identifiers) · **D5** evidence is plain text, injection changes nothing · **D6** human confirmations cannot be overridden — plus coverage for the tool-execution error boundary and signature-overlay confirmation flow. All tests pass.

## 中文摘要

面向创业者的"交易室"演示：一个商业事件、三道门、材料三态（已有/待提供/不存在）、事实署名确认、锚定对手方清单的阻塞项、行动看板与冻结快照。通过 WebMCP 暴露 5 个受限工具——agent 只能取证与提议，`provided` 与事实确认权归客户，硬停下自动化全部拒绝。零后端、零网络请求、零运行时依赖；案例为合成数据。

All names and documents are synthetic. Not legal advice.
