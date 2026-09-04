import type { Member, Offer } from '../data'
import {
  getMember,
  getMenuItem,
  getOffers,
} from '../data'

export interface CartLine {
  productId: string
  qty: number
}

export interface PriceTicketInput {
  lines: CartLine[]
  memberId: string | null
  date: string
}

export interface PricedLine {
  productId: string
  qty: number
  unitPrice: number
  gross: number
  appliedOfferId: string | null
  discount: number
  net: number
}

export interface PricedTicket {
  lines: PricedLine[]
  orderLevel: {
    appliedOfferId: string | null
    discount: number
  }
  subtotal: number
  total: number
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

type Weekday = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'

function weekday(date: string): Weekday {
  const [year, month, day] = date.split('-').map(Number)
  const names: Weekday[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return names[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
}

function isEligible(
  offer: Offer,
  date: string,
  tier: Member['tier'] | undefined,
): boolean {
  if (date < offer.validFrom || date > offer.validTo) return false
  if (offer.dayOfWeek && !offer.dayOfWeek.includes(weekday(date))) {
    return false
  }
  if (offer.eligibleTiers && (!tier || !offer.eligibleTiers.includes(tier))) {
    return false
  }
  return true
}

function winsTie(candidate: Offer, current: Offer): boolean {
  if (candidate.validFrom !== current.validFrom) {
    return candidate.validFrom < current.validFrom
  }
  return candidate.id < current.id
}

export function priceTicket(input: PriceTicketInput): PricedTicket {
  const member = input.memberId === null ? undefined : getMember(input.memberId)
  if (input.memberId !== null && !member) {
    throw new Error(`Unknown member: ${input.memberId}`)
  }

  const cartItems = input.lines.map((line) => {
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      throw new Error(`Invalid qty for ${line.productId}`)
    }
    const item = getMenuItem(line.productId)
    if (!item) throw new Error(`Unknown product: ${line.productId}`)
    return { line, item }
  })

  const activeOffers = getOffers().filter((offer) =>
    isEligible(offer, input.date, member?.tier),
  )
  const quantities = new Map<string, number>()
  for (const { line } of cartItems) {
    quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.qty)
  }

  const pricedLines: PricedLine[] = cartItems.map(({ line, item }) => {
    const gross = round2(item.basePrice * line.qty)
    let bestOffer: Offer | undefined
    let bestDiscount = 0

    for (const offer of activeOffers) {
      let matches = false
      let discount = 0
      if (offer.type === 'percent_off') {
        matches =
          offer.scope.category === item.category ||
          (offer.scope.productIds?.includes(item.id) ?? false)
        if (matches) discount = round2((gross * offer.percent) / 100)
      } else if (offer.type === 'bundle') {
        matches = offer.products[0] === item.id
        if (matches) {
          const buyQty = quantities.get(offer.products[0]) ?? 0
          const getQty = quantities.get(offer.products[1]) ?? 0
          const pairs = Math.min(buyQty, getQty)
          discount = round2(pairs * offer.amountOff)
        }
      }

      discount = Math.min(gross, discount)
      if (matches && discount > 0 &&
          (!bestOffer || discount > bestDiscount ||
            (discount === bestDiscount && winsTie(offer, bestOffer)))) {
        bestOffer = offer
        bestDiscount = discount
      }
    }

    const net = Math.max(0, round2(gross - bestDiscount))
    return {
      productId: line.productId,
      qty: line.qty,
      unitPrice: item.basePrice,
      gross,
      appliedOfferId: bestOffer?.id ?? null,
      discount: round2(bestDiscount),
      net,
    }
  })

  const subtotal = round2(pricedLines.reduce((sum, line) => sum + line.net, 0))
  let orderOffer: Offer | undefined
  let orderDiscount = 0
  for (const offer of activeOffers) {
    if (offer.type !== 'spend_threshold') continue
    const relevant = offer.category
      ? pricedLines.reduce((sum, line) => {
          const item = getMenuItem(line.productId)
          return item?.category === offer.category ? sum + line.net : sum
        }, 0)
      : subtotal
    if (relevant >= offer.minSubtotal &&
        (!orderOffer || offer.amountOff > orderDiscount ||
          (offer.amountOff === orderDiscount && winsTie(offer, orderOffer)))) {
      orderOffer = offer
      orderDiscount = offer.amountOff
    }
  }

  orderDiscount = round2(orderDiscount)
  return {
    lines: pricedLines,
    orderLevel: {
      appliedOfferId: orderOffer?.id ?? null,
      discount: orderDiscount,
    },
    subtotal,
    total: Math.max(0, round2(subtotal - orderDiscount)),
  }
}
