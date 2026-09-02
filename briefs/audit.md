# Brief — Part B: Store Audit (`src/audit/storeAudit.ts`)

> Distilled from SPEC §10. Read this instead of the whole SPEC for Part B.
> If anything here conflicts with SPEC.md, **SPEC.md wins**.

## Signature

```ts
export function auditStores(asOf: string): StoreAudit[]
```

## Types

```ts
interface StoreAudit {
  storeId: string
  weightedScore: number | null   // rounded; null if no counted tickets
  trend: 'up' | 'down' | 'flat' | null   // null if fewer than 2 counted tickets
  daysSinceLastTicket: number | null      // null if no counted tickets
  dormant: boolean
  status: 'thriving' | 'attention' | 'critical' | 'inactive'
}
```

## Validation

- `asOf` must match `YYYY-MM-DD`; otherwise throw `Error("Invalid date: <asOf>")`.
- Return **one entry per store** in `stores.json`, sorted by `storeId` ascending.

## Counted tickets (§10.2)

- For each store, count only tickets with `date ≤ asOf` (inclusive; compare ISO strings).
- Order counted tickets **most recent first**: `date` descending, ties broken by
  `id` descending. ("Latest" = first in this order.)

## Weighted score (§10.3)

- Take up to the **4 most recent** counted tickets with weights **4, 3, 2, 1**
  (most recent gets 4).
- `weightedScore = round2( Σ(weightᵢ × csatᵢ) / Σ(weightᵢ) )` (half-up, §6).

| Tickets used | Weights | Divisor |
|---|---|---|
| 4 | 4, 3, 2, 1 | 10 |
| 3 | 4, 3, 2 | 9 |
| 2 | 4, 3 | 7 |
| 1 | 4 | 4 |

- With 0 counted tickets → `weightedScore = null`.

## Trend (§10.4)

- Requires **at least 2** counted tickets.
- `s₁` = latest ticket's `csat` (integer 1–5).
- `prevMean` = arithmetic mean of the `csat` of the **next up to three** tickets
  (ticket 2, and optionally 3 and 4), rounded per §6.
- `'up'` if `s₁ > prevMean`; `'down'` if `s₁ < prevMean`; `'flat'` if equal
  (comparison on the **rounded** `prevMean`).
- Fewer than 2 counted tickets → `trend = null`.

## Recency (§10.5)

- `daysSinceLastTicket` = whole calendar days from the latest counted ticket's
  `date` to `asOf` (date-only arithmetic; same day → 0). `null` if no counted tickets.
- `dormant = true` when `daysSinceLastTicket` is `null` **or** strictly greater
  than **21**. (Exactly 21 days is **not** dormant.)

## Status (§10.6)

- `'inactive'` — no counted tickets.
- `'critical'` — `weightedScore < 3.0`.
- `'attention'` — `3.0 ≤ weightedScore < 4.0`.
- `'thriving'` — `weightedScore ≥ 4.0`.
- Boundaries decided on the **rounded** `weightedScore` (exactly 3.0 → attention;
  exactly 4.0 → thriving).
- `dormant` is **independent** of `status`.

## Read data via loaders

```ts
import { getStores, getTickets } from '../data'
```
