// Ported from twin-design/screens/7-know-more-story.html
import { useEffect, useState, useSyncExternalStore } from 'react'
import stories from '../data/stories.json'
import { Character, Icon, Twin } from '../design/twin-engine.js'
import { computeReceipt } from '../lib/receipt.js'
import { useProfile } from '../lib/useProfile.js'
import { saveProfile } from '../lib/profileStore.js'
import { markOpened } from '../lib/historyStore.js'
import { getLook, subscribeLook, matchedUuis, moodFor, topicColor, topicFor, topicLabel, bubbleFor } from '../lib/twin.js'
import { ASK_COPY, FIELD_OPTIONS } from '../shared/fields.js'
import NewsCard from '../components/NewsCard.jsx'

const { badgeLabel, shortDate } = NewsCard

// Answer options for ask-in-context. Loans gets a "Both" option (profile allows it).
function optionsFor(field) {
  const base = FIELD_OPTIONS[field] || []
  if (field !== 'loans') return base
  const none = base.filter((o) => o.value === 'none')
  return [...base.filter((o) => o.value !== 'none'), { value: 'both', label: 'Both' }, ...none]
}

const OPTION_ICONS = {
  renting: 'house', dorm: 'dorm', family: 'family', own: 'house',
  federal: 'coin', private: 'coin', both: 'coin',
  'part-time': 'clock', 'full-time': 'briefcase',
  car: 'car', transit: 'train', 'bike-walk': 'bike',
  none: 'skip',
}

