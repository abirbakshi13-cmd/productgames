// Builds the Groq chat messages that turn one news article into a Receipts
// "Story" object. The LLM only ever sees article text plus the list of
// POSSIBLE profile fields/values below — never an actual user's profile.
// That separation is a pitch point; don't change this file to read a profile.
import { FIELD_OPTIONS } from '../src/shared/fields.js';

// `when` keys allowed on a receipt: state (derived from ZIP, not a FIELD_OPTIONS
// entry) plus every real profile field. Never zip, rentRange, or wageRange.
export const WHEN_KEYS = ['state', 'ageRange', 'student', 'residency', 'loans', 'housing', 'work', 'transport'];

export const ALLOWED_WHEN_VALUES = Object.fromEntries(
  WHEN_KEYS.filter((k) => k !== 'state').map((k) => [k, (FIELD_OPTIONS[k] || []).map((o) => o.value)]),
);

function allowedValuesBlock() {
  const lines = ['state: any two-letter USPS state code (e.g. "WA", "CA"). Omit the "state" key entirely for national changes.'];
  for (const key of WHEN_KEYS) {
    if (key === 'state') continue;
    lines.push(`${key}: ${ALLOWED_WHEN_VALUES[key].map((v) => `"${v}"`).join(', ')}`);
  }
  return lines.join('\n');
}

const SCHEMA_BLOCK = `{
  "topicKey": "kebab-case id for this one real-world change, e.g. \\"wa-2027-rent-cap\\". Two articles about the same change MUST produce the same topicKey.",
  "headline": "string",
  "summary": "2 to 3 plain, neutral sentences. No opinion, no outlet framing.",
  "category": "rent" | "loans" | "work" | "transit" | "prices" | "other",
  "stage": "proposed" | "passed" | "in_effect",
  "needs": ["profile field names used in any receipt's when, EXCLUDING state"],
  "receipts": [
    {
      "when": { "...one or more allowed keys below, value = single string or array of strings meaning \\"any of\\"..." },
      "type": "money" | "rule" | "rep" | "deadline",
      "direction": "saving" | "cost",
      "low": number,
      "high": number,
      "unit": "/mo" | "/yr" | "/hr" | " one-time",
      "calc": "optional one-line arithmetic shown to the reader, e.g. \\"9.7% cap x $1,000-1,500 rent = up to $97-145/mo\\"",
      "date": "YYYY-MM-DD, REQUIRED when type is deadline",
      "text": "one plain second-person sentence, max 22 words, no hype",
      "evidence": "one sentence copied VERBATIM, character for character, from the article text"
    }
  ],
  "otherwise": "one sentence on who else this is relevant to, for readers the receipts above don't cover"
}`;

export function buildMessages({ title, outlet, url, date, text }) {
  const system = `You turn one news article into structured "Receipt" data for a personal news app aimed at people roughly 18 to 29 in the United States, many of them students, with a demo user living in Seattle, Washington. You are precise, literal, and never invent numbers.

Output EXACTLY one JSON object, no markdown fences, no commentary outside the JSON:
{"relevant": boolean, "reason": "string", "story": <Story object or null>}

Set "relevant" to false (and "story" to null) when the article has no concrete effect on any reader's money, the rules they live under, their representatives, or a deadline they face. Celebrity news, sports scores, and opinion pieces without a concrete policy or price change are NOT relevant.

When relevant is true, "story" must match this schema exactly:
${SCHEMA_BLOCK}

Allowed "when" keys and values (generated from the app's real profile field options â€” never use any other key or value):
${allowedValuesBlock()}

Rules:
- "needs" must list every profile field used in any receipt's "when", except "state" (state always comes from the reader's ZIP code, never asked).
- Order receipts most specific first; the app uses first-match-wins. Include a receipt for every group the article actually covers, and add one fallback receipt for people affected in a non-money way when the article supports it.
- Use type "money" ONLY when the article itself states the numbers (dollar amounts, percentages applied to a stated base, wage rates). You may do simple arithmetic on numbers the article states, and you MUST show that arithmetic in "calc". Never invent or estimate a number the article does not support. low must be <= high. direction is "saving" if the reader gains money, "cost" if they pay more.
- If the change is not about money, choose "rule" (a new law or policy changes what applies to the reader), "rep" (an election result or new official for the reader's area), or "deadline" (the reader must act by a date; "date" is then required).
- "evidence" must be copied VERBATIM, character for character, from the article text below. Do not paraphrase. Do not stitch together two separate sentences.
- "text" is one plain sentence, second person ("Your rent increase can't exceed..."), max 22 words, no hype.
- "summary" is 2 to 3 plain, neutral sentences with no opinion and no outlet framing.
- "otherwise" is one sentence about who else this affects, for readers the receipts above don't directly cover.
- Geography: if the change applies only to one state or city, put that state's two-letter code in "when". National changes have no "state" key.
- Return JSON only. No markdown code fences.`;

  const user = `ARTICLE
Title: ${title}
Outlet: ${outlet}
URL: ${url}
Date: ${date}

Article text (may be truncated):
"""
${text}
"""`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
