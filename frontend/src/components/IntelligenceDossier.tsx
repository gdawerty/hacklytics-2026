import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { CrisisPoint } from "@/data/heatmapData";

// ─── Types ─────────────────────────────────────────────────────────────────
interface WeatherData {
  temp:      number;
  high:      number;
  low:       number;
  condition: "Clear" | "Cloudy" | "Rain" | "Storm" | "Haze" | "Dust" | "Snow";
  humidity:  number;
  windKph:   number;
}

interface OperationalData {
  healthFacilities:   number;
  displacementAlerts: number;
  hazardLevel:        number;
  alertText:          string;
}

interface SectorEntry { gapScore: number; label: string }
interface SectorData  { food: SectorEntry; water: SectorEntry; health: SectorEntry }

interface TrendPoint  { month: string; underfunding: number }

interface Article {
  title:      string;
  summary:    string;
  source:     string;
  url:        string;
  imageQuery: string;
  imageUrl?:  string;
}

interface SocialPost {
  creator:  string;
  caption:  string;
  hashtags: string[];
  views:    string;
  likes:    string;
  context?: string;
  twitterUrl?: string;
  tiktokUrl?: string;
  coverImageUrl?: string;
}

interface AidOrg {
  name:       string;
  focus:      string;
  status:     "Active" | "Scaling" | "Limited" | "Withdrawn";
  fundingPct: number;
}

interface DossierData {
  weather:     WeatherData;
  operational: OperationalData;
  sectors:     SectorData;
  trend:       TrendPoint[];
  articles:    Article[];
  social:      SocialPost[];
  aidOrgs:     AidOrg[];
}

interface MitigationCategory {
  name: "WASH" | "Health" | "Nutrition" | "Protection" | "Education";
  needAmount: number;
  receivedAmount: number;
  impactScore: number;
  originPlan: string;
  successIfFunded: number;
  underfundingPct?: number;
  analogousCountry?: string;
  solution?: string;
}

interface MitigationFundingData {
  totalGoal: number;
  currentFunding: number;
  categories: MitigationCategory[];
}

export interface DossierProps {
  country: string;
  crisis:  CrisisPoint | null;
  state?:  string;
  onClose: () => void;
}

// ─── Tabs ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "OVERVIEW" },
  { id: "intel",    label: "INTEL"    },
  { id: "aid",      label: "AID"      },
  { id: "social",   label: "SOCIAL"   },
] as const;
type TabId = typeof TABS[number]["id"];

// ─── 3-hour localStorage cache ─────────────────────────────────────────────
const CACHE_TTL = 3 * 60 * 60 * 1000;

function getCached(key: string): DossierData | null {
  try {
    const raw = localStorage.getItem(`dossier_v2_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data as DossierData;
  } catch { return null; }
}

function setCached(key: string, data: DossierData) {
  try {
    localStorage.setItem(`dossier_v2_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota */ }
}

// ─── Groq ──────────────────────────────────────────────────────────────────
const GROQ_KEY   = import.meta.env.VITE_GROQ_API_KEY as string;
const GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string || "http://localhost:5001";
const GOOGLE_WEATHER_KEY = import.meta.env.VITE_GOOGLE_WEATHER_API_KEY as string;
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

const AID_CONTEXTS = [
  "Food & Livelihoods",
  "Health & Wellbeing",
  "Protection & Safety",
  "Shelter & Essential Services",
  "Operations & Support",
];

const SAFE_POSITIVE_TERMS = [
  "aid", "support", "relief", "awareness", "solidarity", "donate", "community",
  "resilience", "protect", "health", "nutrition", "water", "shelter", "education",
  "recovery", "assist", "volunteer", "humanitarian", "hope", "help",
];

const UNSAFE_TERMS = [
  "kill", "exterminate", "hate", "slur", "nazi", "terrorist", "bomb them",
  "racial", "racist", "fuck", "shit", "bitch", "bastard", "retard",
];

function buildPrompt(country: string, state?: string) {
  const location = state ? `${state} (${country})` : country;
  return `You are a humanitarian intelligence analyst. Return ONLY valid JSON — no markdown, no code blocks.

For ${location} as of February 2026, return this exact JSON:
{
  "weather": {
    "temp": <integer celsius>,
    "high": <integer celsius>,
    "low":  <integer celsius>,
    "condition": <"Clear"|"Cloudy"|"Rain"|"Storm"|"Haze"|"Dust"|"Snow">,
    "humidity": <0-100>,
    "windKph":  <integer>
  },
  "operational": {
    "healthFacilities":   <integer 0-100>,
    "displacementAlerts": <integer>,
    "hazardLevel":        <integer 1-5>,
    "alertText":          "<one urgent field alert sentence>"
  },
  "sectors": {
    "food":   { "gapScore": <0.0-1.0>, "label": "<short status>" },
    "water":  { "gapScore": <0.0-1.0>, "label": "<short status>" },
    "health": { "gapScore": <0.0-1.0>, "label": "<short status>" }
  },
  "trend": [
    { "month": "Sep", "underfunding": <0-100> },
    { "month": "Oct", "underfunding": <0-100> },
    { "month": "Nov", "underfunding": <0-100> },
    { "month": "Dec", "underfunding": <0-100> },
    { "month": "Jan", "underfunding": <0-100> },
    { "month": "Feb", "underfunding": <0-100> }
  ],
  "articles": [
    {
      "title":      "<specific bold headline>",
      "summary":    "<2 sentence factual summary>",
      "source":     "Google News",
      "url":        "<full Google News URL from news.google.com/search?q=...>",
      "imageQuery": "<3-word Unsplash phrase>",
      "imageUrl":   "<optional https image URL>"
    }
  ],
  "social": [
    {
      "creator":  "@<realistic username>",
      "caption":  "<authentic 20-35 word post about this crisis. no profanity/slurs/offensive language>",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "views":    "<e.g. 2.4M>",
      "likes":    "<e.g. 180K>",
      "context":  <"${AID_CONTEXTS.join('"|"')}">,
      "twitterUrl": "<full https URL to an X/Twitter post or X search>",
      "coverImageUrl": "<optional https image URL for thumbnail>"
    }
  ],
  "aidOrgs": [
    {
      "name":       "<org like UNHCR, WFP, MSF, IRC, OCHA, Save the Children, ICRC>",
      "focus":      "<8-word focus description>",
      "status":     <"Active"|"Scaling"|"Limited"|"Withdrawn">,
      "fundingPct": <0-100>
    }
  ]
}

For social posts:
- Use ONLY Twitter/X content references (x.com or twitter.com URLs). Do not return TikTok, Instagram, Facebook, Reddit, YouTube, or news URLs.
- Include exactly 5 posts total, exactly one for each context bucket listed.
- Safety filter: exclude anything racist, hateful, profane, violent, or offensive.
- Tone must be constructive, awareness-oriented, and humanitarian-positive.

For articles:
- Use ONLY Google News links from news.google.com.
- Set source to exactly "Google News" for every article.

Include exactly 3 articles, 5 social posts (one per context bucket), and 4 aid organizations. Be specific and factual.
For URLs, avoid placeholders and return valid external links with https.`;
}

function isSafePositivePost(post: SocialPost): boolean {
  const combined = `${post.caption} ${(post.hashtags ?? []).join(" ")}`.toLowerCase();
  if (!combined.trim()) return false;
  if (UNSAFE_TERMS.some((word) => combined.includes(word))) return false;
  return SAFE_POSITIVE_TERMS.some((word) => combined.includes(word));
}

function isTwitterOnlyUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("x.com") || host.includes("twitter.com");
  } catch {
    return false;
  }
}

function socialFallbackForContext(country: string, context: string): SocialPost {
  const query = encodeURIComponent(`${country} ${context} humanitarian awareness`);
  return {
    creator: "@humanitarian_updates",
    caption: `${context} update for ${country}: coordinated humanitarian awareness and community support efforts are helping prioritize relief pathways and protect vulnerable households.`,
    hashtags: ["#Humanitarian", "#Awareness", "#Relief"],
    views: "—",
    likes: "—",
    context,
    twitterUrl: `https://x.com/search?q=${query}&src=typed_query`,
    coverImageUrl: `https://placehold.co/1200x675/020617/22d3ee?text=${encodeURIComponent(context)}`,
  };
}

function sanitizeSocialPosts(country: string, posts: SocialPost[]): SocialPost[] {
  const byContext = new Map<string, SocialPost>();
  for (const raw of posts ?? []) {
    const context = inferAidContext(raw);
    if (!AID_CONTEXTS.includes(context)) continue;
    const normalized: SocialPost = {
      ...raw,
      context,
      creator: raw.creator || "@humanitarian_updates",
      hashtags: Array.isArray(raw.hashtags) ? raw.hashtags.slice(0, 5) : ["#Humanitarian", "#Awareness"],
      twitterUrl: raw.twitterUrl || raw.tiktokUrl,
    };
    if (!isSafePositivePost(normalized)) continue;
    if (!isTwitterOnlyUrl(normalized.twitterUrl)) continue;
    if (!byContext.has(context)) byContext.set(context, normalized);
  }

  for (const context of AID_CONTEXTS) {
    if (!byContext.has(context)) byContext.set(context, socialFallbackForContext(country, context));
  }
  return AID_CONTEXTS.map((context) => byContext.get(context) as SocialPost);
}

function sanitizeIntelArticles(country: string, articles: Article[]): Article[] {
  const input = (articles ?? []).slice(0, 3);
  const fixed = input.map((a) => {
    const q = `${country} ${a.title || a.summary || "humanitarian crisis"}`;
    return {
      ...a,
      source: "Google News",
      url: ensureExternalUrl(a.url, q, "https://news.google.com/search?q="),
    };
  });

  while (fixed.length < 3) {
    const n = fixed.length + 1;
    const q = `${country} humanitarian crisis update ${n}`;
    fixed.push({
      title: `${country} humanitarian update ${n}`,
      summary: `Live coverage related to ${country}.`,
      source: "Google News",
      url: `https://news.google.com/search?q=${encodeURIComponent(q)}`,
      imageQuery: `${country} humanitarian`,
    });
  }
  return fixed;
}

