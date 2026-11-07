// Ported from twin-design/screens/5-home.html
import { useMemo, useState, useSyncExternalStore } from 'react'
import { Character, Blob, Icon, Twin } from '../design/twin-engine.js'
import TabBar from '../components/TabBar.jsx'
import stories from '../data/stories.json'
import { computeReceipt, formatReceipt } from '../lib/receipt.js'
import { useProfile } from '../lib/useProfile.js'
import { getLook, subscribeLook, topicFor, topicLabel, topicColor, moodFor, bubbleFor } from '../lib/twin.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Topic -> scene SVG; other topics get a Blob in the topic's color.
const SCENES = { move: 'commute', money: 'money', home: 'home' }
const BLOB_COLORS = { health: 'mint', rights: 'lilac', campus: 'blush' }

// ---- dates ("YYYY-MM-DD" read as local dates, no timezone shift)
function parseLocal(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function daysFromToday(iso) {
  const date = parseLocal(iso)
  if (!date) return null
  return Math.round((date - startOfToday()) / 86400000)
}

function shortDate(iso) {
  const date = parseLocal(iso)
  return date ? `${MONTHS[date.getMonth()]} ${date.getDate()}` : ''
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning.'
  if (h < 18) return 'afternoon.'
  return 'evening.'
}

function dateLine(neighborhood) {
  const now = new Date()
  const line = `${WEEKDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`
  return neighborhood ? `${line} · Seattle` : line
}

// ---- affected stories: in_effect first, then newest
function affectedStories(profile) {
  return stories
    .map((story) => ({ story, receipt: computeReceipt(profile, story) }))
    .filter((x) => x.receipt.status === 'affected')
    .sort((a, b) => {
      const ea = a.story.stage === 'in_effect' ? 0 : 1
      const eb = b.story.stage === 'in_effect' ? 0 : 1
      if (ea !== eb) return ea - eb
      return String(b.story.source?.date || '').localeCompare(String(a.story.source?.date || ''))
    })
}

function toSlide({ story, receipt }) {
  const topic = topicFor(story.category)
  const mood = moodFor(receipt)
  const posted = daysFromToday(story.source?.date)
  const due = receipt.type === 'deadline' ? daysFromToday(receipt.dueDate) : null
  const whenIso = receipt.type === 'deadline' && receipt.dueDate ? receipt.dueDate : story.source?.date
  return {
    id: story.id,
    topic,
    mood,
    bg: topicColor(topic),
    scene: SCENES[topic] || null,
    blob: BLOB_COLORS[topic] || 'lilac',
    bubble: bubbleFor(receipt.text, Twin.moodCopy[mood] || Twin.moodCopy.chill),
    today: posted === 0 || (due !== null && due >= 0 && due <= 3),
    when: daysFromToday(whenIso) === 0 ? 'Today' : shortDate(whenIso),
    label: topicLabel(topic),
    effect: formatReceipt(receipt),
  }
}

const SCENE_STYLE = {
  position: 'absolute',
  inset: 0,
  fill: 'none',
  stroke: '#1c1b1f',
  strokeWidth: 2.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  opacity: 0.5,
}

function Scene({ scene }) {
  if (scene === 'commute') {
    return (
      <svg width="350" height="300" viewBox="0 0 350 300" aria-hidden="true" style={SCENE_STYLE}>
        <path d="M18 214V166h30v48M48 214V134h26v80M74 214V182h20v32M256 214V150h28v64M284 214V172h26v42M310 214V122h28v92"></path>
        <path d="M8 262H342M8 274H342"></path>
        <path d="M24 262v12M54 262v12M84 262v12M114 262v12M144 262v12M174 262v12M204 262v12M234 262v12M264 262v12M294 262v12M324 262v12"></path>
        <rect x="250" y="214" width="84" height="44" rx="12"></rect>
        <path d="M262 228h20v12h-20zM292 228h20v12h-20z"></path>
        <path d="M300 96l18 32h-36z M300 107v10 M300 122v1"></path>
      </svg>
    )
  }
  if (scene === 'money') {
    return (
      <svg width="350" height="300" viewBox="0 0 350 300" aria-hidden="true" style={SCENE_STYLE}>
        <ellipse cx="62" cy="258" rx="28" ry="8"></ellipse>
        <path d="M34 258v-14M90 258v-14"></path>
        <ellipse cx="62" cy="244" rx="28" ry="8"></ellipse>
        <path d="M34 244v-14M90 244v-14"></path>
        <ellipse cx="62" cy="230" rx="28" ry="8"></ellipse>
        <rect x="262" y="96" width="66" height="62" rx="9"></rect>
        <path d="M262 114h66M279 88v14M311 88v14M286 132h18M295 124v20"></path>
        <path d="M300 206v18M291 215h18M44 126v14M37 133h14M286 250v10M281 255h10"></path>
        <path d="M8 274H342"></path>
      </svg>
    )
  }
  if (scene === 'home') {
    return (
      <svg width="350" height="300" viewBox="0 0 350 300" aria-hidden="true" style={SCENE_STYLE}>
        <path d="M14 274V226l30-24 30 24v48M80 274V206h46v68M246 274V230l26-20 26 20v44M300 274V196h38v78"></path>
        <path d="M92 220h9v9h-9zM110 220h9v9h-9zM92 240h9v9h-9zM110 240h9v9h-9zM311 210h8v8h-8zM311 228h8v8h-8zM36 248h16v26M264 252h16v22"></path>
        <path d="M8 274H342"></path>
        <circle cx="288" cy="112" r="12"></circle>
        <path d="M300 112h30M320 112v10M328 112v8"></path>
        <path d="M54 120l10-14 10 14M64 106v26"></path>
      </svg>
    )
  }
  return null
}

export default function Home({ onOpenStory = () => {}, onNav = () => {} }) {
  const [profile] = useProfile()
  const look = useSyncExternalStore(subscribeLook, getLook, getLook)
  const [idx, setIdx] = useState(0)

  const affected = useMemo(() => affectedStories(profile), [profile])
  const S = useMemo(() => affected.slice(0, 3).map(toSlide), [affected])
  const count = affected.length
  const countCopy = `${count} ${count === 1 ? 'story' : 'stories'} for you`

  const i = S.length ? idx % S.length : 0
  const c = S[i]

  return (
    <div style={{ width: 390, height: 844, display: 'flex', flexDirection: 'column', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', boxSizing: 'border-box', padding: '16px 20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span className="tw-wordmark">twin<i></i></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 'var(--radius-pill)', background: 'var(--surface)', font: '600 13px/1 var(--font-sans)' }}>
              <Icon name="flame" size={16} />
              {countCopy}
            </span>
            <button className="tw-iconbtn" type="button" aria-label="Your profile" onClick={() => onNav('you')} style={{ overflow: 'hidden', padding: 0 }}>
              <Character look={{ ...look, mood: 'chill' }} crop="head" size={42} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          <span className="tw-meta">{dateLine(profile?.neighborhood)}</span>
          <h1 className="display-xl" style={{ margin: 0 }}>{greeting()}</h1>
        </div>

        {c ? (
          <div style={{ position: 'relative', height: 300, flex: 'none', borderRadius: 'var(--radius-lg)', background: c.bg, overflow: 'hidden' }}>
            {c.scene ? (
              <Scene scene={c.scene} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'brightness(0.93)' }}>
                <Blob color={c.blob} size={220} />
              </div>
            )}
            <span key={c.id} className="tw-bubble tw-pop" style={{ position: 'absolute', top: 18, left: 16, maxWidth: 220 }}>{c.bubble}</span>
            {c.today && (
              <span className="tw-badge" style={{ position: 'absolute', top: 20, right: 16 }}>Hits today</span>
            )}
            <button type="button" onClick={() => setIdx((i + 1) % S.length)} aria-label="Show the next thing affecting you" style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', border: 0, background: 'none', padding: 0, cursor: 'pointer' }}>
              <span className="tw-bob" style={{ display: 'block' }}>
                <Character look={{ ...look, mood: c.mood }} size={150} />
              </span>
            </button>
            <span className="tw-meta" style={{ position: 'absolute', left: 14, bottom: 14, display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', borderRadius: 'var(--radius-pill)', background: 'var(--surface)', color: 'var(--ink)' }}>
              <Icon name="tap" size={14} />
              Tap your Twin · {i + 1} of {S.length}
            </span>
            <button className="tw-link" type="button" onClick={() => onOpenStory(c.id)} style={{ position: 'absolute', right: 16, bottom: 20 }}>
              Why? <Icon name="arrow" size={14} />
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative', height: 300, flex: 'none', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', overflow: 'hidden' }}>
            <span className="tw-bubble tw-pop" style={{ position: 'absolute', top: 18, left: 16, maxWidth: 220 }}>Nothing hits you today.</span>
            <span className="tw-bob" style={{ display: 'block', position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)' }}>
              <Character look={{ ...look, mood: 'sleepy' }} size={150} />
            </span>
          </div>
        )}

        {S.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <span className="tw-meta" style={{ color: 'var(--ink)' }}>Your day, forecast</span>
              <span className="tw-meta">{countCopy}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {S.map((f, j) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onOpenStory(f.id)}
                  aria-pressed={j === i ? 'true' : 'false'}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: 10, border: 0, borderRadius: 'var(--radius-md)', background: 'var(--surface)', boxShadow: j === i ? 'inset 0 0 0 2.5px var(--ink)' : 'inset 0 0 0 1.5px var(--line)', color: 'var(--ink)', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                >
                  <span style={{ width: 40, height: 40, borderRadius: '50%', background: f.bg, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
                    <Character look={{ ...look, mood: f.mood }} crop="head" size={40} />
                  </span>
                  <span className="tw-meta" style={{ fontSize: 11 }}>{f.when}</span>
                  <span style={{ font: '700 15px/18px var(--font-display)' }}>{f.label}</span>
                  <span style={{ font: '500 13px/17px var(--font-sans)', color: 'var(--ink-soft)' }}>{f.effect}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <button className="tw-btn tw-btn--block" type="button" onClick={() => onNav('feed')} style={{ marginTop: 4, flex: 'none' }}>
          Get my news{' '}
          <span className="tw-dot">
            <Icon name="arrow" size={16} />
          </span>
        </button>
      </div>
      <TabBar active="home" onNav={onNav} />
    </div>
  )
}
