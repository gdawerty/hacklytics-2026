import { useEffect, useState } from "react";
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
}

interface SocialPost {
  creator:  string;
  caption:  string;
  hashtags: string[];
  views:    string;
  likes:    string;
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
      "source":     <"Reuters"|"NYT"|"WSJ"|"BBC"|"AP">,
      "url":        "<realistic full URL from that source>",
      "imageQuery": "<3-word Unsplash phrase>"
    }
  ],
  "social": [
    {
      "creator":  "@<realistic username>",
      "caption":  "<authentic 20-30 word social post about this crisis>",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "views":    "<e.g. 2.4M>",
      "likes":    "<e.g. 180K>"
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

Include exactly 3 articles, 4 social posts (realistic viral content raising awareness), and 4 aid organizations. Be specific and factual.`;
}

async function fetchDossier(country: string, state?: string): Promise<DossierData> {
  const cacheKey = state ? `${country}::${state}` : country;
  const cached   = getCached(cacheKey);
  if (cached) return cached;

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
  setCached(cacheKey, data);
  return data;
}

// ─── OpenWeatherMap real weather ────────────────────────────────────────────
const OWM_KEY   = import.meta.env.VITE_OWM_API_KEY as string;
const WEATHER_MEM_CACHE = new Map<string, { data: WeatherData; ts: number }>();
const WEATHER_TTL = 60 * 60 * 1000;

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

// ─── Helpers ───────────────────────────────────────────────────────────────
function barColor(v: number) {
  if (v > 74) return "#f87171";
  if (v > 49) return "#fb923c";
  if (v > 24) return "#facc15";
  return "#34d399";
}
function crisisLevel(i: number) {
  if (i > 0.74) return { label: "Critical", cls: "bg-red-500/15 text-red-300 border-red-500/25" };
  if (i > 0.49) return { label: "High",     cls: "bg-orange-500/15 text-orange-300 border-orange-500/25" };
  if (i > 0.24) return { label: "Moderate", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25" };
  return               { label: "Low",      cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" };
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
const HAZARD_COLORS = ["", "#34d399", "#86efac", "#facc15", "#fb923c", "#f87171"];

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

function OperationalPulse({ op }: { op: OperationalData }) {
  const hc       = HAZARD_COLORS[Math.min(5, Math.max(1, op.hazardLevel))];
  const facilPct = Math.min(100, Math.max(0, op.healthFacilities));
  const facilColor = facilPct > 70 ? "#34d399" : facilPct > 40 ? "#fb923c" : "#f87171";

  return (
    <div className="rounded-lg overflow-hidden border border-white/[0.07]" style={{ background: "rgba(8,13,30,0.72)" }}>
      <div className="px-4 pt-3 pb-2 border-b border-white/[0.05]">
        <p className="text-[9px] text-white/25 uppercase tracking-[0.2em] font-mono font-semibold">Operational Pulse</p>
      </div>
      <div className="px-4 py-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-white/35 text-[10px] font-mono uppercase tracking-wider">HLTH FAC FUNCTIONAL</span>
            <span className="font-bold text-[13px] font-mono tabular-nums" style={{ color: facilColor }}>{facilPct}%</span>
          </div>
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${facilPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              style={{ background: facilColor, boxShadow: `0 0 6px ${facilColor}55` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded border border-white/[0.05] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-[9px] text-white/25 font-mono uppercase tracking-wider mb-1.5">DISPL ALERTS</p>
            <p className="text-orange-300 font-bold text-[22px] font-mono tabular-nums leading-none">{op.displacementAlerts}</p>
            <p className="text-white/18 text-[8px] font-mono mt-0.5">ACTIVE</p>
          </div>
          <div className="rounded border border-white/[0.05] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-[9px] text-white/25 font-mono uppercase tracking-wider mb-2">HAZARD LVL</p>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex-1 h-[3px] rounded-sm"
                  style={{
                    background: i <= op.hazardLevel ? hc : "rgba(255,255,255,0.07)",
                    boxShadow:  i <= op.hazardLevel ? `0 0 4px ${hc}66` : "none",
                  }}
                />
              ))}
            </div>
            <p className="font-mono text-[11px] font-bold mt-1.5" style={{ color: hc }}>{op.hazardLevel}/5</p>
          </div>
        </div>
        {op.alertText && (
          <div className="flex items-start gap-2.5 pt-3 border-t border-white/[0.05]">
            <span className="text-red-400 text-[8px] font-mono font-bold shrink-0 mt-0.5 tracking-widest">ALERT</span>
            <p className="text-white/35 text-[11px] leading-relaxed font-mono">{op.alertText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── INTEL TAB ─────────────────────────────────────────────────────────────
function TrendGraph({ trend }: { trend: TrendPoint[] }) {
  const max      = Math.max(...trend.map(t => t.underfunding));
  const critical = max > 70;
  return (
    <div className="rounded-lg overflow-hidden border border-white/[0.07]" style={{ background: "rgba(8,13,30,0.72)" }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.05]">
        <p className="text-[9px] text-white/25 uppercase tracking-[0.2em] font-mono font-semibold">FUNDING GAP · 6-MONTH TREND</p>
        <span className={`text-[9px] font-mono ${critical ? "text-red-400" : "text-emerald-400"}`}>
          {trend[trend.length - 1]?.underfunding ?? 0}%
        </span>
      </div>
      <div className="px-2 pt-2 pb-3">
        <ResponsiveContainer width="100%" height={90}>
          <LineChart data={trend} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.22)", fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "rgba(8,10,20,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "rgba(255,255,255,0.5)" }}
              itemStyle={{ color: critical ? "#f87171" : "#34d399" }}
              formatter={(v: number) => [`${v}%`, "Underfunding"]}
            />
            <ReferenceLine y={70} stroke="rgba(248,113,113,0.25)" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="underfunding"
              stroke={critical ? "#f87171" : "#34d399"} strokeWidth={2}
              dot={{ fill: critical ? "#f87171" : "#34d399", r: 2.5, strokeWidth: 0 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function IntelligenceCard({ article, index }: { article: Article; index: number }) {
  const open = () => { if (article.url) window.open(article.url, "_blank", "noopener,noreferrer"); };
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
            {article.source}
          </span>
        </div>
        <span className="text-white/18 text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">↗ open</span>
      </div>
      <div className="px-4 py-3">
        <h3 className="text-white/90 font-semibold text-[12px] leading-snug tracking-tight mb-1.5 group-hover:text-white transition-colors">
          {article.title}
        </h3>
        <p className="text-white/35 text-[11px] leading-relaxed">{article.summary}</p>
      </div>
    </motion.div>
  );
}

// ─── AID TAB ───────────────────────────────────────────────────────────────
function SectorStatus({ sectors }: { sectors: SectorData }) {
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
function SocialCard({ post, index }: { post: SocialPost; index: number }) {
  const primaryTag    = post.hashtags[0]?.replace("#", "") ?? "";
  const tiktokSearch  = `https://www.tiktok.com/search?q=${encodeURIComponent(primaryTag)}`;
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
            <p className="text-white/20 text-[8px] font-mono mt-0.5 uppercase tracking-wide">TikTok Creator</p>
          </div>
        </div>
        {/* TikTok logo mark */}
        <div className="flex items-center gap-1 px-2 py-1 rounded"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-white/40">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.77a4.85 4.85 0 01-1.01-.08z"/>
          </svg>
          <span className="text-[8px] font-mono text-white/30">TikTok</span>
        </div>
      </div>

      {/* Caption */}
      <div className="px-4 py-3">
        <p className="text-white/72 text-[12px] leading-relaxed mb-2.5">{post.caption}</p>

        {/* Hashtags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.hashtags.map(h => (
            <a key={h} href={`https://www.tiktok.com/search?q=${encodeURIComponent(h.replace("#",""))}`}
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
          <a href={tiktokSearch} target="_blank" rel="noopener noreferrer"
            className="text-[9px] font-mono px-2.5 py-1 rounded transition-all hover:opacity-90"
            style={{ background: "rgba(34,211,238,0.08)", color: "rgba(34,211,238,0.7)", border: "1px solid rgba(34,211,238,0.15)" }}>
            ↗ watch
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
        SOCIAL PULSE — Representative posts raising awareness of the {country} crisis. Click hashtags or ↗ watch to search live content on TikTok.
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

  useEffect(() => {
    let cancelled = false;
    setData(null); setError(null); setLoading(true);
    setRealWeather(null); setActiveTab("overview");

    fetchDossier(country, state)
      .then(d  => { if (!cancelled) setData(d); })
      .catch(e  => { if (!cancelled) setError(e.message ?? "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    const locationQuery = state ? `${state}, ${country}` : country;
    fetchRealWeather(locationQuery)
      .then(w => { if (!cancelled && w) setRealWeather(w); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [country, state]);

  const weatherToShow = realWeather ?? data?.weather ?? null;
  const score  = crisis ? Math.round(crisis.intensity * 100) : null;
  const level  = crisis ? crisisLevel(crisis.intensity) : null;

  return (
    <motion.div
      key={country}
      initial={{ x: "100%", filter: "blur(18px)", opacity: 0 }}
      animate={{ x: 0,      filter: "blur(0px)",  opacity: 1 }}
      exit={{   x: "100%", filter: "blur(12px)", opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="fixed top-0 right-0 h-screen w-[380px] z-50 flex flex-col border-l border-white/[0.07] overflow-hidden"
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
            <div className="w-1 h-1 rounded-full" style={{ background: "rgba(34,211,238,0.7)" }} />
            <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: "rgba(34,211,238,0.60)" }}>
              SIGINT · HUMANITARIAN
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
          {state && <p className="text-white/35 text-[11px] font-mono mt-0.5 uppercase tracking-wider">{country}</p>}
        </div>

        {crisis && score !== null && level && (
          <>
            <div className="flex items-center gap-3 mt-4">
              <span className="text-3xl font-bold tabular-nums text-white">{score}%</span>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${level.cls}`}>{level.label}</span>
              <span className="text-white/22 text-[9px] ml-auto">Crisis Likelihood</span>
            </div>
            <div className="mt-3.5 space-y-1.5">
              {crisis.factors.map(f => (
                <div key={f.name}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-white/40 text-[11px]">{f.icon} {f.name}</span>
                    <span className="text-white/25 text-[10px] font-mono">{f.value}%</span>
                  </div>
                  <div className="h-[2px] rounded-full bg-white/6">
                    <motion.div className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${f.value}%` }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                      style={{ background: barColor(f.value), boxShadow: `0 0 4px ${barColor(f.value)}55` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
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
                    <OperationalPulse op={data.operational} />
                  </Reveal>
                </>
              )}

              {/* ── INTEL ── */}
              {activeTab === "intel" && (
                <>
                  <Reveal delay={0.0}>
                    <TrendGraph trend={data.trend} />
                  </Reveal>
                  <Reveal delay={0.1}>
                    <div className="flex items-center gap-2 pt-1 border-t border-white/[0.05]">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "rgba(34,211,238,0.7)" }} />
                      <p className="text-[9px] text-white/22 uppercase tracking-[0.2em] font-mono font-semibold">SIGINT BRIEFS</p>
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
                    <SectorStatus sectors={data.sectors} />
                  </Reveal>
                  <Reveal delay={0.1}>
                    <div className="flex items-center gap-2 pt-1 border-t border-white/[0.05]">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(34,211,238,0.5)" }} />
                      <p className="text-[9px] text-white/22 uppercase tracking-[0.2em] font-mono font-semibold">AID ORGANIZATIONS</p>
                    </div>
                  </Reveal>
                  {(data.aidOrgs ?? []).length > 0 ? (
                    (data.aidOrgs ?? []).map((org, i) => (
                      <AidOrgRow key={i} org={org} index={i} />
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
                      <SocialCard key={i} post={post} index={i} />
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
          Weather: OpenWeatherMap · Intel: Groq Llama-3.3-70b · {new Date().toUTCString().slice(0, 16)}
        </p>
      </div>
    </motion.div>
  );
}
