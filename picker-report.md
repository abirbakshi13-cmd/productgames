# Story picker report

Built `src/data/stories.json` by hand from the 6 cached articles named in the brief (the WA L&I
article became a 7th story rather than an `alsoReportedBy`, because it reports a different
real-world change). No Groq call, no `prepStories.js` run. Verified with
`node .cache/check-stories.mjs`: **all checks pass** (`npm run build` passes too).

## The 7 stories

| # | id | outlet | date | type | category | stage | featured | sampleProfile sees |
|---|---|---|---|---|---|---|---|---|
| 1 | `closed-school-discharge-expansion-npr-education` | NPR Education | 2026-10-29 | rule | loans | in_effect | **1st** | affected / rule |
| 2 | `iran-war-oil-price-risk-cnbc` | CNBC | 2026-11-07 | rule | prices | in_effect | **2nd** | not_affected |
| 3 | `wa-2027-rent-cap-nbcrightnow` | NBC Right Now | 2026-11-07 | money (cost) | rent | passed | **3rd** | needs_info (asks housing) |
| 4 | `seattle-2027-minimum-wage-fox13seattle` | FOX 13 Seattle | 2026-11-07 | money (saving) | work | passed | **4th** | affected / money |
| 5 | `wa-2027-noncompete-ban-lni` | WA Labor & Industries | 2026-11-07 | rule | work | passed | no | affected / rule |
| 6 | `seattle-d5-council-jenks-the-urbanist` | The Urbanist | 2026-11-05 | rep | other | in_effect | no | affected / rep |
| 7 | `wa-house-democratic-supermajority-the-urbanist` | The Urbanist | 2026-11-04 | rep | other | proposed | no | affected / rep |

Type coverage: money ✓, rule ✓, rep ✓, **deadline ✗** (none of the 6 articles sets a date the
reader must act by; inventing one would be a fabricated receipt).

## computeReceipt checks (`.cache/check-stories.mjs`)

```
PASS  1 loan  / sampleProfile -> affected/rule
PASS  1 loan  / loans:none    -> not_affected
PASS  2 oil   / sampleProfile -> not_affected
PASS  3 rent  / sampleProfile -> needs_info ask=housing
PASS  3 rent  / renting+range -> affected/money/cost 100-150/mo
PASS  4 wage  / sampleProfile -> affected/money/saving 0.84-0.84/hr
```

Every receipt's `evidence` was confirmed as a verbatim substring of the cached article text
(normalising case, curly quotes, dash variants and whitespace). The script also validates the
schema: enums, `when` keys/values against `FIELD_OPTIONS`, `needs` ⟷ `when` consistency,
`low <= high`, direction/unit, 22-word limit on `text`, 2–3 sentences in `summary`.

## Evidence, per story

1. **Loans** — "Under the change, any borrower who was enrolled as of May 6, 2015, would qualify for a loan discharge and refund of any past payments."
2. **Oil/gas** — "Gasoline, diesel and jet fuel prices would all surge as a consequence, Hochstein told CNBC's \"Power Lunch\" Friday."
3. **Rent cap** — "The Washington State Department of Commerce (COM) announced on Wednesday that all rental units subject to the Residential Landlord Tenant Law in Washington state will be allowed a maximum annual rent increase percentage of 10% in 2027."
4. **Seattle wage** — "On Jan. 1, 2027, the minimum wage for Washington's largest city will take an 84-cent climb, reaching $22.14."
5. **Non-compete** — "State law will prohibit non-compete clauses starting in July 2027."
6. **Jenks** — "Nilu Jenks has won a Seattle City Council seat based on the decisive 17-point lead she ran up on election night."
7. **Supermajority** — "Election night returns, when about half of ballots are counted in Washington's vote-by-mail elections, indicated Democrats are likely on course to a two-thirds supermajority in the state House."

## Deviations from the brief, with reasons