async function fetchDossier(country: string, state?: string): Promise<DossierData> {
  const cacheKey = state ? `${country}::${state}` : country;
  const cached   = getCached(cacheKey);
  if (cached) {
    const sanitizedCached: DossierData = {
      ...cached,
      articles: sanitizeIntelArticles(country, cached.articles ?? []),
      social: sanitizeSocialPosts(country, cached.social ?? []),
    };
    setCached(cacheKey, sanitizedCached);
    return sanitizedCached;
  }

  const res = await fetch(GROQ_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model:           GROQ_MODEL,
      messages:        [{ role: "user", content: buildPrompt(country, state) }],
      response_format: { type: "json_object" },
      temperature:     0.35,
      max_tokens:      2400,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const raw  = await res.json();
  const data = JSON.parse(raw.choices[0].message.content) as DossierData;

  data.articles = sanitizeIntelArticles(country, data.articles ?? []);

  data.social = sanitizeSocialPosts(country, data.social ?? []);

  setCached(cacheKey, data);
  return data;
}

// ─── Databricks Funding Prediction ─────────────────────────────────────────
async function fetchDatabricksPrediction(country: string): Promise<any> {
  console.log("[FRONTEND] [Databricks] Starting prediction request for country:", country);
  const cacheKey = `${country}:${new Date().getFullYear()}`;
  const cached = PRED_MEM_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < PRED_TTL) {
    console.log("[FRONTEND] [Databricks] Returning cached prediction:", cacheKey);
    return cached.data;
  }

  try {
    // Fast-path category lookup with short timeout fallback.
    const categoryReq = fetch(`${BACKEND_URL}/api/identify-category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country }),
    });
    const categoryTimeout = new Promise<{ category: string }>((resolve) =>
      window.setTimeout(() => resolve({ category: "Health" }), 1200)
    );
    const categoryData = await Promise.race([
      categoryReq
        .then(async (res) => (res.ok ? res.json() : { category: "Health" }))
        .catch(() => ({ category: "Health" })),
      categoryTimeout,
    ]);
    const category = categoryData.category || "Health";

    const payload = {
      dataframe_records: [
        {
          country,
          category,
          year: new Date().getFullYear(),
        },
      ],
    };

    const startTime = Date.now();
    const databricksReq = fetch(`${BACKEND_URL}/api/databricks/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const reqTimeout = new Promise<Response>((_, reject) =>
      window.setTimeout(() => reject(new Error("Databricks timed out")), 15000)
    );
    const res = (await Promise.race([databricksReq, reqTimeout])) as Response;

    const duration = Date.now() - startTime;
    console.log("[FRONTEND] [Databricks] Response received in", `${duration}ms`);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Databricks ${res.status}: ${errorText}`);
    }

    const result = await res.json();
    PRED_MEM_CACHE.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.error("[FRONTEND] [Databricks] Request failed:", err);
    return null;
  }
}

// ─── OpenWeatherMap real weather ────────────────────────────────────────────
const OWM_KEY   = import.meta.env.VITE_OWM_API_KEY as string;
const WEATHER_MEM_CACHE = new Map<string, { data: WeatherData; ts: number }>();
const WEATHER_TTL = 60 * 60 * 1000;
const PRED_MEM_CACHE = new Map<string, { data: any; ts: number }>();
const PRED_TTL = 30 * 60 * 1000;

const EXPLAIN_CACHE = new Map<string, string>();

function ensureExternalUrl(url: string | undefined, q: string, base = "https://news.google.com/search?q="): string {
  if (!url) return `${base}${encodeURIComponent(q)}`;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
  } catch {}
  return `${base}${encodeURIComponent(q)}`;
}

function inferAidContext(post: SocialPost): string {
  if (post.context && AID_CONTEXTS.includes(post.context)) return post.context;
  const h = post.hashtags.map(t => t.toLowerCase()).join(" ");
  if (/(food|hunger|nutrition|agri|livelihood|cash)/.test(h)) return "Food & Livelihoods";
  if (/(health|med|clinic|doctor|school|education)/.test(h)) return "Health & Wellbeing";
  if (/(protect|gbv|child|safety|traffick|mine)/.test(h)) return "Protection & Safety";
  if (/(wash|water|shelter|camp|nfi|telecom)/.test(h)) return "Shelter & Essential Services";
  return "Operations & Support";
}

const ORG_LINKS: Record<string, string> = {
  "WFP": "https://www.wfp.org",
  "MSF": "https://www.msf.org",
  "ICRC": "https://www.icrc.org",
  "UNHCR": "https://www.unhcr.org",
  "UNICEF": "https://www.unicef.org",
  "WHO": "https://www.who.int",
  "OCHA": "https://www.unocha.org",
  "IRC": "https://www.rescue.org",
  "SAVE THE CHILDREN": "https://www.savethechildren.org",
};

function orgWebsite(name: string): string {
  const upper = name.toUpperCase();
  for (const key of Object.keys(ORG_LINKS)) {
    if (upper.includes(key)) return ORG_LINKS[key];
  }
  return `https://www.google.com/search?q=${encodeURIComponent(name + " humanitarian organization")}`;
}

async function fetchGroqContext(country: string, target: string, kind: "sector" | "organization" | "solution"): Promise<string> {
  const key = `${country}:${kind}:${target}`;
  if (EXPLAIN_CACHE.has(key)) return EXPLAIN_CACHE.get(key)!;
  const prompt = `Give a concise humanitarian explanation (4-6 lines) for why "${target}" helps ${country} in ${kind} context.
Include:
1) Why it worked in similar countries
2) Practical implementation in ${country}
3) Near-term expected outcome
Return plain text only.`;
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 220,
    }),
  });
  if (!res.ok) throw new Error("Context generation unavailable");
  const raw = await res.json();
  const text = (raw.choices?.[0]?.message?.content ?? "").trim();
  EXPLAIN_CACHE.set(key, text);
  return text;
}

function owmToCondition(id: number): WeatherData["condition"] {
  if (id >= 200 && id < 300) return "Storm";
  if (id >= 300 && id < 600) return "Rain";
  if (id >= 600 && id < 700) return "Snow";
  if (id >= 700 && id < 800) return id === 731 || id === 751 ? "Dust" : "Haze";
  if (id === 800)             return "Clear";
  return "Cloudy";
}

async function fetchRealWeather(location: string): Promise<WeatherData | null> {
  const mem = WEATHER_MEM_CACHE.get(location);
  if (mem && Date.now() - mem.ts < WEATHER_TTL) return mem.data;
  if (!OWM_KEY) return null;
  try {
    // Current weather by city name
    const res  = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${OWM_KEY}&units=metric`
    );
    if (!res.ok) return null;
    const d = await res.json();

    // Also fetch one-call for daily high/low
    const { lat, lon } = d.coord;
    const fcRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&cnt=8&appid=${OWM_KEY}&units=metric`
    );
    const fcData = await fcRes.json();
    const temps  = (fcData.list ?? []).map((i: any) => i.main.temp as number);
    const high   = temps.length ? Math.round(Math.max(...temps)) : Math.round(d.main.temp_max);
    const low    = temps.length ? Math.round(Math.min(...temps)) : Math.round(d.main.temp_min);

    const result: WeatherData = {
      temp:      Math.round(d.main.temp),
      high,
      low,
      condition: owmToCondition(d.weather[0].id),
      humidity:  d.main.humidity,
      windKph:   Math.round(d.wind.speed * 3.6),
    };
    WEATHER_MEM_CACHE.set(location, { data: result, ts: Date.now() });
    return result;
  } catch { return null; }
}

async function fetchGoogleWeather(location: string): Promise<WeatherData | null> {
  if (!GOOGLE_WEATHER_KEY || !GOOGLE_MAPS_KEY) return null;
  try {
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${GOOGLE_MAPS_KEY}`
    );
    if (!geoRes.ok) return null;
    const geo = await geoRes.json();
    const loc = geo?.results?.[0]?.geometry?.location;
    if (!loc?.lat || !loc?.lng) return null;

    const weatherRes = await fetch(
      `https://weather.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_WEATHER_KEY}&location.latitude=${loc.lat}&location.longitude=${loc.lng}&unitsSystem=METRIC`
    );
    if (!weatherRes.ok) return null;
    const d = await weatherRes.json();

    const temp = Math.round(d?.temperature?.degrees ?? d?.temperature ?? 0);
    const high = Math.round(d?.maxTemperature?.degrees ?? temp + 2);
    const low = Math.round(d?.minTemperature?.degrees ?? temp - 3);
    const humidity = Math.round(d?.relativeHumidity ?? 0);
    const windKph = Math.round((d?.wind?.speed?.value ?? 0) * 3.6);
    const icon = String(d?.weatherCondition?.type ?? "CLOUDY").toUpperCase();
    const condition: WeatherData["condition"] =
      icon.includes("RAIN") ? "Rain" :
      icon.includes("STORM") || icon.includes("THUNDER") ? "Storm" :
      icon.includes("SNOW") ? "Snow" :
      icon.includes("HAZE") || icon.includes("DUST") || icon.includes("SMOKE") ? "Haze" :
      icon.includes("CLEAR") || icon.includes("SUN") ? "Clear" : "Cloudy";

    return { temp, high, low, humidity, windKph, condition };
  } catch {
    return null;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h || 1;
}

