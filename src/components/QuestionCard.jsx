/* oxlint-disable react/only-export-components -- shared option lists/helpers live here by design */
import { useState } from 'react'
import './QuestionCard.css'

// ---- Shared option lists (used by Onboarding and Profile) ----
// Values are the exact enum strings / shapes from CONTRACT.md.

export const AGE_OPTIONS = [
  { value: '18-21', label: '18–21' },
  { value: '22-25', label: '22–25' },
  { value: '26-29', label: '26–29' },
]

export const STUDENT_OPTIONS = [
  { value: 'none', label: 'Not a student' },
  { value: 'cc', label: 'Community college' },
  { value: '4yr', label: '4-year' },
  { value: 'grad', label: 'Grad school' },
]

export const RESIDENCY_OPTIONS = [
  { value: 'in-state', label: 'In-state' },
  { value: 'out-of-state', label: 'Out-of-state' },
]

export const LOAN_OPTIONS = [
  { value: 'federal', label: 'Federal' },
  { value: 'private', label: 'Private' },
  { value: 'both', label: 'Both' },
  { value: 'none', label: 'None' },
]

export const HOUSING_OPTIONS = [
  { value: 'renting', label: 'Renting' },
  { value: 'dorm', label: 'Dorm' },
  { value: 'family', label: 'Living with family' },
  { value: 'own', label: 'Own' },
]

// Open ends stored as 0 and 3000.
export const RENT_OPTIONS = [
  { value: [0, 800], label: '<$800' },
  { value: [800, 1200], label: '$800–1,200' },
  { value: [1200, 1600], label: '$1,200–1,600' },
  { value: [1600, 2000], label: '$1,600–2,000' },
  { value: [2000, 3000], label: '$2,000+' },
]

export const WORK_OPTIONS = [
  { value: 'part-time', label: 'Part-time' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'none', label: 'Not working' },
]

// Open ends: <$16 stored as [0, 16]; $25+ stored as [25, 30]
// (30/hr is a sensible ceiling for this 18–29 audience).
export const WAGE_OPTIONS = [
  { value: [0, 16], label: '<$16' },
  { value: [16, 18], label: '$16–18' },
  { value: [18, 20], label: '$18–20' },
  { value: [20, 25], label: '$20–25' },
  { value: [25, 30], label: '$25+' },
]

export const HOURS_OPTIONS = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 30, label: '30' },
  { value: 40, label: '40' },
]

export const TRANSPORT_OPTIONS = [
  { value: 'car', label: 'Car' },
  { value: 'transit', label: 'Transit' },
  { value: 'bike-walk', label: 'Bike or walk' },
]

export const WHY = {
  loans: 'Changes to repayment plans and interest rates hit federal and private loans differently.',
  housing: 'Rent caps, tenant laws, and dorm fees only matter if they match how you live.',
  work: 'Minimum wage and overtime changes depend on how much and how often you work.',
  transport: 'Gas taxes, fare changes, and road tolls affect each way of getting around differently.',
}

export function labelFor(options, value) {
  const key = JSON.stringify(value)
  const opt = options.find((o) => JSON.stringify(o.value) === key)
  return opt ? opt.label : null
}

// A card for one optional question, with Skip and an expandable "Why we ask".
// skipped: true when the stored value is null (explicitly skipped).
export default function QuestionCard({ title, why, skipped, onSkip, children }) {
  const [showWhy, setShowWhy] = useState(false)
  return (
    <section className="qcard">
      <div className="qcard-head">
        <h3 className="qcard-title">{title}</h3>
        <button
          type="button"
          className={skipped ? 'qcard-skip qcard-skip--on' : 'qcard-skip'}
          onClick={onSkip}
          aria-pressed={!!skipped}
        >
          {skipped ? 'Skipped' : 'Skip'}
        </button>
      </div>
      {why && (
        <>
          <button
            type="button"
            className="qcard-why-toggle"
            aria-expanded={showWhy}
            onClick={() => setShowWhy((s) => !s)}
          >
            Why we ask
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"
              className={showWhy ? 'qcard-chev qcard-chev--open' : 'qcard-chev'}>
              <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {showWhy && <p className="qcard-why">{why}</p>}
        </>
      )}
      <div className="qcard-body">{children}</div>
    </section>
  )
}

// ---- Patch helpers: keep dependent fields consistent ----
// Non-students have no residency; store null.
export function studentPatch(student) {
  return student === 'none' ? { student, residency: null } : { student }
}

export function housingPatch(housing) {
  return housing === 'renting' ? { housing } : { housing, rentRange: null }
}

export function workPatch(work) {
  const working = work === 'part-time' || work === 'full-time'
  return working ? { work } : { work, wageRange: null, hoursPerWeek: null }
}

export function isValidZip(zip) {
  return /^\d{5}$/.test(zip || '')
}

export function LockIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}
