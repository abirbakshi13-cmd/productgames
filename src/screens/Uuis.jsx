// Ported from twin-design/screens/3-uuis.html
import { Character, Blob, Icon } from '../design/twin-engine.js'
import { useProfile } from '../lib/useProfile.js'
import { uuisFromProfile } from '../lib/twin.js'

const BLANK = { hair: 'none', mood: 'curious' }

const iconTile = (bg) => ({
  width: 36,
  height: 36,
  borderRadius: 12,
  background: bg,
  display: 'grid',
  placeItems: 'center',
})
const row = { display: 'flex', gap: 12, alignItems: 'center' }

export default function Uuis({ onNext = () => {}, onBack = () => {} }) {
  const [profile] = useProfile()
  const uuis = uuisFromProfile(profile)

  return (
    <div
      style={{
        width: 390,
        height: 844,
        boxSizing: 'border-box',
        padding: '20px 20px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: 'var(--paper)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="tw-iconbtn" type="button" aria-label="Back" onClick={onBack}>
          <Icon name="back" size={20} />
        </button>
        <span className="tw-meta">Almost there</span>
        <span style={{ width: 44 }}></span>
      </div>
      <div style={{ position: 'relative', height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Blob color="lilac" size={180} />
        </div>
        <div className="tw-bob" style={{ position: 'relative' }}>
          <Character look={BLANK} crop="head" size={132} />
        </div>
      </div>
      <h1 className="display-l" style={{ margin: 0 }}>
        Here&apos;s what makes you, you.
      </h1>
      <p className="body" style={{ margin: 0, color: 'var(--ink-soft)' }}>
        These are your UUIs. They decide which news reaches you and how we say it. Change them anytime.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {uuis.map((u, i) => (
          <span key={`${u.key}-${u.label}-${i}`} className="tw-chip tw-pop" data-topic={u.topic}>
            {u.label}
          </span>
        ))}
        {uuis.length === 0 && <span className="tw-meta">Nothing yet. Skipping is fine, Twin still works.</span>}
      </div>
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={row}>
          <span style={iconTile('var(--sky)')}>
            <Icon name="eye" size={20} />
          </span>
          <span className="body">Filters out news that doesn&apos;t touch your life.</span>
        </div>
        <div style={row}>
          <span style={iconTile('var(--butter)')}>
            <Icon name="twin" size={20} />
          </span>
          <span className="body">Rewrites each headline around your day.</span>
        </div>
        <div style={row}>
          <span style={iconTile('var(--mint)')}>
            <Icon name="check" size={20} />
          </span>
          <span className="body">Stays on your phone. Never sold, never shared.</span>
        </div>
      </div>
      <button className="tw-btn tw-btn--block" type="button" onClick={onNext} style={{ marginTop: 'auto' }}>
        Now make your Twin{' '}
        <span className="tw-dot">
          <Icon name="arrow" size={16} />
        </span>
      </button>
    </div>
  )
}
