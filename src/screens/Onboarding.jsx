import { useState } from 'react'
import { useProfile } from '../lib/useProfile.js'
import Pills from '../components/Pills.jsx'
import QuestionCard, {
  AGE_OPTIONS,
  STUDENT_OPTIONS,
  RESIDENCY_OPTIONS,
  LOAN_OPTIONS,
  HOUSING_OPTIONS,
  RENT_OPTIONS,
  WORK_OPTIONS,
  WAGE_OPTIONS,
  HOURS_OPTIONS,
  TRANSPORT_OPTIONS,
  WHY,
  studentPatch,
  housingPatch,
  workPatch,
  isValidZip,
  LockIcon,
} from '../components/QuestionCard.jsx'
import './Onboarding.css'

const STEPS = 3
const OPTIONAL_TOPICS = ['loans', 'housing', 'work', 'transport']

export default function Onboarding({ onDone }) {
  const [profile, save] = useProfile()
  const p = profile || {}
  const [step, setStep] = useState(0)
  const [zip, setZip] = useState(p.zip || '')
  const [zipTouched, setZipTouched] = useState(false)

  const isStudent = p.student && p.student !== 'none'
  const basicsDone =
    isValidZip(zip) && isValidZip(p.zip) && !!p.ageRange && !!p.student && (!isStudent || !!p.residency)

  function onZipChange(e) {
    const next = e.target.value.replace(/\D/g, '').slice(0, 5)
    setZip(next)
    // Only persist once it's a full, valid ZIP; saveProfile derives `state`.
    if (isValidZip(next)) save({ zip: next })
  }

  function finish() {
    // Anything left unanswered on the optional step counts as skipped (null).
    const skipped = {}
    for (const key of OPTIONAL_TOPICS) {
      if (p[key] === undefined) Object.assign(skipped, skipPatch(key))
    }
    if (Object.keys(skipped).length) save(skipped)
    onDone?.()
  }

  const working = p.work === 'part-time' || p.work === 'full-time'

  return (
    <div className="onb">
      <div className="onb-dots" aria-label={`Step ${step + 1} of ${STEPS}`}>
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={i === step ? 'onb-dot onb-dot--on' : i < step ? 'onb-dot onb-dot--done' : 'onb-dot'} />
        ))}
      </div>

      {step === 0 && (
        <div className="onb-welcome">
          <div className="onb-welcome-main">
            <h1 className="onb-brand">Receipts</h1>
            <p className="onb-tagline">See what the news means for you</p>
          </div>
          <div className="onb-privacy">
            <span className="onb-privacy-icon"><LockIcon size={22} /></span>
            <p>Your Receipts never leave your phone. No account, no tracking.</p>
          </div>
          <button type="button" className="onb-primary" onClick={() => setStep(1)}>
            Start
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="onb-step">
          <h2 className="onb-title">The basics</h2>
          <p className="onb-sub">We use these to match news to where you live and your stage of life.</p>

          <label className="onb-label" htmlFor="onb-zip">ZIP code</label>
          <input
            id="onb-zip"
            className={zipTouched && zip && !isValidZip(zip) ? 'onb-input onb-input--bad' : 'onb-input'}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="98105"
            value={zip}
            onChange={onZipChange}
            onBlur={() => setZipTouched(true)}
          />
          {zipTouched && zip && !isValidZip(zip) && (
            <p className="onb-error">Enter a 5-digit ZIP code.</p>
          )}

          <p className="onb-label">Age</p>
          <Pills label="Age" options={AGE_OPTIONS} value={p.ageRange} onChange={(v) => save({ ageRange: v })} />

          <p className="onb-label">Student status</p>
          <Pills label="Student status" options={STUDENT_OPTIONS} value={p.student} onChange={(v) => save(studentPatch(v))} />

          {isStudent && (
            <>
              <p className="onb-label">Tuition residency</p>
              <Pills label="Tuition residency" options={RESIDENCY_OPTIONS} value={p.residency} onChange={(v) => save({ residency: v })} />
            </>
          )}

          <div className="onb-nav">
            <button type="button" className="onb-back" onClick={() => setStep(0)}>Back</button>
            <button type="button" className="onb-primary" disabled={!basicsDone} onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="onb-step">
          <h2 className="onb-title">A few optional questions</h2>
          <p className="onb-sub">Answer what you like. The more you share, the more exact your Receipts.</p>

          <div className="onb-cards">
            <QuestionCard title="Student loans" why={WHY.loans} skipped={p.loans === null} onSkip={() => save(skipPatch('loans'))}>
              <Pills label="Student loans" options={LOAN_OPTIONS} value={p.loans} onChange={(v) => save({ loans: v })} />
            </QuestionCard>

            <QuestionCard title="Housing" why={WHY.housing} skipped={p.housing === null} onSkip={() => save(skipPatch('housing'))}>
              <Pills label="Housing" options={HOUSING_OPTIONS} value={p.housing} onChange={(v) => save(housingPatch(v))} />
              {p.housing === 'renting' && (
                <>
                  <p className="qcard-sub">Monthly rent (your share)</p>
                  <Pills label="Monthly rent" options={RENT_OPTIONS} value={p.rentRange} onChange={(v) => save({ rentRange: v })} />
                </>
              )}
            </QuestionCard>

            <QuestionCard title="Work" why={WHY.work} skipped={p.work === null} onSkip={() => save(skipPatch('work'))}>
              <Pills label="Work" options={WORK_OPTIONS} value={p.work} onChange={(v) => save(workPatch(v))} />
              {working && (
                <>
                  <p className="qcard-sub">Hourly wage</p>
                  <Pills label="Hourly wage" options={WAGE_OPTIONS} value={p.wageRange} onChange={(v) => save({ wageRange: v })} />
                  <p className="qcard-sub">Hours per week</p>
                  <Pills label="Hours per week" options={HOURS_OPTIONS} value={p.hoursPerWeek} onChange={(v) => save({ hoursPerWeek: v })} />
                </>
              )}
            </QuestionCard>

            <QuestionCard title="Getting around" why={WHY.transport} skipped={p.transport === null} onSkip={() => save(skipPatch('transport'))}>
              <Pills label="Getting around" options={TRANSPORT_OPTIONS} value={p.transport} onChange={(v) => save({ transport: v })} />
            </QuestionCard>
          </div>

          <div className="onb-nav">
            <button type="button" className="onb-back" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="onb-primary" onClick={finish}>Show my news</button>
          </div>
        </div>
      )}
    </div>
  )
}

function skipPatch(key) {
  if (key === 'housing') return housingPatch(null)
  if (key === 'work') return workPatch(null)
  return { [key]: null }
}
