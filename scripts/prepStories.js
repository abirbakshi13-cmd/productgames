// Offline news pipeline for Receipts. Run: npm run prep
//
// Feeds -> dedupe/balance -> fetch + Readability extraction -> Groq LLM ->
// validate -> src/data/stories.candidates.json + prep-report.md
//
// Privacy: this script NEVER reads a user profile. The LLM only ever sees
// article text plus the list of possible profile fields/values (built from
// src/shared/fields.js in scripts/llmPrompt.js).
import 'dotenv/config';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { FEEDS } from './feeds.js';
import { buildMessages, WHEN_KEYS, ALLOWED_WHEN_VALUES } from './llmPrompt.js';

const ROOT = new URL('..', import.meta.url).pathname;
const CACHE_DIR = path.join(ROOT, '.cache');
const ARTICLES_DIR = path.join(CACHE_DIR, 'articles');
const CANDIDATES_PATH = path.join(ROOT, 'src', 'data', 'stories.candidates.json');
const REPORT_PATH = path.join(ROOT, 'prep-report.md');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 ReceiptsPrototype/0.1';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models';
// Resolved at startup from the live /models list; see pickModels().
let MODEL_PRIMARY = 'llama-3.3-70b-versatile';
let MODEL_FALLBACK = 'llama-3.1-8b-instant';
const MODEL_PREFERENCE = [/llama-4-maverick/, /llama-4-scout/, /llama-3\.3-70b/, /gpt-oss-120b/, /qwen.*32b/, /70b/];
const KEYWORDS = ['rent', 'tuition', 'loan', 'wage', 'tax', 'fare', 'price', 'fee', 'law', 'rule', 'bill', 'deadline', 'enroll', 'election', 'vote', 'council', 'washington', 'seattle', 'king county'];

// ---------- CLI ----------
const { values: args } = parseArgs({
  options: {
    limit: { type: 'string', default: '40' },
    days: { type: 'string', default: '28' },
    'dry-run': { type: 'boolean', default: false },
    url: { type: 'string', multiple: true, default: [] },
    'only-urls': { type: 'boolean', default: false },
    append: { type: 'boolean', default: false },
  },
});
const LIMIT = parseInt(args.limit, 10) || 40;
const DAYS = parseInt(args.days, 10) || 28;
const DRY_RUN = args['dry-run'];
const EXTRA_URLS = args.url;
const ONLY_URLS = args['only-urls'];
const APPEND = args.append;

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!DRY_RUN && !GROQ_API_KEY) {
  console.error('Missing GROQ_API_KEY in .env at the repo root. Set it, or run with --dry-run.');
  process.exit(1);
}

