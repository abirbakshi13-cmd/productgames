import { useMemo, useState } from 'react'
import { computeReceipt } from '../shared/api.js'
import { FIELD_LABELS, labelFor } from '../shared/fields.js'
import AskInContext from './AskInContext.jsx'
import './ReceiptCard.css'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Parse "YYYY-MM-DD" as a LOCAL date so it never shifts a day.
function parseLocalDate(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function formatLongDate(iso) {
  const d = parseLocalDate(iso)
  return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : ''
}

function daysLeft(iso) {
  const d = parseLocalDate(iso)
  if (!d) return null
  const today = new Date()
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((d - todayLocal) / 86400000)
}

function formatDaysLeft(n) {
  if (n === null || n === undefined) return ''
  if (n === 0) return 'Today'
  if (n < 0) return 'Passed'
  return `${n} day${n === 1 ? '' : 's'} left`
}

function formatMoney(low, high, direction, unit) {
  // Cents matter under $10, so "$0.84/hr" never renders as "$1/hr".
  const fmt = (n) =>
    Math.abs(n) < 10 && !Number.isInteger(n) ? n.toFixed(2) : Math.round(n).toLocaleString('en-US')
  const sign = direction === 'saving' ? '+' : '−'
  const body = low === high ? `$${fmt(low)}` : `$${fmt(low)}–$${fmt(high)}`
  return `${sign}${body}${unit || ''}`
}

export default function ReceiptCard({ story, profile, onProfileChange }) {
  const receipt = useMemo(() => {
    try {
      return computeReceipt(profile, story)
    } catch (err) {
      console.warn('computeReceipt failed for story', story?.id, err)
      return { status: 'needs_info', askField: null }
    }
  }, [profile, story])

  const [expanded, setExpanded] = useState(false)

  if (!story) return null

  const status = receipt.status
  const borderClass =
    status === 'affected' && receipt.type === 'money'
      ? receipt.direction === 'saving'
        ? 'rcard--saving'
        : 'rcard--cost'
      : status === 'not_affected'
        ? 'rcard--muted'
        : 'rcard--info'

  function handleAnswered(nextProfile) {
    onProfileChange?.(nextProfile)
  }

  return (
    <div className={`rcard ${borderClass}`}>
      <div className="rcard-head">
        <div className="rcard-head-title">
          <span aria-hidden="true">{'🔒'}</span> Your Receipt
        </div>
        <div className="rcard-head-sub">Calculated on your phone</div>
      </div>

      <div key={status} className="rcard-result">
        {status === 'needs_info' && (
          <AskInContext field={receipt.askField} story={story} onAnswered={handleAnswered} />
        )}

        {status === 'affected' && receipt.type === 'money' && (
          <>
            <div className="rcard-money-row">
              <span
                className={
                  receipt.direction === 'saving' ? 'rcard-amount rcard-amount--saving' : 'rcard-amount rcard-amount--cost'
                }
              >
                {formatMoney(receipt.low, receipt.high, receipt.direction, receipt.unit)}
              </span>
              <span className="rcard-pill">Estimate</span>
            </div>
            <p className="rcard-text">{receipt.text}</p>
          </>
        )}

        {status === 'affected' && receipt.type === 'rule' && (
          <>
            <div className="rcard-label-row">
              <span aria-hidden="true">{'⚖'}</span>
              <span>New rule for you</span>
            </div>
            <p className="rcard-text">{receipt.text}</p>
          </>
        )}

        {status === 'affected' && receipt.type === 'rep' && (
          <>
            <div className="rcard-label-row">
              <span aria-hidden="true">{'🏛'}</span>
              <span>Your representation changed</span>
            </div>
            <p className="rcard-text">{receipt.text}</p>
          </>
        )}

        {status === 'affected' && receipt.type === 'deadline' && (
          <>
            {(receipt.date || receipt.dueDate) && (
              <div className="rcard-deadline-row">
                <span className="rcard-deadline-date">Act by {formatLongDate(receipt.date || receipt.dueDate)}</span>
                <span className="rcard-deadline-days">{formatDaysLeft(daysLeft(receipt.date || receipt.dueDate))}</span>
              </div>
            )}
            <p className="rcard-text">{receipt.text}</p>
          </>
        )}

        {status === 'not_affected' && (
          <>
            <div className="rcard-label-row rcard-label-row--muted">Doesn&rsquo;t affect you</div>
            <p className="rcard-text">Based on your answers, this change doesn&rsquo;t apply to you.</p>
          </>
        )}
      </div>

      {(status === 'affected' || status === 'not_affected') && (
        <HowWeCalculated
          story={story}
          receipt={receipt}
          profile={profile}
          expanded={expanded}
          setExpanded={setExpanded}
        />
      )}

      {story.otherwise && (
        <div className="rcard-otherwise">
          <span aria-hidden="true">{'👥'}</span>
          <div>
            <div className="rcard-otherwise-title">Who else this affects</div>
            <p className="rcard-otherwise-text">{story.otherwise}</p>
          </div>
        </div>
      )}

      {story.stage === 'proposed' && (
        <div className="rcard-stage-note">
          Proposed, not passed yet. This won&rsquo;t count in your History totals.
        </div>
      )}
    </div>
  )
}

function HowWeCalculated({ story, receipt, profile, expanded, setExpanded }) {
  const whenEntries = receipt.when
    ? Object.entries(receipt.when)
    : (story.needs || []).map((field) => [field, profile?.[field]])

  const chips = whenEntries
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([field, value]) => {
      if (field === 'state') return `State: ${value}`
      const label = FIELD_LABELS[field] || field
      // A `when` value may be an array meaning "any of these"; show the reader's own
      // answer rather than the whole set ("Part-time", not "part-time,full-time").
      const shown = Array.isArray(value) ? (profile?.[field] ?? value) : value
      return `${label}: ${labelFor(field, shown)}`
    })

  const evidence = receipt.evidence
  const fallbackEvidence = !evidence ? story.receipts?.[0]?.evidence : null

  return (
    <div className="rcard-how">
      <button
        type="button"
        className="rcard-how-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((e) => !e)}
      >
        <span>How we calculated this</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={expanded ? 'rcard-chev rcard-chev--open' : 'rcard-chev'}
        >
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div className="rcard-how-panel">
          {chips.length > 0 && (
            <div className="rcard-how-section">
              <div className="rcard-how-label">Your answers we used:</div>
              <div className="rcard-chips">
                {chips.map((c) => (
                  <span key={c} className="rcard-chip">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {receipt.calc && (
            <div className="rcard-how-section">
              <div className="rcard-how-label">The math:</div>
              <div className="rcard-calc">{receipt.calc}</div>
            </div>
          )}

          {evidence ? (
            <div className="rcard-how-section">
              <div className="rcard-how-label">From the article:</div>
              <blockquote className="rcard-quote">
                &ldquo;{evidence}&rdquo; &mdash; {story.source?.name}
              </blockquote>
            </div>
          ) : fallbackEvidence ? (
            <div className="rcard-how-section">
              <div className="rcard-how-label">What changed:</div>
              <blockquote className="rcard-quote">
                &ldquo;{fallbackEvidence}&rdquo; &mdash; {story.source?.name}
              </blockquote>
            </div>
          ) : null}

          <p className="rcard-privacy">
            An AI read the article to find these facts. It never saw your answers; this match ran on your phone.
          </p>
          {receipt.type === 'money' && (
            <p className="rcard-privacy">
              This is an estimate based on numbers stated in the article. Your real amount may differ.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
