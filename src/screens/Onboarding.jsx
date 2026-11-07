// Ported from twin-design/screens/2-onboarding-question.html, with the questions
// from twin-design/screens/0-app-flow.html plus a 7th ("loans") in the same style.
import { useState } from 'react'
import { Icon } from '../design/twin-engine.js'
import { useProfile } from '../lib/useProfile.js'
import { saveProfile } from '../lib/profileStore.js'

const QUESTIONS = [
  // ZIP is a text field rather than options; saveProfile derives `state` from it.
  { id: 'live', title: "What's your ZIP code?", helper: 'So you only hear about what is near you.', zip: true },
  { id: 'role', title: 'What does your week look like?', helper: 'This changes which work, money and school news reaches you.', multi: true, options: [
    { id: 'fulltime', label: 'Working full time', icon: 'briefcase', topic: 'campus', adds: ['Full-time worker'] },
    { id: 'parttime', label: 'Part time, shifts or gigs', icon: 'clock', topic: 'money', adds: ['Hourly worker'] },
    { id: 'study', label: 'Studying', icon: 'book', topic: 'campus', adds: ['Student'] },
    { id: 'figuring', label: 'Figuring it out', icon: 'route', topic: 'campus', adds: ['Job hunting'] }] },
  { id: 'move', title: 'How do you get around?', helper: 'We only show transit news if it touches your route.', multi: true, options: [
    { id: 'transit', label: 'Light rail or bus', icon: 'train', topic: 'move', adds: ['Transit rider'] },
    { id: 'bike', label: 'Bike or scooter', icon: 'bike', topic: 'health', adds: ['Bike commuter'] },
    { id: 'car', label: 'Car', icon: 'car', topic: 'money', adds: ['Driver', 'Gas prices'] },
    { id: 'walk', label: 'Mostly walk', icon: 'walk', topic: 'campus', adds: ['Walker'] }] },
  { id: 'home', title: 'What is home right now?', helper: 'Rent, utilities and housing news depend on it.', multi: false, options: [
    { id: 'rent', label: 'Renting', icon: 'house', topic: 'home', adds: ['Renter'] },
    { id: 'shared', label: 'Shared house or dorm', icon: 'dorm', topic: 'home', adds: ['Shared housing'] },
    { id: 'family', label: 'Living with family', icon: 'family', topic: 'home', adds: ['Lives with family'] },
    { id: 'own', label: 'I own my place', icon: 'house', topic: 'home', adds: ['Homeowner'] }] },
  { id: 'loans', title: 'Any student loans?', helper: 'Loan rules change often. This stays on your phone.', multi: false, options: [
    { id: 'federal', label: 'Federal', icon: 'coin', topic: 'money', adds: ['Federal loans'] },
    { id: 'private', label: 'Private', icon: 'coin', topic: 'money', adds: ['Private loans'] },
    { id: 'both', label: 'Both', icon: 'coin', topic: 'money', adds: ['Federal + private loans'] },
    { id: 'none', label: 'None', icon: 'coin', topic: 'money', adds: [] }] },
  { id: 'earn', title: 'Roughly what do you earn a month?', helper: 'Optional. Ranges only, and it never leaves your phone.', multi: false, options: [
    { id: 'low', label: 'Under $1,000', icon: 'coin', topic: 'money', adds: ['Income under $1k'] },
    { id: 'mid', label: '$1,000 to $2,500', icon: 'coin', topic: 'money', adds: ['Income $1k to $2.5k'] },
    { id: 'high', label: 'More than $2,500', icon: 'coin', topic: 'money', adds: ['Income $2.5k+'] },
    { id: 'none', label: 'Rather not say', icon: 'skip', topic: 'money', adds: [] }] },
  { id: 'care', title: 'What do you care about?', helper: 'Pick as many as you like. Change it anytime.', multi: true, options: [
    { id: 'money', label: 'Money', icon: 'coin', topic: 'money', adds: ['Cares: money'] },
    { id: 'move', label: 'Getting around', icon: 'train', topic: 'move', adds: ['Cares: getting around'] },
    { id: 'home', label: 'Home', icon: 'house', topic: 'home', adds: ['Cares: home'] },
    { id: 'health', label: 'Health', icon: 'heart', topic: 'health', adds: ['Cares: health'] },
    { id: 'rights', label: 'Rights and power', icon: 'ballot', topic: 'rights', adds: ['Cares: rights'] },
    { id: 'campus', label: 'Work and school', icon: 'briefcase', topic: 'campus', adds: ['Cares: work'] }] },
]

