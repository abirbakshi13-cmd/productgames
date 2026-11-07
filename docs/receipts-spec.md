# Receipts: Person B Claude Code Prompt Pack

Order of operations:

| Step | Prompt | Runs | Rough time |
|---|---|---|---|
| 0 | Setup (you, by hand) | you | 3 min |
| 1 | Prompt 0: Foundation agent | alone, first | 3 to 5 min |
| 2 | Prompts 1A, 1B, 1C | **3 subagents at the same time** | 15 to 25 min |
| 3 | `npm run prep` (start it the moment 1A finishes, even if 1B/1C still run) | you | 5 to 10 min |
| 4 | Prompt 2: Story picker | alone | 8 to 10 min |
| 5 | Prompt 3: Final review agent | alone | 10 min |
| 6 | 1:00 integration with Person A (checklist at the bottom) | both | 15 min |
| 7 | Prompt 4: Deploy | alone | 5 min |

Honest timing: with a 11:55 start you land stories + feed around 12:30, not 12:15. Tell Person A now so they don't wait on you at 12:15. 1:00 integration is still realistic.

---

## Step 0: Setup you do by hand (before any prompt)

1. `git pull` so you have your friend's folder structure.
2. Save the spec text file into the repo as `docs/receipts-spec.md`. Every prompt tells the agents to read it, which keeps the prompts consistent with the spec.
3. Create `.env` in the **repo root** (same folder as `package.json`) with exactly:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```
   Do NOT name it `VITE_GROQ_API_KEY`. Anything prefixed `VITE_` gets bundled into the website and anyone could read your key from the deployed site. Only the Node script on your laptop reads this key.
4. Open `.gitignore` and confirm it has a line `.env`. If not, add it, plus `.cache/`. Then run `git check-ignore .env`. It must print `.env`. If it prints nothing, the key will get committed.
5. Run `node -v`. You need 18 or higher (built-in `fetch`).
6. Tell Person A these three things now, because they touch A's code:
   - B's screens import `getProfile`, `saveProfile`, `clearProfile`, `computeReceipt` from one file, `src/shared/api.js`. It starts as a stub. At 1:00 it becomes 2 lines re-exporting A's real functions.
   - A's `computeReceipt` must treat a `when` value that is an array as "any of" (example: `when: { housing: ["renting", "dorm"] }`), and must pass through two optional fields from the matched receipt: `date` (deadline type) and `calc` (one line showing the arithmetic). B's card shows them in "How we calculated this".
   - Answer options and range buckets (rent, wage) live in `src/shared/fields.js`, created by Prompt 0. A's onboarding should use that file so the ask-in-context answers and onboarding answers produce identical values.
7. Start Claude Code in the repo root: `claude --model sonnet` (or `/model sonnet` inside a session).

---

## Prompt 0: Foundation agent (run alone, first)

```
You are setting up shared foundation files for "Receipts", a hackathon prototype. I am Person B. Another teammate (Person A) is building in the same repo at the same time, so you must NOT edit or create any of Person A's files: Onboarding.jsx, Profile.jsx, profileStore.js, receipt.js, historyStore.js, stats.js, History.jsx, App.jsx, main.jsx, index.html. If the existing folder structure already contains any of those, leave them untouched.

STEP 1. Orient. Run `git pull`. Read docs/receipts-spec.md fully (the product spec; the "Data contract" section is the source of truth for data shapes). Then list the repo structure (ignore node_modules) and read package.json. Decide where files go based on the existing structure: if there is a src/components or src/screens folder, put .jsx screens there; if there is a src/data folder use it for JSON; otherwise use the paths given below. Write down the final paths you chose in your final report, because other agents will look for them.

STEP 2. Install dependencies once, now, so parallel agents never run npm install at the same time:
  npm install --save-dev rss-parser jsdom @mozilla/readability dotenv
Do not install anything else.

STEP 3. Confirm secrets safety. Check .gitignore contains lines for `.env` and `.cache/`; add any that are missing. Run `git check-ignore .env` and confirm it prints `.env`. Never print, log, or open the contents of .env.

STEP 4. Create src/shared/fields.js. This is the single source of answer options, shared by A's onboarding and B's ask-in-context. Export:

  export const FIELD_OPTIONS = {
    ageRange:  [{value:"18-21",label:"18–21"},{value:"22-25",label:"22–25"},{value:"26-29",label:"26–29"}],
    student:   [{value:"none",label:"Not a student"},{value:"cc",label:"Community college"},{value:"4yr",label:"4-year college"},{value:"grad",label:"Grad school"}],
    residency: [{value:"in-state",label:"In-state"},{value:"out-of-state",label:"Out-of-state"}],
    loans:     [{value:"federal",label:"Federal loans"},{value:"private",label:"Private loans"},{value:"none",label:"No loans"}],
    housing:   [{value:"renting",label:"I rent"},{value:"dorm",label:"Dorm"},{value:"family",label:"Live with family"},{value:"own",label:"I own"}],
    work:      [{value:"part-time",label:"Part-time"},{value:"full-time",label:"Full-time"},{value:"none",label:"Not working"}],
    transport: [{value:"car",label:"Car"},{value:"transit",label:"Transit"},{value:"bike-walk",label:"Bike / walk"}],
  };
  export const RANGE_OPTIONS = {
    rentRange: [{value:[0,1000],label:"Under $1,000"},{value:[1000,1500],label:"$1,000–1,500"},{value:[1500,2000],label:"$1,500–2,000"},{value:[2000,3000],label:"$2,000+"}],
    wageRange: [{value:[16,18],label:"$16–18/hr"},{value:[18,20],label:"$18–20/hr"},{value:[20,23],label:"$20–23/hr"},{value:[23,30],label:"$23+/hr"}],
  };
  // follow-up range asked right after a parent answer
  export const FOLLOW_UPS = { housing: {when:"renting", field:"rentRange"}, work: {when:["part-time","full-time"], field:"wageRange"} };
  export const FIELD_LABELS = { zip:"ZIP", state:"State", ageRange:"Age", student:"Student status", residency:"Residency", loans:"Student loans", housing:"Housing", rentRange:"Rent", work:"Work", wageRange:"Wage", transport:"Getting around" };
  export const ASK_COPY = {   // question text used by ask-in-context and onboarding
    loans:{q:"Do you have student loans?", why:"Loan rules and payments change often. We only use this on your phone."},
    housing:{q:"Do you rent?", why:"Rent caps and tenant rules depend on this."},
    rentRange:{q:"What range is your rent?", why:"A range is enough. We never ask for the exact number."},
    work:{q:"Do you work?", why:"Minimum wage and labor rules depend on this."},
    wageRange:{q:"Roughly what do you make an hour?", why:"A range is enough."},
    transport:{q:"How do you get around?", why:"Fares, gas taxes, and tolls depend on this."},
  };
  export function labelFor(field, value) { /* return the option label for a value, handling array range values by comparing JSON.stringify; fall back to String(value) */ }

