// Ported from twin-design/screens/tab-bar.html
import { Icon } from '../design/twin-engine.js'

const TABS = [
  { id: 'home', label: 'Home', icon: 'house' },
  { id: 'feed', label: 'News', icon: 'feed' },
  { id: 'twin', label: 'Twin', icon: 'twin' },
  { id: 'you', label: 'You', icon: 'you' },
]

export default function TabBar({ active = 'home', onNav = () => {} }) {
  return (
    <nav
      className="tw-tabbar"
      aria-label="Main"
      style={{ width: 390, boxSizing: 'border-box', color: 'var(--ink)', fontFamily: 'var(--font-sans)' }}
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-current={t.id === active ? 'page' : 'false'}
          onClick={() => onNav(t.id)}
        >
          <Icon name={t.icon} size={22} />
          {t.label}
        </button>
      ))}
    </nav>
  )
}