function buildMitigationMock(country: string, state?: string): MitigationFundingData {
  const seed = hashSeed(`${country}::${state ?? "country"}`);
  const totalGoal = 2_000_000_000 + (seed % 9) * 100_000_000; // 2.0B - 2.8B
  const currentFunding = Math.round(totalGoal * (0.36 + ((seed >> 3) % 22) / 100)); // 36% - 57%

  const templates: Array<{
    name: MitigationCategory["name"];
    needRatio: number;
    recvRatio: number;
    impactScore: number;
    originPlan: string;
  }> = [
    { name: "WASH",       needRatio: 0.26, recvRatio: 0.43, impactScore: 82, originPlan: "UN OCHA" },
    { name: "Health",     needRatio: 0.24, recvRatio: 0.48, impactScore: 88, originPlan: "WHO" },
    { name: "Nutrition",  needRatio: 0.18, recvRatio: 0.39, impactScore: 79, originPlan: "UNICEF" },
    { name: "Protection", needRatio: 0.16, recvRatio: 0.34, impactScore: 84, originPlan: "Red Cross" },
    { name: "Education",  needRatio: 0.16, recvRatio: 0.37, impactScore: 73, originPlan: "Save the Children" },
  ];

  const categories = templates.map((t, i) => {
    const jitter = (((seed >> (i + 1)) % 9) - 4) / 100;
    const needAmount = Math.round(totalGoal * Math.max(0.1, t.needRatio + jitter));
    const receivedAmount = Math.round(needAmount * Math.max(0.14, Math.min(0.88, t.recvRatio + jitter * 0.7)));
    const gapRatio = Math.max(0, (needAmount - receivedAmount) / Math.max(needAmount, 1));
    const successIfFunded = Math.round(Math.min(96, t.impactScore + gapRatio * 14));
    return {
      name: t.name,
      needAmount,
      receivedAmount,
      impactScore: t.impactScore,
      originPlan: t.originPlan,
      successIfFunded,
    } satisfies MitigationCategory;
  });

  return { totalGoal, currentFunding, categories };
}

function formatMoneyCompact(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${Math.round(value / 1_000_000)}M`;
  return `$${Math.round(value / 1_000)}K`;
}

function useCountUp(target: number, depsKey: string, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const run = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [target, depsKey, duration]);
  return value;
}

// ─── Reveal wrapper — spring "pop" ─────────────────────────────────────────
function Reveal({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.93 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      transition={{ type: "spring", stiffness: 320, damping: 24, delay }}
    >
      {children}
    </motion.div>
  );
}

// ─── Tab bar ───────────────────────────────────────────────────────────────
function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div className="flex shrink-0 border-b border-white/[0.06]">
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="flex-1 py-2.5 text-[9px] font-mono uppercase tracking-[0.14em] transition-colors relative"
          style={{ color: active === t.id ? "rgba(34,211,238,0.9)" : "rgba(255,255,255,0.22)" }}
        >
          {t.label}
          {active === t.id && (
            <motion.div
              layoutId="tab-underline"
              className="absolute bottom-0 left-0 right-0 h-[1.5px]"
              style={{ background: "rgba(34,211,238,0.55)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Weather SVG icons ─────────────────────────────────────────────────────
const ip = {
  width: 28, height: 28, viewBox: "0 0 24 24",
  fill: "none", stroke: "currentColor",
  strokeWidth: "1.5", strokeLinecap: "round" as const,
};
function SunIcon()   { return <svg {...ip} className="text-amber-300"><circle cx="12" cy="12" r="4" />{[[12,2,12,5],[12,19,12,22],[2,12,5,12],[19,12,22,12],[4.22,4.22,6.34,6.34],[17.66,17.66,19.78,19.78],[4.22,19.78,6.34,17.66],[17.66,6.34,19.78,4.22]].map(([x1,y1,x2,y2],i)=><line key={i} x1={x1} y1={y1} x2={x2} y2={y2}/>)}</svg>; }
function CloudIcon() { return <svg {...ip} className="text-slate-300"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>; }
function RainIcon()  { return <svg {...ip} className="text-sky-400"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/></svg>; }
function StormIcon() { return <svg {...ip} className="text-yellow-300"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>; }
function HazeIcon()  { return <svg {...ip} className="text-slate-400"><path d="M5 5h3m4 0h9M3 10h11m4 0h1M1 15h11m4 0h7M3 20h5m6 0h11" strokeWidth="1.8"/></svg>; }
function SnowIcon()  { return <svg {...ip} className="text-sky-200"><line x1="12" y1="2" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/></svg>; }
function WeatherIcon({ c }: { c: string }) {
  if (c === "Clear")  return <SunIcon />;
  if (c === "Rain")   return <RainIcon />;
  if (c === "Storm")  return <StormIcon />;
  if (c === "Snow")   return <SnowIcon />;
  if (c === "Haze" || c === "Dust") return <HazeIcon />;
  return <CloudIcon />;
}

// ─── OVERVIEW TAB ──────────────────────────────────────────────────────────

function WeatherTactical({ w, country, isLive }: { w: WeatherData; country: string; isLive: boolean }) {
  const [unit, setUnit] = useState<"C" | "F">(() =>
    (localStorage.getItem("weather_unit") as "C" | "F") ?? "C"
  );
  const toggleUnit = () => {
    const next = unit === "C" ? "F" : "C";
    setUnit(next);
    localStorage.setItem("weather_unit", next);
  };
  const toF = (c: number) => Math.round(c * 9 / 5 + 32);
  const fmt = (c: number) => unit === "C" ? `${c}°` : `${toF(c)}°`;

  return (
    <div className="rounded-lg overflow-hidden border border-white/[0.07]" style={{ background: "rgba(8,13,30,0.72)" }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.05]">
        <p className="text-[9px] text-white/25 uppercase tracking-[0.2em] font-mono font-semibold">METAR · {country}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleUnit}
            className="flex items-center gap-0.5 px-2 py-0.5 rounded transition-colors"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <span className="text-[10px] font-bold font-mono" style={{ color: unit === "C" ? "rgba(34,211,238,0.9)" : "rgba(255,255,255,0.22)" }}>°C</span>
            <span className="text-white/12 text-[10px] mx-0.5">|</span>
            <span className="text-[10px] font-bold font-mono" style={{ color: unit === "F" ? "rgba(34,211,238,0.9)" : "rgba(255,255,255,0.22)" }}>°F</span>
          </button>
          <div className="flex items-center gap-1">
            <div className={`w-1 h-1 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-white/15"}`} />
            <span className={`text-[9px] font-mono ${isLive ? "text-emerald-400/60" : "text-white/18"}`}>{isLive ? "LIVE" : "EST"}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.05]">
        <div className="px-4 py-4">
          <p className="text-[9px] text-white/22 font-mono uppercase tracking-widest mb-1">TEMP</p>
          <p className="text-5xl font-light text-white leading-none font-mono">{fmt(w.temp)}</p>
          <p className="text-white/22 text-[9px] font-mono mt-1">{unit === "C" ? "CELSIUS" : "FAHRENHEIT"}</p>
        </div>
        <div className="px-4 py-4 flex flex-col justify-center gap-1.5">
          <WeatherIcon c={w.condition} />
          <p className="text-white/80 font-mono text-[12px] uppercase tracking-wide">{w.condition}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[9px] text-white/22 font-mono uppercase tracking-widest mb-1.5">RANGE</p>
          <div className="flex items-baseline gap-2">
            <span className="text-white/80 text-[13px] font-mono font-medium">H {fmt(w.high)}</span>
            <span className="text-white/32 text-[11px] font-mono">L {fmt(w.low)}</span>
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="text-[9px] text-white/22 font-mono uppercase tracking-widest mb-1.5">CONDITIONS</p>
          <p className="text-white/65 text-[11px] font-mono">WND {w.windKph} kph</p>
          <p className="text-white/38 text-[11px] font-mono mt-0.5">HUM {w.humidity}%</p>
        </div>
      </div>
    </div>
  );
}

interface PlaceCard {
  title: string;
  subtitle: string;
  imageUrl?: string;
  href: string;
  query: string;
}

function buildCountryPlaces(country: string, state?: string): PlaceCard[] {
  const region = state ? `${state}, ${country}` : country;
  const seeds = [
    { title: "Historic District", subtitle: `${region} heritage area`, query: `${region} historic district` },
    { title: "City Center", subtitle: `${region} downtown`, query: `${region} city center skyline` },
    { title: "Natural Landscape", subtitle: `${region} nature`, query: `${region} landscape nature` },
    { title: "Local Community", subtitle: `${region} daily life`, query: `${region} street market community` },
  ];
  return seeds.map((s) => {
    const q = encodeURIComponent(s.query);
    return {
      title: s.title,
      subtitle: s.subtitle,
      href: `https://www.google.com/search?q=${q}`,
      query: s.query,
    };
  });
}

