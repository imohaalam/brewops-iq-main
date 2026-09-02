# Brief — Part C: Region Settlement (`src/settlement/settle.ts`)

> Distilled from SPEC §11. Read this instead of the whole SPEC for Part C.
> If anything here conflicts with SPEC.md, **SPEC.md wins**.
> **This module reuses `priceTicket` from `../pricing/engine` — the parts must agree.**

## Signature

```ts
export function settleRegion(input: SettleRegionInput): RegionSettlement
```

## Types

```ts
interface SettleRegionInput {
  regionId: string
  date: string                    // pricing date, passed to priceTicket
  tickets: Array<{
    storeId: string
    memberId: string | null
    lines: CartLine[]
  }>
}
interface RegionSettlement {
  regionId: string
  date: string
  grossTotal: number
  lineDiscountTotal: number
  orderDiscountTotal: number
  discountTotal: number
  netTotal: number
  perCategory: Record<string, number>
  offerUsage: Record<string, number>
  bonus: number
  storesVisited: string[]
  storesMissed: string[]
}
```

## Validation & pricing (§11.2)

- Unknown `regionId` (via `getRegions()`) → throw `Error("Unknown region: <regionId>")`.
- Every ticket's `storeId` must be one of the region's stores; otherwise throw
  `Error("Store not in region: <storeId>")`. Multiple tickets per store allowed.
  An empty `tickets` array is valid.
- Price **each ticket** by calling `priceTicket({ lines, memberId, date })`
  from `../pricing/engine`. All of §11.3–§11.6 aggregate over those results.
  Any error thrown by `priceTicket` propagates unchanged.

## Money totals (§11.3) — all rounded half-up 2dp

- `grossTotal` = round2( sum of every priced line's `gross` ).
- `lineDiscountTotal` = round2( sum of every priced line's `discount` ).
- `orderDiscountTotal` = round2( sum of every ticket's `orderLevel.discount` ).
- `discountTotal` = round2( lineDiscountTotal + orderDiscountTotal ).
- `netTotal` = round2( sum of every ticket's `total` ).

## Per-category nets (§11.4)

- `perCategory` maps each menu category that appears in the tickets to
  `round2( sum of its lines' net )`.
- Categories with no lines are **absent** (not 0).
- **Order-level discounts are NOT allocated to categories.**
- Keys sorted ascending.

## Offer usage (§11.5)

- `offerUsage` counts applications: each priced **line** with `appliedOfferId`
  adds 1 to that offer; each ticket's `orderLevel.appliedOfferId` (when non-null)
  adds 1.
- Offers never applied are absent. Keys sorted ascending.

## Bonus — marginal tiers on `netTotal` (§11.6)

The shift bonus is **marginal** (like tax brackets), computed on `netTotal`,
rounded per §6 only at the end:

| Tier | Portion of netTotal | Rate |
|---|---|---|
| 1 | first 250.00 | 3% |
| 2 | over 250.00 up to 750.00 | 6% |
| 3 | over 750.00 | 10% |

Examples:
- `netTotal` 400.00 → 250×3% + 150×6% = 7.50 + 9.00 = **16.50**
- `netTotal` 1000.00 → 250×3% + 500×6% + 250×10% = 7.50 + 30.00 + 25.00 = **62.50**
- `netTotal` 316.86 → 250×3% + 66.86×6% = 7.50 + 4.0116 = 11.5116 → **11.51**

(A flat single-rate reading is wrong.)

## Stores (§11.7)

- `storesVisited` = the region's stop `storeId`s that have **≥ 1 ticket**, in
  **region order**, no duplicates (even if a store appears twice as a stop, list
  it once, at its first position in the region).
- `storesMissed` = the remaining stop storeIds, in region order, also deduplicated.

## Read data via loaders

```ts
import { getRegions, getRegion } from '../data'
import { priceTicket } from '../pricing/engine'
```
