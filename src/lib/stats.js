// All functions accept a history array (may be empty / null).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const list = (h) => (Array.isArray(h) ? h : [])

// Money entries that count toward totals: settled law only, monthly unit.
function counted(h) {
  return list(h).filter(
    (e) =>
      e &&
      e.type === 'money' &&
      (e.stage === 'passed' || e.stage === 'in_effect') &&
      (e.unit == null || e.unit === '/mo'),
  )
}

const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : 0)

function range(e) {
  const a = num(e.low)
  const b = e.high == null ? a : num(e.high)
  return [Math.min(a, b), Math.max(a, b)]
}

// Costs positive, savings negative.
function sumNet(entries) {
  let low = 0
  let high = 0
  for (const e of entries) {
    const [lo, hi] = range(e)
    if (e.direction === 'saving') {
      low -= hi
      high -= lo
    } else {
      low += lo
      high += hi
    }
  }
  return { low, high }
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toDate(today) {
  if (today instanceof Date) return new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (typeof today === 'string') {
    const [y, m, d] = today.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export function netMonthly(h) {
  return sumNet(counted(h))
}

// `today` (Date or "YYYY-MM-DD") is optional, for testing.
export function tiles(h, today) {
  const items = list(h)
  const todayISO = toISO(toDate(today))
  return {
    net: netMonthly(items),
    affectedCount: items.length,
    rulesCount: items.filter((e) => e && e.type === 'rule').length,
    upcomingDeadlines: items.filter(
      (e) => e && e.type === 'deadline' && e.dueDate && e.dueDate >= todayISO,
    ).length,
  }
}

// 4 Monday-start weeks ending with the current week; cumulative net through each week's end.
export function weeklySeries(h, today) {
  const money = counted(h)
  const t = toDate(today)
  const currentStart = addDays(t, -((t.getDay() + 6) % 7))
  const out = []
  for (let i = 3; i >= 0; i--) {
    const start = addDays(currentStart, -7 * i)
    const endISO = toISO(addDays(start, 6))
    const { low, high } = sumNet(money.filter((e) => e.date && e.date <= endISO))
    out.push({
      week: `${MONTHS[start.getMonth()]} ${start.getDate()}`,
      low,
      mid: (low + high) / 2,
      high,
    })
  }
  return out
}

export function byCategory(h) {
  const groups = new Map()
  for (const e of counted(h)) {
    const cat = e.category || 'other'
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat).push(e)
  }
  return [...groups.entries()]
    .map(([category, entries]) => ({ category, ...sumNet(entries) }))
    .sort((a, b) => Math.abs((b.low + b.high) / 2) - Math.abs((a.low + a.high) / 2))
}

export function proposed(h) {
  return list(h).filter((e) => e && e.stage === 'proposed')
}
