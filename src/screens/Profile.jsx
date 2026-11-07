import { useState } from 'react'
import { useProfile } from '../lib/useProfile.js'
import { clearProfile } from '../lib/profileStore.js'
import Pills from '../components/Pills.jsx'
import {
  AGE_OPTIONS,
  STUDENT_OPTIONS,
  RESIDENCY_OPTIONS,
  LOAN_OPTIONS,
  HOUSING_OPTIONS,
  RENT_OPTIONS,
  WORK_OPTIONS,
  WAGE_OPTIONS,
  HOURS_OPTIONS,
  TRANSPORT_OPTIONS,
  studentPatch,
  housingPatch,
  workPatch,
  labelFor,
  isValidZip,
  LockIcon,
} from '../components/QuestionCard.jsx'
import './Profile.css'

export default function Profile({ onDeleted }) {
  const [profile, save] = useProfile()
  const p = profile || {}
  const [editing, setEditing] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const isStudent = !!p.student && p.student !== 'none'
  const working = p.work === 'part-time' || p.work === 'full-time'

  const rows = [
    { key: 'ageRange', label: 'Age', options: AGE_OPTIONS },
    { key: 'student', label: 'Student status', options: STUDENT_OPTIONS, patch: studentPatch },
    isStudent && { key: 'residency', label: 'Tuition residency', options: RESIDENCY_OPTIONS },
    { key: 'loans', label: 'Student loans', options: LOAN_OPTIONS },
    { key: 'housing', label: 'Housing', options: HOUSING_OPTIONS, patch: housingPatch },
    p.housing === 'renting' && { key: 'rentRange', label: 'Monthly rent', options: RENT_OPTIONS, indent: true },
    { key: 'work', label: 'Work', options: WORK_OPTIONS, patch: workPatch },
    working && { key: 'wageRange', label: 'Hourly wage', options: WAGE_OPTIONS, indent: true },
    working && { key: 'hoursPerWeek', label: 'Hours per week', options: HOURS_OPTIONS, indent: true, suffix: ' hrs' },
    { key: 'transport', label: 'Getting around', options: TRANSPORT_OPTIONS },
  ].filter(Boolean)

  function toggle(key) {
    setEditing((cur) => (cur === key ? null : key))
  }

  function handleDelete() {
    clearProfile()
    setConfirming(false)
    onDeleted?.()
  }

  return (
    <div className="prof">
      <header className="prof-header">
        <span className="prof-header-icon"><LockIcon size={18} /></span>
        <div>
          <h1 className="prof-title">Stored on this device only</h1>
          <p className="prof-header-sub">No account, no tracking. Edit anything below — changes save instantly.</p>
        </div>
      </header>

      <ul className="prof-list">
        <ZipRow
          zip={p.zip}
          state={p.state}
          open={editing === 'zip'}
          onToggle={() => toggle('zip')}
          onSave={(zip) => { save({ zip }); setEditing(null) }}
        />
        {rows.map((row) => {
          const value = p[row.key]
          const text = value === null || value === undefined ? null : labelFor(row.options, value)
          const open = editing === row.key
          return (
            <li key={row.key} className={row.indent ? 'prof-row prof-row--indent' : 'prof-row'}>
              <div className="prof-row-main">
                <div className="prof-row-text">
                  <span className="prof-row-label">{row.label}</span>
                  {text ? (
                    <span className="prof-row-value">{text}{row.suffix || ''}</span>
                  ) : (
                    <span className="prof-row-value prof-row-value--empty">Not answered</span>
                  )}
                </div>
                <button type="button" className="prof-edit" aria-expanded={open} onClick={() => toggle(row.key)}>
                  {open ? 'Done' : text ? 'Edit' : 'Add'}
                </button>
              </div>
              {open && (
                <div className="prof-editor">
                  <Pills
                    label={row.label}
                    options={row.options}
                    value={value}
                    onChange={(v) => {
                      save(row.patch ? row.patch(v) : { [row.key]: v })
                      setEditing(null)
                    }}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="prof-danger">
        {!confirming ? (
          <button type="button" className="prof-delete" onClick={() => setConfirming(true)}>
            Delete my data
          </button>
        ) : (
          <div className="prof-confirm" role="alert">
            <p className="prof-confirm-text">Delete all your answers and history from this phone? This can’t be undone.</p>
            <div className="prof-confirm-actions">
              <button type="button" className="prof-cancel" onClick={() => setConfirming(false)}>Cancel</button>
              <button type="button" className="prof-delete prof-delete--solid" onClick={handleDelete}>Yes, delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ZipRow({ zip, state, open, onToggle, onSave }) {
  const [draft, setDraft] = useState(zip || '')
  const valid = isValidZip(draft)

  return (
    <li className="prof-row">
      <div className="prof-row-main">
        <div className="prof-row-text">
          <span className="prof-row-label">ZIP code</span>
          {zip ? (
            <span className="prof-row-value">{zip}{state ? ` · ${state}` : ''}</span>
          ) : (
            <span className="prof-row-value prof-row-value--empty">Not answered</span>
          )}
        </div>
        <button
          type="button"
          className="prof-edit"
          aria-expanded={open}
          onClick={() => { setDraft(zip || ''); onToggle() }}
        >
          {open ? 'Cancel' : zip ? 'Edit' : 'Add'}
        </button>
      </div>
      {open && (
        <form
          className="prof-editor prof-zip"
          onSubmit={(e) => { e.preventDefault(); if (valid) onSave(draft) }}
        >
          <input
            className="prof-input"
            inputMode="numeric"
            autoComplete="postal-code"
            aria-label="ZIP code"
            placeholder="98105"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 5))}
          />
          <button type="submit" className="prof-save" disabled={!valid}>Save</button>
        </form>
      )}
    </li>
  )
}
