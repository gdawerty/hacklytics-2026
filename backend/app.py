from flask import Flask, jsonify
from flask_cors import CORS
import random
import time

try:
    import h3
    # Detect API version: h3-py 4.x vs 3.x
    if hasattr(h3, 'latlng_to_cell'):
        def _geo_to_h3(lat, lon, res): return h3.latlng_to_cell(lat, lon, res)
        def _k_ring(cell, k):          return list(h3.grid_disk(cell, k))
    else:
        def _geo_to_h3(lat, lon, res): return h3.geo_to_h3(lat, lon, res)
        def _k_ring(cell, k):          return list(h3.k_ring(cell, k))
    H3_AVAILABLE = True
except ImportError:
    H3_AVAILABLE = False

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Crisis zone definitions — each will expand into a cluster of H3 hexagons
# ---------------------------------------------------------------------------
CRISIS_ZONE_DEFS = [
    {
        "name": "Eastern DRC",     "region": "Sub-Saharan Africa",
        "lat": -1.5,  "lon": 29.0,
        "base_gap": 0.89, "base_severity": 0.92,
        "funding": 45,   "required": 380,  "pop": 6_200_000, "radius": 2,
    },
    {
        "name": "Yemen",           "region": "Middle East",
        "lat": 15.5,  "lon": 44.2,
        "base_gap": 0.78, "base_severity": 0.88,
        "funding": 820,  "required": 3700, "pop": 21_400_000, "radius": 2,
    },
    {
        "name": "Syria",           "region": "Middle East",
        "lat": 35.0,  "lon": 38.5,
        "base_gap": 0.71, "base_severity": 0.82,
        "funding": 1100, "required": 4200, "pop": 15_800_000, "radius": 2,
    },
    {
        "name": "Afghanistan",     "region": "South Asia",
        "lat": 33.9,  "lon": 67.7,
        "base_gap": 0.85, "base_severity": 0.90,
        "funding": 530,  "required": 3600, "pop": 28_500_000, "radius": 2,
    },
    {
        "name": "Ethiopia",        "region": "East Africa",
        "lat": 9.1,   "lon": 40.5,
        "base_gap": 0.73, "base_severity": 0.79,
        "funding": 670,  "required": 2500, "pop": 20_100_000, "radius": 2,
    },
    {
        "name": "Haiti",           "region": "Caribbean",
        "lat": 18.9,  "lon": -72.3,
        "base_gap": 0.65, "base_severity": 0.72,
        "funding": 320,  "required": 920,  "pop": 5_400_000,  "radius": 1,
    },
    {
        "name": "Venezuela",       "region": "South America",
        "lat": 8.0,   "lon": -66.0,
        "base_gap": 0.58, "base_severity": 0.65,
        "funding": 210,  "required": 500,  "pop": 7_200_000,  "radius": 1,
    },
    {
        "name": "Ukraine",         "region": "Eastern Europe",
        "lat": 49.0,  "lon": 32.0,
        "base_gap": 0.42, "base_severity": 0.85,
        "funding": 3200, "required": 5400, "pop": 14_600_000, "radius": 3,
    },
    {
        "name": "Sudan",           "region": "Northeast Africa",
        "lat": 15.5,  "lon": 32.5,
        "base_gap": 0.81, "base_severity": 0.87,
        "funding": 190,  "required": 1000, "pop": 11_200_000, "radius": 2,
    },
    {
        "name": "Myanmar",         "region": "Southeast Asia",
        "lat": 19.8,  "lon": 96.1,
        "base_gap": 0.75, "base_severity": 0.78,
        "funding": 145,  "required": 580,  "pop": 6_700_000,  "radius": 1,
    },
    {
        "name": "South Sudan",     "region": "East Africa",
        "lat": 7.9,   "lon": 30.2,
        "base_gap": 0.88, "base_severity": 0.91,
        "funding": 95,   "required": 800,  "pop": 8_300_000,  "radius": 2,
    },
    {
        "name": "Gaza",            "region": "Middle East",
        "lat": 31.4,  "lon": 34.3,
        "base_gap": 0.93, "base_severity": 0.97,
        "funding": 310,  "required": 4800, "pop": 2_200_000,  "radius": 1,
    },
    {
        "name": "Somalia",         "region": "East Africa",
        "lat": 5.0,   "lon": 46.0,
        "base_gap": 0.82, "base_severity": 0.88,
        "funding": 120,  "required": 680,  "pop": 7_100_000,  "radius": 2,
    },
    {
        "name": "Mozambique",      "region": "Southern Africa",
        "lat": -18.0, "lon": 35.5,
        "base_gap": 0.68, "base_severity": 0.70,
        "funding": 280,  "required": 870,  "pop": 4_100_000,  "radius": 1,
    },
    {
        "name": "Nigeria (NE)",    "region": "West Africa",
        "lat": 11.5,  "lon": 13.5,
        "base_gap": 0.77, "base_severity": 0.80,
        "funding": 200,  "required": 880,  "pop": 9_800_000,  "radius": 2,
    },
]

