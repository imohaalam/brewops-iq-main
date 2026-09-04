# PLAN.md — Progress Note

> Update this between runs. It tells the next run what is done and what is next,
> so the agent does not re-discover finished work.

## Status

| Module | File | Status | Notes |
|--------|------|--------|-------|
| Part A — Pricing | `src/pricing/engine.ts` | ✅ DONE | 1.75 credits |
| Part B — Store Audit | `src/audit/storeAudit.ts` | ✅ DONE | ~1.85 credits |
| Part C — Region Settlement | `src/settlement/settle.ts` | 🔨 BUILD THIS RUN | Must reuse `priceTicket` |

## This Run Scope

**Build ONLY Part C: `src/settlement/settle.ts` with `settleRegion`.**
Read `briefs/settlement.md` for the distilled spec.
Parts A and B are already done — do NOT modify them.
**IMPORTANT:** `settleRegion` MUST import and reuse `priceTicket` from `../pricing/engine`.
After completing Part C, stop. All three modules will be complete.

## Strategy (beginner-friendly)

1. **Build Part A first.** It is the foundation. Parts B and C depend on it.
2. **Build Part B next.** It is independent — only needs the ticket log.
3. **Build Part C last.** It reuses `priceTicket`, so it must agree with Part A.
4. **Scope each run to one module.** Three focused runs beat one mega-run.
   Edit this file between runs to tell the agent which module to build.

## Rounding reminder (applies to all three)

- Half-up to 2 decimals. `1.005 → 1.01`.
- **Banker's rounding is WRONG** (legacy trap).
- Float artifact: `2.175` is stored as `2.17499…`. Use:
  ```ts
  function round2(x: number): number {
    return Math.round((x + Number.EPSILON) * 100) / 100
  }
  ```

## Traps to avoid (always)

- `src/legacy/*` — old register rules, all wrong.
- `docs/RETRO.md` — old register rules, all wrong.
- **`SPEC.md` is the only source of truth.**

## Cost log

| Run | Model | Module | Credits | Compiles |
|-----|-------|--------|---------|----------|
| 1 | — | — | — | — |
