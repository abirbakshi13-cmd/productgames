import { useState } from 'react'
import Feed from './screens/Feed.jsx'
import History from './screens/History.jsx'
import Profile from './screens/Profile.jsx'

const TABS = [
  { id: 'feed', label: 'Feed', Screen: Feed },
  { id: 'history', label: 'History', Screen: History },
  { id: 'profile', label: 'Profile', Screen: Profile },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('feed')
  const { Screen } = TABS.find((t) => t.id === activeTab)

  return (
    <div className="phone">
      <main className="phone-content">
        <Screen />
      </main>
      <nav className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={tab.id === activeTab ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