function CountryPlacesPanel({ country, state }: { country: string; state?: string }) {
  const places = useMemo(() => buildCountryPlaces(country, state), [country, state]);
  const [imagesByQuery, setImagesByQuery] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pairs = await Promise.all(
        places.map(async (place) => {
          try {
            const url =
              `https://en.wikipedia.org/w/api.php?action=query&generator=search` +
              `&gsrsearch=${encodeURIComponent(place.query)}` +
              `&gsrlimit=1&prop=pageimages|info&inprop=url&pithumbsize=1200&format=json&origin=*`;
            const res = await fetch(url);
            if (!res.ok) return [place.query, ""] as const;
            const data = await res.json();
            const pages = data?.query?.pages ? Object.values(data.query.pages) as Array<any> : [];
            const first = pages[0];
            const thumb = first?.thumbnail?.source as string | undefined;
            return [place.query, thumb ?? ""] as const;
          } catch {
            return [place.query, ""] as const;
          }
        })
      );
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [q, img] of pairs) {
        if (img) next[q] = img;
      }
      setImagesByQuery(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [places]);

  return (
    <div className="rounded-lg overflow-hidden border border-white/[0.07]" style={{ background: "rgba(8,13,30,0.72)" }}>
      <div className="px-4 pt-3 pb-2 border-b border-white/[0.05]">
        <p className="text-[9px] text-white/25 uppercase tracking-[0.2em] font-mono font-semibold">
          Places In {state ?? country}
        </p>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {places.map((place) => (
          <a
            key={place.title}
            href={place.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-md border border-white/[0.08] overflow-hidden transition-colors hover:border-cyan-300/30"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <img
              src={imagesByQuery[place.query] || `https://picsum.photos/seed/${encodeURIComponent(place.query)}/900/550`}
              alt={place.subtitle}
              className="h-28 w-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  `https://placehold.co/900x550/020617/94a3b8?text=${encodeURIComponent(place.subtitle)}`;
              }}
            />
            <div className="px-2.5 py-2">
              <p className="text-white/85 text-[11px] font-mono font-semibold">{place.title}</p>
              <p className="text-white/35 text-[9px] mt-0.5">{place.subtitle}</p>
              <p className="text-cyan-300/70 text-[9px] mt-1 font-mono uppercase tracking-wide group-hover:text-cyan-200">
                More information ↗
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── INTEL TAB ─────────────────────────────────────────────────────────────
function DatabricksPrediction({ predictionData }: { predictionData: any }) {
  if (!predictionData) {
    return (
      <div className="rounded-lg overflow-hidden border border-white/[0.07]" style={{ background: "rgba(8,13,30,0.72)" }}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.05]">
          <p className="text-[9px] text-white/25 uppercase tracking-[0.2em] font-mono font-semibold">FUNDING PREDICTION</p>
          <span className="text-[9px] font-mono text-white/30">Loading...</span>
        </div>
        <div className="px-4 py-6 text-center">
          <p className="text-[10px] text-white/40 font-mono">Fetching prediction data...</p>
        </div>
      </div>
    );
  }

  // Extract prediction value from Databricks response
  // The response structure may vary, so we handle different formats
  console.log('[FRONTEND] [DatabricksPrediction] Raw prediction data:', predictionData);
  console.log('[FRONTEND] [DatabricksPrediction] Type:', typeof predictionData);
  console.log('[FRONTEND] [DatabricksPrediction] Is array:', Array.isArray(predictionData));
  
  let predictionValue: number | null = null;
  let rawValue: any = null;

  // Try different response formats
  if (predictionData && typeof predictionData === 'object') {
    // Handle Databricks format: {predictions: [{predicted_underfunded_percent: 36.13}]}
    if (Array.isArray(predictionData.predictions) && predictionData.predictions.length > 0) {
      const firstPrediction = predictionData.predictions[0];
      // Check for common prediction field names
      if (typeof firstPrediction === 'object' && firstPrediction !== null) {
        rawValue = firstPrediction.predicted_underfunded_percent ?? 
                   firstPrediction.prediction ?? 
                   firstPrediction.value ?? 
                   firstPrediction.amount ?? 
                   firstPrediction.funding ?? 
                   firstPrediction;
      } else {
        rawValue = firstPrediction;
      }
    } else if (predictionData.prediction !== undefined) {
      rawValue = predictionData.prediction;
    } else if (Array.isArray(predictionData) && predictionData.length > 0) {
      rawValue = predictionData[0];
    } else if ('predictions' in predictionData && Array.isArray(predictionData.predictions)) {
      const firstPrediction = predictionData.predictions[0];
      if (typeof firstPrediction === 'object' && firstPrediction !== null) {
        rawValue = firstPrediction.predicted_underfunded_percent ?? 
                   firstPrediction.prediction ?? 
                   firstPrediction.value ?? 
                   firstPrediction;
      } else {
        rawValue = firstPrediction;
      }
    }
  } else if (typeof predictionData === 'number') {
    rawValue = predictionData;
  } else if (Array.isArray(predictionData) && predictionData.length > 0) {
    rawValue = predictionData[0];
  }

  console.log('[FRONTEND] [DatabricksPrediction] Extracted raw value:', rawValue);
  console.log('[FRONTEND] [DatabricksPrediction] Raw value type:', typeof rawValue);

  // Convert to number safely
  if (rawValue !== null && rawValue !== undefined) {
    if (typeof rawValue === 'number') {
      predictionValue = rawValue;
    } else if (typeof rawValue === 'string') {
      const parsed = parseFloat(rawValue);
      if (!isNaN(parsed)) {
        predictionValue = parsed;
      }
    } else if (typeof rawValue === 'object') {
      // Try to find a numeric value in the object
      const numericKeys = ['predicted_underfunded_percent', 'prediction', 'value', 'amount', 'funding', 'underfunded_percent'];
      for (const key of numericKeys) {
        if (key in rawValue && typeof rawValue[key] === 'number') {
          predictionValue = rawValue[key];
          break;
        }
      }
    }
  }

  console.log('[FRONTEND] [DatabricksPrediction] Final prediction value:', predictionValue);
  console.log('[FRONTEND] [DatabricksPrediction] Final value type:', typeof predictionValue);

  // Format the prediction value
  // Note: The value is "predicted_underfunded_percent" so it's a percentage, not a dollar amount
  const formatPrediction = (value: number | null): string => {
    if (value === null || value === undefined || isNaN(value)) {
      console.warn('[FRONTEND] [DatabricksPrediction] Invalid value for formatting:', value);
      return "N/A";
    }
    
    // Ensure value is a number
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(numValue)) {
      console.warn('[FRONTEND] [DatabricksPrediction] Could not convert to number:', value);
      return "N/A";
    }
    
    // Since it's "predicted_underfunded_percent", format as percentage
    return `${numValue.toFixed(2)}%`;
  };

  const formattedValue = formatPrediction(predictionValue);
  // For percentage, high is > 70%, medium is 40-70%, low is < 40%
  const isHigh = predictionValue !== null && predictionValue > 70;
  const isMedium = predictionValue !== null && predictionValue >= 40 && predictionValue <= 70;

  return (
    <div className="rounded-lg overflow-hidden border border-white/[0.07]" style={{ background: "rgba(8,13,30,0.72)" }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.05]">
        <p className="text-[9px] text-white/25 uppercase tracking-[0.2em] font-mono font-semibold">UNDERFUNDING PREDICTION · DATABRICKS AI</p>
        <span className={`text-[9px] font-mono ${
          isHigh ? "text-red-400" : isMedium ? "text-amber-400" : "text-emerald-400"
        }`}>
          {formattedValue}
        </span>
      </div>
      <div className="px-4 py-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Predicted Underfunding</span>
            <span className={`text-lg font-mono font-bold ${
              isHigh ? "text-red-400" : isMedium ? "text-amber-400" : "text-emerald-400"
            }`}>
              {formattedValue}
            </span>
          </div>
          {predictionValue !== null && (
            <div className="pt-2 border-t border-white/[0.05]">
              <p className="text-[9px] text-white/30 font-mono leading-relaxed">
                AI-powered prediction for Food Security underfunding percentage based on historical data and current crisis indicators. Higher percentages indicate greater funding gaps.
              </p>
            </div>
          )}
          {predictionValue === null && (
            <div className="pt-2 border-t border-white/[0.05]">
              <p className="text-[9px] text-white/30 font-mono leading-relaxed">
                Unable to parse prediction data. Raw response: {JSON.stringify(predictionData).substring(0, 100)}...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IntelligenceCard({ article, index }: { article: Article; index: number }) {
  const safeUrl = `https://news.google.com/search?q=${encodeURIComponent(`${article.title} ${article.summary}`)}`;
  const fallbackSeed = encodeURIComponent(article.title || article.imageQuery || article.source || `article-${index}`);
  const imgUrl = article.imageUrl || `https://picsum.photos/seed/${fallbackSeed}/800/450`;
  const open = () => { window.open(safeUrl, "_blank", "noopener,noreferrer"); };
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.1 + index * 0.08 }}
      onClick={open}
      className="group cursor-pointer rounded-lg border transition-colors"
      style={{ background: "rgba(8,13,30,0.72)", borderColor: "rgba(255,255,255,0.06)" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(34,211,238,0.22)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono font-bold text-white/20 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ background: "rgba(34,211,238,0.08)", color: "rgba(34,211,238,0.65)" }}>
            Google News
          </span>
        </div>
        <span className="text-white/18 text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">↗ open</span>
      </div>
      <div className="px-4 py-3">
        <img
          src={imgUrl}
          alt={article.title}
          className="mb-2.5 h-28 w-full rounded-md object-cover border border-white/10"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            const seeded = `https://picsum.photos/seed/${fallbackSeed}-fallback/800/450`;
            if (!el.src.includes("picsum.photos")) {
              el.src = seeded;
              return;
            }
            el.src = "https://placehold.co/800x450/020617/94a3b8?text=Google%20News";
          }}
        />
        <h3 className="text-white/90 font-semibold text-[12px] leading-snug tracking-tight mb-1.5 group-hover:text-white transition-colors">
          {article.title}
        </h3>
        <p className="text-white/35 text-[11px] leading-relaxed">{article.summary}</p>
      </div>
    </motion.div>
  );
}

// ─── Solution cache to avoid redundant API calls ──────────────────────────
const SOLUTION_CACHE = new Map<string, {analogousCountry: string; solution: string; likelihood: number}>();
const CRISIS_CACHE = new Map<string, { hasCrisis: boolean; articles: any[]; ts: number }>();
const FUNDING_CACHE = new Map<string, { data: Record<string, number>; ts: number }>();

const CRISIS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const FUNDING_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Detect if a country has an active crisis ────────────────────────────
async function detectCrisisInCountry(country: string): Promise<{ hasCrisis: boolean; articles: any[] }> {
  const cacheKey = country.toLowerCase();
  const cached = CRISIS_CACHE.get(cacheKey);
  
  if (cached && Date.now() - cached.ts < CRISIS_CACHE_TTL) {
    console.log(`[FRONTEND] [Crisis] Using cached crisis data for ${country}`);
    return { hasCrisis: cached.hasCrisis, articles: cached.articles };
  }
  
  console.log(`[FRONTEND] [Crisis] Detecting crisis for ${country}`);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/detect-crisis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country }),
    });
    
    if (!response.ok) {
      console.error(`[FRONTEND] [Crisis] Failed to detect crisis for ${country}`);
      return { hasCrisis: false, articles: [] };
    }
    
    const data = await response.json();
    const result = {
      hasCrisis: data.hasCrisis ?? false,
      articles: data.articles ?? [],
    };
    
    CRISIS_CACHE.set(cacheKey, { ...result, ts: Date.now() });
    console.log(`[FRONTEND] [Crisis] Crisis detection for ${country}: hasCrisis=${result.hasCrisis}`);
    return result;
  } catch (error) {
    console.error(`[FRONTEND] [Crisis] Error detecting crisis for ${country}:`, error);
    return { hasCrisis: false, articles: [] };
  }
}

