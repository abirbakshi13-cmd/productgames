// STUB. At 1:00 integration replace everything below with:
//   export { getProfile, saveProfile, clearProfile } from '../lib/profileStore.js';
//   export { computeReceipt } from '../lib/receipt.js';
// B's screens import ONLY from this file, so the swap needs no other edits.

const KEY = "receipts.profile";

// The spec's Data contract profile, but housing/rentRange unanswered so the rent
// story triggers ask-in-context in demo step 5.
export const sampleProfile = {
  zip: "98105",
  state: "WA",
  ageRange: "18-21",
  student: "4yr",
  residency: "in-state",
  loans: "federal",
  housing: null,
  rentRange: null,
  work: "part-time",
  wageRange: [16, 18],
  hoursPerWeek: 20,
  transport: "transit",
};

export function getProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // private mode / blocked storage: fall through to the sample
  }
  return { ...sampleProfile };
}

export function saveProfile(partial) {
  const merged = { ...getProfile(), ...partial };
  try {
    localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    // ignore; the in-memory merge is still returned
  }
  window.dispatchEvent(new Event("profilechange"));
  return merged;
}

export function clearProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event("profilechange"));
}

const isMissing = (v) => v === null || v === undefined;

// An array in `when` means "any of these".
const matches = (when, profile) =>
  Object.entries(when || {}).every(([field, allowed]) =>
    Array.isArray(allowed) ? allowed.includes(profile[field]) : profile[field] === allowed,
  );

export function computeReceipt(profile, story) {
  const p = profile || {};
  const missing = (story?.needs || []).find((field) => isMissing(p[field]));
  if (missing) return { status: "needs_info", askField: missing };

  const hit = (story?.receipts || []).find((r) => matches(r.when, p));
  if (!hit) return { status: "not_affected", text: story?.otherwise, askField: null };

  const { when, ...rest } = hit;
  // date: fixtures use `date`, the contract calls it `dueDate`. Pass both through.
  return { status: "affected", ...rest, date: hit.date ?? hit.dueDate, when, askField: null };
}
