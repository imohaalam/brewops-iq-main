import { getStores, getTickets } from '../data'

export interface StoreAudit {
  storeId: string
  weightedScore: number | null
  trend: 'up' | 'down' | 'flat' | null
  daysSinceLastTicket: number | null
  dormant: boolean
  status: 'thriving' | 'attention' | 'critical' | 'inactive'
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function parseDateParts(date: string): [number, number, number] | null {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(date)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const dt = new Date(Date.UTC(year, month - 1, day))

  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null
  }

  return [year, month, day]
}

function dateToUtcMs(date: string): number {
  const parts = parseDateParts(date)
  if (!parts) {
    throw new Error(`Invalid date: ${date}`)
  }

  const [year, month, day] = parts
  return Date.UTC(year, month - 1, day)
}

export function auditStores(asOf: string): StoreAudit[] {
  if (!parseDateParts(asOf)) {
    throw new Error(`Invalid date: ${asOf}`)
  }

  const stores = getStores().slice().sort((a, b) => a.id.localeCompare(b.id))
  const tickets = getTickets()
  const asOfMs = dateToUtcMs(asOf)

  return stores.map((store) => {
    const counted = tickets
      .filter((ticket) => ticket.storeId === store.id && ticket.date <= asOf)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

    if (counted.length === 0) {
      return {
        storeId: store.id,
        weightedScore: null,
        trend: null,
        daysSinceLastTicket: null,
        dormant: true,
        status: 'inactive',
      }
    }

    const latest = counted[0]
    const weights = [4, 3, 2, 1]
    const used = counted.slice(0, Math.min(counted.length, weights.length))
    const numerator = used.reduce((sum, ticket, index) => {
      return sum + ticket.csat * weights[index]
    }, 0)
    const denominator = used.reduce((sum, _, index) => sum + weights[index], 0)
    const weightedScore = round2(numerator / denominator)

    let trend: 'up' | 'down' | 'flat' | null = null
    if (counted.length >= 2) {
      const prevTickets = counted.slice(1, Math.min(counted.length, 4))
      const prevMean = round2(
        prevTickets.reduce((sum, ticket) => sum + ticket.csat, 0) / prevTickets.length,
      )
      if (latest.csat > prevMean) trend = 'up'
      else if (latest.csat < prevMean) trend = 'down'
      else trend = 'flat'
    }

    const daysSinceLastTicket = Math.floor(
      (asOfMs - dateToUtcMs(latest.date)) / 86400000,
    )
    const dormant = daysSinceLastTicket > 21

    let status: StoreAudit['status']
    if (weightedScore < 3) status = 'critical'
    else if (weightedScore < 4) status = 'attention'
    else status = 'thriving'

    return {
      storeId: store.id,
      weightedScore,
      trend,
      daysSinceLastTicket,
      dormant,
      status,
    }
  })
}
