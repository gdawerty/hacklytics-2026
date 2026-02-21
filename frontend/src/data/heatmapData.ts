export interface ContributingFactor {
  icon: string
  name: string
  value: number // 0–100
}

export interface CrisisPoint {
  lat: number
  lng: number
  intensity: number // 0–1 overall underfunding likelihood
  country: string
  factors: ContributingFactor[]
}

export const crisisData: CrisisPoint[] = [
  {
    lat: 15.5, lng: 44.2, intensity: 0.87, country: "Yemen",
    factors: [
      { icon: "💸", name: "Poverty",              value: 92 },
      { icon: "⚔️",  name: "Conflict",             value: 96 },
      { icon: "🌾", name: "Food Insecurity",       value: 88 },
      { icon: "🌡️", name: "Climate Risk",          value: 72 },
      { icon: "🏛️", name: "Political Instability", value: 94 },
      { icon: "🚶", name: "Displacement",          value: 85 },
    ],
  },
  {
    lat: 33.9, lng: 67.7, intensity: 0.91, country: "Afghanistan",
    factors: [
      { icon: "💸", name: "Poverty",              value: 89 },
      { icon: "⚔️",  name: "Conflict",             value: 90 },
      { icon: "🌾", name: "Food Insecurity",       value: 93 },
      { icon: "🌡️", name: "Climate Risk",          value: 65 },
      { icon: "🏛️", name: "Political Instability", value: 95 },
      { icon: "🚶", name: "Displacement",          value: 88 },
    ],
  },
  {
    lat: 7.9, lng: 30.2, intensity: 0.94, country: "South Sudan",
    factors: [
      { icon: "💸", name: "Poverty",              value: 96 },
      { icon: "⚔️",  name: "Conflict",             value: 91 },
      { icon: "🌾", name: "Food Insecurity",       value: 94 },
      { icon: "🌡️", name: "Climate Risk",          value: 78 },
      { icon: "🏛️", name: "Political Instability", value: 90 },
      { icon: "🚶", name: "Displacement",          value: 92 },
    ],
  },
  {
    lat: 35.0, lng: 38.5, intensity: 0.79, country: "Syria",
    factors: [
      { icon: "💸", name: "Poverty",              value: 80 },
      { icon: "⚔️",  name: "Conflict",             value: 85 },
      { icon: "🌾", name: "Food Insecurity",       value: 75 },
      { icon: "🌡️", name: "Climate Risk",          value: 60 },
      { icon: "🏛️", name: "Political Instability", value: 88 },
      { icon: "🚶", name: "Displacement",          value: 90 },
    ],
  },
  {
    lat: -1.5, lng: 29.0, intensity: 0.86, country: "DR Congo",
    factors: [
      { icon: "💸", name: "Poverty",              value: 88 },
      { icon: "⚔️",  name: "Conflict",             value: 84 },
      { icon: "🌾", name: "Food Insecurity",       value: 82 },
      { icon: "🌡️", name: "Climate Risk",          value: 70 },
      { icon: "🏛️", name: "Political Instability", value: 86 },
      { icon: "🚶", name: "Displacement",          value: 80 },
    ],
  },
  {
    lat: 5.0, lng: 46.0, intensity: 0.88, country: "Somalia",
    factors: [
      { icon: "💸", name: "Poverty",              value: 90 },
      { icon: "⚔️",  name: "Conflict",             value: 87 },
      { icon: "🌾", name: "Food Insecurity",       value: 91 },
      { icon: "🌡️", name: "Climate Risk",          value: 80 },
      { icon: "🏛️", name: "Political Instability", value: 92 },
      { icon: "🚶", name: "Displacement",          value: 84 },
    ],
  },
  {
    lat: 9.1, lng: 40.5, intensity: 0.76, country: "Ethiopia",
    factors: [
      { icon: "💸", name: "Poverty",              value: 75 },
      { icon: "⚔️",  name: "Conflict",             value: 72 },
      { icon: "🌾", name: "Food Insecurity",       value: 80 },
      { icon: "🌡️", name: "Climate Risk",          value: 76 },
      { icon: "🏛️", name: "Political Instability", value: 70 },
      { icon: "🚶", name: "Displacement",          value: 74 },
    ],
  },
  {
    lat: 15.5, lng: 32.5, intensity: 0.82, country: "Sudan",
    factors: [
      { icon: "💸", name: "Poverty",              value: 82 },
      { icon: "⚔️",  name: "Conflict",             value: 84 },
      { icon: "🌾", name: "Food Insecurity",       value: 80 },
      { icon: "🌡️", name: "Climate Risk",          value: 74 },
      { icon: "🏛️", name: "Political Instability", value: 86 },
      { icon: "🚶", name: "Displacement",          value: 78 },
    ],
  },
  {
    lat: 18.9, lng: -72.3, intensity: 0.73, country: "Haiti",
    factors: [
      { icon: "💸", name: "Poverty",              value: 76 },
      { icon: "⚔️",  name: "Conflict",             value: 70 },
      { icon: "🌾", name: "Food Insecurity",       value: 72 },
      { icon: "🌡️", name: "Climate Risk",          value: 82 },
      { icon: "🏛️", name: "Political Instability", value: 78 },
      { icon: "🚶", name: "Displacement",          value: 65 },
    ],
  },
  {
    lat: 49.0, lng: 32.0, intensity: 0.48, country: "Ukraine",
    factors: [
      { icon: "💸", name: "Poverty",              value: 40 },
      { icon: "⚔️",  name: "Conflict",             value: 82 },
      { icon: "🌾", name: "Food Insecurity",       value: 38 },
      { icon: "🌡️", name: "Climate Risk",          value: 30 },
      { icon: "🏛️", name: "Political Instability", value: 55 },
      { icon: "🚶", name: "Displacement",          value: 72 },
    ],
  },
  {
    lat: 19.8, lng: 96.1, intensity: 0.74, country: "Myanmar",
    factors: [
      { icon: "💸", name: "Poverty",              value: 68 },
      { icon: "⚔️",  name: "Conflict",             value: 80 },
      { icon: "🌾", name: "Food Insecurity",       value: 70 },
      { icon: "🌡️", name: "Climate Risk",          value: 72 },
      { icon: "🏛️", name: "Political Instability", value: 84 },
      { icon: "🚶", name: "Displacement",          value: 76 },
    ],
  },
  {
    lat: 14.0, lng: -2.0, intensity: 0.80, country: "Mali",
    factors: [
      { icon: "💸", name: "Poverty",              value: 82 },
      { icon: "⚔️",  name: "Conflict",             value: 78 },
      { icon: "🌾", name: "Food Insecurity",       value: 80 },
      { icon: "🌡️", name: "Climate Risk",          value: 85 },
      { icon: "🏛️", name: "Political Instability", value: 80 },
      { icon: "🚶", name: "Displacement",          value: 72 },
    ],
  },
  {
    lat: 33.9, lng: 35.5, intensity: 0.42, country: "Lebanon",
    factors: [
      { icon: "💸", name: "Poverty",              value: 55 },
      { icon: "⚔️",  name: "Conflict",             value: 45 },
      { icon: "🌾", name: "Food Insecurity",       value: 48 },
      { icon: "🌡️", name: "Climate Risk",          value: 38 },
      { icon: "🏛️", name: "Political Instability", value: 60 },
      { icon: "🚶", name: "Displacement",          value: 42 },
    ],
  },
  {
    lat: 28.6, lng: 77.2, intensity: 0.42, country: "India",
    factors: [
      { icon: "💸", name: "Poverty",              value: 45 },
      { icon: "⚔️",  name: "Conflict",             value: 28 },
      { icon: "🌾", name: "Food Insecurity",       value: 40 },
      { icon: "🌡️", name: "Climate Risk",          value: 68 },
      { icon: "🏛️", name: "Political Instability", value: 32 },
      { icon: "🚶", name: "Displacement",          value: 38 },
    ],
  },
  {
    lat: 37.1, lng: -95.7, intensity: 0.06, country: "United States",
    factors: [
      { icon: "💸", name: "Poverty",              value: 8 },
      { icon: "⚔️",  name: "Conflict",             value: 5 },
      { icon: "🌾", name: "Food Insecurity",       value: 10 },
      { icon: "🌡️", name: "Climate Risk",          value: 18 },
      { icon: "🏛️", name: "Political Instability", value: 12 },
      { icon: "🚶", name: "Displacement",          value: 5 },
    ],
  },
  {
    lat: 51.5, lng: -0.1, intensity: 0.05, country: "United Kingdom",
    factors: [
      { icon: "💸", name: "Poverty",              value: 7 },
      { icon: "⚔️",  name: "Conflict",             value: 4 },
      { icon: "🌾", name: "Food Insecurity",       value: 6 },
      { icon: "🌡️", name: "Climate Risk",          value: 15 },
      { icon: "🏛️", name: "Political Instability", value: 8 },
      { icon: "🚶", name: "Displacement",          value: 3 },
    ],
  },
  {
    lat: -14.2, lng: -51.9, intensity: 0.38, country: "Brazil",
    factors: [
      { icon: "💸", name: "Poverty",              value: 40 },
      { icon: "⚔️",  name: "Conflict",             value: 25 },
      { icon: "🌾", name: "Food Insecurity",       value: 35 },
      { icon: "🌡️", name: "Climate Risk",          value: 58 },
      { icon: "🏛️", name: "Political Instability", value: 42 },
      { icon: "🚶", name: "Displacement",          value: 28 },
    ],
  },
]

// Keep backward-compat alias for any imports that still use heatmapData
export const heatmapData = crisisData
export type HeatmapPoint = CrisisPoint
