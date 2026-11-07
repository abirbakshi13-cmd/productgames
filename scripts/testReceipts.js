// Usage: node scripts/testReceipts.js
import { readFileSync } from 'node:fs'
import { computeReceipt, formatReceipt } from '../src/lib/receipt.js'

const storiesUrl = new URL('../src/data/stories.json', import.meta.url)
const stories = JSON.parse(readFileSync(storiesUrl, 'utf8') || '[]')

if (!Array.isArray(stories) || stories.length === 0) {
  console.log('No stories yet')
  process.exit(0)
}

const profiles = {
  'WA renter, fed loans': {
    zip: '98105', state: 'WA', ageRange: '18-21', student: '4yr', residency: 'in-state',
    loans: 'federal', housing: 'renting', rentRange: [1200, 1600],
    work: 'part-time', wageRange: [16, 18], hoursPerWeek: 20, transport: 'transit',
  },
  'Dorm student, no loans': {
    zip: '98105', state: 'WA', ageRange: '18-21', student: '4yr', residency: 'out-of-state',
    loans: 'none', housing: 'dorm', work: 'none', transport: 'bike-walk',
  },
  'Housing skipped (null)': {
    zip: '98105', state: 'WA', ageRange: '22-25', student: 'none', residency: 'in-state',
    loans: 'private', housing: null, work: 'full-time', wageRange: [20, 24], hoursPerWeek: 40,
    transport: 'car',
  },
}

const rows = []
for (const story of stories) {
  for (const [name, profile] of Object.entries(profiles)) {
    const r = computeReceipt(profile, story)
    rows.push({
      story: story.id,
      profile: name,
      status: r.status,
      chip: formatReceipt(r),
      detail: r.status === 'needs_info' ? `ask: ${r.askField}` : r.text,
    })
  }
}
console.table(rows)
