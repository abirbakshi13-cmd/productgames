// Ported from twin-design/screens/8-you.html
import { useMemo, useState, useSyncExternalStore } from 'react'
import { Character, Blob, Icon } from '../design/twin-engine.js'
import TabBar from '../components/TabBar.jsx'
import { getLook, subscribeLook, uuisFromProfile } from '../lib/twin.js'
import { useProfile } from '../lib/useProfile.js'
import { clearProfile } from '../lib/profileStore.js'
import { computeReceipt } from '../lib/receipt.js'
import { getHistory, subscribeHistory } from '../lib/historyStore.js'
import { tiles } from '../lib/stats.js'
import stories from '../data/stories.json'

const TOGGLES = [
  { id: 'morning', icon: 'sun', bg: 'var(--butter)', title: 'Morning brief', sub: 'Every day at 8:00 AM' },
  { id: 'alerts', icon: 'bell', bg: 'var(--sky)', title: 'Hits today alerts', sub: 'Only when something changes your plans' },
  { id: 'outside', icon: 'eye', bg: 'var(--lilac)', title: 'Outside your bubble', sub: 'One big story beyond your feed each week' },
]

const noop = () => {}

function dollars(v) {
  return `$${Math.round(Math.abs(v)).toLocaleString('en-US')}`
}

// Signed monthly range: positive = cost, negative = saving.
function formatNet(low, high) {
  let lo = Math.round(Number(low) || 0)
  let hi = Math.round(Number(high) || 0)
  if (lo > hi) [lo, hi] = [hi, lo]
  if (lo === 0 && hi === 0) return '$0/mo'
  if (lo >= 0) return lo === hi ? `+${dollars(hi)}/mo` : `+${dollars(lo)}–${dollars(hi)}/mo`
  if (hi <= 0) {
    const a = Math.abs(hi)
    const b = Math.abs(lo)
    return a === b ? `Saves ${dollars(b)}/mo` : `Saves ${dollars(a)}–${dollars(b)}/mo`
  }
  return `−${dollars(lo)} to +${dollars(hi)}/mo`
}

function countAffected(profile) {
  if (!profile) return 0
  let n = 0
  for (const s of stories) {
    try {
      if (computeReceipt(profile, s)?.status === 'affected') n++
    } catch {
      // skip malformed story
    }
  }
  return n
}

export default function You({ onEditTwin, onEditAnswers, onOpenHistory, onDeleted, onNav }) {
  const [profile] = useProfile()
  const look = useSyncExternalStore(subscribeLook, getLook, getLook)
  const history = useSyncExternalStore(subscribeHistory, getHistory, getHistory)
  const [on, setOn] = useState({ morning: true, outside: true, alerts: false })
  const [confirming, setConfirming] = useState(false)

  const storyCount = useMemo(() => countAffected(profile), [profile])
  const uuis = useMemo(() => uuisFromProfile(profile), [profile])
  const net = useMemo(() => tiles(history).net, [history])

  const deleteData = () => {
    clearProfile()
    setConfirming(false)
    onDeleted?.()
  }

  return (
    <div
      style={{
        width: 390,
        height: 844,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--paper)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          boxSizing: 'border-box',
          padding: '18px 20px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <h1 className="display-l" style={{ margin: 0 }}>You</h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: 14,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 130,
              height: 150,
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Blob color="sky" size={130} />
            </div>
            <span className="tw-bob" style={{ display: 'block', position: 'relative' }}>
              <Character look={{ ...look, mood: 'hyped' }} size={96} />
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="headline">Your Twin</span>
            <span className="tw-meta">
              {storyCount} {storyCount === 1 ? 'story' : 'stories'} for you
            </span>
            <button
              className="tw-btn tw-btn--secondary"
              type="button"
              onClick={onEditTwin ?? noop}
              style={{ height: 44, padding: '0 6px 0 16px' }}
            >
              Edit my Twin{' '}
              <span className="tw-dot" style={{ width: 32, height: 32 }}>
                <Icon name="edit" size={14} />
              </span>
            </button>
          </div>
        </div>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="tw-meta" style={{ margin: 0, color: 'var(--ink)' }}>What makes you, you</h2>
            <button className="tw-link" type="button" onClick={onEditAnswers ?? noop}>Edit answers</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {uuis.map((u, i) => (
              <span key={`${u.label}-${i}`} className="tw-chip" data-topic={u.topic}>{u.label}</span>
            ))}
          </div>
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="tw-meta" style={{ margin: 0, color: 'var(--ink)' }}>Your brief</h2>
          {TOGGLES.map((t) => {
            const checked = !!on[t.id]
            return (
              <button
                key={t.id}
                type="button"
                role="switch"
                aria-checked={checked ? 'true' : 'false'}
                onClick={() => setOn((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  border: 0,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <span
                  style={{
                    flex: 'none',
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    background: t.bg,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Icon name={t.icon} size={20} />
                </span>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ font: '600 15px/20px var(--font-sans)' }}>{t.title}</span>
                  <span style={{ font: '500 13px/17px var(--font-sans)', color: 'var(--ink-muted)' }}>{t.sub}</span>
                </span>
                <span
                  style={{
                    flex: 'none',
                    width: 50,
                    height: 30,
                    borderRadius: 'var(--radius-pill)',
                    background: checked ? 'var(--ink)' : 'var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'var(--surface)',
                      boxShadow: 'inset 0 0 0 1.5px var(--line)',
                      transform: `translateX(${checked ? '20px' : '0px'})`,
                    }}
                  />
                </span>
              </button>
            )
          })}
        </section>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: 14,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
          }}
        >
          <h2 className="tw-meta" style={{ margin: 0, color: 'var(--ink)' }}>Your news, last 4 weeks</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ font: '500 13px/17px var(--font-sans)', color: 'var(--ink-muted)' }}>Net monthly impact</span>
              <span className="headline">{formatNet(net?.low, net?.high)}</span>
              <span className="tw-meta">Estimate</span>
            </div>
            <button className="tw-link" type="button" onClick={onOpenHistory ?? noop}>
              See history <Icon name="arrow" size={14} />
            </button>
          </div>
        </div>
        {confirming ? (
          <div
            role="group"
            aria-label="Confirm delete"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 14,
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              boxShadow: 'inset 0 0 0 1.5px var(--line)',
            }}
          >
            <span className="body">Delete everything on this phone? Your answers and your Twin will be gone.</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button className="tw-btn" type="button" onClick={deleteData} style={{ height: 44, padding: '0 18px' }}>
                Delete my data
              </button>
              <button className="tw-link" type="button" onClick={() => setConfirming(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            className="tw-btn tw-btn--ghost"
            type="button"
            onClick={() => setConfirming(true)}
            style={{ alignSelf: 'center' }}
          >
            Delete my data
          </button>
        )}
      </div>
      <TabBar active="you" onNav={onNav ?? noop} />
    </div>
  )
}
