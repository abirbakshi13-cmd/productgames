```js
// PROFILE (localStorage "receipts.profile"). null = skipped, "none" = answered none
{
  zip: "98105", state: "WA",
  ageRange: "18-21",          // "18-21" | "22-25" | "26-29"
  student: "4yr",              // "none" | "cc" | "4yr" | "grad"
  residency: "in-state",       // "in-state" | "out-of-state"
  loans: "federal",            // "federal" | "private" | "both" | "none" | null
  housing: "renting",          // "renting" | "dorm" | "family" | "own" | null
  rentRange: [1200, 1600],     // only if renting
  work: "part-time",           // "part-time" | "full-time" | "none" | null
  wageRange: [16, 18], hoursPerWeek: 20,   // only if working
  transport: "transit",        // "car" | "transit" | "bike-walk" | null, OR an array of those
  // added for Twin (all optional):
  neighborhood: "Capitol Hill",  // string label from onboarding
  roles: ["parttime", "study"],  // "fulltime" | "parttime" | "study" | "figuring"
  incomeRange: "1k-2.5k",        // "under-1k" | "1k-2.5k" | "2.5k+" | null
  cares: ["money", "home"]       // topic ids: money | move | home | health | rights
}

// LOOK (localStorage "receipts.look"), the Twin character; cleared by clearProfile()
{ hair: "messy", item: "headphones", accent: "signal", ... }  // any Twin.parts keys

// STORY (array in src/data/stories.json)
{
  id, topicKey,                // topicKey = one real-world change; duplicates count once
  headline, summary,
  source: { name, url, date: "YYYY-MM-DD" },
  category: "rent" | "loans" | "work" | "transit" | "prices" | "other",
  stage: "proposed" | "passed" | "in_effect",
  needs: ["housing"],          // profile fields required; any null -> ask in context
  receipts: [{                 // first match wins
    when: { state: "WA", housing: "renting" },  // value = string or array of allowed strings;
                               // an array PROFILE value matches if any of its values is allowed
    type: "money" | "rule" | "rep" | "deadline",
    direction: "cost" | "saving", low, high, unit: "/mo",  // money only
    dueDate: "YYYY-MM-DD",     // deadline only
    text, evidence             // evidence = exact sentence from the article
  }],
  otherwise: "string"
}

// RECEIPT (returned by computeReceipt)
{ status: "affected" | "not_affected" | "needs_info",
  type, text, evidence, low, high, unit, direction, dueDate, askField,
  when }                       // affected only: the matched receipt's `when`

// HISTORY ENTRY (localStorage "receipts.history"; opened ids in "receipts.opened")
{ storyId, topicKey, date, type, direction, low, high, unit, dueDate, category, stage }
```

## Module APIs
- profileStore.js: getProfile(), saveProfile(partial), clearProfile(), subscribe(fn) -> unsubscribe, zipToState(zip)
- useProfile.js: useProfile() -> [profile, saveProfile]  (re-renders on any change)
- receipt.js: computeReceipt(profile, story) -> Receipt; formatReceipt(receipt) -> short chip label
- historyStore.js: rebuildHistory(profile, stories), initHistory(stories), getHistory(), subscribeHistory(fn), markOpened(id), getOpened()
- stats.js: netMonthly(h), tiles(h), weeklySeries(h), byCategory(h), proposed(h)
- twin.js: getLook(), saveLook(partial), subscribeLook(fn) -> unsubscribe, topicFor(category),
  topicLabel(topic), topicColor(topic), moodFor(receipt), uuisFromProfile(profile) -> [{ label, topic, key, value }],
  matchedUuis(profile, receipt) -> chips for the receipt's matched `when` keys

## Screen props
- Welcome({ onStart }), Onboarding({ onDone, onBack }), Uuis({ onNext, onBack }), CreateTwin({ onDone })
- Home({ onOpenStory, onNav }), Feed({ onOpenStory, onNav }), StoryDetail({ storyId, onBack })
- You({ onEditTwin, onEditAnswers, onOpenHistory, onDeleted, onNav }), History({ onOpenStory, onBack })
- onNav(tab): tab = "home" | "feed" | "twin" | "you"

## File ownership
- Person A: src/lib/*, Onboarding, Profile, History, src/components/Pills.jsx and QuestionCard.jsx, App.jsx
- Person B: src/data/stories.json, Feed, StoryDetail, ReceiptCard, scripts/prepStories.js