// ─── Classify articles into a crisis category ────────────────────────────
async function classifyArticlesIntoCrisis(country: string, articles: any[]): Promise<string> {
  if (!articles || articles.length === 0) return 'Health';
  
  console.log(`[FRONTEND] [Classify] Classifying articles for ${country}`);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/classify-crisis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, articles }),
    });
    
    if (!response.ok) {
      console.error(`[FRONTEND] [Classify] Failed to classify crisis for ${country}`);
      return 'Health';
    }
    
    const data = await response.json();
    const category = data.primary_category ?? 'Health';
    
    console.log(`[FRONTEND] [Classify] Classified ${country} crisis as: ${category}`);
    return category;
  } catch (error) {
    console.error(`[FRONTEND] [Classify] Error classifying crisis for ${country}:`, error);
    return 'Health';
  }
}

// ─── Fetch previous year funding baseline ─────────────────────────────────
async function fetchPreviousYearFunding(country: string): Promise<Record<string, number>> {
  const cacheKey = country.toLowerCase();
  const cached = FUNDING_CACHE.get(cacheKey);
  
  if (cached && Date.now() - cached.ts < FUNDING_CACHE_TTL) {
    console.log(`[FRONTEND] [Funding] Using cached funding data for ${country}`);
    return cached.data;
  }
  
  console.log(`[FRONTEND] [Funding] Fetching previous year funding for ${country}`);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/previous-year-funding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country }),
    });
    
    if (!response.ok) {
      console.error(`[FRONTEND] [Funding] Failed to fetch funding for ${country}`);
      // Return minimal fallback
      return { "Food Security": 0, "Wellbeing": 0, "Support": 0, "Shelter": 0, "Protection": 0 };
    }
    
    const data = await response.json();
    const result = {
      "Food Security": data["Food Security"] ?? 0,
      "Wellbeing": data["Wellbeing"] ?? 0,
      "Support": data["Support"] ?? 0,
      "Shelter": data["Shelter"] ?? 0,
      "Protection": data["Protection"] ?? 0,
      total: data.total ?? 0,
    };
    
    FUNDING_CACHE.set(cacheKey, { data: result, ts: Date.now() });
    console.log(`[FRONTEND] [Funding] Previous year funding for ${country}: $${(result.total / 1e9).toFixed(2)}B`);
    return result;
  } catch (error) {
    console.error(`[FRONTEND] [Funding] Error fetching funding for ${country}:`, error);
    return { WASH: 0, Health: 0, Nutrition: 0, Protection: 0, Education: 0 };
  }
}

// ─── Fetch UN Solution for a category ────────────────────────────────────
async function fetchUNSolution(country: string, category: string): Promise<{analogousCountry: string; solution: string; likelihood: number}> {
  const cacheKey = `${country}:${category}`;
  
  // Check cache first
  if (SOLUTION_CACHE.has(cacheKey)) {
    console.log(`[FRONTEND] [Solution] Using cached solution for ${country} - ${category}`);
    return SOLUTION_CACHE.get(cacheKey)!;
  }
  
  console.log(`[FRONTEND] [Solution] Fetching UN solution for ${country} - ${category}`);

  const MAX_RETRIES = 5;
  let baseDelay = 2000; // Start with 2 second delay

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Add significant delay before request
      const delayMs = baseDelay + (attempt * 1000); // 2s, 3s, 4s, 5s, 6s
      if (attempt > 0) {
        console.log(`[FRONTEND] [Solution] Retry ${attempt}/${MAX_RETRIES} for ${category}, waiting ${delayMs}ms`);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));

      // Call backend endpoint which uses Groq
      const response = await fetch(`${BACKEND_URL}/api/un-solution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country: country,
          category: category,
        }),
      });

      if (response.status === 429) {
        // Rate limited - retry with longer delays
        if (attempt < MAX_RETRIES - 1) {
          console.warn(`[FRONTEND] [Solution] Rate limited (429) for ${category}, will retry with longer delay`);
          continue;
        } else {
          console.error(`[FRONTEND] [Solution] Rate limited after ${MAX_RETRIES} retries`);
          const fallback = { analogousCountry: 'Lebanon', solution: 'UNHCR Displacement Response', likelihood: 75 };
          SOLUTION_CACHE.set(cacheKey, fallback);
          return fallback;
        }
      }

      if (!response.ok) {
        console.error(`[FRONTEND] [Solution] Backend error: ${response.status}`);
        const errorData = await response.json().catch(() => ({}));
        console.error('[FRONTEND] [Solution] Error details:', errorData);
        
        // Use sensible default instead of empty
        const fallback = { analogousCountry: 'Similar Crisis Region', solution: 'UN Standard Response', likelihood: 65 };
        SOLUTION_CACHE.set(cacheKey, fallback);
        return fallback;
      }

      const data = await response.json();
      console.log(`[FRONTEND] [Solution] ${category} result:`, data);
      
      const result = {
        analogousCountry: data.analogous_country || 'Unknown',
        solution: data.solution || 'UN Humanitarian Response',
        likelihood: Math.max(0, Math.min(100, data.likelihood || 0)),
      };
      
      SOLUTION_CACHE.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`[FRONTEND] [Solution] Error fetching solution for ${category} (attempt ${attempt + 1}):`, error);
      
      if (attempt === MAX_RETRIES - 1) {
        // Final fallback
        const fallback = { analogousCountry: 'Similar Region', solution: 'Emergency Response Program', likelihood: 60 };
        SOLUTION_CACHE.set(cacheKey, fallback);
        return fallback;
      }
    }
  }

  const fallback = { analogousCountry: 'Unknown', solution: 'Unable to fetch solution', likelihood: 0 };
  SOLUTION_CACHE.set(cacheKey, fallback);
  return fallback;
}

// ─── Fetch all category predictions from backend ─────────────────────────
async function fetchAllCategoryPredictions(country: string): Promise<{categoryResults: Record<string, number>; underfundingPct: number}> {
  const categories = ["WASH", "Health", "Nutrition", "Protection", "Education"];
  const categoryResults: Record<string, number> = {};
  const currentYear = new Date().getFullYear();

  console.log('[FRONTEND] [Categories] Starting prediction fetch for all 5 categories:', country);

  try {
    // Fetch predictions for all 5 categories in parallel
    const promises = categories.map(async (category) => {
      const payload = {
        dataframe_records: [
          {
            country: country,
            category: category,
            year: currentYear
          }
        ]
      };

      try {
        const res = await fetch(`${BACKEND_URL}/api/databricks/predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          console.warn(`[FRONTEND] [Categories] Failed to fetch ${category}: ${res.status}`);
          return { category, value: 0 };
        }

        const result = await res.json();
        console.log(`[FRONTEND] [Categories] Full ${category} response:`, JSON.stringify(result, null, 2));
        
        // Extract underfunding percentage - try multiple possible field names
        let value = 0;
        if (typeof result.predictions === 'object' && result.predictions[0]) {
          // If it's an array of predictions
          value = parseFloat(result.predictions[0].underfunding_percentage) || 
                  parseFloat(result.predictions[0].predicted_underfunding) || 0;
        } else if (result.predictions) {
          // If predictions is a single value
          value = parseFloat(result.predictions) || 0;
        } else if (result.underfunding_percentage !== undefined) {
          value = parseFloat(result.underfunding_percentage) || 0;
        } else if (result.predicted_underfunding !== undefined) {
          value = parseFloat(result.predicted_underfunding) || 0;
        } else if (result.result && typeof result.result === 'object') {
          // Try nested result object
          value = parseFloat(result.result.underfunding_percentage) || 
                  parseFloat(result.result.predicted_underfunding) || 0;
        }
        
        console.log(`[FRONTEND] [Categories] ${category} extracted value:`, value);
        return { category, value: Math.max(0, Math.min(100, value)) }; // Clamp to 0-100
      } catch (error) {
        console.error(`[FRONTEND] [Categories] Error fetching ${category}:`, error);
        return { category, value: 0 };
      }
    });

    const results = await Promise.all(promises);
    results.forEach(({ category, value }) => {
      categoryResults[category] = value;
    });

    // Calculate average underfunding percentage (sum of all categories divided by 5)
    const totalUnderfunding = Object.values(categoryResults).reduce((a, b) => a + b, 0);
    const underfundingPct = totalUnderfunding / categories.length;

    console.log('[FRONTEND] [Categories] All results:', categoryResults);
    console.log('[FRONTEND] [Categories] Average underfunding:', underfundingPct);

    // If all values are 0, use a synthetic variance based on country (fallback)
    if (underfundingPct === 0) {
      console.warn('[FRONTEND] [Categories] All category values are 0, using synthetic distribution');
      const seed = hashSeed(country);
      const baseUnderfunding = 30 + (seed % 50); // 30-80%
      categories.forEach((cat, idx) => {
        const variance = ((seed >> (idx * 2)) % 20) - 10; // -10 to +10
        categoryResults[cat] = Math.max(10, Math.min(95, baseUnderfunding + variance));
      });
      const totalSynthetic = Object.values(categoryResults).reduce((a, b) => a + b, 0);
      const syntheticAvg = totalSynthetic / categories.length;
      console.log('[FRONTEND] [Categories] Synthetic results:', categoryResults, 'Average:', syntheticAvg);
      return { categoryResults, underfundingPct: syntheticAvg };
    }

    return { categoryResults, underfundingPct };
  } catch (error) {
    console.error('[FRONTEND] [Categories] Failed to fetch all categories:', error);
    return { categoryResults: {}, underfundingPct: 0 };
  }
}