STEP 5. Create src/shared/api.js exactly as the stub below. B's screens import ONLY from this file. At integration it becomes two re-export lines pointing at Person A's real code.

  // STUB. At 1:00 integration replace everything below with:
  //   export { getProfile, saveProfile, clearProfile } from '../profileStore.js';
  //   export { computeReceipt } from '../receipt.js';
  (then implement:)
  - export const sampleProfile = the Profile from the spec's Data contract, BUT with housing: null and rentRange: null (so the rent story triggers ask-in-context in demo step 5). Keep loans: "federal".
  - getProfile(): read localStorage key "receipts.profile" (JSON) inside try/catch; if missing or error return a copy of sampleProfile.
  - saveProfile(partial): merge into getProfile(), write back inside try/catch, then window.dispatchEvent(new Event("profilechange")), return the merged profile.
  - clearProfile(): remove the key (try/catch), dispatch "profilechange".
  - computeReceipt(profile, story): implements the spec. 1) If any field in story.needs is null/undefined in profile, return {status:"needs_info", askField:<first missing field>}. 2) Walk story.receipts in order; a receipt matches when every key in its `when` equals the profile value, where an array value in `when` means "any of these". First match wins. 3) On match return {status:"affected", type, text, evidence, askField:null, when, calc, date} plus low, high, unit, direction for type "money". 4) No match: {status:"not_affected", text: story.otherwise, askField:null}.

STEP 6. Create src/styles/receipts-theme.css with CSS custom properties only (no component styles), imported by B's components:
  --r-saving:#1f9d55; --r-saving-bg:#e6f6ec; --r-cost:#d64545; --r-cost-bg:#fdecec; --r-info:#2563eb; --r-info-bg:#e8efff; --r-muted:#6b7280; --r-muted-bg:#f1f2f4; --r-text:#111827; --r-subtle:#4b5563; --r-border:#e5e7eb; --r-surface:#ffffff; --r-page:#f6f7f9; --r-radius:14px; --r-tap:44px; --r-font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif.
  The mockup team owns final visuals; keep this minimal.

STEP 7. Create a fixture file src/data/stories.fixture.json with exactly 4 stories that follow the spec's Story schema PLUS these fields on every story: topicKey, category (rent|loans|work|transit|prices|other), stage (proposed|passed|in_effect), featured: true. Each receipt may also have optional "calc" (string) and, for deadline type, "date" (YYYY-MM-DD). These are FAKE placeholder stories for UI testing; prefix every headline with "[FIXTURE]" so nobody demos them by accident. Design them so the sampleProfile from api.js produces all four chip states:
  1. id "fx-loans": needs ["loans"]; receipts: [{when:{loans:"federal"}, type:"money", direction:"cost", low:38, high:52, unit:"/mo", ...}]; otherwise text about private-loan or no-loan borrowers. With sampleProfile -> affected money. If loans changes to "none" -> not_affected. This simulates the live-update moment.
  2. id "fx-rent": needs ["housing"]; receipts: [{when:{state:"WA", housing:"renting"}, type:"money", direction:"saving", low:30, high:45, unit:"/mo"}, {when:{state:"WA", housing:["dorm","family","own"]}, type:"rule", ...}] -> needs_info with sampleProfile.
  3. id "fx-rule": needs ["transport"]; receipts: [{when:{transport:"car"}, type:"rule", ...}] -> not_affected with sampleProfile (transit).
  4. id "fx-deadline": needs ["student"]; receipts: [{when:{student:["4yr","cc","grad"]}, type:"deadline", date:"2026-12-01", ...}] -> affected deadline.
  Every receipt needs text and evidence strings. Dates in source.date within the last 2 weeks.
  Then copy the fixture to src/data/stories.json (same content). The Story Picker step will overwrite stories.json later with real stories. Do not create any other data files.

STEP 8. Create a Person B preview page that does not touch Person A's files, so B's screens can be tested before integration:
  - preview-b.html at the repo root (sibling of index.html) that loads /src/dev/previewB.jsx as a module and has <div id="root">.
  - src/dev/previewB.jsx: renders a tiny state router: screen "feed" shows <Feed onOpenStory={id=>...} onOpenProfile={...}/>; screen "detail" shows <StoryDetail story={getStory(id)} onBack={...}/>. Import Feed, StoryDetail, getStory lazily from the paths the other agents will create (src/components/Feed.jsx, src/components/StoryDetail.jsx, src/stories.js, or the equivalents in the existing structure; write the chosen paths in your report). Because those files don't exist yet, also create minimal placeholder versions ONLY IF they don't exist: each placeholder default-exports a component returning <div>TODO</div> and has a top comment "PLACEHOLDER, owned by Person B agent, overwrite freely". src/stories.js placeholder: import stories from './data/stories.json'; export {stories}; export const getStory = id => stories.find(s=>s.id===id);
  - The preview also renders a small floating "Dev panel" fixed to the bottom-right OUTSIDE the phone frame with buttons: "Loans: federal", "Loans: none", "Reset profile" (call saveProfile / clearProfile from src/shared/api.js). This stands in for Person A's profile screen during testing (demo step 4).
  - If vite.config.js has no build.rollupOptions.input, do NOT add preview-b.html to the production build; Vite dev server serves it at http://localhost:5173/preview-b.html automatically.

STEP 9. Verify: run `npm run build` (must succeed) and `npm run dev` briefly, confirm /preview-b.html loads without console errors, then stop the dev server.

STEP 10. Commit only the files you created or changed (list them explicitly with git add <paths>, never `git add -A`, never add .env): message "B: foundation (api stub, fields, theme, fixture, preview)". Push.

