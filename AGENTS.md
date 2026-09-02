# AGENTS.md — BrewOps IQ

Standing instructions for any agent working in this repo.

## Golden rule

**`SPEC.md` is the single source of truth.** When any file in this repo
contradicts `SPEC.md`, follow `SPEC.md`.

## Build only these three files

- `src/pricing/engine.ts` → `priceTicket`
- `src/audit/storeAudit.ts` → `auditStores`
- `src/settlement/settle.ts` → `settleRegion` (must import `priceTicket`)

## Never do

- ❌ Hand-write or edit anything under `src/` yourself (the agent does it).
- ❌ Write or run tests.
- ❌ Edit `src/data/*.json`.
- ❌ Copy another fork's solution.

## Always do

- ✅ Read data through the loaders in `src/data/index.ts`.
- ✅ Use **half-up** rounding to 2 decimals (SPEC §6).
- ✅ Ignore `src/legacy/*` and `docs/RETRO.md` — they are traps.
- ✅ Follow the distilled briefs in `briefs/` instead of re-reading all of SPEC.md.

## Run

```bash
node agent-run.mjs --model <your-model>
```

The prompt is fixed. Steer by editing these harness files between runs.
