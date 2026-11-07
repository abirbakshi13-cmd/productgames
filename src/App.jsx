import { useEffect, useState } from 'react'
import stories from './data/stories.json'
import { getProfile } from './lib/profileStore.js'
import { initHistory } from './lib/historyStore.js'
import Onboarding from './screens/Onboarding.jsx'
import Feed from './screens/Feed.jsx'
import History from './screens/History.jsx'
import Profile from './screens/Profile.jsx'
import StoryDetail from './screens/StoryDetail.jsx'
import TabBar from './components/TabBar.jsx'


function hasBasics(profile) {
  return !!(profile && profile.zip && profile.ageRange && profile.student)
}

export default function App() {
  // Decided once on load; Onboarding saves as the user goes, so the profile
  // becomes non-null mid-flow and can't drive this directly. A profile with
  // unfinished basics (e.g. a reload mid-onboarding) restarts onboarding.
  const [onboarding, setOnboarding] = useState(() => !hasBasics(getProfile()))
  const [activeTab, setActiveTab] = useState('home')
  const [openStoryId, setOpenStoryId] = useState(null)

  useEffect(() => initHistory(stories), [])

  function finishOnboarding() {
    setOnboarding(false)
    setActiveTab('home')
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
        <Onboarding onDone={finishOnboarding} />
      </div>
    )
  }

  let screen
  if (openStoryId) {
    screen = <StoryDetail storyId={openStoryId} onBack={() => setOpenStoryId(null)} />
  } else if (activeTab === 'home' || activeTab === 'feed') {
    screen = <Feed onOpenStory={setOpenStoryId} />
  } else if (activeTab === 'twin') {
    screen = <History onOpenStory={setOpenStoryId} />
  } else {
    screen = <Profile onDeleted={restartOnboarding} />
  }

  // Transitional shell until the Twin screens land (see Step 3).
  return (
    <div className="phone" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{screen}</div>
      <TabBar active={activeTab} onNav={selectTab} />
    </div>
  )
}
