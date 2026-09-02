# Brief — Part A: Pricing Engine (`src/pricing/engine.ts`)

> Distilled from SPEC §2–§7. Read this instead of the whole SPEC for Part A.
> If anything here conflicts with SPEC.md, **SPEC.md wins**.

## Signature

```ts
export function priceTicket(input: PriceTicketInput): PricedTicket
```

## Types (from SPEC §2)

```ts
interface CartLine { productId: string; qty: number }   // qty ≥ 1, integer
interface PriceTicketInput {
  lines: CartLine[]
  memberId: string | null   // null = walk-in
  date: string              // ISO date, e.g. "2026-07-15"
}
interface PricedLine {
  productId: string
  qty: number
  unitPrice: number         // from menu.basePrice
  gross: number            // unitPrice * qty, rounded
  appliedOfferId: string | null
  discount: number         // ≥ 0, rounded
  net: number              // gross - discount, never below 0
}
interface PricedTicket {
  lines: PricedLine[]
  orderLevel: { appliedOfferId: string | null; discount: number }
  subtotal: number         // sum of line nets
  total: number            // subtotal - orderLevel.discount, floored at 0
}
```

## Rounding (SPEC §6) — the #1 failure cause

- Every money value → **2 decimals, half-up**. `1.005 → 1.01`.
- **Banker's rounding is WRONG** (that's the legacy trap).
- Float artifact: `2.175` is stored as `2.17499…`. A naive
  `Math.round(x*100)/100` gives `2.17` but the spec needs `2.18`.
  Use a helper like:
  ```ts
  function round2(x: number): number {
    return Math.round((x + Number.EPSILON) * 100) / 100
  }
  ```
- Round each line's `gross` and `discount` independently, then
  `net = round2(gross - discount)`, clamped at 0.
- `subtotal = round2(sum of line nets)`.
- `total = round2(subtotal - orderLevel.discount)`, clamped at 0.

## Offer types (SPEC §3)

### `percent_off` (line-level)
- `scope` has **either** `category` **or** `productIds[]`.
- Applies to a line if the line's product matches the scope.
- `discount = round2(gross * percent / 100)`.

### `bundle` (line-level, two-product)
- `products = [buyProductId, getProductId]` — exactly two distinct ids.
- Discounts the **buy** line (`products[0]`). The **get** line (`products[1]`)
  is a **requirement** (must be in cart at qty ≥ 1) but is **not** discounted.
- `pairs = min(qty of products[0], qty of products[1])`.
- `discount = round2(pairs * amountOff)`.
- If the get line is absent → `pairs = 0` → discount 0 → **not applicable**.
- Clamp so the buy line's `net` never goes below 0.

### `spend_threshold` (order-level)
- Evaluated **after** all line-level offers.
- `category` optional. If present, qualify on sum of **line nets** in that
  category. If absent, qualify on **order subtotal** (sum of all line nets).
- Qualifies when amount **≥ minSubtotal** (inclusive).
- `orderLevel.discount = amountOff` (fixed).

## Validity & eligibility (SPEC §4)

- Date-active when `validFrom ≤ date ≤ validTo` — **both inclusive**.
- `dayOfWeek` (array of `Sun|Mon|...|Sat`): if present, only active on those
  weekdays. Compute from ISO date as **UTC**:
  ```ts
  const [y, m, d] = date.split('-').map(Number)
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay()  // 0=Sun … 6=Sat
  ```
- `eligibleTiers`: if present, the ticket **must** have a member whose tier is
  in the list. A walk-in (`memberId === null`) is **never** eligible.
  If absent, all members **and** walk-ins are eligible.
- **Loyalty tier alone grants NO automatic discount.** (Legacy trap.)

## Stacking & selection (SPEC §5)

1. **At most one line-level offer per line.** If several match, pick the one
   with the **largest clamped discount** ("best for customer").
2. Tie-break: earlier `validFrom` wins; if still tied, offer whose `id` sorts
   first lexicographically wins.
3. A line offer with computed (clamped) discount **0** is not applicable.
4. **At most one order-level offer per order.** If several qualify, pick the
   largest `amountOff`; tie-break as rule 2.
5. Line-level and order-level offers **do stack** with each other.
6. The same offer may apply to multiple lines if its scope matches them.
7. **No cumulative stacking on a single line** — only the winner is applied.

## Edge cases (SPEC §7)

- Empty `lines` → valid: no lines, subtotal 0, total 0, no offers.
- Unknown `productId` → throw `Error("Unknown product: <id>")`.
- `memberId` non-null but unknown → throw `Error("Unknown member: <id>")`.
- `memberId === null` is valid (walk-in).
- `qty` ≤ 0 or non-integer → throw `Error("Invalid qty for <productId>")`.
- A bundle whose buy-line discount would exceed the buy line's `gross` is
  clamped at `gross` (line net 0). Selection uses the clamped amount.

## Read data via loaders

```ts
import { getMenu, getMembers, getOffers, getMenuItem, getMember } from '../data'
```
