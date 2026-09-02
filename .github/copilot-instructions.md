# Copilot Instructions — BrewOps IQ Harness

> **Read this first.** This file tells the AI agent how to build the three
> missing modules. It is the "recipe card" that steers the agent.

## The one rule that matters most

**`SPEC.md` is the ONLY source of truth.**

If anything in this repo contradicts `SPEC.md`, **`SPEC.md` wins, every time.**
This is not a suggestion — it is the whole point of the assignment.

## What to build

Three files, nothing else:

| File | Function | Spec section |
|------|----------|--------------|
| `src/pricing/engine.ts` | `priceTicket` | SPEC §2–§7 |
| `src/audit/storeAudit.ts` | `auditStores` | SPEC §10 |
| `src/settlement/settle.ts` | `settleRegion` | SPEC §11 |

Create files **only** under `src/pricing`, `src/audit`, and `src/settlement`.
Do **not** write or run tests. Do **not** edit `src/data/*.json`.

## The traps — do NOT follow these

The repo contains **old, wrong** code that looks authoritative but is a trap.
If you see these, **ignore them and follow `SPEC.md` instead**:

| Trap location | What it says | Why it is WRONG |
|---------------|--------------|-----------------|
| `src/legacy/pricingV0.ts` | Banker's rounding | SPEC §6 requires **half-up** rounding |
| `src/legacy/pricingV0.ts` | Loyalty tier gives automatic % off | SPEC §4: tier only affects **eligibility**, never a discount |
| `src/legacy/pricingV0.ts` | Cumulative offer stacking | SPEC §5: **at most one** line-level offer per line |
| `src/legacy/pricingV0.ts` | Date window `[validFrom, validTo)` exclusive | SPEC §4: **both endpoints inclusive** |
| `src/legacy/pricingV0.ts` | Bundle applies once per ticket | SPEC §3.2: pairs = `min(qty of buy, qty of get)` |
| `src/legacy/pricingV0.ts` | Ignore `dayOfWeek` | SPEC §4: **use** `dayOfWeek` |
| `docs/RETRO.md` | Old register rules | All of the above — **ignore entirely** |

## How to read data

Use the typed loaders in `src/data/index.ts`. **Do not** read the JSON files
directly.

```ts
import { getMenu, getMembers, getOffers, getStores, getRegions, getTickets,
         getMenuItem, getMember, getStore, getRegion } from '../data'
```

## Rounding (the #1 cause of failures)

Every money value is rounded to **2 decimals, half-up** (SPEC §6).
`1.005 → 1.01`. **Banker's rounding is wrong.**

Beware float artifacts: `2.175` is stored as `2.17499…`, so a naive
`Math.round(x * 100) / 100` gives `2.17` when the spec needs `2.18`.
Use a rounding helper that adds a tiny epsilon or uses `toFixed`-based logic.

## Progress

See `PLAN.md` for what is done and what is next. Update it between runs.