FINAL REPORT: list every file path you created, the exact import paths other agents should use for api.js, fields.js, theme css, stories.js, and the components folder, and confirm `git check-ignore .env` output.
```

---

## Round 1: three parallel subagents

Paste this launcher into a fresh Claude Code session, followed by the three prompts below it (1A, 1B, 1C) in one message.

```
You are an orchestrator. Do not write code yourself. Use the Task tool to launch THREE subagents IN PARALLEL in a single message, each with model "sonnet", each given its prompt below VERBATIM (PROMPT 1A, PROMPT 1B, PROMPT 1C). They own separate files and must not edit each other's files. When all three finish, print each agent's final report in full, then run `npm run build` once and report whether it passes. Do not fix anything yourself; just report.
```

### Prompt 1A: News pipeline (prepStories.js)

```
PROMPT 1A. You are building the offline news pipeline for "Receipts", a hackathon prototype. Read docs/receipts-spec.md fully first, especially "Real news", "Tech stack and architecture", "Data contract", "The 4 Receipt types", "History", and Person B's prepStories.js and LLM prompt tasks. Then read src/shared/fields.js (allowed profile values) and src/data/stories.fixture.json (example output shape).

FILES YOU OWN (create/edit only these): scripts/prepStories.js (or the scripts folder the repo already uses), scripts/feeds.js, scripts/llmPrompt.js, and the "prep" entry in package.json "scripts". You may also add `.cache/` to .gitignore if missing. Do NOT touch anything in src/ except reading. Do NOT run npm install (deps rss-parser, jsdom, @mozilla/readability, dotenv are already installed; if one is missing, stop and report).

SECRETS: the Groq key is GROQ_API_KEY in .env at the repo root, loaded with `import 'dotenv/config'`. Never print it, never log request headers, never write it to any file. If GROQ_API_KEY is missing, exit with a clear one-line error. Confirm `git check-ignore .env` prints `.env` before finishing.

PRIVACY RULE (this is a pitch point, do not break it): the LLM receives article text plus the LIST OF POSSIBLE PROFILE FIELDS AND VALUES. It never receives any user's actual profile. No profile is read anywhere in this script.

=== What the script does, in order ===
Run as `npm run prep` -> `node scripts/prepStories.js`. Node ESM ("type":"module" if package.json has it; otherwise use .mjs and update the npm script accordingly). Node 18+ global fetch.

CLI flags:
  --limit N        max articles sent to the LLM (default 40)
  --days N         lookback window in days (default 28)
  --dry-run        fetch feeds + articles, write the report, skip the LLM
  --url <URL>      process this specific article URL too (repeatable). Used when a needed story (e.g. a federal student loan story) isn't in the feeds. These skip the date filter and are always included.
  --only-urls      process only --url articles, skip feeds
  --append         merge new results into the existing candidates file instead of overwriting (dedupe by id)

1) FEEDS (scripts/feeds.js). Export an array of {name, url, scope, note}. scope is "national" | "local" | "topic". Goal: a spread of perspectives across the spectrum plus Washington-state local news (the demo user lives in ZIP 98105, Seattle WA). Start from these CANDIDATE urls; they are from memory and some may be dead or moved, which the script handles at runtime:
   - NPR News https://feeds.npr.org/1001/rss.xml (national)
   - NPR Education https://feeds.npr.org/1013/rss.xml (topic: loans, campus)
   - NPR Economy https://feeds.npr.org/1017/rss.xml (topic: prices, work)
   - The Hill https://thehill.com/feed/ (national)
   - Fox News https://moxie.foxnews.com/google-publisher/latest.xml (national)
   - Fox Business https://moxie.foxnews.com/google-publisher/personal-finance.xml (topic)
   - CNBC Top News https://www.cnbc.com/id/100003114/device/rss/rss.html (national business)
   - Washington State Standard https://washingtonstatestandard.com/feed/ (local)
   - KUOW https://www.kuow.org/rss.xml (local)  [unsure URL]
   - GeekWire https://www.geekwire.com/feed/ (topic: tech, platform policies)
   - The Urbanist https://www.theurbanist.org/feed/ (local: Seattle transit and housing)
   Do NOT use Google News or any Google API. Do NOT use paywalled outlets (Seattle Times, NYT, WSJ, Washington Post).
   Feed health check at startup: fetch each feed with a 10 s timeout and a browser-like User-Agent ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 ReceiptsPrototype/0.1"). If it fails or isn't RSS/Atom, try discovery once: fetch the site homepage and look for <link rel="alternate" type="application/rss+xml" or "application/atom+xml">, and try <origin>/feed and <origin>/rss. Record status per feed: ok | recovered(newUrl) | dead(reason). A dead feed is skipped, never fatal. If fewer than 4 feeds are ok, still continue but warn loudly.

2) COLLECT. Parse feeds with rss-parser. Keep items with a pubDate within --days. Normalize: {title, url (strip utm_* params), date (YYYY-MM-DD), outlet name}. Dedupe by normalized URL, then by near-duplicate title (lowercase, strip punctuation, Jaccard on word sets >= 0.6 -> keep the earlier/most local one). Balance: at most 8 items per feed; round-robin across feeds so the first --limit items mix outlets and scopes. Prefer items whose title or snippet mentions money or rules: rent, tuition, loan, wage, tax, fare, price, fee, law, rule, bill, deadline, enroll, election, vote, council, Washington, Seattle, King County. Do this as a score bump, not a filter (the spec says no topic filter; we just order).

3) FETCH ARTICLE TEXT. For each selected item, fetch HTML (10 s timeout, same UA, follow redirects), run @mozilla/readability via jsdom to get textContent. Collapse whitespace. If text < 1,200 characters, mark "too_short_or_paywalled" and skip. Truncate to the first 1,500 words for the LLM (Groq free tier has tight tokens-per-minute limits). Cache the full extracted text at .cache/articles/<sha1(url)>.txt and metadata at .cache/articles/<sha1(url)>.json; on reruns read from cache instead of refetching. Fetch at most 4 articles concurrently.

