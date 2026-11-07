import { useEffect, useRef, useState } from 'react'
import { saveProfile, getProfile } from '../shared/api.js'
import { ASK_COPY, FIELD_OPTIONS, RANGE_OPTIONS, FOLLOW_UPS } from '../shared/fields.js'
import './AskInContext.css'

function matchesWhen(when, value) {
  return Array.isArray(when) ? when.includes(value) : when === value
}

// Shown inside the Receipt card when computeReceipt returns status "needs_info".
export default function AskInContext({ field, story, onAnswered }) {
  const [dismissed, setDismissed] = useState(false)
  const [parentValue, setParentValue] = useState(null)
  const [showWhy, setShowWhy] = useState(false)
  const followUpRef = useRef(null)

  const copy = ASK_COPY[field]
  const options = FIELD_OPTIONS[field]
  const followUpDef = FOLLOW_UPS[field]
  const followUp =
    parentValue != null && followUpDef && matchesWhen(followUpDef.when, parentValue) ? followUpDef : null

  useEffect(() => {
    if (followUp) followUpRef.current?.focus()
  }, [followUp])

  // Never crash: no copy or options for this field.
  if (!copy || !options) {
    return <div className="ask ask-missing">Add this in your profile</div>
  }

  function pick(value) {
    const fu = followUpDef && matchesWhen(followUpDef.when, value) ? followUpDef : null
    if (fu) {
      // Hold the parent answer locally and ask the follow-up first. Saving it
      // immediately would fire "profilechange" and could let a listener up the
      // tree (e.g. the live-update subscription) recompute the Receipt from a
      // half-answered profile before the range question is even shown.
      setParentValue(value)
    } else {
      saveProfile({ [field]: value })
      onAnswered?.(getProfile())
    }
  }

  function pickRange(value) {
    const merged = saveProfile({ [field]: parentValue, [followUp.field]: value })
    onAnswered?.(merged)
  }

  if (dismissed) {
    return (
      <div className="ask ask-collapsed">
        <span>Answer one question to see your Receipt</span>
        <button type="button" className="ask-answer-btn" onClick={() => setDismissed(false)}>
          Answer
        </button>
      </div>
    )
  }

  return (
    <div className="ask">
      <h3 className="ask-title">See what this means for you</h3>

      {!followUp ? (
        <>
          <h4 className="ask-question">{copy.q}</h4>
          <button
            type="button"
            className="ask-why-toggle"
            aria-expanded={showWhy}
            onClick={() => setShowWhy((s) => !s)}
          >
            Why we ask
          </button>
          {showWhy && <p className="ask-why">{copy.why}</p>}
          <div className="ask-options">
            {options.map((opt) => (
              <button
                key={JSON.stringify(opt.value)}
                type="button"
                className="ask-option"
                onClick={() => pick(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button type="button" className="ask-not-now" onClick={() => setDismissed(true)}>
            Not now
          </button>
        </>
      ) : (
        <>
          <h4 className="ask-question" tabIndex={-1} ref={followUpRef}>
            {ASK_COPY[followUp.field]?.q}
          </h4>
          <div className="ask-options">
            {(RANGE_OPTIONS[followUp.field] || []).map((opt) => (
              <button
                key={JSON.stringify(opt.value)}
                type="button"
                className="ask-option"
                onClick={() => pickRange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      <p className="ask-footer">Saved only on this phone. Change it anytime in your profile.</p>
    </div>
  )
}
