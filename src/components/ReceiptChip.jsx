import './ReceiptChip.css';

const PERIOD_WORDS = { '/mo': 'month', '/yr': 'year', '/hr': 'hour' };

function fmtNum(n) {
  return Math.round(n).toLocaleString('en-US');
}

function moneyLabel({ low, high, unit, direction }) {
  const sign = direction === 'saving' ? '+' : '−'; // U+2212 minus
  const body = low === high ? `$${fmtNum(low)}` : `$${fmtNum(low)}–$${fmtNum(high)}`;
  return `${sign}${body}${unit}`;
}

function moneyAria({ low, high, unit, direction }) {
  const word = direction === 'saving' ? 'saving' : 'cost';
  const amount =
    low === high ? `${Math.round(low)} dollars` : `${Math.round(low)} to ${Math.round(high)} dollars`;
  if (unit === ' one-time') return `Estimated ${word} of ${amount}, one time`;
  const period = PERIOD_WORDS[unit] || 'period';
  return `Estimated ${word} of ${amount} per ${period}`;
}

// Parse "YYYY-MM-DD" as a LOCAL date so formatting never shifts a day.
function parseLocalDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function deadlineLabel(receipt) {
  if (!receipt.date) return 'Deadline for you';
  const formatted = parseLocalDate(receipt.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `Act by ${formatted}`;
}

const ICONS = { rule: '⚖', rep: '🏛', deadline: '⏰' }; // ⚖ 🏛 ⏰

/**
 * Pure display. Renders the output of computeReceipt as a small pill.
 * Props: { receipt, size = "md" }
 */
export default function ReceiptChip({ receipt, size = 'md' }) {
  if (!receipt) return null;
  const sizeClass = size === 'lg' ? 'chip--lg' : 'chip--md';

  if (receipt.status === 'affected' && receipt.type === 'money') {
    const tone = receipt.direction === 'saving' ? 'chip--saving' : 'chip--cost';
    return (
      <span className={`chip ${tone} ${sizeClass}`} aria-label={moneyAria(receipt)}>
        {moneyLabel(receipt)}
        <span className="chip-est" aria-hidden="true">
          {' '}
          est.
        </span>
      </span>
    );
  }

  if (
    receipt.status === 'affected' &&
    (receipt.type === 'rule' || receipt.type === 'rep' || receipt.type === 'deadline')
  ) {
    const label =
      receipt.type === 'rule'
        ? 'New rule for you'
        : receipt.type === 'rep'
          ? 'Your rep changed'
          : deadlineLabel(receipt);
    return (
      <span className={`chip chip--info ${sizeClass}`} aria-label={label}>
        <span aria-hidden="true" className="chip-icon">
          {ICONS[receipt.type]}
        </span>
        {label}
      </span>
    );
  }

  if (receipt.status === 'not_affected') {
    return (
      <span className={`chip chip--muted ${sizeClass}`} aria-label="Doesn't affect you">
        Doesn't affect you
      </span>
    );
  }

  // needs_info, and any unrecognized/malformed status falls back here.
  return (
    <span className={`chip chip--needs-info ${sizeClass}`} aria-label="See what this means for you">
      See what this means for you
    </span>
  );
}
