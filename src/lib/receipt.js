// Pure functions (no browser APIs) so they also run in plain Node.

function isMissing(value) {
  return value === null || value === undefined
}

function matches(when, profile) {
  return Object.entries(when || {}).every(([key, allowed]) =>
    Array.isArray(allowed) ? allowed.includes(profile[key]) : profile[key] === allowed,
  )
}

export function computeReceipt(profile, story) {
  const missing = (story.needs || []).find((field) => !profile || isMissing(profile[field]))
  if (missing) return { status: 'needs_info', askField: missing }

  const hit = (story.receipts || []).find((r) => matches(r.when, profile || {}))
  if (hit) {
    const fields = { ...hit }
    delete fields.when
    return { status: 'affected', ...fields }
  }
  return { status: 'not_affected', text: story.otherwise }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2026-11-20" -> "Nov 20" (string parsing, so no timezone shift)
function shortDate(iso) {
  const [, month, day] = String(iso || '').split('-').map(Number)
  if (!month || !day) return ''
  return `${MONTHS[month - 1]} ${day}`
}

function moneyRange(low, high) {
  return low === high || isMissing(high) ? `$${low}` : `$${low}–$${high}`
}

export function formatReceipt(receipt) {
  if (!receipt) return ''
  if (receipt.status === 'needs_info') return 'See what this means for you'
  if (receipt.status === 'not_affected') return "Doesn't affect you"

  switch (receipt.type) {
    case 'money': {
      const amount = `${moneyRange(receipt.low, receipt.high)}${receipt.unit || ''}`
      return receipt.direction === 'saving' ? `Saves ${amount}` : `+${amount}`
    }
    case 'rule':
      return 'New rule'
    case 'rep':
      return 'New rep'
    case 'deadline':
      return `Due ${shortDate(receipt.dueDate)}`
    default:
      return receipt.text || ''
  }
}
