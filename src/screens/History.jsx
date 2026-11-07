import { useMemo, useSyncExternalStore } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getHistory, subscribeHistory, markOpened } from '../lib/historyStore.js'
import { tiles, weeklySeries, byCategory, proposed } from '../lib/stats.js'
import { formatReceipt } from '../lib/receipt.js'
import stories from '../data/stories.json'
import './History.css'

const EMPTY = []

const CATEGORY_LABELS = {
  rent: 'Rent & housing',
  loans: 'Student loans',
  work: 'Work & wages',
  transit: 'Transit',
  prices: 'Prices',
  other: 'Other',
}

const HEADLINES = Object.fromEntries(stories.map((s) => [s.id, s.headline]))

// --- Store access (guarded so the screen never crashes) ---

function safeSubscribe(fn) {
  try {
    const unsub = subscribeHistory(fn)
    return typeof unsub === 'function' ? unsub : () => {}
  } catch {
    return () => {}
  }
}

function safeGetHistory() {
  try {
    const h = getHistory()
    return Array.isArray(h) ? h : EMPTY
  } catch {
    return EMPTY
  }
}

function safe(fn, h, fallback) {
  try {
    return fn(h) ?? fallback
  } catch {
    return fallback
  }
}

// --- Formatting helpers ---

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function dollars(v) {
  return `$${Math.round(Math.abs(v)).toLocaleString('en-US')}`
}

// Signed monthly range: positive = cost, negative = saving.
function formatNet(low, high, unit = '/mo') {
  let lo = Math.round(num(low))
  let hi = Math.round(num(high))
  if (lo > hi) [lo, hi] = [hi, lo]
  if (lo === 0 && hi === 0) return { text: `$0${unit}`, tone: 'neutral' }
  if (lo >= 0) {
    const text = lo === hi ? `+${dollars(hi)}${unit}` : `+${dollars(lo)}–${dollars(hi)}${unit}`
    return { text, tone: 'cost' }
  }
  if (hi <= 0) {
    const a = Math.abs(hi)
    const b = Math.abs(lo)
    const text = a === b ? `Saves ${dollars(b)}${unit}` : `Saves ${dollars(a)}–${dollars(b)}${unit}`
    return { text, tone: 'saving' }
  }
  return { text: `−${dollars(lo)} to +${dollars(hi)}${unit}`, tone: 'neutral' }
}

function parseDate(s) {
  if (typeof s !== 'string') return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function shortDate(s) {
  const d = parseDate(s)
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
}

function mondayKey(s) {
  const d = parseDate(s)
  if (!d) return 'unknown'
  const offset = (d.getDay() + 6) % 7 // days since Monday
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset)
  const mm = String(mon.getMonth() + 1).padStart(2, '0')
  const dd = String(mon.getDate()).padStart(2, '0')
  return `${mon.getFullYear()}-${mm}-${dd}`
}

function fallbackChip(entry) {
  switch (entry.type) {
    case 'money': {
      const sign = entry.direction === 'saving' ? -1 : 1
      return formatNet(sign * num(entry.low), sign * num(entry.high), entry.unit || '/mo').text
    }
    case 'deadline':
      return entry.dueDate ? `Due ${shortDate(entry.dueDate)}` : 'Deadline'
    case 'rule':
      return 'Rule change'
    case 'rep':
      return 'Your rep'
    default:
      return 'Affects you'
  }
}

function chipLabel(entry) {
  try {
    const label = formatReceipt({ status: 'affected', ...entry })
    return typeof label === 'string' && label ? label : fallbackChip(entry)
  } catch {
    return fallbackChip(entry)
  }
}

function chipTone(entry) {
  if (entry.type === 'money') return entry.direction === 'saving' ? 'saving' : 'cost'
  if (entry.type === 'deadline') return 'deadline'
  return 'neutral'
}

function headlineFor(entry) {
  return HEADLINES[entry.storyId] || 'Untitled story'
}

// --- Component ---