// ─── AID TAB ───────────────────────────────────────────────────────────────
function ContextExplain({
  country, kind, target,
}: { country: string; kind: "sector" | "organization" | "solution"; target: string }) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const onMore = async () => {
    setOpen(v => !v);
    if (text || loading) return;
    setLoading(true);
    try {
      const t = await fetchGroqContext(country, target, kind);
      setText(t);
    } catch {
      setText("Could not fetch context right now. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={onMore}
        className="text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded border border-cyan-400/25 text-cyan-300/80 hover:bg-cyan-400/10 transition-colors"
      >
        Give More Context
      </button>
      {open && (
        <div className="mt-2 rounded-md border border-white/10 bg-slate-900/50 backdrop-blur-xl px-2.5 py-2">
          <p className="text-[10px] text-white/70 leading-relaxed whitespace-pre-wrap font-mono">
            {loading ? "Generating context..." : text}
          </p>
        </div>
      )}
    </div>
  );
}

function FundingBeastModule({ country, state }: { country: string; state?: string }) {
  const [mitigation, setMitigation] = useState<MitigationFundingData | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [hasCrisis, setHasCrisis] = useState(false);
  const [crisisArticles, setCrisisArticles] = useState<any[]>([]);
  const [fundingByCategory, setFundingByCategory] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    setCategoryLoading(true);

    const fetchAndBuildMitigation = async () => {
      try {
        // Step 1: Detect if country has an active crisis
        console.log(`[FRONTEND] [FundingBeast] Starting crisis detection for ${country}`);
        const crisisResult = await detectCrisisInCountry(country);
        
        if (cancelled) return;

        setHasCrisis(crisisResult.hasCrisis);
        setCrisisArticles(crisisResult.articles || []);

        if (crisisResult.hasCrisis && crisisResult.articles.length > 0) {
          // ──── CRISIS PATH: Classify crisis and fetch underfunding predictions ────
          console.log(`[FRONTEND] [FundingBeast] Crisis detected in ${country}. Classifying into category...`);
          
          const crisisCategory = await classifyArticlesIntoCrisis(country, crisisResult.articles);
          
          if (cancelled) return;

          // Now fetch underfunding predictions for all categories
          console.log(`[FRONTEND] [FundingBeast] Fetching underfunding predictions for ${country}`);
          const { categoryResults, underfundingPct } = await fetchAllCategoryPredictions(country);

          if (cancelled) return;

          // Build mitigation data for this crisis
          const seed = hashSeed(`${country}::${state ?? "country"}`);
          const totalGoal = 2_000_000_000 + (seed % 9) * 100_000_000; // 2.0B - 2.8B
          const currentFundingRatio = Math.max(0.35, Math.min(0.9, 1 - (underfundingPct / 100)));
          const currentFunding = Math.round(totalGoal * currentFundingRatio);

          const templates: Array<{
            name: MitigationCategory["name"];
            needRatio: number;
            recvRatio: number;
            impactScore: number;
            originPlan: string;
          }> = [
            { name: "WASH",       needRatio: 0.26, recvRatio: 0.43, impactScore: 82, originPlan: "UN OCHA" },
            { name: "Health",     needRatio: 0.24, recvRatio: 0.48, impactScore: 88, originPlan: "WHO" },
            { name: "Nutrition",  needRatio: 0.18, recvRatio: 0.39, impactScore: 79, originPlan: "UNICEF" },
            { name: "Protection", needRatio: 0.16, recvRatio: 0.34, impactScore: 84, originPlan: "Red Cross" },
            { name: "Education",  needRatio: 0.16, recvRatio: 0.37, impactScore: 73, originPlan: "Save the Children" },
          ];

          let categories = templates.map((t) => {
            const categoryUnderfunding = categoryResults[t.name] || underfundingPct;
            const underfundingMultiplier = 1 + (categoryUnderfunding / 100);
            const needAmount = Math.round(totalGoal * t.needRatio * underfundingMultiplier);
            const receivedAmount = Math.round(needAmount * t.recvRatio);
            const gapRatio = Math.max(0, (needAmount - receivedAmount) / Math.max(needAmount, 1));
            const successIfFunded = Math.round(Math.min(96, t.impactScore + gapRatio * 14));

            console.log(`[FRONTEND] [FundingBeast] [CRISIS] ${t.name}: underfunding=${categoryUnderfunding}%, need=${needAmount}`);

            return {
              name: t.name,
              needAmount,
              receivedAmount,
              impactScore: t.impactScore,
              originPlan: t.originPlan,
              successIfFunded,
              underfundingPct: categoryUnderfunding,
            } satisfies MitigationCategory;
          });

          // Sort by underfunding and get top 3
          const topThree = categories
            .sort((a, b) => (b.underfundingPct || 0) - (a.underfundingPct || 0))
            .slice(0, 3);

          // Fetch UN solutions for top 3 categories (sequentially)
          console.log('[FRONTEND] [FundingBeast] [CRISIS] Fetching UN solutions for top 3 categories:', topThree.map(c => c.name));
          const solutionResults = [];
          for (let i = 0; i < topThree.length; i++) {
            const cat = topThree[i];
            if (i > 0) {
              console.log(`[FRONTEND] [FundingBeast] [CRISIS] Waiting 4s before fetching solution ${i + 1}/3...`);
              await new Promise(resolve => setTimeout(resolve, 4000));
            }
            console.log(`[FRONTEND] [FundingBeast] [CRISIS] Fetching solution ${i + 1}/3 for ${cat.name}...`);
            const solution = await fetchUNSolution(country, cat.name);
            solutionResults.push({ categoryName: cat.name, solution });
          }

          if (cancelled) return;

          // Update categories with solution data
          const solutionMap = new Map(solutionResults.map(r => [r.categoryName, r.solution]));
          categories = categories.map(cat => {
            const solutionData = solutionMap.get(cat.name);
            if (solutionData) {
              return {
                ...cat,
                analogousCountry: solutionData.analogousCountry,
                solution: solutionData.solution,
                successIfFunded: solutionData.likelihood,
              };
            }
            return cat;
          });

          const result: MitigationFundingData = {
            totalGoal,
            currentFunding,
            categories,
          };

          if (!cancelled) {
            setMitigation(result);
          }
        } else {
          // ──── NO CRISIS PATH: Show previous year funding baseline ────
          console.log(`[FRONTEND] [FundingBeast] No crisis detected in ${country}. Fetching baseline funding...`);
          
          const fundingData = await fetchPreviousYearFunding(country);
          
          if (cancelled) return;

          setFundingByCategory(fundingData);
          
          // Still create a minimal mitigation object showing baseline (all zeroed except what's already received)
          const baselineMitigation: MitigationFundingData = {
            totalGoal: fundingData.total || 2_000_000_000,
            currentFunding: fundingData.total || 2_000_000_000,
            categories: [
              { 
                name: "Food Security", 
                needAmount: fundingData["Food Security"] || 0, 
                receivedAmount: fundingData["Food Security"] || 0,
                underfundingPct: 0,
                impactScore: 0,
                originPlan: "",
                successIfFunded: 0
              },
              { 
                name: "Wellbeing", 
                needAmount: fundingData["Wellbeing"] || 0, 
                receivedAmount: fundingData["Wellbeing"] || 0,
                underfundingPct: 0,
                impactScore: 0,
                originPlan: "",
                successIfFunded: 0
              },
              { 
                name: "Support", 
                needAmount: fundingData["Support"] || 0, 
                receivedAmount: fundingData["Support"] || 0,
                underfundingPct: 0,
                impactScore: 0,
                originPlan: "",
                successIfFunded: 0
              },
              { 
                name: "Shelter", 
                needAmount: fundingData["Shelter"] || 0, 
                receivedAmount: fundingData["Shelter"] || 0,
                underfundingPct: 0,
                impactScore: 0,
                originPlan: "",
                successIfFunded: 0
              },
              { 
                name: "Protection", 
                needAmount: fundingData["Protection"] || 0, 
                receivedAmount: fundingData["Protection"] || 0,
                underfundingPct: 0,
                impactScore: 0,
                originPlan: "",
                successIfFunded: 0
              },
            ],
          };

          if (!cancelled) {
            setMitigation(baselineMitigation);
            console.log(`[FRONTEND] [FundingBeast] [NO CRISIS] Baseline funding for ${country}: $${(fundingData.total / 1e9).toFixed(2)}B`);
          }
        }
      } catch (error) {
        console.error('[FRONTEND] [FundingBeast] Error building mitigation data:', error);
        // Fallback to mock data
        if (!cancelled) {
          setMitigation(buildMitigationMock(country, state));
        }
      } finally {
        if (!cancelled) {
          setCategoryLoading(false);
        }
      }

    };

    fetchAndBuildMitigation();
    return () => { cancelled = true; };
  }, [country, state]);

  // Use fetched data or fallback to mock
  const currentMitigation = mitigation ?? buildMitigationMock(country, state);
  const animKey = `${country}::${state ?? "country"}`;

  const totalGoal = currentMitigation.totalGoal;
  const currentFunding = Math.min(currentMitigation.currentFunding, totalGoal);
  const predictedNeeded = Math.max(0, totalGoal - currentFunding);

  const receivedPct = Math.max(0, Math.min(100, (currentFunding / Math.max(totalGoal, 1)) * 100));
  const predictedPct = Math.max(0, Math.min(100 - receivedPct, (predictedNeeded / Math.max(totalGoal, 1)) * 100));

  const shownReceived = useCountUp(currentFunding, `${animKey}-received`);
  const shownPredicted = useCountUp(predictedNeeded, `${animKey}-predicted`);

  const ranked = currentMitigation.categories
    .map(cat => {
      const fundingGap = Math.max(0, cat.needAmount - cat.receivedAmount);
      const gapRatio = fundingGap / Math.max(cat.needAmount, 1);
      return { ...cat, fundingGap, gapRatio };
    })
    .sort((a, b) => (b.underfundingPct || 0) - (a.underfundingPct || 0))
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 backdrop-blur-xl p-4 space-y-3">
      {hasCrisis ? (
        // ──── CRISIS MODE ────
        <>
          <div className="flex items-center justify-between">
            <p className="text-[9px] text-red-400 uppercase tracking-[0.2em] font-mono font-semibold">
              🚨 Active Crisis Detected {categoryLoading && <span className="text-red-500 animate-pulse">●</span>}
            </p>
            <span className="text-[9px] font-mono text-white/35">Goal {formatMoneyCompact(mitigation?.totalGoal || 0)}</span>
          </div>

          {crisisArticles.length > 0 && (
            <div className="space-y-2 bg-red-950/20 border border-red-400/20 rounded-lg p-3">
              <p className="text-[9px] text-red-300 uppercase tracking-[0.2em] font-mono font-semibold">
                Crisis Articles
              </p>
              {crisisArticles.slice(0, 3).map((article, idx) => (
                <div key={idx} className="text-[9px] text-red-100/80 border-l border-red-400/30 pl-2">
                  <p className="font-semibold">{article.title || article.source || `Article ${idx + 1}`}</p>
                  {article.summary && <p className="text-red-100/60 text-[8px] mt-1">{article.summary}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="relative h-3 w-full rounded-full overflow-hidden border border-white/10 bg-black/45">
              <motion.div
                className="absolute left-0 top-0 h-full"
                style={{ background: "#22d3ee", boxShadow: "0 0 10px rgba(34,211,238,0.45)" }}
                initial={{ width: 0 }}
                animate={{ width: `${(mitigation?.currentFunding || 0) / Math.max(mitigation?.totalGoal || 1, 1) * 100}%` }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
              />
              <motion.div
                className="absolute top-0 h-full"
                style={{
                  left: `${(mitigation?.currentFunding || 0) / Math.max(mitigation?.totalGoal || 1, 1) * 100}%`,
                  background:
                    "repeating-linear-gradient(135deg, rgba(239,68,68,0.92) 0, rgba(239,68,68,0.92) 5px, rgba(239,68,68,0.58) 5px, rgba(239,68,68,0.58) 10px)",
                }}
                initial={{ width: 0, opacity: 0.5 }}
                animate={{ width: `${Math.max(0, 100 - (mitigation?.currentFunding || 0) / Math.max(mitigation?.totalGoal || 1, 1) * 100)}%`, opacity: [0.45, 0.95, 0.45] }}
                transition={{
                  width: { type: "spring", stiffness: 210, damping: 24 },
                  opacity: { repeat: Infinity, duration: 1.4, ease: "easeInOut" },
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-[9px] font-mono uppercase tracking-wider">
              <div>
                <p className="text-cyan-300/85">Received</p>
                <p className="text-white/85 text-[11px] normal-case">{formatMoneyCompact(mitigation?.currentFunding || 0)}</p>
              </div>
              <div>
                <p className="text-red-400/85">Crisis Need</p>
                <p className="text-white/85 text-[11px] normal-case">{formatMoneyCompact(mitigation?.totalGoal || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-white/45">Underfunding Gap</p>
                <p className="text-white text-[11px] normal-case">
                  {Math.round(((mitigation?.totalGoal || 0) - (mitigation?.currentFunding || 0)) / Math.max(mitigation?.totalGoal || 1, 1) * 100)}%
                </p>
              </div>
            </div>
          </div>

          <div className="pt-1 border-t border-white/10 space-y-2">
            <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-mono font-semibold">
              Top Underfunded Sectors
            </p>
            {(mitigation?.categories || [])
              .sort((a, b) => (b.underfundingPct || 0) - (a.underfundingPct || 0))
              .slice(0, 3)
              .map((sector, idx) => (
                <div
                  key={sector.name}
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2"
                  style={{
                    boxShadow: idx === 0 ? "0 0 0 1px rgba(239,68,68,0.35) inset" : "none",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-[11px] font-mono font-bold text-white">{sector.name}</p>
                      {sector.analogousCountry ? (
                        <p className="text-[9px] font-mono text-cyan-400/70">Analogous: {sector.analogousCountry}</p>
                      ) : (
                        <p className="text-[9px] font-mono text-white/35">Origin of Plan · {sector.originPlan}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-red-400">
                      {sector.underfundingPct?.toFixed(1) || "0"}% gap
                    </span>
                  </div>
                  
                  {sector.solution && (
                    <div className="mt-2 rounded-md bg-cyan-900/20 border border-cyan-500/20 px-2 py-1.5">
                      <p className="text-[8px] text-cyan-300/80 font-mono uppercase tracking-wider mb-1">UN Solution</p>
                      <p className="text-[9px] font-mono text-cyan-100/90 leading-snug">{sector.solution}</p>
                    </div>
                  )}
                  
                  <div className="mt-2 flex items-center justify-between text-[9px] font-mono">
                    <span className="text-white/40">Success if Funded</span>
                    <span className="text-cyan-300 font-bold">{sector.successIfFunded}%</span>
                  </div>
                  <ContextExplain country={state ?? country} kind="solution" target={`${sector.name} Plan`} />
                </div>
              ))}
          </div>
        </>
      ) : (
        // ──── NO CRISIS MODE ────
        <>
          <div className="flex items-center justify-between">
            <p className="text-[9px] text-cyan-400 uppercase tracking-[0.2em] font-mono font-semibold">
              ✓ Baseline Funding (No Active Crisis) {categoryLoading && <span className="text-cyan-400 animate-pulse">●</span>}
            </p>
            <span className="text-[9px] font-mono text-white/35">
              FY2025 Total {formatMoneyCompact(fundingByCategory.total || 0)}
            </span>
          </div>

          {Object.keys(fundingByCategory).length > 0 && (
            <div className="space-y-3">
              <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-mono">
                Funding by Category
              </p>
              <div className="space-y-2">
                {["Food Security", "Wellbeing", "Support", "Shelter", "Protection"].map((category) => {
                  const value = fundingByCategory[category] || 0;
                  const total = fundingByCategory.total || 1;
                  const pct = total > 0 ? (value / total) * 100 : 0;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-[9px]">
                        <p className="font-mono text-white/70">{category}</p>
                        <p className="font-mono text-cyan-300">
                          {formatMoneyCompact(value)} ({pct.toFixed(1)}%)
                        </p>
                      </div>
                      <div className="relative h-2 w-full rounded-full overflow-hidden border border-white/10 bg-black/45">
                        <motion.div
                          className="absolute left-0 top-0 h-full"
                          style={{ background: "#22d3ee", boxShadow: "0 0 8px rgba(34,211,238,0.35)" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ type: "spring", stiffness: 220, damping: 26 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-white/10">
            <p className="text-[10px] text-cyan-300/80 font-mono leading-relaxed">
              No active humanitarian crisis detected in {country}. Showing previous year funding baseline for continued support in key sectors.
            </p>
          </div>
        </>
      )}
    </div>
  );

}

function SectorStatus({ sectors, country }: { sectors: SectorData; country: string }) {
  const items = [
    { key: "food",   abbr: "FOOD", d: sectors.food   },
    { key: "water",  abbr: "H₂O",  d: sectors.water  },
    { key: "health", abbr: "MED",  d: sectors.health },
  ] as const;
  return (
    <div>
      <p className="text-[9px] text-white/22 uppercase tracking-[0.2em] font-mono font-semibold mb-2.5">Sector Gap Analysis</p>
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ key, abbr, d }) => {
          const pct      = Math.round(d.gapScore * 100);
          const critical = pct > 70;
          const elevated = pct > 40;
          const accent   = critical ? "#f87171" : elevated ? "#fb923c" : "#34d399";
          const status   = critical ? "CRITICAL" : elevated ? "ELEVATED" : "STABLE";
          return (
            <div key={key} className="flex flex-col rounded-lg border overflow-hidden"
              style={{ background: "rgba(8,13,30,0.72)", borderColor: critical ? "rgba(248,113,113,0.20)" : "rgba(255,255,255,0.06)" }}>
              <div className="h-[2px] w-full" style={{ background: accent, opacity: 0.75 }} />
              <div className="px-2.5 py-3 flex flex-col gap-0.5">
                <p className="text-[9px] text-white/28 font-mono uppercase tracking-widest">{abbr}</p>
                <p className="text-white font-bold text-[24px] font-mono leading-none tabular-nums mt-0.5">{pct}</p>
                <p className="text-white/20 text-[8px] font-mono">%</p>
                <p className="text-[8px] font-mono font-bold mt-1.5 uppercase tracking-wide" style={{ color: accent }}>{status}</p>
                <p className="text-white/20 text-[8px] leading-tight mt-0.5">{d.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const AID_STATUS_COLORS: Record<string, string> = {
  "Active":    "#34d399",
  "Scaling":   "#22d3ee",
  "Limited":   "#fb923c",
  "Withdrawn": "#f87171",
};

function AidOrgRow({ org, index }: { org: AidOrg; index: number }) {
  const color     = AID_STATUS_COLORS[org.status] ?? "#94a3b8";
  const fundColor = org.fundingPct > 70 ? "#34d399" : org.fundingPct > 40 ? "#fb923c" : "#f87171";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      transition={{ type: "spring", stiffness: 300, damping: 22, delay: index * 0.09 }}
      className="rounded-lg border border-white/[0.06] px-4 py-3"
      style={{ background: "rgba(8,13,30,0.72)" }}
    >
      <div className="flex items-start justify-between mb-2.5">
        <div>
          <p className="text-white/85 font-mono font-bold text-[13px]">{org.name}</p>
          <p className="text-white/30 text-[10px] mt-0.5 leading-snug">{org.focus}</p>
          <a
            href={orgWebsite(org.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mt-2 rounded-md border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider text-cyan-300/80 hover:bg-cyan-500/20 hover:text-cyan-200 transition-colors"
          >
            More Info ↗
          </a>
        </div>
        <span className="text-[8px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded shrink-0 ml-2"
          style={{ background: `${color}18`, color, border: `1px solid ${color}28` }}>
          {org.status}
        </span>
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-white/20 text-[9px] font-mono uppercase tracking-wider">FUNDING TARGET</span>
          <span className="font-mono text-[10px] font-bold" style={{ color: fundColor }}>{org.fundingPct}%</span>
        </div>
        <div className="h-[2px] rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
          <motion.div className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${org.fundingPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 + index * 0.08 }}
            style={{ background: fundColor, boxShadow: `0 0 5px ${fundColor}55` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── SOCIAL TAB ────────────────────────────────────────────────────────────
function SocialCard({ post, index, country }: { post: SocialPost; index: number; country: string }) {
  const context = inferAidContext(post);
  const twitterSearch = `https://x.com/search?q=${encodeURIComponent(`${country} ${context}`)}&src=typed_query`;
  const initial       = post.creator.replace("@", "")[0]?.toUpperCase() ?? "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.93 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      transition={{ type: "spring", stiffness: 300, damping: 22, delay: index * 0.09 }}
      className="rounded-lg border border-white/[0.07] overflow-hidden"
      style={{ background: "rgba(8,13,30,0.72)" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #ff2d55 0%, #22d3ee 100%)" }}>
            {initial}
          </div>
          <div>
            <p className="text-white/80 text-[11px] font-mono font-semibold leading-none">{post.creator}</p>
            <p className="text-white/20 text-[8px] font-mono mt-0.5 uppercase tracking-wide">Twitter/X Source</p>
          </div>
        </div>
        {/* X mark */}
        <div className="flex items-center gap-1 px-2 py-1 rounded"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-[8px] font-mono text-white/30">X</span>
        </div>
      </div>

      {/* Caption */}
      <div className="px-4 py-3">
        <p className="text-cyan-300/70 text-[9px] font-mono uppercase tracking-[0.14em] mb-2">{context}</p>
        <p className="text-white/72 text-[12px] leading-relaxed mb-2.5">{post.caption}</p>

        {/* Hashtags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.hashtags.map(h => (
            <a key={h} href={`https://x.com/search?q=${encodeURIComponent(`${country} ${context}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-mono transition-opacity hover:opacity-100"
              style={{ color: "rgba(34,211,238,0.7)" }}>
              {h}
            </a>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.05]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-white/25">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <span className="text-white/40 text-[10px] font-mono">{post.views}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-white/25">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span className="text-white/40 text-[10px] font-mono">{post.likes}</span>
            </div>
          </div>
          <a href={twitterSearch} target="_blank" rel="noopener noreferrer"
            className="text-[9px] font-mono px-2.5 py-1 rounded transition-all hover:opacity-90"
            style={{ background: "rgba(34,211,238,0.08)", color: "rgba(34,211,238,0.7)", border: "1px solid rgba(34,211,238,0.15)" }}>
            ↗ open
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function SocialAwarenessNote({ country }: { country: string }) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg mb-4"
      style={{ background: "rgba(34,211,238,0.04)", border: "1px solid rgba(34,211,238,0.10)" }}>
      <div className="w-1 h-1 rounded-full mt-1.5 shrink-0 animate-pulse" style={{ background: "rgba(34,211,238,0.6)" }} />
      <p className="text-[10px] font-mono leading-relaxed" style={{ color: "rgba(34,211,238,0.45)" }}>
        SOCIAL PULSE — Context-specific videos for {country} across 5 frameworks: Food & Livelihoods, Health & Wellbeing, Protection & Safety, Shelter & Essential Services, and Operations & Support.
      </p>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-white/6 overflow-hidden" style={{ background: "rgba(15,20,40,0.55)" }}>
        <div className="px-4 pt-3 pb-2 border-b border-white/6"><div className="h-2 w-32 rounded bg-white/8 animate-pulse" /></div>
        <div className="grid grid-cols-2 divide-x divide-y divide-white/6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-4 py-4 space-y-2">
              <div className="h-2 w-14 rounded bg-white/6 animate-pulse" />
              <div className="h-7 w-16 rounded bg-white/8 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-lg border border-white/6 h-20 animate-pulse"
          style={{ background: "rgba(15,20,40,0.55)", animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export function IntelligenceDossier({ country, crisis, state, onClose }: DossierProps) {
  const [data,        setData]        = useState<DossierData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [realWeather, setRealWeather] = useState<WeatherData | null>(null);
  const [activeTab,   setActiveTab]   = useState<TabId>("overview");
  const [databricksData, setDatabricksData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null); setError(null); setLoading(true);
    setRealWeather(null); setActiveTab("overview");
    setDatabricksData(null);

    // Fetch dossier data
    fetchDossier(country, state)
      .then(d  => { if (!cancelled) setData(d); })
      .catch(e  => { if (!cancelled) setError(e.message ?? "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    // Fetch Databricks prediction
    fetchDatabricksPrediction(country)
      .then(result => { if (!cancelled) setDatabricksData(result); })
      .catch(err => { console.warn('[FRONTEND] [Databricks] Failed to fetch prediction:', err); });

    // Fetch weather data
    const locationQuery = state ? `${state}, ${country}` : country;
    fetchGoogleWeather(locationQuery)
      .then(w => {
        if (cancelled) return;
        if (w) {
          setRealWeather(w);
          return;
        }
        return fetchRealWeather(locationQuery).then(fallback => {
          if (!cancelled && fallback) setRealWeather(fallback);
        });
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [country, state]);

  const weatherToShow = realWeather ?? data?.weather ?? null;

  return (
    <motion.div
      key={country}
      initial={{ x: "100%", filter: "blur(18px)", opacity: 0 }}
      animate={{ x: 0,      filter: "blur(0px)",  opacity: 1 }}
      exit={{   x: "100%", filter: "blur(12px)", opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="fixed top-0 right-0 h-screen w-[94vw] sm:w-[460px] lg:w-[540px] z-50 flex flex-col border-l border-white/[0.07] overflow-hidden"
      style={{
        background:           "rgba(2,6,20,0.92)",
        backdropFilter:       "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
      }}
    >
      {/* ── Header ── */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-start justify-between mb-3">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded"
            style={{ background: "rgba(34,211,238,0.07)", border: "1px solid rgba(34,211,238,0.18)" }}>
            <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: "rgba(34,211,238,0.60)" }}>
              AEGIS
            </span>
          </div>
          <button onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-white/25 hover:text-white hover:bg-white/[0.06] transition-all text-sm">
            ✕
          </button>
        </div>

        <div>
          <p className="text-[9px] text-white/20 font-mono uppercase tracking-[0.2em] mb-1">
            {state ? "Admin-1 · Regional" : "Country Intelligence"}
          </p>
          <h2 className="text-white font-bold text-[22px] leading-tight tracking-tight font-mono">
            {state ?? country}
          </h2>
          <p className="text-white/35 text-[11px] font-mono mt-0.5 uppercase tracking-wider">
            Country · {country}
          </p>
        </div>

      </div>

      {/* ── Tab bar ── */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto px-5 py-5
                      [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.07)_transparent]">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Skeleton />
            </motion.div>
          ) : error ? (
            <motion.p key="err" className="text-red-400/70 text-xs font-mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              ⚠ {error}
            </motion.p>
          ) : data ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: -10, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="space-y-4"
            >

              {/* ── OVERVIEW ── */}
              {activeTab === "overview" && (
                <>
                  <Reveal delay={0.0}>
                    <WeatherTactical
                      w={weatherToShow ?? data.weather}
                      country={state ?? country}
                      isLive={realWeather !== null}
                    />
                  </Reveal>
                  <Reveal delay={0.1}>
                    <CountryPlacesPanel country={country} state={state} />
                  </Reveal>
                </>
              )}

              {/* ── INTEL ── */}
              {activeTab === "intel" && (
                <>
                  <Reveal delay={0.0}>
                    <DatabricksPrediction predictionData={databricksData} />
                  </Reveal>
                  <Reveal delay={0.1}>
                    <div className="flex items-center gap-2 pt-1 border-t border-white/[0.05]">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "rgba(34,211,238,0.7)" }} />
                      <p className="text-[9px] text-white/22 uppercase tracking-[0.2em] font-mono font-semibold">AEGIS</p>
                    </div>
                  </Reveal>
                  {data.articles.map((a, i) => (
                    <IntelligenceCard key={i} article={a} index={i} />
                  ))}
                </>
              )}

              {/* ── AID ── */}
              {activeTab === "aid" && (
                <>
                  <Reveal delay={0.0}>
                    <FundingBeastModule country={country} state={state} />
                  </Reveal>
                  <Reveal delay={0.08}>
                    <SectorStatus sectors={data.sectors} country={state ?? country} />
                  </Reveal>
                  <Reveal delay={0.14}>
                    <div className="flex items-center gap-2 pt-1 border-t border-white/[0.05]">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(34,211,238,0.5)" }} />
                      <p className="text-[9px] text-white/22 uppercase tracking-[0.2em] font-mono font-semibold">AID ORGANIZATIONS</p>
                    </div>
                  </Reveal>
                  {(data.aidOrgs ?? []).length > 0 ? (
                    (data.aidOrgs ?? []).map((org, i) => (
                      <AidOrgRow key={i} org={org} index={i} country={state ?? country} />
                    ))
                  ) : (
                    <p className="text-white/20 text-[11px] font-mono">No aid organization data available.</p>
                  )}
                </>
              )}

              {/* ── SOCIAL ── */}
              {activeTab === "social" && (
                <>
                  <SocialAwarenessNote country={country} />
                  {(data.social ?? []).length > 0 ? (
                    (data.social ?? []).map((post, i) => (
                      <SocialCard key={i} post={post} index={i} country={country} />
                    ))
                  ) : (
                    <p className="text-white/20 text-[11px] font-mono">No social data available.</p>
                  )}
                </>
              )}

            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 px-5 py-3 border-t border-white/6">
        <p className="text-white/12 text-[9px] font-mono tracking-wide">
          Weather: Google Weather API (fallback OpenWeatherMap) · Intel: Groq Llama-3.3-70b · {new Date().toUTCString().slice(0, 16)}
        </p>
      </div>
    </motion.div>
  );
}
