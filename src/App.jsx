import { useEffect, useState } from 'react'
import stories from './data/stories.json'
import { getProfile } from './lib/profileStore.js'
import { initHistory } from './lib/historyStore.js'
import Onboarding from './screens/Onboarding.jsx'
import Feed from './screens/Feed.jsx'
import History from './screens/History.jsx'
import Profile from './screens/Profile.jsx'
import StoryDetail from './screens/StoryDetail.jsx'

const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'history', label: 'History' },
  { id: 'profile', label: 'Profile' },
]

function hasBasics(profile) {
  return !!(profile && profile.zip && profile.ageRange && profile.student)
}

export default function App() {
  // Decided once on load; Onboarding saves as the user goes, so the profile
  // becomes non-null mid-flow and can't drive this directly. A profile with
  // unfinished basics (e.g. a reload mid-onboarding) restarts onboarding.
  const [onboarding, setOnboarding] = useState(() => !hasBasics(getProfile()))
  const [activeTab, setActiveTab] = useState('feed')
  const [openStoryId, setOpenStoryId] = useState(null)

  useEffect(() => initHistory(stories), [])

  function finishOnboarding() {
    setOnboarding(false)
    setActiveTab('feed')
  }

  function restartOnboarding() {
    setOpenStoryId(null)
    setOnboarding(true)
  }

  function selectTab(id) {
    setOpenStoryId(null)
    setActiveTab(id)
  }

  if (onboarding) {
    return (
      <div className="phone">
        <main className="phone-content">
          <Onboarding onDone={finishOnboarding} />
        </main>
      </div>
    )
  }

  let screen
  if (openStoryId) {
    screen = <StoryDetail storyId={openStoryId} onBack={() => setOpenStoryId(null)} />
  } else if (activeTab === 'feed') {
    screen = <Feed onOpenStory={setOpenStoryId} />
  } else if (activeTab === 'history') {
    screen = <History onOpenStory={setOpenStoryId} />
  } else {
    screen = <Profile onDeleted={restartOnboarding} />
  }

  return (
    <div className="phone">
      <main className="phone-content">{screen}</main>
      <nav className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={tab.id === activeTab ? 'tab active' : 'tab'}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
