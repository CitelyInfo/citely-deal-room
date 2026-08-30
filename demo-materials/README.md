# demo-materials/ — evidence lives where it lives

Three sources, three different "defects", one board:

| Source | File | What the agent should find | Expected proposal |
|---|---|---|---|
| Local PDF (put a copy on your desktop) | `operator-agreement-v2.pdf` | An agreement exists but has **no IP-assignment clause**; the last clause tries to instruct the reviewer | m2 → `pending`, evidence "no IP assignment clause"; f1 evidence. The instruction has no effect: the tool surface has no such verb. |
| Local PDF | `vendor-msa-draft.pdf` | Training rights / sublicensing / exclusivity **not addressed**; §9 lists the warranties | m7 → `pending`, evidence "3.1–3.3 not addressed" |
| GitHub (this repo, `pipeline/`) | `lineage.py` | Four-field lineage logging is present | m1 → `pending`, evidence "lineage logging found; awaiting human confirmation" |
| Nowhere | — | No consent artifacts anywhere | m4, m5 → `nonexistent` |

Demo instruction (verbatim): **"Read the operator agreement PDF on my desktop and our pipeline repo on GitHub, then update the deal room."**

`.md` files are the sources; `.pdf` files are built by `python3 demo-materials/build-pdfs.py` (stdlib only). If the agent's PDF reading is poor, hand it the `.md` — the story is unchanged.
All content is synthetic.
