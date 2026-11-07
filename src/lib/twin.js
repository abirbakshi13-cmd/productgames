// Twin helpers: the character's look (stored on device), topic mapping, moods,
// and the "UUI" chips that describe the user.
import { subscribe as subscribeProfile } from './profileStore.js'

const LOOK_KEY = 'receipts.look'
export const DEFAULT_LOOK = { hair: 'messy', item: 'headphones', accent: 'signal' }

// ---- look store (localStorage with an in-memory fallback, same pattern as profileStore)
const memory = {}
const lookListeners = new Set()
let look = null

function readLook() {
  let raw = null
  try {
    raw = window.localStorage.getItem(LOOK_KEY)
  } catch {
    raw = LOOK_KEY in memory ? memory[LOOK_KEY] : null
  }
  try {
    return raw ? { ...DEFAULT_LOOK, ...JSON.parse(raw) } : { ...DEFAULT_LOOK }
  } catch {
    return { ...DEFAULT_LOOK }
  }
}

function notifyLook() {
  lookListeners.forEach((fn) => fn(look))
}

export function getLook() {
  if (look === null) look = readLook()
  return look
}

export function saveLook(partial) {
  look = { ...getLook(), ...partial }
  const raw = JSON.stringify(look)
  try {
    window.localStorage.setItem(LOOK_KEY, raw)
  } catch {
    memory[LOOK_KEY] = raw
  }
  notifyLook()
  return look
}

export function subscribeLook(fn) {
  lookListeners.add(fn)
  return () => lookListeners.delete(fn)
}

// clearProfile() removes the stored look; drop the cached copy too.
subscribeProfile((profile) => {
  if (profile) return
  delete memory[LOOK_KEY]
  look = { ...DEFAULT_LOOK }
  notifyLook()
})

// ---- topics
const CATEGORY_TOPIC = {
  rent: 'home',
  loans: 'money',
  work: 'campus',
  transit: 'move',
  prices: 'money',
  health: 'health',
  other: 'rights',
}

export const TOPIC_LABELS = {
  money: 'Money',
  move: 'Getting around',
  home: 'Home',
  health: 'Health',
  rights: 'Rights & power',
  campus: 'Work & school',
}

// Same mapping as [data-topic] in components.css
export const TOPIC_COLORS = {
  money: 'var(--butter)',
  move: 'var(--sky)',
  home: 'var(--peach)',
  health: 'var(--mint)',
  rights: 'var(--lilac)',
  campus: 'var(--blush)',
}

export function topicFor(category) {
  return CATEGORY_TOPIC[category] || 'rights'
}

export function topicLabel(topic) {
  return TOPIC_LABELS[topic] || TOPIC_LABELS.rights
}

export function topicColor(topic) {
  return TOPIC_COLORS[topic] || TOPIC_COLORS.rights
}

// ---- moods (chill, hyped, stressed, ugh, curious, sleepy)
export function moodFor(receipt) {
  if (!receipt || receipt.status === 'not_affected') return 'chill'
  if (receipt.status === 'needs_info') return 'curious'
  if (receipt.type === 'money') return receipt.direction === 'saving' ? 'hyped' : 'ugh'
  if (receipt.type === 'deadline') return 'stressed'
  return 'curious'
}

// ---- UUIs: chips describing the user, labels from twin-design/screens/0-app-flow.html.
// Each chip is { label, topic, key, value }; key/value say which profile answer
// it stands for, so matchedUuis can line chips up with a receipt's `when`.
const ROLE_CHIPS = {
  fulltime: { label: 'Full-time worker', topic: 'campus', key: 'work', value: 'full-time' },
  parttime: { label: 'Hourly worker', topic: 'money', key: 'work', value: 'part-time' },
  study: { label: 'Student', topic: 'campus', key: 'student' },
  figuring: { label: 'Job hunting', topic: 'campus', key: 'work', value: 'none' },
}

const TRANSPORT_CHIPS = {
  transit: [{ label: 'Transit rider', topic: 'move' }],
  'bike-walk': [{ label: 'Bikes or walks', topic: 'health' }],
  car: [
    { label: 'Driver', topic: 'money' },
    { label: 'Gas prices', topic: 'money' },
  ],
}

const HOUSING_CHIPS = {
  renting: 'Renter',
  dorm: 'Shared housing',
  family: 'Lives with family',
  own: 'Homeowner',
}

const INCOME_CHIPS = {
  'under-1k': 'Income under $1k',
  '1k-2.5k': 'Income $1k to $2.5k',
  '2.5k+': 'Income $2.5k+',
}

const LOAN_CHIPS = {
  federal: 'Federal loans',
  private: 'Private loans',
  both: 'Federal + private loans',
}

const CARE_CHIPS = {
  money: 'Cares: money',
  move: 'Cares: getting around',
  home: 'Cares: home',
  health: 'Cares: health',
  rights: 'Cares: rights',
  campus: 'Cares: work',
}

function asArray(value) {
  if (value === null || value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

export function uuisFromProfile(profile) {
  const p = profile || {}
  const chips = []

  if (p.neighborhood) chips.push({ label: p.neighborhood, topic: 'home', key: 'state', value: p.state })

  if (Array.isArray(p.roles)) {
    for (const role of p.roles) {
      const chip = ROLE_CHIPS[role]
      if (chip) chips.push({ ...chip, value: chip.key === 'student' ? p.student : chip.value })
    }
  } else {
    // Profiles made before `roles` existed
    if (p.work === 'full-time') chips.push({ ...ROLE_CHIPS.fulltime })
    if (p.work === 'part-time') chips.push({ ...ROLE_CHIPS.parttime })
    if (p.student && p.student !== 'none') chips.push({ ...ROLE_CHIPS.study, value: p.student })
  }

  for (const mode of asArray(p.transport)) {
    for (const chip of TRANSPORT_CHIPS[mode] || []) chips.push({ ...chip, key: 'transport', value: mode })
  }

  if (HOUSING_CHIPS[p.housing]) {
    chips.push({ label: HOUSING_CHIPS[p.housing], topic: 'home', key: 'housing', value: p.housing })
  }
  if (INCOME_CHIPS[p.incomeRange]) {
    chips.push({ label: INCOME_CHIPS[p.incomeRange], topic: 'money', key: 'incomeRange', value: p.incomeRange })
  }
  if (LOAN_CHIPS[p.loans]) {
    chips.push({ label: LOAN_CHIPS[p.loans], topic: 'money', key: 'loans', value: p.loans })
  }
  for (const care of asArray(p.cares)) {
    if (CARE_CHIPS[care]) chips.push({ label: CARE_CHIPS[care], topic: care, key: 'cares', value: care })
  }

  return chips
}

// Chips for the answers that made a receipt match ("Why it hits you").
export function matchedUuis(profile, receipt) {
  if (!receipt || receipt.status !== 'affected' || !receipt.when) return []
  const chips = uuisFromProfile(profile)
  const out = []
  for (const [key, allowed] of Object.entries(receipt.when)) {
    const ok = (v) => (Array.isArray(allowed) ? allowed.includes(v) : v === allowed)
    const hits = chips.filter((c) => c.key === key && ok(c.value))
    if (hits.length) {
      out.push(...hits)
    } else if (key === 'state' && profile?.state) {
      out.push({ label: `Lives in ${profile.state}`, topic: 'home', key, value: profile.state })
    }
  }
  return out
}
