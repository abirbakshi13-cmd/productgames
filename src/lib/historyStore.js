import { computeReceipt } from './receipt.js'
import { getProfile, subscribe } from './profileStore.js'

const HISTORY_KEY = 'receipts.history'
const OPENED_KEY = 'receipts.opened'

// ---- storage (localStorage with in-memory fallback for Node / private browsing)
const memory = new Map()

function readJSON(key, fallback) {
  let raw = null
  try {
    raw = globalThis.localStorage ? globalThis.localStorage.getItem(key) : null
  } catch {
    raw = null
  }
  if (raw == null && memory.has(key)) raw = memory.get(key)
  if (raw == null) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  const raw = JSON.stringify(value)
  memory.set(key, raw)
  try {
    if (globalThis.localStorage) globalThis.localStorage.setItem(key, raw)
  } catch {
    // quota / private mode: memory copy is enough
  }
}

function removeKey(key) {
  memory.delete(key)
  try {
    if (globalThis.localStorage) globalThis.localStorage.removeItem(key)
  } catch {
    // nothing stored to remove
  }
}

// ---- state (stable references between changes, for useSyncExternalStore)
let history = null
let opened = null
const listeners = new Set()

function notify() {
  for (const fn of [...listeners]) {
    try {
      fn()
    } catch (err) {
      console.error('[historyStore] listener error', err)
    }
  }
}

export function getHistory() {
  if (history === null) {
    const saved = readJSON(HISTORY_KEY, [])
    history = Array.isArray(saved) ? saved : []
  }
  return history
}

export function subscribeHistory(fn) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function toEntry(story, receipt) {
  return {
    storyId: story.id,
    topicKey: story.topicKey ?? story.id,
    date: story.source?.date ?? null,
    type: receipt.type ?? null,
    direction: receipt.direction ?? null,
    low: receipt.low ?? null,
    high: receipt.high ?? null,
    unit: receipt.unit ?? null,
    dueDate: receipt.dueDate ?? null,
    category: story.category ?? 'other',
    stage: story.stage ?? null,
  }
}

// Recomputes history from scratch. Errors from computeReceipt propagate
// (initHistory catches them so the app keeps running).
export function rebuildHistory(profile, stories) {
  const byTopic = new Map()
  if (profile && Array.isArray(stories)) {
    for (const story of stories) {
      const receipt = computeReceipt(profile, story)
      if (!receipt || receipt.status !== 'affected') continue
      const entry = toEntry(story, receipt)
      const prev = byTopic.get(entry.topicKey)
      // keep the earliest date per topicKey; undated entries lose to dated ones
      if (!prev || (entry.date && (!prev.date || entry.date < prev.date))) {
        byTopic.set(entry.topicKey, entry)
      }
    }
  }
  const next = [...byTopic.values()].sort((a, b) =>
    (a.date ?? '').localeCompare(b.date ?? ''),
  )
  history = next
  if (profile) {
    writeJSON(HISTORY_KEY, next)
  } else {
    // No profile means the user deleted their data: drop both keys and the
    // in-memory copies so nothing gets written back later.
    removeKey(HISTORY_KEY)
    removeKey(OPENED_KEY)
    opened = []
  }
  notify()
  return next
}

let profileUnsub = null

function safeRebuild(stories) {
  let profile = null
  try {
    profile = getProfile()
  } catch (err) {
    console.error('[historyStore] getProfile failed', err)
  }
  try {
    rebuildHistory(profile, stories)
  } catch (err) {
    console.error('[historyStore] rebuildHistory failed', err)
  }
}

// Safe to call repeatedly: replaces any previous profile subscription.
export function initHistory(stories) {
  if (profileUnsub) {
    profileUnsub()
    profileUnsub = null
  }
  safeRebuild(stories)
  let unsub = null
  try {
    unsub = subscribe(() => safeRebuild(stories))
  } catch (err) {
    console.error('[historyStore] profile subscribe failed', err)
  }
  const cleanup = () => {
    if (typeof unsub === 'function') unsub()
    unsub = null
    if (profileUnsub === cleanup) profileUnsub = null
  }
  profileUnsub = cleanup
  return cleanup
}

// ---- opened ids: separate from history, never affects totals
export function getOpened() {
  if (opened === null) {
    const saved = readJSON(OPENED_KEY, [])
    opened = Array.isArray(saved) ? saved : []
  }
  return opened
}

export function markOpened(id) {
  if (id == null) return
  const current = getOpened()
  if (current.includes(id)) return
  opened = [...current, id]
  writeJSON(OPENED_KEY, opened)
  notify()
}