// ---------- small utils ----------
function sha1(s) {
  return createHash('sha1').update(s).digest('hex');
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function fetchWithTimeout(url, opts = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}
// ponytail: simple async pool, no p-limit dep needed for a fixed concurrency cap
async function runPool(limit, items, worker) {
  const results = new Array(items.length);
  let i = 0;
  async function next() {
    const idx = i++;
    if (idx >= items.length) return;
    results[idx] = await worker(items[idx], idx);
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}
function slugify(s) {
  return String(s || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}

// ---------- feed health + discovery ----------
function looksLikeFeed(text) {
  return /<rss[\s>]/i.test(text) || /<feed[\s>]/i.test(text) || /<rdf:RDF[\s>]/i.test(text);
}

async function discoverFeed(originalUrl) {
  let origin;
  try {
    origin = new URL(originalUrl).origin;
  } catch {
    return null;
  }
  try {
    const res = await fetchWithTimeout(origin, { headers: { 'User-Agent': UA } }, 10000);
    if (res.ok) {
      const html = await res.text();
      const m = html.match(/<link[^>]+rel=["']alternate["'][^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/i)
        || html.match(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]+rel=["']alternate["'][^>]*>/i);
      if (m) {
        const hrefMatch = m[0].match(/href=["']([^"']+)["']/i);
        if (hrefMatch) return new URL(hrefMatch[1], origin).toString();
      }
    }
  } catch { /* fall through to /feed, /rss */ }
  for (const suffix of ['/feed', '/rss']) {
    try {
      const res = await fetchWithTimeout(origin + suffix, { headers: { 'User-Agent': UA } }, 10000);
      if (res.ok) {
        const text = await res.text();
        if (looksLikeFeed(text)) return origin + suffix;
      }
    } catch { /* try next */ }
  }
  return null;
}

async function checkFeed(feed) {
  try {
    const res = await fetchWithTimeout(feed.url, { headers: { 'User-Agent': UA } }, 10000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!looksLikeFeed(text)) throw new Error('response is not RSS/Atom');
    return { ...feed, status: 'ok', finalUrl: feed.url, rawXml: text };
  } catch (e) {
    const discovered = await discoverFeed(feed.url);
    if (discovered) {
      try {
        const res2 = await fetchWithTimeout(discovered, { headers: { 'User-Agent': UA } }, 10000);
        if (res2.ok) {
          const text2 = await res2.text();
          if (looksLikeFeed(text2)) return { ...feed, status: 'recovered', finalUrl: discovered, rawXml: text2 };
        }
      } catch { /* fall through to dead */ }
    }
    return { ...feed, status: 'dead', reason: e.message, finalUrl: null, rawXml: null };
  }
}

async function checkAllFeeds() {
  const results = await runPool(4, FEEDS, checkFeed);
  const okCount = results.filter((r) => r.status !== 'dead').length;
  console.log('\nFeed health:');
  for (const r of results) {
    const label = r.status === 'recovered' ? `recovered(${r.finalUrl})` : r.status === 'dead' ? `dead(${r.reason})` : 'ok';
    console.log(`  ${r.name.padEnd(28)} ${label}`);
  }
  if (okCount < 4) {
    console.warn(`\nWARNING: only ${okCount}/${FEEDS.length} feeds are usable. Continuing anyway.`);
  }
  return results;
}

// ---------- collect + dedupe + balance ----------
function stripUtm(rawUrl) {
  const u = new URL(rawUrl);
  for (const k of [...u.searchParams.keys()]) {
    if (k.toLowerCase().startsWith('utm_')) u.searchParams.delete(k);
  }
  return u.toString();
}
function withinDays(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  if (Number.isNaN(d)) return false;
  return (Date.now() - d) / 86400000 <= days;
}
function normalizeItem(it, outlet, scope) {
  const rawUrl = it.link || it.guid;
  if (!rawUrl) return null;
  let url;
  try {
    url = stripUtm(rawUrl);
  } catch {
    return null;
  }
  const pub = it.isoDate || it.pubDate;
  const parsed = pub ? new Date(pub) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  return {
    title: it.title || '',
    url,
    date: parsed.toISOString().slice(0, 10),
    outlet,
    scope,
    snippet: it.contentSnippet || it.content || '',
  };
}
function scoreItem(it) {
  const hay = `${it.title} ${it.snippet}`.toLowerCase();
  let score = 0;
  for (const kw of KEYWORDS) if (hay.includes(kw)) score += 1;
  return score;
}
function titleTokens(title) {
  return new Set(String(title).toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean));
}
function jaccard(a, b) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}
function dedupeNearTitles(items) {
  const kept = [];
  for (const it of items) {
    const tokens = titleTokens(it.title);
    let dupIndex = -1;
    for (let i = 0; i < kept.length; i++) {
      if (jaccard(tokens, kept[i].tokens) >= 0.6) {
        dupIndex = i;
        break;
      }
    }
    if (dupIndex === -1) {
      kept.push({ ...it, tokens });
      continue;
    }
    const existing = kept[dupIndex];
    const newMoreLocal = it.scope === 'local' && existing.scope !== 'local';
    const newEarlier = it.scope === existing.scope && it.date < existing.date;
    if (newMoreLocal || newEarlier) kept[dupIndex] = { ...it, tokens };
  }
  return kept.map(({ tokens, ...rest }) => rest);
}
function roundRobin(items) {
  const byFeed = new Map();
  for (const it of items) {
    if (!byFeed.has(it.outlet)) byFeed.set(it.outlet, []);
    byFeed.get(it.outlet).push(it);
  }
  const queues = [...byFeed.values()];
  const result = [];
  let any = true;
  while (any) {
    any = false;
    for (const q of queues) {
      if (q.length) {
        result.push(q.shift());
        any = true;
      }
    }
  }
  return result;
}

async function collectItems(feedResults) {
  const parser = new Parser();
  const perFeedCapped = [];
  for (const feed of feedResults) {
    if (feed.status === 'dead' || !feed.rawXml) continue;
    let parsed;
    try {
      parsed = await parser.parseString(feed.rawXml);
    } catch (e) {
      console.warn(`  skip ${feed.name}: failed to parse feed XML (${e.message})`);
      continue;
    }
    const norm = (parsed.items || [])
      .map((it) => normalizeItem(it, feed.name, feed.scope))
      .filter(Boolean)
      .filter((it) => withinDays(it.date, DAYS));
    norm.forEach((it) => {
      it.score = scoreItem(it);
    });
    norm.sort((a, b) => b.score - a.score || (b.date || '').localeCompare(a.date || ''));
    perFeedCapped.push(...norm.slice(0, 8));
  }
  const seenUrls = new Set();
  const uniqueByUrl = [];
  for (const it of perFeedCapped) {
    if (seenUrls.has(it.url)) continue;
    seenUrls.add(it.url);
    uniqueByUrl.push(it);
  }
  const deduped = dedupeNearTitles(uniqueByUrl);
  return roundRobin(deduped);
}

// ---------- article fetch + readability ----------
function ensureCacheDirs() {
  mkdirSync(ARTICLES_DIR, { recursive: true });
}
function cachePaths(url) {
  const key = sha1(url);
  return { txtPath: path.join(ARTICLES_DIR, `${key}.txt`), jsonPath: path.join(ARTICLES_DIR, `${key}.json`) };
}
function extractReadable(html, url) {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  return article?.textContent ?? '';
}

async function fetchArticle(item) {
  const { txtPath, jsonPath } = cachePaths(item.url);
  if (existsSync(txtPath) && existsSync(jsonPath)) {
    const meta = JSON.parse(readFileSync(jsonPath, 'utf8'));
    const text = readFileSync(txtPath, 'utf8');
    console.log(`  [cache] ${item.url}`);
    return { ...item, outlet: item.outlet || meta.outlet, date: item.date || meta.date, text, status: meta.status };
  }
  let html;
  try {
    const res = await fetchWithTimeout(item.url, { headers: { 'User-Agent': UA }, redirect: 'follow' }, 10000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e) {
    console.log(`  [fetch_failed] ${item.url} (${e.message})`);
    writeFileSync(jsonPath, JSON.stringify({ url: item.url, outlet: item.outlet, date: item.date, status: 'fetch_failed', error: e.message }, null, 2));
    return { ...item, status: 'fetch_failed', text: '' };
  }
  let text = '';
  try {
    text = extractReadable(html, item.url).replace(/\s+/g, ' ').trim();
  } catch { /* leave text empty, handled by length check below */ }
  const outlet = item.outlet || (() => { try { return new URL(item.url).hostname.replace(/^www\./, ''); } catch { return 'unknown'; } })();
  const date = item.date || new Date().toISOString().slice(0, 10);
  const status = text.length < 1200 ? 'too_short_or_paywalled' : 'ok';
  writeFileSync(txtPath, text);
  writeFileSync(jsonPath, JSON.stringify({ url: item.url, outlet, date, title: item.title, status, charCount: text.length }, null, 2));
  console.log(`  [${status}] ${item.url} (${text.length} chars)`);
  return { ...item, outlet, date, status, text };
}

// ---------- LLM ----------
let total70bRateLimits = 0;
let usingFallbackModel = false;
const noJsonMode = new Set(); // models that rejected response_format: json_object

async function pickModels() {
  const res = await fetchWithTimeout(GROQ_MODELS_URL, { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } });
  const body = await res.text();
  if (!res.ok) throw new Error(`Groq GET ${GROQ_MODELS_URL} -> HTTP ${res.status}: ${body.slice(0, 400)}`);
  const ids = (JSON.parse(body).data || []).map((m) => m.id).filter(Boolean).sort();
  if (!ids.length) throw new Error('Groq /models returned no models');

  const envModel = process.env.GROQ_MODEL;
  if (envModel && ids.includes(envModel)) MODEL_PRIMARY = envModel;
  else {
    if (envModel) console.warn(`  GROQ_MODEL="${envModel}" is not in the available model list; ignoring it.`);
    const hit = MODEL_PREFERENCE.map((re) => ids.find((id) => re.test(id))).find(Boolean);
    if (!hit) throw new Error(`No preferred model available. Groq offers: ${ids.join(', ')}`);
    MODEL_PRIMARY = hit;
  }
  // Last resort keeps the 429 fallback meaningful on accounts with no 8b/instant/scout model.
  const smaller = ids.filter((id) => id !== MODEL_PRIMARY);
  MODEL_FALLBACK = smaller.find((id) => /8b|instant|scout/.test(id)) || smaller.find((id) => /20b/.test(id)) || MODEL_PRIMARY;
  console.log(`Groq endpoint: ${GROQ_URL}`);
  console.log(`Groq models: primary="${MODEL_PRIMARY}", rate-limit fallback="${MODEL_FALLBACK}" (${ids.length} available)`);
}

async function callGroq(messages) {
  const model = usingFallbackModel ? MODEL_FALLBACK : MODEL_PRIMARY;
  for (let attempt = 0; attempt < 5; attempt++) {
    const payload = { model, temperature: 0.1, max_tokens: 1500, messages };
    if (!noJsonMode.has(model)) payload.response_format = { type: 'json_object' };
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify(payload),
    });
    if (res.status === 429) {
      if (!usingFallbackModel) {
        total70bRateLimits += 1;
        if (total70bRateLimits > 6) {
          usingFallbackModel = true;
          console.warn(`  ${MODEL_PRIMARY} rate-limited >6 times this run; switching remaining requests to ${MODEL_FALLBACK}.`);
        }
      }
      const retryAfterHeader = Number(res.headers.get('retry-after'));
      const waitSec = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader : 2 ** attempt;
      await sleep(waitSec * 1000);
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      let msg = body.slice(0, 400);
      try { msg = JSON.parse(body).error?.message || msg; } catch { /* keep raw body */ }
      if (res.status === 400 && /response_format/i.test(msg) && !noJsonMode.has(model)) {
        noJsonMode.add(model);
        console.warn(`  ${model} rejected response_format json_object (${msg}); retrying without it.`);
        continue;
      }
      throw new Error(`Groq POST ${GROQ_URL} model="${model}" -> HTTP ${res.status}: ${msg}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }
  throw new Error('Groq rate-limited after 5 retries');
}

function tryParseJson(raw) {
  // Without json_object mode the model may wrap the object in ``` fences or prose.
  const stripped = String(raw).replace(/```(?:json)?/gi, '').trim();
  for (const text of [stripped, stripped.slice(stripped.indexOf('{'), stripped.lastIndexOf('}') + 1)]) {
    try {
      return JSON.parse(text);
    } catch { /* try the next shape */ }
  }
  return null;
}

// Cheap presence check used to decide whether to spend the one allowed retry.
// Deep schema/enum validation happens later in validateStory().
function quickValidate(parsed) {
  const errs = [];
  if (!parsed || typeof parsed !== 'object') return ['response is not a JSON object'];
  if (typeof parsed.relevant !== 'boolean') errs.push('"relevant" must be a boolean');
  if (parsed.relevant === true) {
    const s = parsed.story;
    if (!s || typeof s !== 'object') errs.push('"story" must be an object when relevant is true');
    else {
      for (const field of ['topicKey', 'headline', 'summary', 'category', 'stage', 'needs', 'receipts', 'otherwise']) {
        if (s[field] === undefined) errs.push(`story.${field} is missing`);
      }
    }
  }
  return errs;
}

async function getStoryFromLLM(item) {
  const truncated = item.text.split(' ').slice(0, 1500).join(' ');
  const messages = buildMessages({ title: item.title || item.outlet, outlet: item.outlet, url: item.url, date: item.date, text: truncated });
  let raw;
  try {
    raw = await callGroq(messages);
  } catch (e) {
    return { ok: false, reason: `LLM request failed: ${e.message}` };
  }
  let parsed = tryParseJson(raw);
  let errs = quickValidate(parsed);
  if (errs.length) {
    try {
      raw = await callGroq([...messages, { role: 'user', content: `Your previous output was invalid: ${errs.join('; ')}. Return corrected JSON only.` }]);
    } catch (e) {
      return { ok: false, reason: `LLM retry failed: ${e.message}` };
    }
    parsed = tryParseJson(raw);
    errs = quickValidate(parsed);
    if (errs.length) return { ok: false, reason: `Invalid LLM output after retry: ${errs.join('; ')}` };
  }
  return { ok: true, data: parsed };
}

// ---------- validation (schema, evidence, numbers) ----------
const CATEGORIES = ['rent', 'loans', 'work', 'transit', 'prices', 'other'];
const STAGES = ['proposed', 'passed', 'in_effect'];
const RECEIPT_TYPES = ['money', 'rule', 'rep', 'deadline'];
const UNITS = ['/mo', '/yr', '/hr', ' one-time'];
const STATE_RE = /^[A-Z]{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateWhen(when, errs, idx) {
  if (!when || typeof when !== 'object') {
    errs.push(`receipt[${idx}].when missing or not an object`);
    return;
  }
  for (const key of Object.keys(when)) {
    if (!WHEN_KEYS.includes(key)) {
      errs.push(`receipt[${idx}].when has disallowed key "${key}"`);
      continue;
    }
    const vals = Array.isArray(when[key]) ? when[key] : [when[key]];
    for (const v of vals) {
      if (key === 'state') {
        if (!STATE_RE.test(v)) errs.push(`receipt[${idx}].when.state "${v}" is not a 2-letter code`);
      } else if (!ALLOWED_WHEN_VALUES[key]?.includes(v)) {
        errs.push(`receipt[${idx}].when.${key} has disallowed value "${v}"`);
      }
    }
  }
}

function validateStory(story) {
  const errs = [];
  if (!story || typeof story !== 'object') return { valid: false, errors: ['story is not an object'] };
  if (!story.topicKey || typeof story.topicKey !== 'string') errs.push('topicKey missing');
  if (!story.headline) errs.push('headline missing');
  if (!story.summary) errs.push('summary missing');
  if (!CATEGORIES.includes(story.category)) errs.push(`category "${story.category}" invalid`);
  if (!STAGES.includes(story.stage)) errs.push(`stage "${story.stage}" invalid`);
  if (!Array.isArray(story.needs)) errs.push('needs must be an array');
  if (!Array.isArray(story.receipts) || story.receipts.length === 0) errs.push('receipts must be a non-empty array');
  if (!story.otherwise) errs.push('otherwise missing');

  const neededKeys = new Set();
  (story.receipts || []).forEach((r, idx) => {
    if (!RECEIPT_TYPES.includes(r.type)) errs.push(`receipt[${idx}].type "${r.type}" invalid`);
    if (!r.text) errs.push(`receipt[${idx}].text missing`);
    if (!r.evidence) errs.push(`receipt[${idx}].evidence missing`);
    validateWhen(r.when, errs, idx);
    if (r.when && typeof r.when === 'object') {
      for (const key of Object.keys(r.when)) if (key !== 'state') neededKeys.add(key);
    }
    if (r.type === 'money') {
      if (typeof r.low !== 'number' || typeof r.high !== 'number') errs.push(`receipt[${idx}] money missing numeric low/high`);
      else if (r.low > r.high) errs.push(`receipt[${idx}] money low > high`);
      if (!['saving', 'cost'].includes(r.direction)) errs.push(`receipt[${idx}] money direction invalid`);
      if (!UNITS.includes(r.unit)) errs.push(`receipt[${idx}] money unit invalid`);
    }
    if (r.type === 'deadline' && !DATE_RE.test(r.date || '')) errs.push(`receipt[${idx}] deadline missing valid date`);
  });
  if (Array.isArray(story.needs)) {
    for (const key of neededKeys) {
      if (!story.needs.includes(key)) errs.push(`needs is missing "${key}" used in a receipt's when`);
    }
  }
  return { valid: errs.length === 0, errors: errs };
}

function normalizeForMatch(s) {
  return String(s)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNumbers(s) {
  return (String(s).match(/\d+(?:\.\d+)?/g) || []).map(Number);
}

function applyEvidenceAndNumberChecks(story, articleText) {
  const normArticle = normalizeForMatch(articleText);
  for (const r of story.receipts || []) {
    const normEvidence = normalizeForMatch(r.evidence || '');
    r.evidenceVerified = normEvidence.length > 0 && normArticle.includes(normEvidence);
    if (r.type === 'money') {
      const articleNums = extractNumbers(articleText);
      const lowFound = articleNums.includes(r.low);
      const highFound = articleNums.includes(r.high);
      r.numbersTraceable = Boolean((lowFound && highFound) || r.calc);
    }
  }
}

// ---------- candidate assembly ----------
function buildCandidate(story, item, model) {
  const outletSlug = slugify(item.outlet);
  const id = `${story.topicKey}-${outletSlug}`;
  applyEvidenceAndNumberChecks(story, item.text);
  const evidenceAllVerified = (story.receipts || []).every((r) => r.evidenceVerified);
  return {
    ...story,
    id,
    source: { name: item.outlet, url: item.url, date: item.date },
    _meta: { outlet: item.outlet, scope: item.scope || 'extra-url', model, evidenceAllVerified },
  };
}

// ---------- outputs ----------
function loadExistingCandidates() {
  if (!existsSync(CANDIDATES_PATH)) return [];
  try {
    return JSON.parse(readFileSync(CANDIDATES_PATH, 'utf8'));
  } catch {
    return [];
  }
}
function writeCandidates(newOnes) {
  let final = newOnes;
  if (APPEND) {
    const existing = loadExistingCandidates();
    const byId = new Map(existing.map((s) => [s.id, s]));
    for (const s of newOnes) byId.set(s.id, s); // new wins on id collision
    final = [...byId.values()];
  }
  writeFileSync(CANDIDATES_PATH, JSON.stringify(final, null, 2));
  return final;
}

function hasType(stories, type) {
  return stories.some((s) => (s.receipts || []).some((r) => r.type === type));
}
function hasFederalLoanStory(stories) {
  return stories.some((s) => (s.receipts || []).some((r) => {
    const v = r.when?.loans;
    return v === 'federal' || (Array.isArray(v) && v.includes('federal'));
  }));
}
function hasWaRentStory(stories) {
  return stories.some((s) => (s.receipts || []).some((r) => r.when?.state === 'WA' && r.when?.housing !== undefined));
}

function writeReport({ feedResults, fetchResults, llmResults, candidates, droppedLog }) {
  const skipped = fetchResults.filter((r) => r.status !== 'ok');
  const relevant = llmResults.filter((r) => r.ok && r.data?.relevant === true).length;
  const sentToLlm = llmResults.length;

  const typeCounts = {};
  const categoryCounts = {};
  for (const s of candidates) {
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
    for (const r of s.receipts || []) typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
  }

  const lines = [];
  lines.push('# Receipts prep report');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Feed health');
  lines.push('');
  lines.push('| Feed | Scope | Status |');
  lines.push('|---|---|---|');
  for (const f of feedResults) {
    const status = f.status === 'recovered' ? `recovered(${f.finalUrl})` : f.status === 'dead' ? `dead(${f.reason})` : 'ok';
    lines.push(`| ${f.name} | ${f.scope} | ${status} |`);
  }
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  const skipReasons = skipped.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {});
  lines.push(`- Articles fetched: ${fetchResults.length}`);
  lines.push(`- Skipped: ${skipped.length} (${Object.entries(skipReasons).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'})`);
  lines.push(`- Sent to LLM: ${sentToLlm}`);
  lines.push(`- Relevant: ${relevant}`);
  lines.push(`- Valid candidates: ${candidates.length}`);
  lines.push(`- Model: ${MODEL_PRIMARY}${usingFallbackModel ? ` (rate-limit fallback used: ${MODEL_FALLBACK})` : ''}`);
  lines.push('');
  lines.push('### By receipt type');
  lines.push('');
  for (const t of RECEIPT_TYPES) lines.push(`- ${t}: ${typeCounts[t] || 0}`);
  lines.push('');
  lines.push('### By category');
  lines.push('');
  for (const c of CATEGORIES) lines.push(`- ${c}: ${categoryCounts[c] || 0}`);
  lines.push('');
  lines.push('## Candidates');
  lines.push('');
  lines.push('| id | outlet | type(s) | category | stage | needs | evidenceVerified | numbersTraceable |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const s of candidates) {
    const types = [...new Set((s.receipts || []).map((r) => r.type))].join(', ');
    const ev = (s.receipts || []).every((r) => r.evidenceVerified) ? 'all' : (s.receipts || []).some((r) => r.evidenceVerified) ? 'partial' : 'none';
    const numReceipts = (s.receipts || []).filter((r) => r.type === 'money');
    const nt = numReceipts.length === 0 ? 'n/a' : numReceipts.every((r) => r.numbersTraceable) ? 'all' : 'partial/none';
    lines.push(`| ${s.id} | ${s._meta?.outlet} | ${types} | ${s.category} | ${s.stage} | ${(s.needs || []).join(', ')} | ${ev} | ${nt} |`);
  }
  lines.push('');
  lines.push('## Coverage checklist');
  lines.push('');
  for (const t of RECEIPT_TYPES) lines.push(`- [${hasType(candidates, t) ? 'x' : ' '}] has a "${t}" story`);
  const loanOk = hasFederalLoanStory(candidates);
  const rentOk = hasWaRentStory(candidates);
  lines.push(`- [${loanOk ? 'x' : ' '}] has a federal student loan story`);
  lines.push(`- [${rentOk ? 'x' : ' '}] has a WA rent/housing story`);
  if (!loanOk) lines.push('\n  Find an article URL and run: `npm run prep -- --only-urls --append --url <URL>`');
  if (!rentOk) lines.push('\n  Find an article URL and run: `npm run prep -- --only-urls --append --url <URL>`');
  if (droppedLog.length) {
    lines.push('');
    lines.push('## Dropped / not relevant / failed');
    lines.push('');
    for (const d of droppedLog) lines.push(`- ${d}`);
  }
  writeFileSync(REPORT_PATH, lines.join('\n') + '\n');
}

function ensureGitignoreHasReport() {
  const gi = path.join(ROOT, '.gitignore');
  const content = existsSync(gi) ? readFileSync(gi, 'utf8') : '';
  if (!content.split('\n').some((l) => l.trim() === 'prep-report.md')) {
    writeFileSync(gi, content.replace(/\n?$/, '\n') + 'prep-report.md\n');
  }
}

// ---------- main ----------
async function main() {
  console.log(`Receipts prep: limit=${LIMIT} days=${DAYS} dryRun=${DRY_RUN} onlyUrls=${ONLY_URLS} append=${APPEND}`);
  ensureCacheDirs();
  ensureGitignoreHasReport();

  const feedResults = ONLY_URLS ? [] : await checkAllFeeds();
  let items = [];
  if (!ONLY_URLS) {
    items = await collectItems(feedResults);
    console.log(`\nCollected ${items.length} candidate articles from feeds (pre-limit).`);
  }
  const extraItems = EXTRA_URLS.map((url) => ({ title: null, url, date: null, outlet: null, scope: 'extra-url' }));
  const selected = ONLY_URLS ? extraItems : [...extraItems, ...items.slice(0, LIMIT)];
  console.log(`\nFetching ${selected.length} articles (concurrency 4)...`);
  const fetchResults = await runPool(4, selected, fetchArticle);

  const fetchable = fetchResults.filter((r) => r.status === 'ok');
  console.log(`\n${fetchable.length}/${fetchResults.length} articles usable after extraction.`);

  const droppedLog = [];
  for (const r of fetchResults) {
    if (r.status !== 'ok') droppedLog.push(`${r.url} — ${r.status}`);
  }

  const candidates = [];
  if (!DRY_RUN) {
    await pickModels();
    console.log(`\nSending ${fetchable.length} articles to Groq (concurrency 2)...`);
    const llmResults = await runPool(2, fetchable, async (item) => {
      const result = await getStoryFromLLM(item);
      console.log(`  [llm] ${item.url} -> ${result.ok ? (result.data.relevant ? 'relevant' : 'not relevant') : `failed: ${result.reason}`}`);
      return { item, result };
    });
    for (const { item, result } of llmResults) {
      if (!result.ok) {
        droppedLog.push(`${item.url} — LLM failed: ${result.reason}`);
        continue;
      }
      if (!result.data.relevant) {
        droppedLog.push(`${item.url} — not relevant: ${result.data.reason || ''}`);
        continue;
      }
      const { valid, errors } = validateStory(result.data.story);
      if (!valid) {
        droppedLog.push(`${item.url} — invalid story: ${errors.join('; ')}`);
        continue;
      }
      candidates.push(buildCandidate(result.data.story, item, usingFallbackModel ? MODEL_FALLBACK : MODEL_PRIMARY));
    }
    const finalCandidates = writeCandidates(candidates);
    writeReport({ feedResults, fetchResults, llmResults: llmResults.map((x) => x.result), candidates: finalCandidates, droppedLog });
    console.log(`\nWrote ${finalCandidates.length} candidates to ${path.relative(ROOT, CANDIDATES_PATH)}`);
  } else {
    writeReport({ feedResults, fetchResults, llmResults: [], candidates: [], droppedLog });
    console.log('\nDry run: skipped the LLM. See prep-report.md for feed health and fetch results.');
  }
  console.log(`Report written to ${path.relative(ROOT, REPORT_PATH)}`);
}

main().catch((e) => {
  console.error('prepStories failed:', e.message);
  process.exit(1);
});
