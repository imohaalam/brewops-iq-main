import { getMenuItem, getRegion } from '../data'
import {
  priceTicket,
  type CartLine,
  type PricedTicket,
} from '../pricing/engine'

export interface SettleRegionInput {
  regionId: string
  date: string
  tickets: Array<{
    storeId: string
    memberId: string | null
    lines: CartLine[]
  }>
}

export interface RegionSettlement {
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

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function sortedRecord(values: Map<string, number>): Record<string, number> {
  const result: Record<string, number> = {}
  for (const key of [...values.keys()].sort()) {
    result[key] = round2(values.get(key) ?? 0)
  }
  return result
}

function calculateBonus(netTotal: number): number {
  const firstTier = Math.min(netTotal, 250)
  const secondTier = Math.min(Math.max(netTotal - 250, 0), 500)
  const thirdTier = Math.max(netTotal - 750, 0)
  return round2(firstTier * 0.03 + secondTier * 0.06 + thirdTier * 0.1)
}

export function settleRegion(input: SettleRegionInput): RegionSettlement {
  const region = getRegion(input.regionId)
  if (!region) {
    throw new Error(`Unknown region: ${input.regionId}`)
  }

  const stopIds = [...new Set(region.stores.map((store) => store.storeId))]
  const stopSet = new Set(stopIds)
  for (const ticket of input.tickets) {
    if (!stopSet.has(ticket.storeId)) {
      throw new Error(`Store not in region: ${ticket.storeId}`)
    }
  }

  const pricedTickets: Array<{ storeId: string; priced: PricedTicket }> = []
  for (const ticket of input.tickets) {
    pricedTickets.push({
      storeId: ticket.storeId,
      priced: priceTicket({
        lines: ticket.lines,
        memberId: ticket.memberId,
        date: input.date,
      }),
    })
  }

  let grossTotal = 0
  let lineDiscountTotal = 0
  let orderDiscountTotal = 0
  let netTotal = 0
  const categoryTotals = new Map<string, number>()
  const offerCounts = new Map<string, number>()

  for (const { priced } of pricedTickets) {
    for (const line of priced.lines) {
      grossTotal += line.gross
      lineDiscountTotal += line.discount

      const item = getMenuItem(line.productId)
      if (item) {
        categoryTotals.set(
          item.category,
          (categoryTotals.get(item.category) ?? 0) + line.net,
        )
      }

      if (line.appliedOfferId) {
        offerCounts.set(
          line.appliedOfferId,
          (offerCounts.get(line.appliedOfferId) ?? 0) + 1,
        )
      }
    }

    orderDiscountTotal += priced.orderLevel.discount
    netTotal += priced.total
    if (priced.orderLevel.appliedOfferId) {
      const offerId = priced.orderLevel.appliedOfferId
      offerCounts.set(offerId, (offerCounts.get(offerId) ?? 0) + 1)
    }
  }

  grossTotal = round2(grossTotal)
  lineDiscountTotal = round2(lineDiscountTotal)
  orderDiscountTotal = round2(orderDiscountTotal)
  const discountTotal = round2(lineDiscountTotal + orderDiscountTotal)
  netTotal = round2(netTotal)

  const visited = new Set(pricedTickets.map((ticket) => ticket.storeId))
  const storesVisited = stopIds.filter((storeId) => visited.has(storeId))
  const storesMissed = stopIds.filter((storeId) => !visited.has(storeId))

  return {
    regionId: input.regionId,
    date: input.date,
    grossTotal,
    lineDiscountTotal,
    orderDiscountTotal,
    discountTotal,
    netTotal,
    perCategory: sortedRecord(categoryTotals),
    offerUsage: sortedRecord(offerCounts),
    bonus: calculateBonus(netTotal),
    storesVisited,
    storesMissed,
  }
}