function money(n) {
  return `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

// "+$100–$150/mo" or "Saves $0.84/hr"
function rangeText(r) {
  const amount = (r.low === r.high || r.high == null ? money(r.low) : `${money(r.low)}–${money(r.high)}`) + (r.unit || '')
  return r.direction === 'saving' ? `Saves ${amount}` : `+${amount}`
}

function calcText(r) {
  if (r.calc) return r.calc
  const per = r.unit ? ` ${r.unit.replace('/', 'per ')}` : ''
  const verb = r.direction === 'saving' ? 'you keep' : 'it costs you'
  const range = r.low === r.high || r.high == null ? `about ${money(r.low)}` : `between ${money(r.low)} and ${money(r.high)}`
  return `We took the numbers in the article and applied them to the ranges you gave us: ${verb} ${range}${per}. Ranges, not exact amounts, so this is an estimate.`
}

function actionsFor(receipt) {
  const list = []
  if (receipt?.status === 'affected') {
    if (receipt.type === 'money') {
      list.push({ id: 'calc', icon: 'coin', text: 'See how we calculated this' })
      list.push({ id: 'remind', icon: 'bell', text: 'Remind me when it takes effect' })
    } else if (receipt.type === 'deadline') {
      list.push({ id: 'deadline', icon: 'calendar', text: `Remind me before ${shortDate(receipt.dueDate)}` })
    } else if (receipt.type === 'rule') {
      list.push({ id: 'rule', icon: 'eye', text: 'What this changes for me' })
    } else if (receipt.type === 'rep') {
      list.push({ id: 'rep', icon: 'ballot', text: 'See what they ran on' })
    }
  } else {
    list.push({ id: 'ping', icon: 'bell', text: 'Ping me if this starts to affect me' })
  }
  list.push({ id: 'share', icon: 'chat', text: 'Send to my group chat' })
  return list
}

function shareStory(story) {
  try {
    if (navigator.share) {
      navigator.share({ title: story.headline, url: story.source?.url }).catch(() => {})
    }
  } catch {
    // Sharing is optional; the action still marks itself done.
  }
}

const SECTION = { display: 'flex', flexDirection: 'column', gap: 10 }
const H2 = { margin: 0, color: 'var(--ink)' }

export default function StoryDetail({ storyId, onBack = () => {} }) {
  const [profile] = useProfile()
  const look = useSyncExternalStore(subscribeLook, getLook, getLook)
  const [done, setDone] = useState({})
  const story = stories.find((s) => s.id === storyId)

  useEffect(() => {
    if (storyId != null) markOpened(storyId)
  }, [storyId])

  const frame = {
    width: 390,
    height: 844,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--paper)',
    color: 'var(--ink)',
    fontFamily: 'var(--font-sans)',
    overflow: 'hidden',
  }

  const topBar = (
    <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 10px' }}>
      <button className="tw-iconbtn" type="button" aria-label="Back to your news" onClick={onBack}>
        <Icon name="back" size={20} />
      </button>
      <span className="tw-meta">Know more</span>
      <button
        className="tw-iconbtn"
        type="button"
        aria-label="Share this story"
        onClick={() => story && shareStory(story)}
      >
        <Icon name="share" size={20} />
      </button>
    </div>
  )

  if (!story) {
    return (
      <div style={frame}>
        {topBar}
        <div style={{ padding: '4px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="body-l" style={{ margin: 0 }}>We couldn't find that story.</p>
          <button className="tw-btn tw-btn--block" type="button" onClick={onBack}>
            Back to my news{' '}
            <span className="tw-dot">
              <Icon name="arrow" size={16} />
            </span>
          </button>
        </div>
      </div>
    )
  }

  let receipt
  try {
    receipt = computeReceipt(profile, story)
  } catch {
    receipt = { status: 'not_affected', text: story.otherwise }
  }
  const topic = topicFor(story.category)
  const bg = topicColor(topic)
  const mood = moodFor(receipt)
  const uuis = matchedUuis(profile, receipt)
  const badge = badgeLabel(story, receipt)
  const actions = actionsFor(receipt)
  const askField = receipt.status === 'needs_info' ? receipt.askField : null
  const ask = askField ? ASK_COPY[askField] : null
  const askOptions = askField ? optionsFor(askField) : []

  function toggle(a) {
    const next = !done[a.id]
    setDone((d) => ({ ...d, [a.id]: next }))
    if (a.id === 'share' && next) shareStory(story)
  }

  function answer(value) {
    saveProfile({ [askField]: askField === 'transport' ? [value] : value })
  }

  return (
    <div style={frame}>
      {topBar}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          boxSizing: 'border-box',
          padding: '4px 20px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div style={{ background: bg, borderRadius: 'var(--radius-lg)', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="tw-chip tw-chip--on-card">{topicLabel(topic)}</span>
            {badge && <span className="tw-badge">{badge}</span>}
          </div>
          <h1 className="display-l" style={{ margin: 0 }}>
            {receipt.status === 'affected' && receipt.text ? receipt.text : story.headline}
          </h1>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <span className="tw-bob" style={{ display: 'block' }}>
              <Character look={{ ...look, mood }} size={84} />
            </span>
            <span className="tw-bubble" style={{ marginBottom: 70 }}>
              {receipt.status === 'affected' ? bubbleFor(receipt.text, Twin.moodCopy[mood]) : Twin.moodCopy[mood]}
            </span>
          </div>
        </div>

        <section style={SECTION}>
          <h2 className="tw-meta" style={H2}>What's happening</h2>
          <p className="body-l" style={{ margin: 0 }}>{story.summary}</p>
        </section>

        <section style={SECTION}>
          <h2 className="tw-meta" style={H2}>Why it hits you</h2>
          {uuis.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {uuis.map((u, i) => (
                <span key={`${u.key}-${u.label}-${i}`} className="tw-chip" data-topic={u.topic}>
                  {u.label}
                </span>
              ))}
            </div>
          )}
          {receipt.status === 'affected' && (
            <>
              <p className="body-l" style={{ margin: 0 }}>{receipt.text}</p>
              {receipt.type === 'money' && (
                <p className="headline" style={{ margin: 0 }}>
                  {rangeText(receipt)} <span className="tw-meta">· Estimate</span>
                </p>
              )}
            </>
          )}
          {receipt.status === 'not_affected' && (
            <p className="body-l" style={{ margin: 0 }}>{story.otherwise}</p>
          )}
          {receipt.status === 'needs_info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ask ? (
                <>
                  <h3 className="headline" style={{ margin: 0 }}>{ask.q}</h3>
                  <p className="body" style={{ margin: 0, color: 'var(--ink-soft)' }}>{ask.why}</p>
                  {askOptions.map((o) => (
                    <button
                      key={o.value}
                      className="tw-option"
                      type="button"
                      aria-pressed="false"
                      onClick={() => answer(o.value)}
                    >
                      <span className="tw-option__icon" data-topic={topic}>
                        <Icon name={OPTION_ICONS[o.value] || 'check'} size={22} />
                      </span>
                      <span className="tw-option__text">{o.label}</span>
                      <span className="tw-option__check">
                        <Icon name="check" size={14} weight={3} />
                      </span>
                    </button>
                  ))}
                  <span className="tw-meta">Saved only on this phone.</span>
                </>
              ) : (
                <p className="body-l" style={{ margin: 0 }}>Add a bit more about you in the You tab to see how this hits you.</p>
              )}
            </div>
          )}
        </section>

        <section style={SECTION}>
          <h2 className="tw-meta" style={H2}>What you can do</h2>
          {actions.map((a) => {
            const isDone = !!done[a.id]
            return (
              <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => toggle(a)}
                  aria-pressed={isDone ? 'true' : 'false'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    border: 0,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    boxShadow: isDone ? 'inset 0 0 0 2.5px var(--ink)' : 'inset 0 0 0 1.5px var(--line)',
                    color: 'var(--ink)',
                    font: '600 15px/20px var(--font-sans)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 14, background: bg, display: 'grid', placeItems: 'center' }}>
                    <Icon name={a.icon} size={20} />
                  </span>
                  <span style={{ flex: 1 }}>{a.text}</span>
                  {isDone ? (
                    <span style={{ flex: 'none', width: 28, height: 28, borderRadius: '50%', background: 'var(--signal)', display: 'grid', placeItems: 'center' }}>
                      <Icon name="check" size={16} weight={3} />
                    </span>
                  ) : (
                    <Icon name="arrow" size={18} />
                  )}
                </button>
                {a.id === 'calc' && isDone && (
                  <p className="body" style={{ margin: 0, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
                    {calcText(receipt)}
                  </p>
                )}
              </div>
            )
          })}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 'var(--radius-lg)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 14, background: 'var(--mint)', display: 'grid', placeItems: 'center' }}>
              <Icon name="sources" size={20} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <h2 className="headline" style={{ margin: 0 }}>How we checked</h2>
              <span className="body" style={{ color: 'var(--ink-soft)' }}>
                {receipt.evidence ? '1 source. The quote below is word for word.' : '1 source, linked below.'}
              </span>
            </div>
          </div>
          <a
            href={story.source?.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 10, borderTop: '1.5px solid var(--line)', color: 'var(--ink)', textDecoration: 'none' }}
          >
            <span className="tw-meta" style={{ flex: 'none', padding: '4px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--paper)', color: 'var(--ink)' }}>
              Source
            </span>
            <span className="body" style={{ flex: 1 }}>{story.source?.name}</span>
            <span className="tw-meta" style={{ textDecoration: 'underline' }}>{shortDate(story.source?.date)}</span>
          </a>
          {receipt.evidence && (
            <blockquote
              className="body"
              style={{ margin: 0, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--paper)', borderLeft: '3px solid var(--ink)', fontStyle: 'italic' }}
            >
              "{receipt.evidence}"
            </blockquote>
          )}
        </section>

        <button className="tw-btn tw-btn--block" type="button" onClick={onBack}>
          Back to my news{' '}
          <span className="tw-dot">
            <Icon name="arrow" size={16} />
          </span>
        </button>
      </div>
    </div>
  )
}
