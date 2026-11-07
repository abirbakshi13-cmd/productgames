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
  transport: "transit"         // "car" | "transit" | "bike-walk" | null
}

// STORY (array in src/data/stories.json)
{
  id, topicKey,                // topicKey = one real-world change; duplicates count once
  headline, summary,
  source: { name, url, date: "YYYY-MM-DD" },
  category: "rent" | "loans" | "work" | "transit" | "prices" | "other",
  stage: "proposed" | "passed" | "in_effect",
  needs: ["housing"],          // profile fields required; any null -> ask in context
  receipts: [{                 // first match wins
    when: { state: "WA", housing: "renting" },  // value = string or array of allowed strings
    type: "money" | "rule" | "rep" | "deadline",
    direction: "cost" | "saving", low, high, unit: "/mo",  // money only
    dueDate: "YYYY-MM-DD",     // deadline only
    text, evidence             // evidence = exact sentence from the article
  }],
  otherwise: "string"
}

// RECEIPT (returned by computeReceipt)
{ status: "affected" | "not_affected" | "needs_info",
  type, text, evidence, low, high, unit, direction, dueDate, askField }

// HISTORY ENTRY (localStorage "receipts.history"; opened ids in "receipts.opened")
{ storyId, topicKey, date, type, direction, low, high, unit, dueDate, category, stage }
```

## Module APIs
- profileStore.js: getProfile(), saveProfile(partial), clearProfile(), subscribe(fn) -> unsubscribe, zipToState(zip)
- useProfile.js: useProfile() -> [profile, saveProfile]  (re-renders on any change)
- receipt.js: computeReceipt(profile, story) -> Receipt; formatReceipt(receipt) -> short chip label
- historyStore.js: rebuildHistory(profile, stories), initHistory(stories), getHistory(), subscribeHistory(fn), markOpened(id), getOpened()
- stats.js: netMonthly(h), tiles(h), weeklySeries(h), byCategory(h), proposed(h)

## Screen props
- Onboarding({ onDone }), Profile({ onDeleted }), History({ onOpenStory })
- Feed({ onOpenStory }), StoryDetail({ storyId, onBack })

## File ownership
- Person A: src/lib/*, Onboarding, Profile, History, src/components/Pills.jsx and QuestionCard.jsx, App.jsx
- Person B: src/data/stories.json, Feed, StoryDetail, ReceiptCard, scripts/prepStories.js
