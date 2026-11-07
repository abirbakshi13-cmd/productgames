// Ported from twin-design/screens/4-make-your-twin.html
import { useState, useSyncExternalStore } from 'react'
import { Character, Blob, Icon, Twin } from '../design/twin-engine.js'
import { getLook, saveLook, subscribeLook } from '../lib/twin.js'

const ACCENT = Twin.swatches.accent

function buildTabs(look, set) {
  const cur = (k) => (look[k] !== undefined ? look[k] : Twin.defaults[k])
  const SWATCH = {
    // hair "accent" follows the current splash colour, as in the design
    hairColor: { ...Twin.swatches.hairColor, accent: ACCENT[cur('accent')] || 'var(--signal)' },
    topColor: Twin.swatches.topColor,
    accent: ACCENT,
    skin: Twin.swatches.skin,
  }
  const tiles = (key, title, head) => ({
    title,
    isTiles: true,
    items: Twin.parts[key].map((v) => ({
      value: v,
      label: v.replace('-', ' '),
      pressed: cur(key) === v ? 'true' : 'false',
      pick: () => set(key, v),
      look: { ...look, [key]: v, mood: 'chill' },
      crop: head ? 'head' : '',
      size: head ? 64 : 46,
    })),
  })
  const swatches = (key, title) => ({
    title,
    isTiles: false,
    items: Object.keys(SWATCH[key]).map((v) => ({
      value: v,
      aria: title + ': ' + v,
      color: SWATCH[key][v],
      pressed: cur(key) === v ? 'true' : 'false',
      pick: () => set(key, v),
    })),
  })
  return [
    { id: 'hair', label: 'Hair', rows: () => [tiles('hair', 'Hairstyle', true), swatches('hairColor', 'Hair fill')] },
    { id: 'face', label: 'Face', rows: () => [tiles('head', 'Face shape', true), tiles('glasses', 'Glasses', true)] },
    { id: 'top', label: 'Top', rows: () => [tiles('top', 'Top', false), swatches('topColor', 'Black or white')] },
    { id: 'item', label: 'Item', rows: () => [tiles('item', 'Carry something', false), swatches('accent', 'Splash colour')] },
    {
      id: 'body',
      label: 'Body',
      rows: () => [
        tiles('build', 'Build', false),
        tiles('height', 'Height', false),
        tiles('bottom', 'Bottom', false),
        swatches('skin', 'Tone'),
      ],
    },
  ]
}

export default function CreateTwin({ onDone }) {
  const look = useSyncExternalStore(subscribeLook, getLook, getLook)
  const [tabId, setTabId] = useState('hair')

  const set = (k, v) => saveLook({ [k]: v })
  const TABS = buildTabs(look, set)
  const tab = TABS.find((t) => t.id === tabId) || TABS[0]
  const rows = tab.rows()
  const accent = look.accent !== undefined ? look.accent : Twin.defaults.accent
  const blobColor = accent === 'butter' ? 'sky' : 'butter'

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 className="display-l" style={{ margin: 0 }}>Make your Twin</h1>
        <span className="tw-meta">No gender boxes. Mix anything.</span>
      </div>
      <div
        style={{
          position: 'relative',
          height: 220,
          flex: 'none',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Blob color={blobColor} size={200} />
        </div>
        <div className="tw-bob" style={{ position: 'relative', marginTop: 6 }}>
          <Character look={{ ...look, mood: 'chill' }} size={136} />
        </div>
      </div>
      <div className="tw-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            className="tw-tab"
            type="button"
            role="tab"
            aria-selected={t.id === tab.id ? 'true' : 'false'}
            onClick={() => setTabId(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          padding: 3,
        }}
      >
        {rows.map((r) => (
          <div key={r.title} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="tw-meta">{r.title}</span>
            {r.isTiles ? (
              <div className="tw-tiles">
                {r.items.map((it) => (
                  <button key={it.value} className="tw-tile" type="button" aria-pressed={it.pressed} onClick={it.pick}>
                    <Character look={it.look} crop={it.crop} size={it.size} />
                    <span>{it.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="tw-swatches">
                {r.items.map((it) => (
                  <button
                    key={it.value}
                    className="tw-swatch"
                    type="button"
                    aria-pressed={it.pressed}
                    aria-label={it.aria}
                    onClick={it.pick}
                    style={{ background: it.color }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="tw-btn tw-btn--block" type="button" onClick={() => onDone?.()}>
        Looks like me{' '}
        <span className="tw-dot">
          <Icon name="arrow" size={16} />
        </span>
      </button>
    </div>
  )
}