const isValidZip = (zip) => /^\d{5}$/.test(zip || '')
// Seattle ZIPs (981xx) get the "Seattle" label used by the UUI chip and Home's date line.
const neighborhoodFor = (zip) => (/^981/.test(zip) ? 'Seattle' : null)
const HOME_TO_HOUSING = { rent: 'renting', shared: 'dorm', family: 'family', own: 'own' }
const EARN_TO_INCOME = { low: 'under-1k', mid: '1k-2.5k', high: '2.5k+', none: null }
const MOVE_TO_TRANSPORT = { car: 'car', transit: 'transit', bike: 'bike-walk', walk: 'bike-walk' }
const LOANS = ['federal', 'private', 'both', 'none']

const invert = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null).map(([k, v]) => [v, k]))

// Profile fields for one question's answer (null = skipped / nothing picked).
function patchFor(qid, answer) {
  const list = Array.isArray(answer) && answer.length ? answer : null
  switch (qid) {
    case 'live':
      return isValidZip(answer) ? { zip: answer, neighborhood: neighborhoodFor(answer) } : { zip: null, neighborhood: null }
    case 'role':
      if (!list) return { roles: null, work: null, student: null }
      return {
        roles: list,
        work: list.includes('fulltime')
          ? 'full-time'
          : list.includes('parttime')
            ? 'part-time'
            : list.includes('figuring')
              ? 'none'
              : null,
        student: list.includes('study') ? '4yr' : 'none',
      }
    case 'move':
      return { transport: list ? [...new Set(list.map((m) => MOVE_TO_TRANSPORT[m]))] : null }
    case 'home':
      return { housing: HOME_TO_HOUSING[answer] || null }
    case 'earn':
      return { incomeRange: EARN_TO_INCOME[answer] ?? null }
    case 'care':
      return { cares: list }
    case 'loans':
      return { loans: LOANS.includes(answer) ? answer : null }
    default:
      return {}
  }
}

// Reverse mapping: existing profile -> each question's selection (for "Edit answers").
function answersFromProfile(profile) {
  const p = profile || {}
  const a = {}

  if (p.zip) a.live = p.zip

  if (Array.isArray(p.roles)) {
    a.role = p.roles.slice()
  } else {
    const roles = []
    if (p.work === 'full-time') roles.push('fulltime')
    if (p.work === 'part-time') roles.push('parttime')
    if (p.student && p.student !== 'none') roles.push('study')
    if (p.work === 'none') roles.push('figuring')
    if (roles.length) a.role = roles
  }

  const transport = p.transport == null ? [] : Array.isArray(p.transport) ? p.transport : [p.transport]
  const move = []
  if (transport.includes('transit')) move.push('transit')
  if (transport.includes('bike-walk')) move.push('bike')
  if (transport.includes('car')) move.push('car')
  if (move.length) a.move = move

  const home = invert(HOME_TO_HOUSING)[p.housing]
  if (home) a.home = home

  const earn = invert(EARN_TO_INCOME)[p.incomeRange]
  if (earn) a.earn = earn

  if (Array.isArray(p.cares) && p.cares.length) a.care = p.cares.slice()

  if (LOANS.includes(p.loans)) a.loans = p.loans

  return a
}