- **Featured #1 is a `rule`, not `money`.** The NPR closed-college article states no dollar figure
  that applies to a reader. Its only amounts are two named individuals' debts ("nearly $22,000",
  "about $28,000"); presenting either as the reader's amount would be a fabricated number. The
  demo-step-4 behaviour the slot exists for is intact: `loans: "federal"` → affected,
  `loans: "none"` → "Doesn't affect you". The feed still shows a money chip at rest, from
  featured #4. To get a money chip in slot 1 you need a loan article that states amounts
  (e.g. a repayment-plan or interest-rate change).
- **Rent cap is 10%, not 9.7%.** The example calc in the spec used 9.7%; Commerce set 10% for 2027.
- **The L&I article is its own story, about the non-compete ban.** The `$17.73` figure is *not in
  the cached extraction* — Readability dropped the headline/lede, and the body only says "the
  increase". It is derivable ($1,773/wk ÷ 40 ÷ 2.5, and $15.07 ÷ 0.85), but deriving a headline
  number the article never prints is exactly the move the accuracy rule forbids, so the story
  leads with the non-compete ban, which the text states outright.

## Human please double-check

1. **`+$1/hr` rounding on the Seattle wage card** — the data is exactly `low: 0.84, high: 0.84`,
   but `ReceiptChip.jsx:6` and `ReceiptCard.jsx:38` both do `Math.round(n)`, so the chip and the
   big card line will read **"+$1/hr"** while the expandable math correctly reads
   "$22.14 in 2027 - $21.30 in 2026 = $0.84 more per hour". A 19% overstatement on the most
   prominent number in the feed. Fixing it is a one-line component change (show cents when the
   amount is under $10) which is outside this task's file scope — your call.
   Source: https://www.fox13seattle.com/news/seattle-minimum-wage-increase
2. **Rent cap assumes the $1,000–1,500 bucket.** `rentRange` is not an allowed `when` key, so the
   receipt hardcodes `$100–150/mo` from that bucket. A renter who answers "$2,000+" still sees
   $100–150. The `calc` line discloses the assumption, but the number is wrong for them.
   Source: https://www.nbcrightnow.com/news/washington-doc-sets-10-rent-increase-cap-for-2027/article_b6c5a301-3348-53d1-9b4d-fe0bdc153cde.html
3. **Rent cap direction is "cost".** The cap *limits* an increase; the chip renders
   "−$100–$150/mo", which reads as a certainty. `text` and `calc` both say "cannot raise more
   than" / "at most". Consider whether that framing is acceptable on camera.
4. **Seattle wage uses `state: "WA"`** because there is no city key. The article says the rise is
   "only for employees within Seattle city limits", so a Spokane user would also see this receipt.
   `text` says "If you work in Seattle"; the `when` cannot.
5. **Jenks `when` is `state: "WA"`** for what is a Seattle District 5 seat — the same limitation,
   but worse: a Spokane user sees "Your rep changed". Also note ZIP 98105 is District 4, not 5.
   Source: https://www.theurbanist.org/nilu-jenks-wins-seattle-council-seat-in-blowout/
6. **Oil story is typed `rule`**, which renders as "New rule for you" for drivers. A war-driven
   price risk is not a law change; `rule` is just the spec's catch-all once `money` is ruled out
   (no per-gallon figure is stated). Only reachable with `transport: "car"` — the demo profile is
   transit, so the demo shows "Doesn't affect you".
   Source: https://www.cnbc.com/2026/11/07/iran-war-midterm-election-oil-price-trump.html
7. **Supermajority story is `stage: "proposed"`** so it shows the amber "won't count in your
   History totals" note — results were not final ("about half of ballots are counted"). The note's
   wording ("Proposed, not passed yet") reads oddly for an election.
8. **The rent cap article extracted only 926 characters** and was flagged
   `too_short_or_paywalled` by the pipeline. The 10% figure and the HB 1217 context are both in
   that fragment, but nobody has seen the rest of the page.
9. **Outlet display names were cleaned up** (`nbcrightnow.com` → "NBC Right Now",
   `fox13seattle.com` → "FOX 13 Seattle", `lni.wa.gov` → "Washington State Dept. of Labor &
   Industries", `CNBC Top News` → "CNBC"). `source.url` and `source.date` are untouched from the
   cache metadata.
