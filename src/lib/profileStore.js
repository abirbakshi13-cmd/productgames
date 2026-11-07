// Profile storage: localStorage with an in-memory fallback, plus a tiny pub/sub.
const PROFILE_KEY = 'receipts.profile'
const HISTORY_KEY = 'receipts.history'
const OPENED_KEY = 'receipts.opened'
const LOOK_KEY = 'receipts.look'

const memory = {} // used when localStorage is missing or throws
const listeners = new Set()
let cached // cached profile snapshot (same reference until it changes)
let loaded = false

function readKey(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return key in memory ? memory[key] : null
  }
}

function writeKey(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    memory[key] = value
  }
}

function removeKey(key) {
  delete memory[key]
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function notify() {
  listeners.forEach((fn) => fn(cached))
}

export function getProfile() {
  if (!loaded) {
    loaded = true
    try {
      cached = JSON.parse(readKey(PROFILE_KEY)) || null
    } catch {
      cached = null
    }
  }
  return cached
}

export function saveProfile(partial) {
  const current = getProfile() || {}
  const next = { ...current, ...partial }
  if (partial && 'zip' in partial && partial.zip !== current.zip) {
    next.state = zipToState(partial.zip)
  }
  cached = next
  writeKey(PROFILE_KEY, JSON.stringify(next))
  notify()
  return next
}

export function clearProfile() {
  removeKey(PROFILE_KEY)
  removeKey(HISTORY_KEY)
  removeKey(OPENED_KEY)
  removeKey(LOOK_KEY)
  cached = null
  loaded = true
  notify()
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// First-3-digit USPS ZIP prefix ranges -> state. Specific exceptions come first.
const ZIP_RANGES = [
  [5, 5, 'NY'], [6, 7, 'PR'], [8, 8, 'VI'], [9, 9, 'PR'],
  [55, 55, 'MA'], [201, 201, 'VA'], [569, 569, 'DC'], [885, 885, 'TX'],
  [10, 27, 'MA'], [28, 29, 'RI'], [30, 38, 'NH'], [39, 49, 'ME'],
  [50, 59, 'VT'], [60, 69, 'CT'], [70, 89, 'NJ'], [100, 149, 'NY'],
  [150, 196, 'PA'], [197, 199, 'DE'], [200, 205, 'DC'], [206, 219, 'MD'],
  [220, 246, 'VA'], [247, 268, 'WV'], [270, 289, 'NC'], [290, 299, 'SC'],
  [300, 319, 'GA'], [320, 349, 'FL'], [350, 369, 'AL'], [370, 385, 'TN'],
  [386, 397, 'MS'], [398, 399, 'GA'], [400, 427, 'KY'], [430, 459, 'OH'],
  [460, 479, 'IN'], [480, 499, 'MI'], [500, 528, 'IA'], [530, 549, 'WI'],
  [550, 567, 'MN'], [570, 577, 'SD'], [580, 588, 'ND'], [590, 599, 'MT'],
  [600, 629, 'IL'], [630, 658, 'MO'], [660, 679, 'KS'], [680, 693, 'NE'],
  [700, 714, 'LA'], [716, 729, 'AR'], [730, 749, 'OK'], [750, 799, 'TX'],
  [800, 816, 'CO'], [820, 831, 'WY'], [832, 838, 'ID'], [840, 847, 'UT'],
  [850, 865, 'AZ'], [870, 884, 'NM'], [889, 898, 'NV'], [900, 961, 'CA'],
  [967, 968, 'HI'], [969, 969, 'GU'], [970, 979, 'OR'], [980, 994, 'WA'],
  [995, 999, 'AK'],
]

export function zipToState(zip) {
  const digits = String(zip ?? '').trim()
  if (!/^\d{3}/.test(digits)) return null
  const prefix = Number(digits.slice(0, 3))
  const match = ZIP_RANGES.find(([lo, hi]) => prefix >= lo && prefix <= hi)
  return match ? match[2] : null
}
