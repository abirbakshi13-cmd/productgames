// Screen state machine ported from twin-design/screens/0-app-flow.html:
// welcome -> onboard -> uuis -> create -> home, then tabs home / feed (News) /
// create (Twin) / you, with story and history as overlays that go back.
import { useEffect, useState } from 'react'
import stories from './data/stories.json'
import { getProfile } from './lib/profileStore.js'
import { initHistory } from './lib/historyStore.js'
import Welcome from './screens/Welcome.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Uuis from './screens/Uuis.jsx'
import CreateTwin from './screens/CreateTwin.jsx'
import Home from './screens/Home.jsx'
import Feed from './screens/Feed.jsx'
import StoryDetail from './screens/StoryDetail.jsx'
import You from './screens/You.jsx'
import History from './screens/History.jsx'

const TAB_SCREENS = { home: 'home', feed: 'feed', twin: 'create', you: 'you' }
const LAST_QUESTION = 6 // 7 onboarding questions

// "care" is the last question; Skip saves cares: null, so the key exists
// once onboarding has been finished.
function hasOnboarded(profile) {
  return !!profile && 'cares' in profile
}

export default function App() {
  const [screen, setScreen] = useState(() => (hasOnboarded(getProfile()) ? 'home' : 'welcome'))
  const [step, setStep] = useState(0)
  const [storyId, setStoryId] = useState(null)
  const [backTo, setBackTo] = useState('feed')
  const [historyBackTo, setHistoryBackTo] = useState('you')
  // Edit answers from You: finishing (or backing out of) the questions returns
  // to You instead of repeating UUIs -> Make your Twin -> Home.
  const [editing, setEditing] = useState(false)

  useEffect(() => initHistory(stories), [])

  const go = (next) => setScreen(next)
  const nav = (tab) => go(TAB_SCREENS[tab] || 'home')

  function openStory(id) {
    setStoryId(id)
    // Opening a story from a story keeps the original place to return to.
    if (screen !== 'story') setBackTo(screen)
    go('story')
  }

  function openHistory() {
    setHistoryBackTo(screen)
    go('history')
  }

  function startOnboarding(fromStep = 0, isEdit = false) {
    setStep(fromStep)
    setEditing(isEdit)
    go('onboard')
  }

  let view
  switch (screen) {
    case 'welcome':
      view = <Welcome onStart={() => startOnboarding(0)} />
      break
    case 'onboard':
      view = (
        <Onboarding
          key={step}
          initialStep={step}
          onDone={() => go(editing ? 'you' : 'uuis')}
          onBack={() => go(editing ? 'you' : 'welcome')}
        />
      )
      break
    case 'uuis':
      view = <Uuis onNext={() => go('create')} onBack={() => startOnboarding(LAST_QUESTION)} />
      break
    case 'create':
      view = <CreateTwin onDone={() => go('home')} />
      break
    case 'feed':
      view = <Feed onOpenStory={openStory} onNav={nav} />
      break
    case 'story':
      view = <StoryDetail key={storyId} storyId={storyId} onBack={() => go(backTo || 'feed')} />
      break
    case 'you':
      view = (
        <You
          onEditTwin={() => go('create')}
          onEditAnswers={() => startOnboarding(0, true)}
          onOpenHistory={openHistory}
          onDeleted={() => {
            setEditing(false)
            go('welcome')
          }}
          onNav={nav}
        />
      )
      break
    case 'history':
      view = <History onOpenStory={openStory} onBack={() => go(historyBackTo || 'you')} />
      break
    default:
      view = <Home onOpenStory={openStory} onNav={nav} />
  }

  return <div className="phone">{view}</div>
}