4) LLM (Groq, OpenAI-compatible). POST https://api.groq.com/openai/v1/chat/completions with Authorization: Bearer GROQ_API_KEY, model "llama-3.3-70b-versatile", temperature 0.1, response_format {type:"json_object"}, max_tokens 1500. Concurrency 2. On HTTP 429: read retry-after header (seconds) or default to 2^attempt seconds, wait, retry up to 5 times. If the 70b model gets 429 more than 6 times total in the run, switch remaining requests to "llama-3.1-8b-instant" and note it in the report. On non-JSON or schema-invalid output: retry once with an extra user message "Your previous output was invalid: <validation errors>. Return corrected JSON only." Then give up on that article and log it.
   Put the prompt in scripts/llmPrompt.js as buildMessages({title, outlet, url, date, text}). The prompt (write it carefully; it determines demo quality) must say:
   - Role: you turn one news article into structured "Receipt" data for a personal news app for people roughly 18 to 29, many of them students, in the United States, with a demo user in Seattle, Washington.
   - Output exactly one JSON object: {"relevant": boolean, "reason": string, "story": <Story or null>}. relevant=false when the article has no concrete effect on any reader's money, rules they live under, their representatives, or a deadline they face (e.g. celebrity news, sports scores, opinion pieces without a concrete change).
   - The Story schema, copied exactly from docs/receipts-spec.md plus: topicKey (kebab-case, one per real-world change, e.g. "wa-2027-rent-cap"; two articles on the same change must produce the same topicKey), category (rent|loans|work|transit|prices|other), stage (proposed|passed|in_effect), and per receipt optional "calc" (one short line showing arithmetic, e.g. "9.7% cap × $1,000–1,500 rent = up to $97–145/mo") and "date" (YYYY-MM-DD, required for deadline type).
   - Allowed `when` keys and values, generated in code from src/shared/fields.js FIELD_OPTIONS plus state (two-letter US state code). `when` keys MUST be from: state, ageRange, student, residency, loans, housing, work, transport. NEVER zip, rentRange, or wageRange. A `when` value may be one allowed value or an array of allowed values meaning "any of".
   - `needs` must list every profile field used in any receipt's `when` except "state" (state always comes from ZIP).
   - Order receipts most specific first; first match wins. Include receipts for the groups the article actually covers; also give a fallback receipt for people affected in a non-money way when the article supports it.
   - Type rules (from the spec): use "money" ONLY when the article itself states the numbers (dollar amounts, percentages applied to a stated base, wage rates). You may do simple arithmetic on stated numbers and must show it in "calc". Never invent or estimate a number the article doesn't support. low <= high. direction is "saving" if the reader gains money, "cost" if they pay more. unit is "/mo", "/yr", "/hr", or " one-time". Otherwise choose "rule" (a new law or policy changes what applies to them), "rep" (an election result or new official for their area), or "deadline" (they must act by a date; include "date").
   - evidence: one sentence copied VERBATIM from the article text, character for character, that supports that receipt. Do not paraphrase. Do not stitch two sentences.
   - text: one plain sentence, second person ("Your rent increase can't exceed..."), max 22 words, no hype.
   - summary: 2 to 3 plain sentences, neutral tone, no opinion, no outlet framing.
   - otherwise: one sentence on who else this affects, for readers it doesn't affect directly.
   - Geography: if the change applies only to a state or city, put that in `when` (state code). National changes have no state key.
   - Return JSON only, no markdown fences.

5) VALIDATE IN CODE (scripts/prepStories.js) every story the LLM returns:
   - Required fields present, enums valid, when keys/values allowed, needs consistent with when keys, money receipts have numeric low/high with low<=high and a valid direction/unit, deadline receipts have a valid date.
   - EVIDENCE CHECK: normalize both evidence and the full cached article text (lowercase, curly quotes -> straight, dashes -> "-", collapse whitespace) and check the evidence is a substring. Set receipt.evidenceVerified true/false. Do not drop unverified receipts; flag them.
   - NUMBER CHECK: for money receipts, extract every number from evidence + calc; flag receipt.numbersTraceable=false if low/high cannot be found in, or computed from, numbers that appear in the evidence or the article text (simple check: each of low/high either appears in the article text, or calc is present). Flag only.
   - id = topicKey + "-" + outlet slug. source = {name: outlet, url, date}.
   - Drop relevant=false and invalid ones, but log them.

6) OUTPUTS:
   - src/data/stories.candidates.json: array of all valid stories, each with the extra fields above plus "_meta": {outlet, scope, model, evidenceAllVerified}. Do NOT write src/data/stories.json; a later step picks the final 10.
   - prep-report.md at repo root (gitignored is fine; add it to .gitignore): feed health table; counts of articles fetched / skipped (with reasons) / sent to LLM / relevant / valid; counts by receipt type and category; a table of every candidate: id, outlet, type(s), category, stage, needs, evidenceVerified, numbersTraceable; and a list of whether candidates exist for: at least one of each type (money, rule, rep, deadline), a federal student loan story (any receipt whose when includes loans:"federal"), a WA rent/housing story (when includes state:"WA" and housing). If the loan or rent story is missing, print a clear suggestion: "Find an article URL and run: npm run prep -- --only-urls --append --url <URL>".
   - Console: a short progress line per article and the final summary. Total runtime should stay under ~10 minutes for 40 articles.

7) TEST before reporting:
   - `npm run prep -- --dry-run --limit 10` must complete, write prep-report.md, and show feed health.
   - Then run a tiny real test: `npm run prep -- --limit 3` and confirm candidates are written and validation flags appear. If GROQ_API_KEY is not set, report that and stop after the dry run.
   - Confirm `git status` does not show .env or .cache.

