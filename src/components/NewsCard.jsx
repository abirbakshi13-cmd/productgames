// Ported from the card in twin-design/screens/6-your-news-feed.html
import { Character, Icon } from '../design/twin-engine.js'
import { formatReceipt } from '../lib/receipt.js'
import { moodFor, topicFor, topicLabel } from '../lib/twin.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "YYYY-MM-DD" -> "Nov 7" (string parsing, so no timezone shift)
function shortDate(iso) {
  const [, m, d] = String(iso || '').split('-').map(Number)
  if (!m || !d) return ''
  return `${MONTHS[m - 1]} ${d}`
}

// Today's local date as "YYYY-MM-DD"
function todayIso() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// "Hits today": an affecting story that ran today, or whose deadline is today.
function hitsToday(story, receipt) {
  if (receipt?.status !== 'affected') return false
  const today = todayIso()
  return story?.source?.date === today || (receipt.type === 'deadline' && receipt.dueDate === today)
}

// Badge copy: the design's "Hits today" when it's today, otherwise the receipt chip label.
function badgeLabel(story, receipt) {
  return hitsToday(story, receipt) ? 'Hits today' : formatReceipt(receipt)
}

export default function NewsCard({ story, receipt, look, lead = false, onOpen = () => {} }) {
  const topic = topicFor(story.category)
  const head = receipt?.status === 'affected' && receipt.text ? receipt.text : story.headline
  const meta = [story.source?.name, shortDate(story.source?.date)].filter(Boolean).join(' · ')
  const badge = badgeLabel(story, receipt)

  return (
    <article
      className="tw-news tw-pop"
      data-topic={topic}
      style={{ boxShadow: lead ? 'var(--shadow-lift)' : 'none' }}
    >
      <div className="tw-news__face">
        <Character look={{ ...look, mood: moodFor(receipt) }} crop="head" size={56} />
      </div>
      <div className="tw-news__top" style={{ flexWrap: 'wrap' }}>
        <span className="tw-chip tw-chip--on-card">{topicLabel(topic)}</span>
        {badge && <span className="tw-badge">{badge}</span>}
      </div>
      <h3 className="tw-news__head">{head}</h3>
      <p className="tw-news__why">{story.summary}</p>
      <div className="tw-news__foot">
        <span className="tw-meta">{meta}</span>
        <button className="tw-link" type="button" onClick={() => onOpen(story.id)}>
          Know more <Icon name="arrow" size={14} />
        </button>
      </div>
    </article>
  )
}

// Shared with StoryDetail (kept on the component so this file only exports components).
NewsCard.shortDate = shortDate
NewsCard.badgeLabel = badgeLabel
