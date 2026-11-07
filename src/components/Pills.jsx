/* oxlint-disable react/only-export-components -- shared option lists/helpers live here by design */
import './Pills.css'

// Values may be strings, numbers, or [low, high] arrays, so compare structurally.
export function sameValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Single-choice pill buttons. options: [{ value, label }]
export default function Pills({ options, value, onChange, label }) {
  return (
    <div className="pills" role="radiogroup" aria-label={label}>
      {options.map((opt, i) => {
        const selected = value !== undefined && value !== null && sameValue(opt.value, value)
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected}
            className={selected ? 'pills-pill pills-pill--on' : 'pills-pill'}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