export default function Onboarding({ onDone = () => {}, onBack = () => {}, initialStep = 0 }) {
  const [profile] = useProfile()
  const [step, setStep] = useState(() => Math.max(0, Math.min(initialStep, QUESTIONS.length - 1)))
  const [answers, setAnswers] = useState(() => answersFromProfile(profile))

  const q = QUESTIONS[step]
  const last = step === QUESTIONS.length - 1

  const isPicked = (id) => (q.multi ? (answers[q.id] || []).includes(id) : answers[q.id] === id)

  function pick(id) {
    let value
    if (q.multi) {
      const cur = (answers[q.id] || []).slice()
      const i = cur.indexOf(id)
      if (i >= 0) cur.splice(i, 1)
      else cur.push(id)
      value = cur
    } else {
      value = id
    }
    setAnswers({ ...answers, [q.id]: value })
    saveProfile(patchFor(q.id, value))
  }

  function advance() {
    if (last) onDone()
    else setStep(step + 1)
  }

  function setZip(e) {
    const zip = e.target.value.replace(/\D/g, '').slice(0, 5)
    setAnswers({ ...answers, live: zip })
    if (isValidZip(zip)) saveProfile(patchFor('live', zip))
  }

  // A partly typed ZIP can't be saved: ask for 5 digits (Skip still works).
  const zipError = q.zip && answers.live && !isValidZip(answers.live)

  function next() {
    if (zipError) return
    saveProfile(patchFor(q.id, answers[q.id]))
    advance()
  }

  function skip() {
    const rest = { ...answers }
    delete rest[q.id]
    setAnswers(rest)
    saveProfile(patchFor(q.id, null))
    advance()
  }

  function back() {
    if (step > 0) setStep(step - 1)
    else onBack()
  }

  return (
    <div
      style={{
        width: 390,
        height: 844,
        boxSizing: 'border-box',
        padding: '20px 20px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        background: 'var(--paper)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button className="tw-iconbtn" type="button" aria-label="Back" onClick={back}>
          <Icon name="back" size={20} />
        </button>
        <span className="tw-meta">{`Step ${step + 1} of ${QUESTIONS.length}`}</span>
        <button className="tw-btn tw-btn--ghost" type="button" onClick={skip} style={{ padding: '0 6px' }}>
          Skip
        </button>
      </div>
      <div className="tw-progress">
        {QUESTIONS.map((x, i) => (
          <span key={x.id} className={i < step ? 'is-done' : i === step ? 'is-now' : ''}></span>
        ))}
      </div>
      <h1 className="display-l" style={{ margin: '10px 0 0' }}>
        {q.title}
      </h1>
      <p className="body" style={{ margin: 0, color: 'var(--ink-soft)' }}>
        {q.helper}
      </p>
      {!q.zip && <span className="tw-meta">{q.multi ? 'Pick all that apply' : 'Pick one'}</span>}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 3,
        }}
      >
        {q.zip && (
          <div className="tw-field">
            <label htmlFor="onb-zip">ZIP code</label>
            <input
              id="onb-zip"
              className="tw-input"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              placeholder="98105"
              value={answers.live || ''}
              onChange={setZip}
              onKeyDown={(e) => e.key === 'Enter' && next()}
            />
            {zipError && (
              <span className="tw-meta" style={{ color: 'var(--ink)' }}>
                Enter all 5 digits
              </span>
            )}
          </div>
        )}
        {(q.options || []).map((o) => (
          <button
            key={`${q.id}-${o.id}`}
            className="tw-option"
            type="button"
            aria-pressed={isPicked(o.id) ? 'true' : 'false'}
            onClick={() => pick(o.id)}
          >
            <span className="tw-option__icon" data-topic={o.topic}>
              <Icon name={o.icon} size={22} />
            </span>
            <span className="tw-option__text">
              {o.label}
              <small>{o.adds.length ? 'Adds: ' + o.adds.join(', ') : 'Adds nothing'}</small>
            </span>
            <span className="tw-option__check">
              <Icon name="check" size={14} weight={3} />
            </span>
          </button>
        ))}
      </div>
      <button className="tw-btn tw-btn--block" type="button" onClick={next}>
        {last ? 'See my UUIs' : 'Continue'}{' '}
        <span className="tw-dot">
          <Icon name="arrow" size={16} />
        </span>
      </button>
    </div>
  )
}
