// Ported from twin-design/screens/6-your-news-feed.html
import { useMemo, useState, useSyncExternalStore } from 'react'
import stories from '../data/stories.json'
import { Icon } from '../design/twin-engine.js'
import { computeReceipt } from '../lib/receipt.js'
import { useProfile } from '../lib/useProfile.js'
import { getLook, subscribeLook, topicFor, topicLabel } from '../lib/twin.js'
import NewsCard from '../components/NewsCard.jsx'
import TabBar from '../components/TabBar.jsx'

// The design's chip list, plus "Work & school" so work stories can be filtered too.
const FILTERS = [
  { id: 'all', label: 'All', topic: '' },
  ...['move', 'money', 'home', 'health', 'rights', 'campus'].map((t) => ({ id: t, label: topicLabel(t), topic: t })),
]

const STAGE_ORDER = { in_effect: 0, passed: 1, proposed: 2 }

function byEffectThenNewest(a, b) {
  const s = (STAGE_ORDER[a.story.stage] ?? 3) - (STAGE_ORDER[b.story.stage] ?? 3)
  if (s !== 0) return s
  return String(b.story.source?.date || '').localeCompare(String(a.story.source?.date || ''))
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Feed({ onOpenStory = () => {}, onNav = () => {} }) {
  const [profile] = useProfile()
  const look = useSyncExternalStore(subscribeLook, getLook, getLook)
  const [filter, setFilter] = useState('all')
  const [added, setAdded] = useState(false)
  const [showOutside, setShowOutside] = useState(false)

  const { mine, outside } = useMemo(() => {
    const items = stories.map((story) => {
      let receipt
      try {
        receipt = computeReceipt(profile, story)
      } catch {
        receipt = { status: 'needs_info' }
      }
      return { story, receipt }
    })
    items.sort(byEffectThenNewest)
    return {
      mine: items.filter((i) => i.receipt.status !== 'not_affected'),
      outside: items.filter((i) => i.receipt.status === 'not_affected'),
    }
  }, [profile])

  const cards = mine.filter((i) => filter === 'all' || topicFor(i.story.category) === filter)
  const a = mine.filter((i) => i.receipt.status === 'affected').length
  const b = outside.length

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
      <div style={{ flex: 'none', boxSizing: 'border-box', padding: '18px 20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="tw-meta">{todayLabel()}</span>
        <h1 className="display-l" style={{ margin: 0 }}>Your news</h1>
        <p className="body" style={{ margin: 0, color: 'var(--ink-soft)' }}>
          {a} {a === 1 ? 'story' : 'stories'} for you. We skipped {b} that {b === 1 ? "doesn't" : "don't"} affect you.
        </p>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 2px 2px', margin: '0 -2px' }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className="tw-chip"
              type="button"
              data-topic={f.topic}
              aria-pressed={f.id === filter ? 'true' : 'false'}
              onClick={() => setFilter(f.id)}
              style={{
                border: 0,
                cursor: 'pointer',
                flex: 'none',
                boxShadow: f.id === filter ? 'inset 0 0 0 2px var(--ink)' : 'none',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          boxSizing: 'border-box',
          padding: '4px 20px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {cards.map(({ story, receipt }, j) => (
          <NewsCard key={story.id} story={story} receipt={receipt} look={look} lead={j === 0} onOpen={onOpenStory} />
        ))}
        {cards.length === 0 && (
          <p className="body" style={{ margin: 0, color: 'var(--ink-soft)' }}>
            Nothing in this topic affects you right now.
          </p>
        )}
        {b > 0 && (
          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: 18,
              borderRadius: 'var(--radius-lg)',
              border: '2px dashed var(--line)',
              background: 'var(--surface)',
            }}
          >
            <span className="tw-meta">Outside your bubble</span>
            <h3 className="headline" style={{ margin: 0 }}>
              {b} big {b === 1 ? "story doesn't" : "stories don't"} affect you directly, but {b === 1 ? 'it matters' : 'they matter'}.
            </h3>
            <p className="body" style={{ margin: 0, color: 'var(--ink-soft)' }}>
              Seeing past your own feed keeps the algorithm honest. We add one to your brief each week.
            </p>
            <button
              className="tw-link"
              type="button"
              aria-expanded={showOutside}
              onClick={() => setShowOutside((v) => !v)}
              style={{ alignSelf: 'flex-start' }}
            >
              {showOutside ? 'Hide them' : `See ${b === 1 ? 'it' : `all ${b}`}`} <Icon name="arrow" size={14} />
            </button>
            {showOutside && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
                {outside.map(({ story }) => (
                  <li key={story.id}>
                    <button
                      type="button"
                      onClick={() => onOpenStory(story.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '10px 0',
                        border: 0,
                        borderTop: '1.5px solid var(--line)',
                        background: 'none',
                        color: 'var(--ink)',
                        font: '600 15px/20px var(--font-sans)',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <span className="tw-chip" data-topic={topicFor(story.category)} style={{ flex: 'none' }}>
                        {topicLabel(topicFor(story.category))}
                      </span>
                      <span style={{ flex: 1 }}>{story.headline}</span>
                      <Icon name="arrow" size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!added && (
              <button className="tw-btn tw-btn--secondary" type="button" onClick={() => setAdded(true)} style={{ alignSelf: 'flex-start' }}>
                Add to tomorrow's brief{' '}
                <span className="tw-dot">
                  <Icon name="arrow" size={16} />
                </span>
              </button>
            )}
            {added && (
              <span className="tw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink)' }}>
                <Icon name="check" size={16} />
                Added to tomorrow's brief
              </span>
            )}
          </section>
        )}
      </div>
      <TabBar active="feed" onNav={onNav} />
    </div>
  )
}