export default function History({ onOpenStory }) {
  const history = useSyncExternalStore(safeSubscribe, safeGetHistory)

  const data = useMemo(() => {
    const t = safe(tiles, history, {})
    const series = safe(weeklySeries, history, []).map((p) => ({
      week: p.week,
      mid: num(p.mid),
      band: [num(p.low), num(p.high)],
    }))
    const cats = safe(byCategory, history, [])
    const prop = safe(proposed, history, [])

    const counted = history.filter((e) => e.stage !== 'proposed')
    const groups = new Map()
    for (const e of counted) {
      const key = mondayKey(e.date)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(e)
    }
    const weeks = [...groups.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, entries]) => ({
        key,
        label: key === 'unknown' ? 'Undated' : `Week of ${shortDate(key)}`,
        entries: [...entries].sort((a, b) => String(b.date).localeCompare(String(a.date))),
      }))

    return { t, series, cats, prop, weeks }
  }, [history])

  const open = (id) => {
    try {
      markOpened(id)
    } catch {
      // store not ready; still navigate
    }
    onOpenStory?.(id)
  }

  if (history.length === 0) {
    return (
      <div className="history">
        <h1 className="history-title">Your news, last 4 weeks</h1>
        <div className="history-empty">
          <div className="history-empty-icon" aria-hidden="true">🧾</div>
          <p className="history-empty-head">No receipts yet</p>
          <p className="history-empty-body">
            As stories that affect you show up in your feed, we'll tally what they add up to here.
          </p>
        </div>
      </div>
    )
  }

  const { t, series, cats, prop, weeks } = data
  const net = formatNet(t.net?.low, t.net?.high)

  return (
    <div className="history">
      <h1 className="history-title">Your news, last 4 weeks</h1>

      <section className="history-tiles">
        <div className="history-tile history-tile-net">
          <span className="history-tile-label">Net monthly impact</span>
          <span className={`history-tile-value history-tone-${net.tone}`}>{net.text}</span>
          <span className="history-estimate">Estimate</span>
        </div>
        <div className="history-tile">
          <span className="history-tile-label">Stories that affected you</span>
          <span className="history-tile-value">{num(t.affectedCount)}</span>
        </div>
        <div className="history-tile">
          <span className="history-tile-label">Rules that changed for you</span>
          <span className="history-tile-value">{num(t.rulesCount)}</span>
        </div>
        <div className="history-tile">
          <span className="history-tile-label">Deadlines coming up</span>
          <span className="history-tile-value">{num(t.upcomingDeadlines)}</span>
        </div>
      </section>

      {series.length > 0 && (
        <section className="history-section">
          <h2 className="history-h2">Running total</h2>
          <p className="history-sub">Cumulative $/mo, range and midpoint</p>
          <div className="history-chart">
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#eef0f3" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  width={52}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v < 0 ? '−' : ''}$${Math.abs(Math.round(v))}`}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (Array.isArray(value)) {
                      return [formatNet(value[0], value[1]).text, 'Range']
                    }
                    return [`${value < 0 ? '−' : ''}$${Math.abs(Math.round(value))}/mo`, name === 'mid' ? 'Midpoint' : name]
                  }}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="band"
                  stroke="none"
                  fill="#4f46e5"
                  fillOpacity={0.15}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="mid"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#4f46e5' }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {cats.length > 0 && (
        <section className="history-section">
          <h2 className="history-h2">By category</h2>
          <ul className="history-list">
            {cats.map((c) => {
              const r = formatNet(c.low, c.high)
              return (
                <li key={c.category} className="history-cat-row">
                  <span className="history-cat-name">
                    {CATEGORY_LABELS[c.category] || c.category}
                  </span>
                  <span className={`history-cat-value history-tone-${r.tone}`}>{r.text}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {weeks.length > 0 && (
        <section className="history-section">
          <h2 className="history-h2">Week by week</h2>
          {weeks.map((w) => (
            <div key={w.key} className="history-week">
              <h3 className="history-week-label">{w.label}</h3>
              <ul className="history-list">
                {w.entries.map((e, i) => (
                  <li key={`${e.storyId}-${i}`}>
                    <button type="button" className="history-row" onClick={() => open(e.storyId)}>
                      <span className="history-row-headline">{headlineFor(e)}</span>
                      <span className="history-row-meta">
                        <span className={`history-chip history-chip-${chipTone(e)}`}>
                          {chipLabel(e)}
                        </span>
                        <span className="history-row-date">{shortDate(e.date)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {prop.length > 0 && (
        <section className="history-section">
          <h2 className="history-h2">Could affect you</h2>
          <p className="history-sub">Proposed, not law yet. Not counted in your totals.</p>
          <ul className="history-list">
            {prop.map((e, i) => (
              <li key={`${e.storyId}-${i}`}>
                <button
                  type="button"
                  className="history-row history-row-proposed"
                  onClick={() => open(e.storyId)}
                >
                  <span className="history-row-headline">{headlineFor(e)}</span>
                  <span className="history-row-meta">
                    <span className="history-chip history-chip-proposed">{chipLabel(e)}</span>
                    <span className="history-row-date">{shortDate(e.date)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