# ---------------------------------------------------------------------------
# Fallback static data if h3-py is not installed
# (pre-computed resolution-3 hex cells near each crisis zone)
# ---------------------------------------------------------------------------
FALLBACK_ZONES = [
    {"hex": "8328adfffffffff", "country": "Eastern DRC",  "region": "Sub-Saharan Africa",
     "gapScore": 0.89, "severity": 0.92, "fundingAmount": 45,   "fundingRequired": 380,  "affectedPop": 6_200_000},
    {"hex": "832830fffffffff", "country": "Eastern DRC",  "region": "Sub-Saharan Africa",
     "gapScore": 0.85, "severity": 0.88, "fundingAmount": 45,   "fundingRequired": 380,  "affectedPop": 6_200_000},
    {"hex": "83284dfffffffff", "country": "Yemen",        "region": "Middle East",
     "gapScore": 0.78, "severity": 0.88, "fundingAmount": 820,  "fundingRequired": 3700, "affectedPop": 21_400_000},
    {"hex": "832862fffffffff", "country": "Yemen",        "region": "Middle East",
     "gapScore": 0.75, "severity": 0.84, "fundingAmount": 820,  "fundingRequired": 3700, "affectedPop": 21_400_000},
    {"hex": "83286afffffffff", "country": "Syria",        "region": "Middle East",
     "gapScore": 0.71, "severity": 0.82, "fundingAmount": 1100, "fundingRequired": 4200, "affectedPop": 15_800_000},
    {"hex": "832b62fffffffff", "country": "Afghanistan",  "region": "South Asia",
     "gapScore": 0.85, "severity": 0.90, "fundingAmount": 530,  "fundingRequired": 3600, "affectedPop": 28_500_000},
    {"hex": "83295afffffffff", "country": "Ethiopia",     "region": "East Africa",
     "gapScore": 0.73, "severity": 0.79, "fundingAmount": 670,  "fundingRequired": 2500, "affectedPop": 20_100_000},
    {"hex": "832972fffffffff", "country": "Somalia",      "region": "East Africa",
     "gapScore": 0.82, "severity": 0.88, "fundingAmount": 120,  "fundingRequired": 680,  "affectedPop": 7_100_000},
    {"hex": "8329b2fffffffff", "country": "Sudan",        "region": "Northeast Africa",
     "gapScore": 0.81, "severity": 0.87, "fundingAmount": 190,  "fundingRequired": 1000, "affectedPop": 11_200_000},
    {"hex": "832b0afffffffff", "country": "Gaza",         "region": "Middle East",
     "gapScore": 0.93, "severity": 0.97, "fundingAmount": 310,  "fundingRequired": 4800, "affectedPop": 2_200_000},
    {"hex": "832b1afffffffff", "country": "Ukraine",      "region": "Eastern Europe",
     "gapScore": 0.42, "severity": 0.85, "fundingAmount": 3200, "fundingRequired": 5400, "affectedPop": 14_600_000},
    {"hex": "832890fffffffff", "country": "South Sudan",  "region": "East Africa",
     "gapScore": 0.88, "severity": 0.91, "fundingAmount": 95,   "fundingRequired": 800,  "affectedPop": 8_300_000},
    {"hex": "8328b0fffffffff", "country": "Nigeria (NE)", "region": "West Africa",
     "gapScore": 0.77, "severity": 0.80, "fundingAmount": 200,  "fundingRequired": 880,  "affectedPop": 9_800_000},
]


def _generate_zones():
    """Generate H3 hexagon records for all crisis zones using h3-py."""
    if not H3_AVAILABLE:
        return FALLBACK_ZONES

    zones = []
    seen = set()

    for zd in CRISIS_ZONE_DEFS:
        try:
            center = _geo_to_h3(zd["lat"], zd["lon"], 3)
            candidates = _k_ring(center, zd["radius"])
            # Pick up to 7 non-overlapping hexes; shuffle for variety
            random.shuffle(candidates)
            selected = [h for h in candidates if h not in seen][:7]

            for hex_id in selected:
                seen.add(hex_id)
                jitter = random.uniform(-0.07, 0.07)
                gap = round(max(0.05, min(0.99, zd["base_gap"] + jitter)), 3)
                sev = round(max(0.05, min(0.99, zd["base_severity"] + jitter * 0.5)), 3)
                zones.append({
                    "hex":            hex_id,
                    "country":        zd["name"],
                    "region":         zd["region"],
                    "gapScore":       gap,
                    "severity":       sev,
                    "fundingAmount":  zd["funding"],
                    "fundingRequired": zd["required"],
                    "affectedPop":    zd["pop"],
                })
        except Exception:
            continue

    return zones


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route('/api/crisis', methods=['GET'])
def get_crisis_data():
    zones = _generate_zones()

    # Build per-country summary for aggregate stats
    country_seen = {}
    for z in zones:
        if z["country"] not in country_seen:
            country_seen[z["country"]] = z

    total_affected   = sum(v["affectedPop"]                              for v in country_seen.values())
    total_gap_usd_m  = sum(v["fundingRequired"] - v["fundingAmount"]     for v in country_seen.values())
    avg_gap          = round(sum(z["gapScore"] for z in zones) / len(zones), 3) if zones else 0

    return jsonify({
        "zones":           zones,
        "lastUpdated":     time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "totalAffected":   total_affected,
        "avgGapScore":     avg_gap,
        "totalFundingGap": round(total_gap_usd_m, 1),   # USD millions
        "crisisCount":     len(country_seen),
    })


@app.route('/api/signal', methods=['GET'])
def get_signal():
    time.sleep(0.1)
    ok = random.random() > 0.2
    return jsonify({
        'signal':    random.randint(1, 100),
        'success':   ok,
        'message':   'Signal received successfully' if ok else 'Signal processing failed',
        'timestamp': time.time(),
    }), 200 if ok else 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'h3_available': H3_AVAILABLE}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0')
