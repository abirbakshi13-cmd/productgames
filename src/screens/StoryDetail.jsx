import { useEffect, useState } from 'react'
import { getProfile } from '../shared/api.js'
import { getStory } from '../stories.js'
import ReceiptCard from '../components/ReceiptCard.jsx'
import '../styles/receipts-theme.css'
import './StoryDetail.css'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Parse "YYYY-MM-DD" as a LOCAL date so it never shifts a day.
function formatLongDate(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

function TopBar({ onBack }) {
  return (
    <div className="sd-topbar">
      <button type="button" className="sd-back" aria-label="Back to feed" onClick={onBack}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.5 4 6 10l6.5 6" />
        </svg>
        <span>Back</span>
      </button>
    </div>
  )
}

// Props: story (preferred) or storyId (resolved via src/stories.js so this works
// whether the router passes the story object or just its id), profile, onBack,
// onOpenProfile.
export default function StoryDetail({ story: storyProp, storyId, profile: profileProp, onBack, onOpenProfile }) {
  const story = storyProp ?? (storyId != null ? getStory(storyId) : null)
  const [profile, setProfile] = useState(() => profileProp ?? getProfile())

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    function refresh() {
      setProfile(getProfile())
    }
    window.addEventListener('profilechange', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('profilechange', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  if (!story) {
    return (
      <div className="sd">
        <TopBar onBack={onBack} />
        <p className="sd-missing">Story not found</p>
      </div>
    )
  }

  return (
    <div className="sd">
      <TopBar onBack={onBack} />
      <div className="sd-meta">
        {story.source?.name} · {formatLongDate(story.source?.date)}
      </div>
      <h1 className="sd-headline">{story.headline}</h1>
      <p className="sd-summary">{story.summary}</p>
      <ReceiptCard story={story} profile={profile} onProfileChange={setProfile} />
      {story.source?.url && (
        <a className="sd-source" href={story.source.url} target="_blank" rel="noopener noreferrer">
          Read the full story at {story.source.name} ↗
        </a>
      )}
      {onOpenProfile && (
        <button type="button" className="sd-profile-link" onClick={onOpenProfile}>
          Edit your profile
        </button>
      )}
    </div>
  )
}