8) COMMIT only your files (git add with explicit paths, never -A, never .env, never .cache, never stories.candidates.json unless it's small and I asked; do not commit it). Message "B: news pipeline". Push.

FINAL REPORT: feed health results, which feeds are dead, the dry-run and 3-article test results, any validation failures you saw, and the exact command to run the full pipeline.
```

### Prompt 1B: Feed screen + Receipt chip + phone frame

```
PROMPT 1B. You are building the Feed screen for "Receipts", a hackathon prototype mobile web app (React + Vite). Read docs/receipts-spec.md fully first, especially "Demo script" steps 2 and 4, "Data contract", "The 4 Receipt types", and "Screens" row 4. Then read src/shared/api.js, src/shared/fields.js, src/styles/receipts-theme.css, src/data/stories.json, src/dev/previewB.jsx, and preview-b.html. (If paths differ, find them; the foundation agent wrote them.)

FILES YOU OWN (create/overwrite only these): src/stories.js, src/components/Feed.jsx, src/components/Feed.css, src/components/ReceiptChip.jsx, src/components/ReceiptChip.css, src/components/PhoneFrame.jsx, src/components/PhoneFrame.css. If the repo uses a different components/screens folder, use it and keep these file names. Overwrite placeholders marked "PLACEHOLDER". Do NOT edit StoryDetail.jsx, ReceiptCard.jsx, AskInContext.jsx (another agent is building those right now), src/shared/*, any scripts/*, or any of Person A's files (Onboarding.jsx, Profile.jsx, profileStore.js, receipt.js, historyStore.js, stats.js, History.jsx, App.jsx, main.jsx, index.html). Do NOT run npm install or add dependencies. No UI libraries; plain React + CSS.

IMPORT RULES: profile and calculation functions come ONLY from src/shared/api.js (getProfile, computeReceipt). Never import profileStore.js or receipt.js directly; at integration api.js will re-export Person A's real versions and your code must keep working unchanged.

1) src/stories.js
   import stories from './data/stories.json';
   export { stories };
   export const getStory = (id) => stories.find(s => s.id === id) || null;
   export const feedStories = () => { const f = stories.filter(s => s.featured); return (f.length ? f : stories).slice(0, f.length ? f.length : 4); };
   Sort feedStories by source.date descending only if no story has featured:true (featured order is chosen deliberately for the demo, keep it).

2) src/components/ReceiptChip.jsx: default export ReceiptChip({ receipt, size = "md" }). Pure display, receives the output of computeReceipt. Exact label and color rules (these matter for the demo script):
   - status "affected", type "money": label "+$38–$52/mo" for direction "saving", "−$38–$52/mo" (U+2212 minus) for "cost". If low === high show a single number "+$40/mo". Format dollars with no decimals and thousands separators ($1,250). Unit appended as given ("/mo", "/yr", "/hr", " one-time"). Colors: saving -> --r-saving on --r-saving-bg; cost -> --r-cost on --r-cost-bg. Add a visually small "est." suffix after the amount (the "Estimate" label is shown in full on the detail card).
   - status "affected", type "rule": "New rule for you"; type "rep": "Your rep changed"; type "deadline": if receipt.date exists "Act by Dec 1" (format month short + day, no year, parse YYYY-MM-DD as a LOCAL date so it doesn't shift a day), else "Deadline for you". Colors: --r-info on --r-info-bg. Small leading icon via inline SVG or a unicode glyph: rule ⚖, rep 🏛, deadline ⏰ (use aria-hidden on icons).
   - status "not_affected": "Doesn't affect you", --r-muted on --r-muted-bg.
   - status "needs_info": "See what this means for you", --r-info text, transparent background, 1px dashed --r-info border.
   - Pill shape, font-weight 600, font-size 13px (md) / 15px (lg), padding 6px 10px, white-space nowrap, include an aria-label that reads the full meaning, e.g. "Estimated saving of 38 to 52 dollars per month".

3) src/components/Feed.jsx: default export Feed({ profile: profileProp, onOpenStory, onOpenProfile }).
   - Profile source: use profileProp if provided, else getProfile(). Keep it in state, and subscribe to window "profilechange" and "storage" events to re-read getProfile() so the chips update instantly when the profile changes (demo step 4: user changes loans Federal -> None, goes back, the loan chip flips to "Doesn't affect you"). Also re-read on mount. Clean up listeners on unmount.
   - Compute receipts with useMemo: feedStories().map(story => ({ story, receipt: computeReceipt(profile, story) })).
   - Header (sticky top): app name "Receipts" bold 22px left; right side a profile button (circle 40px, person icon inline SVG, aria-label "Your profile") that calls onOpenProfile. Under the header a one-line privacy strip: lock icon + "Calculated on your phone. Your answers never leave it." in --r-subtle 12px.
   - Section label: "This week" (small caps, --r-muted).
   - Story card (one per story), the whole card is a <button> (or role=link with keyboard support) calling onOpenStory(story.id): top row outlet name · relative date ("Today", "Yesterday", "3 days ago", else "Nov 5"; local-date parsing), headline (17px, 600, max 3 lines clamp), summary first sentence (14px --r-subtle, 2-line clamp), then the ReceiptChip. Card: white surface, radius --r-radius, 1px --r-border, padding 14px 16px, 12px gap between cards, min-height comfortably above 44px tap target, :active scale(0.99), visible focus ring.
   - Empty state if no stories: "No stories yet. Run npm run prep."
   - Never crash on a malformed story: wrap computeReceipt in try/catch per story and fall back to {status:"needs_info"} plus console.warn with the story id.

4) src/components/PhoneFrame.jsx: default export PhoneFrame({ children }). On screens wider than 500px: centers a 390px wide, 844px tall frame (rounded 44px corners, subtle shadow, --r-page background behind, overflow hidden, inner content scrolls vertically with -webkit-overflow-scrolling: touch) on a neutral page. On real phones (<=500px): full width, full height, no frame. Use 100dvh with a 100vh fallback. Import receipts-theme.css here so every screen inside gets the variables; set font-family var(--r-font) and color var(--r-text). Person A will wrap the real App in this at integration, so it must have no dependencies other than its CSS.

5) Wire into the preview: if src/dev/previewB.jsx doesn't already wrap content in PhoneFrame, add that wrapping (this is the ONLY edit you may make to previewB.jsx; keep the dev panel outside the frame). Coordinate safely: re-read the file right before editing, change only the wrapper lines.

6) VERIFY:
   - `npm run build` passes with no errors.
   - Start `npm run dev`, open http://localhost:5173/preview-b.html. If Playwright is available (`node -e "require('playwright')"`), script it: load the page at 390x844, screenshot to ./.cache/feed-1.png, confirm 4 cards render with the chip labels you expect from the fixture + sample profile (fx-loans "−$38–$52/mo", fx-rent "See what this means for you", fx-rule "Doesn't affect you", fx-deadline "Act by Dec 1"), click the dev panel "Loans: none" and confirm the fx-loans chip becomes "Doesn't affect you" without a reload, then "Reset profile". If Playwright isn't available, verify by reading the rendered DOM some other way or explain exactly what you checked by code reading.
   - Check the console has no React key warnings or errors.
   - Stop the dev server.

7) COMMIT only your files with explicit paths (never -A). Message "B: feed, receipt chip, phone frame". Pull with rebase first if push is rejected; never force-push.

FINAL REPORT: files created, the exact props of Feed, ReceiptChip, PhoneFrame, the verification results (with what each fixture chip showed before and after "Loans: none"), and anything Person A must do at integration (e.g., wrap App in PhoneFrame, pass onOpenStory/onOpenProfile).
```

### Prompt 1C: Story detail + Receipt card + Ask-in-context

```
PROMPT 1C. You are building the Story Detail screen, the Receipt card, and the Ask-in-context prompt for "Receipts", a hackathon prototype mobile web app (React + Vite). Read docs/receipts-spec.md fully first, especially "Demo script" steps 3, 4 and 5 (step 5 is yours), "Scope", "Data contract", "The 4 Receipt types", and "Screens" rows 5 and 6. Then read src/shared/api.js, src/shared/fields.js, src/styles/receipts-theme.css, src/data/stories.json (fixture), and src/dev/previewB.jsx. (If paths differ, find them.)

FILES YOU OWN (create/overwrite only these): src/components/StoryDetail.jsx, src/components/StoryDetail.css, src/components/ReceiptCard.jsx, src/components/ReceiptCard.css, src/components/AskInContext.jsx, src/components/AskInContext.css. Use the repo's existing components/screens folder if different. Overwrite placeholders marked "PLACEHOLDER". Do NOT edit Feed.jsx, ReceiptChip.jsx, PhoneFrame.jsx, stories.js (another agent is building those right now), src/shared/*, src/dev/*, scripts/*, or any of Person A's files (Onboarding.jsx, Profile.jsx, profileStore.js, receipt.js, historyStore.js, stats.js, History.jsx, App.jsx, main.jsx, index.html). Do NOT import ReceiptChip (it may not exist yet); the card has its own display. Do NOT run npm install. No UI libraries.

IMPORT RULES: getProfile, saveProfile, computeReceipt ONLY from src/shared/api.js. Field options, labels, and questions ONLY from src/shared/fields.js (FIELD_OPTIONS, RANGE_OPTIONS, FOLLOW_UPS, FIELD_LABELS, ASK_COPY, labelFor). Never hardcode option values; they must match Person A's onboarding.

1) StoryDetail.jsx: default export StoryDetail({ story, profile: profileProp, onBack, onOpenProfile }).
   - The story arrives as a prop (routing is Person A's job). If story is null, show "Story not found" plus a back button.
   - Profile: profileProp if provided, else getProfile(); keep in state; subscribe to window "profilechange" and "storage" to re-read; clean up on unmount.
   - Layout top to bottom: sticky top bar with a back button (chevron + "Back", 44px tap target, aria-label "Back to feed") calling onBack; outlet · formatted date (e.g. "NPR · Nov 5, 2026", parse YYYY-MM-DD as local date); headline (22px, 700); summary (16px, line-height 1.5); <ReceiptCard story={story} profile={profile} onProfileChange={setProfile} />; a "Source" row at the bottom: "Read the full story at {outlet}" link with ↗, href story.source.url, target="_blank" rel="noopener noreferrer".
   - Scroll to top on mount.

2) ReceiptCard.jsx: default export ReceiptCard({ story, profile, onProfileChange }).
   - receipt = computeReceipt(profile, story) (useMemo on profile + story; try/catch -> treat as needs_info and console.warn).
   - Card container: white surface, radius --r-radius, 1px border tinted by state (saving green, cost red, info blue, muted gray), padding 16px, a small header line "Your Receipt" with a lock glyph and "Calculated on your phone" in 12px --r-subtle.
   - BY STATUS:
     a) affected + money: big amount line 32px 700, "+$30–$45/mo" (saving, --r-saving) or "−$30–$45/mo" (cost, U+2212, --r-cost); single number if low===high; no decimals, thousands separators; unit appended as given. Next to it an "Estimate" pill (12px, --r-muted-bg). Then receipt.text (16px).
     b) affected + rule: label row "New rule for you" with ⚖ (aria-hidden), then receipt.text.
     c) affected + rep: "Your representation changed" with 🏛, then receipt.text.
     d) affected + deadline: big date line "Act by Dec 1, 2026" (if receipt.date), with "X days left" computed from today (local), "Today" if 0, "Passed" if negative; then receipt.text.
     e) not_affected: gray label "Doesn't affect you" and a short line "Based on your answers, this change doesn't apply to you." (Do not show the otherwise text twice; it appears in "Who else this affects" below.)
     f) needs_info: render <AskInContext field={receipt.askField} story={story} onAnswered={handleAnswered} />. handleAnswered(nextProfile) calls onProfileChange?.(nextProfile). Because computeReceipt is recalculated from the new profile, the card switches in place to its new state (demo step 5: "Answer it, and the Receipt appears in place"). Add a short CSS fade/slide-in (200ms) on the result container keyed by status so the switch reads as a moment on video; respect prefers-reduced-motion.
   - LIVE UPDATE (demo step 4): when the profile prop changes (loans federal -> none), the card must recompute and change with no reload. Use a key or effect so the transition animation also plays here.
   - "How we calculated this": an expandable section (a <button aria-expanded> toggling a panel, collapsed by default, chevron rotates) shown for affected and not_affected. Content:
       * "Your answers we used:" chips listing each field from receipt.when (fall back to story.needs if receipt.when is absent, which may happen with Person A's real computeReceipt) except state shown as "State: WA". Use FIELD_LABELS and labelFor for text, e.g. "Student loans: Federal loans".
       * If receipt.calc exists: "The math:" + calc in a monospace-ish 14px line.
       * "From the article:" + receipt.evidence as a blockquote with curly quotes and "— {outlet}". (The spec requires the article sentence this is based on.) For not_affected there is no evidence; show the first receipt's evidence from story.receipts[0]?.evidence if present, labeled "What changed:".
       * A privacy line: "An AI read the article to find these facts. It never saw your answers; this match ran on your phone."
       * For money: "This is an estimate based on numbers stated in the article. Your real amount may differ."
   - "Who else this affects": a row below the card body, icon 👥 (aria-hidden), title "Who else this affects", text story.otherwise. Always shown when story.otherwise exists.
   - Stage note: if story.stage === "proposed", show a small amber note "Proposed, not passed yet. This won't count in your History totals." (spec: proposals never move your number).

3) AskInContext.jsx: default export AskInContext({ field, story, onAnswered }).
   - Shown inside the Receipt card when status is needs_info. Title: "See what this means for you". Then ASK_COPY[field].q as the question (17px 600) and a "Why we ask" toggle revealing ASK_COPY[field].why.
   - Options: FIELD_OPTIONS[field] as large tap-to-pick buttons (min-height 48px, full width, stacked, 8px gap).
   - On pick: call saveProfile({ [field]: value }). Then if FOLLOW_UPS[field] exists and the picked value matches its `when` (string or array), show the follow-up question for FOLLOW_UPS[field].field with RANGE_OPTIONS buttons in the same card (demo step 5 asks "Do you rent? What range?"). On picking a range, saveProfile({ [rangeField]: value }). After the final answer, call onAnswered(getProfile()).
   - Edge: if no ASK_COPY or FIELD_OPTIONS entry exists for field, show "Add this in your profile" text and nothing else; never crash.
   - "Not now" text button under the options: collapses the prompt to a single line "Answer one question to see your Receipt" with a "Answer" button to reopen. Does not save anything.
   - Footer microcopy: "Saved only on this phone. Change it anytime in your profile."
   - Accessibility: buttons are real <button>s, the question is a heading, focus moves to the follow-up question when it appears.

4) VERIFY:
   - `npm run build` passes.
   - Start `npm run dev`, open http://localhost:5173/preview-b.html. The feed may still be a placeholder while another agent builds it; if so, test detail directly by temporarily calling it in a throwaway script, NOT by editing previewB.jsx. Preferred: if Playwright is available (`node -e "require('playwright')"`), write a throwaway test file at ./.cache/test-detail.mjs that opens the preview at 390x844 and drives it. Otherwise verify by careful code reading and a small Node script that imports computeReceipt from src/shared/api.js with the fixture and the sample profile (you may need a localStorage shim) and prints the receipt status per story.
   - Expected with fixture + sample profile: fx-loans -> money cost card with Estimate pill; click dev panel "Loans: none" -> card flips to "Doesn't affect you" without reload; fx-rent -> AskInContext "Do you rent?"; pick "I rent" -> follow-up "What range is your rent?"; pick "$1,000–1,500" -> card switches in place to "+$30–$45/mo"; fx-deadline -> date line with days left; "How we calculated this" expands and shows answers used, evidence, and privacy line. Use dev panel "Reset profile" afterwards.
   - No console errors or React warnings. Stop the dev server. Delete any throwaway test files in .cache that aren't useful.

5) COMMIT only your files with explicit paths (never -A). Message "B: story detail, receipt card, ask-in-context". Pull with rebase if the push is rejected; never force-push.

FINAL REPORT: files created, exact props of StoryDetail, ReceiptCard, AskInContext, the result of each expected check above, and anything Person A must do at integration (pass story, onBack; computeReceipt must pass through when/calc/date; saveProfile must dispatch "profilechange" or the screens must remount on navigation).
```

---

## Step 3: run the pipeline (you)

As soon as 1A reports done, in a separate terminal:

```
npm run prep -- --dry-run      # 30 sec: check feed health in prep-report.md
npm run prep                   # the real run, ~5–10 min
```

Open `prep-report.md`. If it says the federal-loan story or WA rent story is missing, find one real article URL for each (NPR Education and Washington State Standard are the likeliest sources) and run:

```
npm run prep -- --only-urls --append --url "<loan article URL>" --url "<rent article URL>"
```

---

## Prompt 2: Story picker (run alone, after the pipeline)

```
You are the content editor for "Receipts", a hackathon prototype. Read docs/receipts-spec.md fully, especially "Demo script", "The 4 Receipt types", "History", and Person B's review task: "keep the 10 that produce the strongest, most accurate Receipts across a mix of topics, including at least one of each Receipt type and one federal-loan story for the live-update moment". Then read prep-report.md, src/data/stories.candidates.json, src/shared/fields.js, src/shared/api.js (computeReceipt and sampleProfile), and the cached article texts in .cache/articles/*.txt (match by sha1 of source.url, or read the .json metadata files).

YOU MAY EDIT ONLY: src/data/stories.json (overwrite it with the final list) and create picker-report.md at the repo root. Do not edit code. Do not edit stories.candidates.json.

ACCURACY IS THE PRIORITY. Judges may click the source. A wrong number on screen is worse than a missing story.

1) For every candidate, verify against the cached full article text:
   - Every receipt's evidence appears verbatim in the article (ignoring quote style and whitespace). If not, find the actual sentence in the article that supports the receipt and replace evidence with it verbatim; if none exists, drop that receipt.
   - Every money receipt's low/high either appear in the article or follow from stated numbers via simple arithmetic; write or fix the calc line to show it. If you cannot trace a number, change the receipt to a non-money type that the article supports, or drop it. Never invent numbers.
   - when/needs make sense for who the article says is affected (state-only changes must have state; don't claim "all students" if the article says "borrowers in the SAVE plan").
   - stage is right (proposed vs passed vs in_effect) based on the article.
   - text is one plain second-person sentence, max 22 words; summary is 2–3 neutral sentences; otherwise exists.
   - Dedupe: if two candidates share a topicKey (same real-world change), keep the one with the best evidence and prefer the local outlet; note the other outlet names in a new optional field "alsoReportedBy": ["Fox News", ...].

2) Pick exactly 10 (or as many as pass verification, minimum 6; if fewer than 10 pass, say so clearly). Requirements:
   - At least one of each type: money, rule, rep, deadline.
   - At least one federal-loan story: a receipt with when.loans "federal" (or an array containing it) AND, for profiles with loans "none", the story resolves to not_affected. This powers demo step 4.
   - At least one WA rent/housing story whose needs includes "housing" and that gives a money receipt for {state:"WA", housing:"renting"} (powers demo step 5).
   - A mix of categories and outlets across the spectrum; source dates spread across the last 4 weeks (History is built from article dates week by week).
   - No fixture stories (headline starts with "[FIXTURE]").

3) Mark exactly 4 as featured:true, in this order, for the feed in the demo script:
   1st the federal-loan story (with sampleProfile it must show a money chip, ideally like "+$38–$52/mo" or "−$...").
   2nd a story that is not_affected for sampleProfile.
   3rd the WA rent story (needs_info for sampleProfile because housing is null).
   4th a rule or deadline story that is affected for sampleProfile.
   All other stories get featured:false. Run computeReceipt(sampleProfile, story) for every story in a small Node script (shim localStorage if needed) and confirm the featured four give: affected money, not_affected, needs_info, affected rule/deadline. Then also check with {...sampleProfile, loans:"none"} that story 1 becomes not_affected, and with {...sampleProfile, housing:"renting", rentRange:[1000,1500]} that story 3 becomes affected money. If any check fails, fix the data (not the code) or choose different stories.

4) Write src/data/stories.json as a JSON array. Keep all schema fields: id, headline, summary, source{name,url,date}, needs, receipts[...] (with optional calc/date), otherwise, topicKey, category, stage, featured, optional alsoReportedBy. Remove "_meta", "evidenceVerified", "numbersTraceable".

5) Write picker-report.md: a table of the final stories (id, outlet, date, type(s), category, stage, featured, what sampleProfile sees), the computeReceipt check results, every edit you made with a reason, and dropped candidates with reasons. Put any story you were unsure about under "Human please double-check" with the source URL.

6) Run `npm run build` to confirm the JSON imports. Commit only src/data/stories.json with message "B: final stories". Push.

FINAL REPORT: the final table, the four featured chips as the demo will show them, and the "Human please double-check" list.
```

After it finishes, spend 5 minutes yourself on the "Human please double-check" list. Open each source and confirm the number on the card. That's the review step the spec requires, and the agent can't fully replace it.

---

## Prompt 3: Final review agent (run alone, before 1:00 integration)

```
You are the final reviewer for Person B's part of "Receipts", a hackathon prototype. You did not write this code. Your job is to find problems before a live demo in front of judges. Read docs/receipts-spec.md fully first; it is the source of truth. Then read every Person B file: src/shared/api.js, src/shared/fields.js, src/styles/receipts-theme.css, src/stories.js, src/data/stories.json, src/components/{Feed,ReceiptChip,PhoneFrame,StoryDetail,ReceiptCard,AskInContext}.jsx and their CSS, src/dev/previewB.jsx, preview-b.html, scripts/prepStories.js, scripts/feeds.js, scripts/llmPrompt.js, package.json, .gitignore, picker-report.md, prep-report.md.

RULES: You may fix small, clearly-scoped bugs in Person B files only (typos, wrong labels, crashes, missing null checks, build errors, accessibility attributes). Anything bigger, anything in Person A's files (Onboarding.jsx, Profile.jsx, profileStore.js, receipt.js, historyStore.js, stats.js, History.jsx, App.jsx, main.jsx, index.html), or any design opinion goes in the report as a recommendation, not an edit. Do not refactor. Do not add dependencies.

CHECKLIST (report PASS / FAIL / FIXED for each, with file:line evidence):

Security and privacy
 1. `git check-ignore .env` prints .env; `git log --all --stat -- .env` shows .env was never committed; grep the whole repo (excluding node_modules, .env itself) for "gsk_" and "GROQ_API_KEY" and confirm the key value appears nowhere and the env var name appears only in scripts/.
 2. No file under src/ references GROQ, fetch to api.groq.com, or any VITE_ secret. The built bundle (run `npm run build`, then grep dist/) contains no "groq" and no "gsk_".
 3. Nothing in src/ sends the profile anywhere (no fetch/XMLHttpRequest/sendBeacon/analytics in B's components).
 4. scripts/ never reads a user profile; the LLM prompt contains field definitions only.

Contract
 5. B's components import profile/calc functions only from src/shared/api.js, and options only from src/shared/fields.js.
 6. Every story in stories.json validates against the spec Story schema (+ topicKey, category, stage, featured, optional calc/date/alsoReportedBy): enums valid, when keys only from state/ageRange/student/residency/loans/housing/work/transport, needs covers every non-state when key, money receipts have numeric low<=high, direction, unit; deadline receipts have date. Write a throwaway Node validator in .cache/ and run it.
 7. No "[FIXTURE]" headlines in stories.json. Exactly 4 featured.

Demo script (the 60-second walkthrough in the spec). Using Playwright if available (`node -e "require('playwright')"`), else by careful code tracing plus a Node script calling computeReceipt, walk preview-b.html at 390x844:
 8. Step 2: the feed shows 4 cards; chips show one money amount, one "Doesn't affect you", one "See what this means for you", one rule/deadline chip. Colors: green saving, red cost, blue rule/rep/deadline and needs_info outline, gray not affected.
 9. Step 3: tapping the loan story opens detail with: amount range, "Estimate" label, expandable "How we calculated this" (answers used, evidence quote, privacy line), "Who else this affects", source link opening in a new tab.
 10. Step 4: using the dev panel set loans to none, go back: the loan chip reads "Doesn't affect you" with no reload; open it: the card says "Doesn't affect you". Reset.
 11. Step 5: open the rent story: card asks "Do you rent?", picking "I rent" asks the range, picking a range shows the money Receipt in place without navigating.
 12. Screenshots of each step saved to .cache/review/ (if Playwright is available).

Robustness
 13. No console errors or React warnings during the walk.
 14. A story with an unknown type, missing receipts array, or null source does not crash Feed or Detail (check the code paths).
 15. localStorage blocked (private mode): getProfile/saveProfile are wrapped in try/catch and the app still renders.
 16. Dates parse as local dates (no off-by-one day) in both chip and card.
 17. Tap targets >= 44px; buttons are real buttons; the phone frame is 390px on desktop and full-width on a phone.
 18. `npm run build` passes; `npm run prep -- --dry-run --limit 3` still runs.

Spec gaps
 19. List anything in Person B's checklist in the spec that isn't done.
 20. List exactly what Person A must do at the 1:00 integration for B's screens to work (routing props, PhoneFrame wrapper, api.js swap, computeReceipt array-matching + when/calc/date passthrough, saveProfile event or remount).

Commit only the small fixes you made (explicit paths, never -A), message "B: review fixes". FINAL REPORT: the checklist table, the list of fixes with diffs summarized, the recommendations, and the integration list for Person A. Put any FAIL that would break the live demo at the very top in a section called "DEMO BLOCKERS".
```

---

## 1:00 integration checklist (you + Person A, no agent needed)

1. `git pull` on both laptops.
2. Replace the body of `src/shared/api.js` with:
   ```js
   export { getProfile, saveProfile, clearProfile } from '../profileStore.js';
   export { computeReceipt } from '../receipt.js';
   ```
   (Adjust the paths to wherever A's files live.)
3. Person A's App: wraps everything in `<PhoneFrame>`, renders `<Feed onOpenStory={id => ...} onOpenProfile={...} />` and `<StoryDetail story={getStory(id)} onBack={...} />`.
4. Confirm A's `computeReceipt` handles arrays in `when` and passes through `when`, `calc`, `date`.
5. Run the 5 demo steps from the real onboarding, not the preview page. The sample profile's `housing: null` only lives in the stub, so during onboarding **skip housing** for step 5 to work.
6. If anything breaks and it's 1:30, revert `api.js` to the stub and demo from `/preview-b.html`. The dev panel stays outside the phone frame, so it won't show in a cropped screen recording.

---

## Prompt 4: Deploy (after integration works)

```
Deploy this Vite + React app to Vercel so a pitch team can open it on their phones. Read package.json and vite.config.js first.
1) Run `npm run build` and fix nothing; if it fails, stop and report the error.
2) If the app uses client-side routing with real URL paths (react-router BrowserRouter), create vercel.json with {"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}. If it uses state-based screens or HashRouter, do not create it.
3) Make sure no secret is in the bundle: grep dist/ for "gsk_" and "groq"; if found, stop and report, do not deploy.
4) Deploy with `npx vercel --prod --yes`. If not logged in, stop and tell me to run `npx vercel login` myself (do not attempt to log in for me). Accept defaults: framework Vite, output dir dist.
5) Open the deployed URL with Playwright at 390x844 (if available), confirm it loads with no console errors, first launch goes to onboarding, and screenshot to .cache/deploy.png.
6) Commit vercel.json if you created it (explicit path). Report the production URL.
```

Send the URL to the pitch team, then do the three end-to-end demo runs and the 60-second backup recording together with Person A.
