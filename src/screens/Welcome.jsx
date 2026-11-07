// Ported from twin-design/screens/1-welcome.html
// (email field and "I already have an account" removed on purpose)
import { Character, Blob, Icon } from '../design/twin-engine.js'

const LEFT = { hair: 'bangs', top: 'stripe', bottom: 'skirt', build: 'curvy', item: 'tote', accent: 'sky' }
const MID = { hair: 'messy', item: 'headphones', accent: 'signal', mood: 'hyped' }
const RIGHT = { hair: 'curly', glasses: 'round', item: 'coffee', accent: 'butter' }

export default function Welcome({ onStart = () => {} }) {
  return (
    <div
      style={{
        width: 390,
        height: 844,
        boxSizing: 'border-box',
        padding: '20px 20px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: 'var(--paper)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
        <span className="tw-wordmark">
          twin<i></i>
        </span>
        <span className="tw-meta">For Gen Z</span>
      </div>
      <div style={{ position: 'relative', height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Blob color="butter" size={290} />
        </div>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            marginTop: 24,
          }}
        >
          <div className="tw-bob" style={{ marginRight: -22, animationDelay: '.5s' }}>
            <Character look={LEFT} size={108} />
          </div>
          <div className="tw-bob" style={{ position: 'relative', zIndex: 1 }}>
            <Character look={MID} size={126} />
          </div>
          <div className="tw-bob" style={{ marginLeft: -22, animationDelay: '1s' }}>
            <Character look={RIGHT} size={108} />
          </div>
        </div>
      </div>
      <h1 className="display-xl" style={{ margin: '4px 0 0' }}>
        Meet your news twin.
      </h1>
      <p className="body-l" style={{ margin: 0, color: 'var(--ink-soft)' }}>
        Build a doodle version of yourself. Every story comes back as what it means for your day.
      </p>
      <button className="tw-btn tw-btn--block" type="button" onClick={onStart}>
        Create my Twin{' '}
        <span className="tw-dot">
          <Icon name="arrow" size={16} />
        </span>
      </button>
      <span className="tw-meta" style={{ textAlign: 'center', marginTop: 'auto' }}>
        No ads. We never sell your data.
      </span>
    </div>
  )
}
