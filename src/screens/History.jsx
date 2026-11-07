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
import { Icon } from '../design/twin-engine.js'
import { topicFor, topicLabel } from '../lib/twin.js'

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

function headlineFor(entry) {
  return HEADLINES[entry.storyId] || 'Untitled story'
}

// --- Styles (design tokens) ---

// Chart colors: SVG attributes, so token values are written out (tokens.css --ink, --ink-muted, --line).
const INK = '#1c1b1f'
const INK_MUTED = '#5c5853'
const INK_LINE = '#e3dbcd'

const S = {
  screen: {
    width: 390,
    height: 844,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--paper)',
    color: 'var(--ink)',
    fontFamily: 'var(--font-sans)',
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    boxSizing: 'border-box',
    padding: '18px 20px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  header: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 14,
    borderRadius: 'var(--radius-lg)',
    background: 'var(--surface)',
  },
  section: { display: 'flex', flexDirection: 'column', gap: 10 },
  h2: { margin: 0, color: 'var(--ink)' },
  sub: { margin: 0, font: '500 13px/17px var(--font-sans)', color: 'var(--ink-muted)' },
  tiles: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 14,
    borderRadius: 'var(--radius-lg)',
    background: 'var(--surface)',
  },
  tileLabel: { font: '500 13px/17px var(--font-sans)', color: 'var(--ink-muted)' },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  catRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--surface)',
  },
  row: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    border: 0,
    borderRadius: 'var(--radius-lg)',
    background: 'var(--surface)',
    color: 'var(--ink)',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
  },
  rowHeadline: { font: '600 15px/20px var(--font-sans)' },
  rowMeta: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  receipt: { font: '600 13px/1 var(--font-sans)', color: 'var(--ink)' },
}

function Row({ entry, proposed: isProposed, onOpen }) {
  const topic = topicFor(entry.category)
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(entry.storyId)}
        style={isProposed ? { ...S.row, background: 'transparent', boxShadow: 'inset 0 0 0 1.5px var(--line)' } : S.row}
      >
        <span style={S.rowHeadline}>{headlineFor(entry)}</span>
        <span style={S.rowMeta}>
          <span className="tw-chip" data-topic={topic}>{topicLabel(topic)}</span>
          <span style={S.receipt}>{chipLabel(entry)}</span>
          <span className="tw-meta">{shortDate(entry.date)}</span>
        </span>
      </button>
    </li>
  )
}

// --- Component ---

export default function History({ onOpenStory, onBack }) {
  const history = useSyncExternalStore(safeSubscribe, safeGetHistory, safeGetHistory)

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

  const header = (
    <div style={S.header}>
      {onBack && (
        <button className="tw-iconbtn" type="button" aria-label="Back" onClick={onBack}>
          <Icon name="back" size={20} />
        </button>
      )}
      <h1 className="display-l" style={{ margin: 0 }}>Your news, last 4 weeks</h1>
    </div>
  )

  if (history.length === 0) {
    return (
      <div style={S.screen}>
        <div style={S.scroll}>
          {header}
          <div style={{ ...S.card, alignItems: 'flex-start', padding: 20 }}>
            <span className="tw-meta">Nothing yet</span>
            <span className="headline">No receipts yet</span>
            <p className="body" style={{ margin: 0, color: 'var(--ink-muted)' }}>
              As stories that affect you show up in your feed, we'll tally what they add up to here.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { t, series, cats, prop, weeks } = data
  const net = formatNet(t.net?.low, t.net?.high)

  return (
    <div style={S.screen}>
      <div style={S.scroll}>
        {header}

        <section style={S.tiles}>
          <div style={{ ...S.tile, gridColumn: '1 / -1' }}>
            <span className="tw-meta">Net monthly impact</span>
            <span className="display-l">{net.text}</span>
            <span className="tw-meta">Estimate</span>
          </div>
          <div style={S.tile}>
            <span style={S.tileLabel}>Stories that affected you</span>
            <span className="headline">{num(t.affectedCount)}</span>
          </div>
          <div style={S.tile}>
            <span style={S.tileLabel}>Rules that changed for you</span>
            <span className="headline">{num(t.rulesCount)}</span>
          </div>
          <div style={{ ...S.tile, gridColumn: '1 / -1' }}>
            <span style={S.tileLabel}>Deadlines coming up</span>
            <span className="headline">{num(t.upcomingDeadlines)}</span>
          </div>
        </section>

        {series.length > 0 && (
          <section style={S.section}>
            <h2 className="tw-meta" style={S.h2}>Running total</h2>
            <p style={S.sub}>Cumulative $/mo, range and midpoint</p>
            <div style={{ ...S.card, padding: '14px 10px 8px 4px' }}>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={INK_LINE} strokeDasharray="3 4" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: INK_MUTED, fontFamily: 'var(--font-mono)' }}
                    tickLine={false}
                    axisLine={{ stroke: INK_LINE }}
                  />
                  <YAxis
                    width={52}
                    tick={{ fontSize: 11, fill: INK_MUTED, fontFamily: 'var(--font-mono)' }}
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
                    contentStyle={{
                      fontSize: 12,
                      fontFamily: 'var(--font-sans)',
                      borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${INK_LINE}`,
                      color: INK,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="band"
                    stroke="none"
                    fill={INK_LINE}
                    fillOpacity={1}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="mid"
                    stroke={INK}
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: INK, stroke: INK }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {cats.length > 0 && (
          <section style={S.section}>
            <h2 className="tw-meta" style={S.h2}>By category</h2>
            <ul style={S.list}>
              {cats.map((c) => {
                const r = formatNet(c.low, c.high)
                const topic = topicFor(c.category)
                return (
                  <li key={c.category} style={S.catRow}>
                    <span className="tw-chip" data-topic={topic}>
                      {CATEGORY_LABELS[c.category] || c.category}
                    </span>
                    <span className="label">{r.text}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {weeks.length > 0 && (
          <section style={S.section}>
            <h2 className="tw-meta" style={S.h2}>Week by week</h2>
            {weeks.map((w) => (
              <div key={w.key} style={S.section}>
                <h3 className="tw-meta" style={{ margin: '4px 0 0' }}>{w.label}</h3>
                <ul style={S.list}>
                  {w.entries.map((e, i) => (
                    <Row key={`${e.storyId}-${i}`} entry={e} onOpen={open} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {prop.length > 0 && (
          <section style={S.section}>
            <h2 className="tw-meta" style={S.h2}>Could affect you</h2>
            <p style={S.sub}>Proposed, not law yet. Not counted in your totals.</p>
            <ul style={S.list}>
              {prop.map((e, i) => (
                <Row key={`${e.storyId}-${i}`} entry={e} proposed onOpen={open} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
