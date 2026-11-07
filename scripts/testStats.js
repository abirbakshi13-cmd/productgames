// Run: node scripts/testStats.js
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { rebuildHistory, getHistory, markOpened, getOpened } from '../src/lib/historyStore.js'
import { netMonthly, tiles, weeklySeries, byCategory, proposed } from '../src/lib/stats.js'
import sampleProfile from '../src/data/sampleProfile.js'

function show(label, value) {
  console.log(`${label}:`, JSON.stringify(value, null, 2))
}

function assertEq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : `\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`}`)
  if (!ok) process.exitCode = 1
}

// ---------- 1. Hand-made history (checks the math without receipt.js) ----------
console.log('=== Hand-made history (today = 2026-11-07) ===')
const TODAY = '2026-11-07'
const hand = [
  { storyId: 'a', topicKey: 'a', date: '2026-10-13', type: 'money', direction: 'cost', low: 40, high: 90, unit: '/mo', dueDate: null, category: 'loans', stage: 'passed' },
  { storyId: 'b', topicKey: 'b', date: '2026-10-27', type: 'money', direction: 'saving', low: 20, high: 30, unit: '/mo', dueDate: null, category: 'transit', stage: 'in_effect' },
  { storyId: 'c', topicKey: 'c', date: '2026-11-03', type: 'money', direction: 'cost', low: 100, high: 200, unit: '/mo', dueDate: null, category: 'rent', stage: 'proposed' },
  { storyId: 'd', topicKey: 'd', date: '2026-10-21', type: 'rule', direction: null, low: null, high: null, unit: null, dueDate: null, category: 'rent', stage: 'in_effect' },
  { storyId: 'e', topicKey: 'e', date: '2026-11-05', type: 'deadline', direction: null, low: null, high: null, unit: null, dueDate: '2026-12-01', category: 'transit', stage: 'in_effect' },
  { storyId: 'f', topicKey: 'f', date: '2026-09-01', type: 'deadline', direction: null, low: null, high: null, unit: null, dueDate: '2026-10-01', category: 'other', stage: 'in_effect' },
  { storyId: 'g', topicKey: 'g', date: '2026-11-04', type: 'money', direction: 'cost', low: 10, high: 10, unit: '/mo', dueDate: null, category: 'transit', stage: 'passed' },
]
show('tiles', tiles(hand, TODAY))
show('weeklySeries', weeklySeries(hand, TODAY))
show('byCategory', byCategory(hand))
show('proposed ids', proposed(hand).map((e) => e.storyId))

// costs 40-90 + 10-10, saving 20-30 -> low 50-30=20, high 100-20=80
assertEq('netMonthly', netMonthly(hand), { low: 20, high: 80 })
assertEq('tiles', tiles(hand, TODAY), { net: { low: 20, high: 80 }, affectedCount: 7, rulesCount: 1, upcomingDeadlines: 1 })
assertEq('weeklySeries', weeklySeries(hand, TODAY), [
  { week: 'Oct 12', low: 40, mid: 65, high: 90 },
  { week: 'Oct 19', low: 40, mid: 65, high: 90 },
  { week: 'Oct 26', low: 10, mid: 40, high: 70 },
  { week: 'Nov 2', low: 20, mid: 50, high: 80 },
])
assertEq('byCategory', byCategory(hand), [
  { category: 'loans', low: 40, high: 90 },
  { category: 'transit', low: -20, high: -10 },
])
assertEq('proposed', proposed(hand).map((e) => e.storyId), ['c'])

console.log('\n=== Empty history ===')
assertEq('netMonthly([])', netMonthly([]), { low: 0, high: 0 })
assertEq('tiles([])', tiles([], TODAY), { net: { low: 0, high: 0 }, affectedCount: 0, rulesCount: 0, upcomingDeadlines: 0 })
assertEq('weeklySeries([]) length', weeklySeries([], TODAY).length, 4)
assertEq('byCategory([])', byCategory([]), [])
assertEq('proposed([])', proposed([]), [])
assertEq('tiles(null)', tiles(null, TODAY).affectedCount, 0)

console.log('\n=== historyStore basics ===')
assertEq('rebuildHistory(null) is empty', rebuildHistory(null, []), [])
const ref = getHistory()
assertEq('getHistory stable ref', getHistory() === ref, true)
markOpened('a'); markOpened('a')
assertEq('opened ids deduped', getOpened(), ['a'])
assertEq('markOpened does not change history', getHistory() === ref, true)

// ---------- 2. Real stories.json + sample renter profile ----------
console.log('\n=== stories.json + sample renter profile ===')
let stories = []
try {
  const path = fileURLToPath(new URL('../src/data/stories.json', import.meta.url))
  const raw = readFileSync(path, 'utf8').trim()
  stories = raw ? JSON.parse(raw) : []
  if (!Array.isArray(stories)) stories = []
} catch (err) {
  console.log(`Could not read stories.json (${err.message}); using []`)
}
console.log(`${stories.length} stories loaded`)

try {
  rebuildHistory(sampleProfile, stories)
} catch (err) {
  if (/not implemented/i.test(err.message)) {
    console.log('receipt.js not implemented yet — skipping real-data section.')
    process.exit(process.exitCode ?? 0)
  }
  throw err
}
const h = getHistory()
show('history', h)
show('tiles', tiles(h))
show('weeklySeries', weeklySeries(h))
show('byCategory', byCategory(h))
show('proposed', proposed(h).map((e) => e.storyId))
