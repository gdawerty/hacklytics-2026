from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import time
import json
import os
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus
from urllib.request import urlopen
import xml.etree.ElementTree as ET

import pandas as pd

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

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

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

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


CRISIS_TYPE_BY_COUNTRY = {
    "Eastern DRC": "Protection",
    "Yemen": "Food & Livelihoods",
    "Syria": "Protection",
    "Afghanistan": "Food & Livelihoods",
    "Ethiopia": "Nutrition",
    "Haiti": "WASH",
    "Venezuela": "Health",
    "Ukraine": "Protection",
    "Sudan": "Food & Livelihoods",
    "Myanmar": "Protection",
    "South Sudan": "Food & Livelihoods",
    "Gaza": "Protection",
    "Somalia": "WASH",
    "Mozambique": "WASH",
    "Nigeria (NE)": "Nutrition",
}

STABILITY_BY_REGION = {
    "Sub-Saharan Africa": 0.58,
    "Middle East": 0.52,
    "South Asia": 0.55,
    "East Africa": 0.56,
    "Caribbean": 0.66,
    "South America": 0.64,
    "Eastern Europe": 0.72,
    "Northeast Africa": 0.54,
    "Southeast Asia": 0.63,
    "Southern Africa": 0.69,
    "West Africa": 0.59,
}

SOLUTIONS_DATABASE = [
    {"Name": "Cash Transfers in Lebanon", "Cost": 180_000_000, "Success_Rate_Percentage": 74, "Primary_Crisis_Type": "Food & Livelihoods"},
    {"Name": "Borehole Drilling in Somalia", "Cost": 120_000_000, "Success_Rate_Percentage": 71, "Primary_Crisis_Type": "WASH"},
    {"Name": "Mobile Health Clinics in Yemen", "Cost": 150_000_000, "Success_Rate_Percentage": 69, "Primary_Crisis_Type": "Health"},
    {"Name": "School Continuity Grants in Syria", "Cost": 90_000_000, "Success_Rate_Percentage": 67, "Primary_Crisis_Type": "Education"},
    {"Name": "Nutrition Vouchers in Ethiopia", "Cost": 110_000_000, "Success_Rate_Percentage": 73, "Primary_Crisis_Type": "Nutrition"},
    {"Name": "Protection Case Management in Jordan", "Cost": 95_000_000, "Success_Rate_Percentage": 76, "Primary_Crisis_Type": "Protection"},
    {"Name": "Community WASH Rehab in Mozambique", "Cost": 105_000_000, "Success_Rate_Percentage": 70, "Primary_Crisis_Type": "WASH"},
    {"Name": "Targeted Food Baskets in Sudan", "Cost": 130_000_000, "Success_Rate_Percentage": 68, "Primary_Crisis_Type": "Food & Livelihoods"},
]


def _build_needs_df() -> pd.DataFrame:
    rows = []
    for zone in CRISIS_ZONE_DEFS:
        rows.append({
            "Year": 2026,
            "Country": zone["name"],
            "Crisis_Type": CRISIS_TYPE_BY_COUNTRY.get(zone["name"], "Food & Livelihoods"),
            "Funding_Required": float(zone["required"]) * 1_000_000.0,
            "Funding_Received": float(zone["funding"]) * 1_000_000.0,
            "People_in_Need": int(zone["pop"]),
            "Stability_Index": float(STABILITY_BY_REGION.get(zone["region"], 0.62)),
        })
    return pd.DataFrame(rows)


class HumanitarianSim:
    # Class-level cache for UN solutions to avoid redundant API calls
    _solution_cache: Dict[str, Dict[str, Any]] = {}
    
    def __init__(
        self,
        df_needs: pd.DataFrame,
        solutions_database: List[Dict[str, Any]],
        api_key: Optional[str] = None,
        model: str = "llama-3.3-70b-versatile",
    ):
        self.df_needs = df_needs.copy()
        self.solutions_database = solutions_database
        self.model = model
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=self.api_key) if GROQ_AVAILABLE and self.api_key else None

    @staticmethod
    def _parse_percent(text_or_num: Any) -> float:
        if isinstance(text_or_num, (int, float)):
            return float(text_or_num)
        if not text_or_num:
            return 0.0
        raw = str(text_or_num).replace("%", "").strip()
        try:
            return float(raw)
        except ValueError:
            return 0.0

    def _system_prompt(self) -> str:
        return (
            "**Role:** You are the Authentia AI Crisis Solution Architect. Your goal is to transform "
            "humanitarian underfunding data into a predictive, evidence-based recovery roadmap.\n\n"
            "**Logic Framework:**\n"
            "1. **Gap Analysis:** Analyze the provided 'Funding Gap' ($USD) for the specific crisis category.\n"
            "2. **Analogous Retrieval:** Identify historical humanitarian interventions in other nations "
            "(e.g., Lebanon, Yemen, Somalia) that faced identical crisis markers.\n"
            "3. **Hypothetical Allocation:** Assuming the 'Funding Gap' is now 100% filled, distribute that "
            "money across 3-4 specific solutions.\n"
            "4. **Success Prediction:** Calculate a 'Likelihood of Success' (0-100%) for each solution based on:\n"
            "   - Historical efficacy of the intervention.\n"
            "   - Funding-to-Need ratio.\n"
            "   - Local Absorption Capacity (Stability Index).\n\n"
            "**Constraints:**\n"
            "- You must output in valid JSON format.\n"
            "- You must include a \"Reasoning\" field explaining why a specific country was chosen as an analogy."
        )

    def _user_prompt(
        self,
        country: str,
        category: str,
        year: int,
        funding_gap_usd: float,
        people_in_need: int,
        stability_index: float,
    ) -> str:
        return (
            "### INPUT DATA\n"
            f"- **Country:** {country}\n"
            f"- **Primary Crisis:** {category}\n"
            f"- **Year:** {year}\n"
            f"- **Current Funding Gap:** ${funding_gap_usd:,.0f}\n"
            f"- **Affected Population:** {people_in_need}\n"
            f"- **Stability Index:** {stability_index}\n\n"
            "### INSTRUCTIONS\n"
            f"1. Based on the ${funding_gap_usd:,.0f} shortfall, identify 3 high-impact solutions solved in "
            "other nations with similar socio-economic profiles.\n"
            f"2. If we provide the full ${funding_gap_usd:,.0f} today, allocate a percentage (%) to each solution.\n"
            "3. Calculate the 'Likelihood of Success' and 'Projected Impact' (number of people moved out of "
            "'In Need' status).\n\n"
            "### RESPONSE FORMAT\n"
            "Return a JSON object with this structure:\n"
            "{\n"
            "  \"summary\": \"...\",\n"
            "  \"Reasoning\": \"...\",\n"
            "  \"proposed_solutions\": [\n"
            "    {\n"
            "      \"solution_name\": \"...\",\n"
            "      \"analogous_country\": \"...\",\n"
            "      \"allocation_percentage\": 0,\n"
            "      \"allocated_amount\": 0,\n"
            "      \"success_likelihood\": \"0%\",\n"
            "      \"projected_impact_count\": 0,\n"
            "      \"rationale\": \"...\"\n"
            "    }\n"
            "  ],\n"
            "  \"overall_impact_score\": 0\n"
            "}"
        )

    def get_underfunding_metrics(self, country: str, year: int) -> Dict[str, Any]:
        row = self.df_needs[(self.df_needs["Country"] == country) & (self.df_needs["Year"] == year)]
        if row.empty:
            # fallback for current dashboard where year may not be explicitly stored
            row = self.df_needs[self.df_needs["Country"] == country]
        if row.empty:
            raise ValueError(f"No needs data found for country={country}, year={year}")

        r = row.iloc[0]
        funding_required = float(r["Funding_Required"])
        funding_received = float(r["Funding_Received"])
        gap = max(funding_required - funding_received, 0.0)
        underfund_pct = (gap / funding_required * 100.0) if funding_required > 0 else 0.0
        return {
            "Country": str(r["Country"]),
            "Year": int(year),
            "Category": str(r["Crisis_Type"]),
            "Funding_Gap_USD": gap,
            "Funding_Required": funding_required,
            "Funding_Received": funding_received,
            "Underfunding_Percentage": underfund_pct,
            "People_in_Need": int(r.get("People_in_Need", 0)),
            "Stability_Index": float(r.get("Stability_Index", 0.62)),
        }

    def _groq_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        if not self.client:
            raise RuntimeError("Groq client unavailable. Set GROQ_API_KEY and install groq.")
        completion = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        return json.loads(completion.choices[0].message.content)

    def fetch_analogous_solutions(
        self, country: str, category: str, year: int, funding_gap_usd: float, people_in_need: int, stability_index: float
    ) -> Dict[str, Any]:
        return self._groq_json(
            self._system_prompt(),
            self._user_prompt(country, category, year, funding_gap_usd, people_in_need, stability_index),
        )

    def allocate_and_predict(self, metrics: Dict[str, Any], llm_result: Dict[str, Any]) -> Dict[str, Any]:
        solutions = llm_result.get("proposed_solutions", []) or []
        if not solutions:
            return {"proposed_solutions": [], "package_success_score": 0.0}

        # Normalize/repair allocations if LLM does not sum to 100.
        alloc_values = [float(s.get("allocation_percentage", 0) or 0) for s in solutions]
        alloc_sum = sum(alloc_values)
        if alloc_sum <= 0:
            alloc_values = [100.0 / len(solutions)] * len(solutions)
            alloc_sum = 100.0
        norm_weights = [a / alloc_sum for a in alloc_values]

        gap = float(metrics["Funding_Gap_USD"])
        stability = float(metrics["Stability_Index"])

        out_solutions = []
        weighted_success = 0.0
        for i, sol in enumerate(solutions):
            weight = norm_weights[i]
            success = self._parse_percent(sol.get("success_likelihood", 0))
            weighted_success += weight * success

            allocated_amount = float(sol.get("allocated_amount", 0) or 0)
            if allocated_amount <= 0:
                allocated_amount = gap * weight

            out_solutions.append({
                "solution_name": sol.get("solution_name", "Unknown"),
                "analogous_country": sol.get("analogous_country", "Unknown"),
                "allocation_percentage": round(weight * 100.0, 2),
                "allocated_amount": round(allocated_amount, 2),
                "success_likelihood": f"{round(success, 1)}%",
                "projected_impact_count": int(sol.get("projected_impact_count", 0) or 0),
                "rationale": sol.get("rationale", ""),
            })

        package_success = max(0.0, min(100.0, weighted_success * stability))
        return {
            "proposed_solutions": out_solutions,
            "package_success_score": round(package_success, 2),
        }

    def identify_humanitarian_category(self, country: str) -> str:
        """
        Use Groq AI to identify the primary humanitarian crisis category for a country.
        Returns one of: WASH, Health, Nutrition, Protection, Education
        """
        valid_categories = ["WASH", "Health", "Nutrition", "Protection", "Education"]
        
        system_prompt = (
            "You are a humanitarian crisis analyst. Analyze the given country and identify "
            "its primary humanitarian crisis category from these options: WASH (water/sanitation), "
            "Health (medical/disease), Nutrition (food/hunger), Protection (violence/displacement), "
            "Education (access to schooling). Return ONLY valid JSON."
        )
        
        user_prompt = (
            f"For {country} as of February 2026, identify the primary humanitarian crisis category. "
            f"Return JSON with exactly this structure:\n"
            f'{{\n'
            f'  "country": "{country}",\n'
            f'  "category": "<one of: WASH, Health, Nutrition, Protection, Education>",\n'
            f'  "reasoning": "<brief explanation of why this is the primary crisis>"\n'
            f'}}\n\n'
            f'Valid categories: {", ".join(valid_categories)}'
        )
        
        try:
            result = self._groq_json(system_prompt, user_prompt)
            category = result.get("category", "Health").strip()
            
            # Ensure it's one of the valid categories
            if category not in valid_categories:
                # Try to find a partial match
                for valid_cat in valid_categories:
                    if valid_cat.lower() in category.lower() or category.lower() in valid_cat.lower():
                        category = valid_cat
                        break
                else:
                    # Default to Health if no match found
                    category = "Health"
            
            return category
        except Exception as e:
            print(f"[ERROR] identify_humanitarian_category failed for {country}: {e}")
            return "Health"  # Default fallback

    def fetch_un_solution(self, country: str, category: str) -> Dict[str, Any]:
        """
        Use Groq AI to find a UN solution for a country's humanitarian crisis category.
        Returns: {analogous_country, solution, likelihood}
        Includes retry logic with exponential backoff for rate limiting.
        """
        # Check cache first to avoid redundant API calls
        cache_key = f"{country.lower()}:{category.lower()}"
        if cache_key in HumanitarianSim._solution_cache:
            print(f"[DEBUG] CACHE HIT for {country} - {category}")
            return HumanitarianSim._solution_cache[cache_key]
        
        print(f"[DEBUG] CACHE MISS for {country} - {category}, fetching from Groq")
        
        system_prompt = (
            "You are a UN humanitarian affairs expert. Identify REAL historical UN interventions "
            "and solutions that addressed similar crises. You must return ONLY valid JSON."
        )
        
        user_prompt = (
            f"For {country} facing a {category} crisis in 2026:\n\n"
            f"1. Name a REAL country that faced a similar {category} crisis (e.g., Syria, Yemen, DRC, South Sudan, Uganda, Ethiopia)\n"
            f"2. Identify the REAL UN program/solution that addressed it (e.g., UNHCR Family Reunification, WFP Emergency Response, WHO Health Mobile Clinics)\n"
            f"3. Estimate likelihood of success (0-100%) if applied to {country}\n\n"
            f"Return ONLY this JSON structure:\n"
            f'{{\n'
            f'  "analogous_country": "<real country name>",\n'
            f'  "solution_name": "<official UN program name>",\n'
            f'  "solution_description": "<2 sentence description of what it does>",\n'
            f'  "likelihood_of_success": <0-100 number>,\n'
            f'  "reasoning": "<why this would/would not work for {country}>"\n'
            f'}}\n'
        )
        
        max_retries = 5
        retry_delay = 2  # Start with 2 seconds
        
        for attempt in range(max_retries):
            try:
                print(f"[DEBUG] fetch_un_solution attempt {attempt + 1}/{max_retries} for {country} - {category}")
                result = self._groq_json(system_prompt, user_prompt)
                print(f"[DEBUG] fetch_un_solution SUCCESS for {country} - {category}")
                value = {
                    "analogous_country": result.get("analogous_country", "Unknown"),
                    "solution": result.get("solution_name", "UN Humanitarian Response"),
                    "likelihood": max(0, min(100, result.get("likelihood_of_success", 0) or 0)),
                }
                # Store in cache
                HumanitarianSim._solution_cache[cache_key] = value
                return value
            except Exception as e:
                error_str = str(e).lower()
                # Check if it's a rate limit error
                is_rate_limit = any(phrase in error_str for phrase in ["429", "rate", "too many requests", "quota"])
                
                if is_rate_limit:
                    if attempt < max_retries - 1:
                        wait_time = retry_delay * (2 ** attempt)  # Exponential backoff: 2s, 4s, 8s, 16s, 32s
                        print(f"[WARNING] Rate limit hit for {country} - {category}. Retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})")
                        time.sleep(wait_time)
                        continue
                    else:
                        print(f"[ERROR] Rate limit persisted after {max_retries} retries for {country} - {category}")
                        # Return a valid fallback instead of error
                        fallback = {
                            "analogous_country": "Similar Crisis Region",
                            "solution": "UN Humanitarian Response Program",
                            "likelihood": 65,
                        }
                        HumanitarianSim._solution_cache[cache_key] = fallback
                        return fallback
                else:
                    print(f"[ERROR] fetch_un_solution failed for {country} - {category}: {e}")
                    # Return valid fallback
                    fallback = {
                        "analogous_country": "Similar Region",
                        "solution": "UN Emergency Response",
                        "likelihood": 60,
                    }
                    HumanitarianSim._solution_cache[cache_key] = fallback
                    return fallback
        
        # Final fallback after all retries exhausted
        fallback = {
            "analogous_country": "Similar Region",
            "solution": "UN Humanitarian Response",
            "likelihood": 55,
        }
        HumanitarianSim._solution_cache[cache_key] = fallback
        return fallback

    def generate_final_report(self, country: str, year: int, category: Optional[str] = None,
                              funding_gap_usd: Optional[float] = None, people_in_need: Optional[int] = None,
                              stability_index: Optional[float] = None) -> Dict[str, Any]:
        metrics = self.get_underfunding_metrics(country, year)
        if category:
            metrics["Category"] = category
        if funding_gap_usd is not None:
            metrics["Funding_Gap_USD"] = float(max(0.0, funding_gap_usd))
        if people_in_need is not None:
            metrics["People_in_Need"] = int(max(0, people_in_need))
        if stability_index is not None:
            metrics["Stability_Index"] = float(max(0.3, min(1.2, stability_index)))

        first = self.fetch_analogous_solutions(
            metrics["Country"],
            metrics["Category"],
            metrics["Year"],
            metrics["Funding_Gap_USD"],
            metrics["People_in_Need"],
            metrics["Stability_Index"],
        )

        base = self.allocate_and_predict(metrics, first)

        refine_payload = {
            "metrics": metrics,
            "simulation": base,
            "instructions": "Refine Solutions for Local Context",
        }
        refined = self._groq_json(
            "You refine humanitarian intervention packages for local implementation constraints. Output JSON only.",
            json.dumps(refine_payload),
        )

        quantify_payload = {
            "metrics": metrics,
            "refined_simulation": refined,
            "instructions": "Quantify Final Success Likelihood",
        }
        quantified = self._groq_json(
            "You quantify final humanitarian package likelihood and impact. Output JSON only.",
            json.dumps(quantify_payload),
        )

        impact_score = quantified.get("overall_impact_score", base["package_success_score"])
        try:
            impact_score = float(impact_score)
        except (TypeError, ValueError):
            impact_score = float(base["package_success_score"])
        impact_score = max(0.0, min(100.0, impact_score))

        return {
            "summary": first.get("summary", ""),
            "Reasoning": first.get("Reasoning", first.get("reasoning", "")),
            "proposed_solutions": base["proposed_solutions"],
            "overall_impact_score": round(impact_score, 2),
            "country": metrics["Country"],
            "year": metrics["Year"],
            "crisis_type": metrics["Category"],
            "funding_gap_usd": round(metrics["Funding_Gap_USD"], 2),
            "underfunding_percentage": round(metrics["Underfunding_Percentage"], 2),
            "people_in_need": metrics["People_in_Need"],
            "stability_index": metrics["Stability_Index"],
        }


NEEDS_DF = _build_needs_df()
SIMULATOR = HumanitarianSim(NEEDS_DF, SOLUTIONS_DATABASE)

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


def _fetch_live_news(country: str, crisis: str, limit: int = 3) -> List[Dict[str, Any]]:
    """
    Pull live news from Google News RSS so links are real and clickable.
    """
    q = quote_plus(f"{country} {crisis} humanitarian")
    rss_url = f"https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"
    try:
        with urlopen(rss_url, timeout=8) as resp:
            xml_data = resp.read()
    except Exception:
        return []

    try:
        root = ET.fromstring(xml_data)
    except Exception:
        return []

    items = []
    channel = root.find("channel")
    if channel is None:
        return []

    for item in channel.findall("item")[: max(1, min(limit, 8))]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        source = "Google News"

        source_node = item.find("{http://search.yahoo.com/mrss/}source")
        if source_node is not None and (source_node.text or "").strip():
            source = source_node.text.strip()

        if not title or not link:
            continue
        items.append({
            "title": title,
            "url": link,
            "source": source,
            "summary": f"Live coverage related to {country} · {crisis}.",
            "imageQuery": f"{country} humanitarian crisis",
        })
    return items


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
    return jsonify({
        'status': 'healthy',
        'h3_available': H3_AVAILABLE,
        'groq_available': GROQ_AVAILABLE,
        'groq_key_configured': bool(os.getenv("GROQ_API_KEY")),
    }), 200


@app.route('/api/news/search', methods=['GET'])
def news_search():
    country = (request.args.get("country") or "").strip()
    crisis = (request.args.get("crisis") or "humanitarian crisis").strip()
    limit = int(request.args.get("limit", 3))

    if not country:
        return jsonify({"error": "country is required"}), 400

    results = _fetch_live_news(country, crisis, limit=limit)
    return jsonify({"articles": results, "count": len(results)}), 200


@app.route('/api/identify-category', methods=['POST'])
def identify_category():
    """
    Identify the primary humanitarian crisis category for a given country using Groq AI.
    Expected payload:
    {
        "country": "<country name>"
    }
    """
    payload = request.get_json(silent=True) or {}
    country = payload.get("country")
    
    if not country:
        return jsonify({"error": "country is required"}), 400
    
    try:
        category = SIMULATOR.identify_humanitarian_category(country)
        return jsonify({
            "country": country,
            "category": category
        }), 200
    except Exception as exc:
        print(f"[ERROR] identify_category failed: {exc}")
        return jsonify({"error": str(exc), "country": country}), 500


@app.route('/api/un-solution', methods=['POST'])
def get_un_solution():
    """
    Fetch a UN solution for a country's humanitarian crisis category.
    Expected payload:
    {
        "country": "<country name>",
        "category": "<category: WASH, Health, Nutrition, Protection, Education>"
    }
    """
    payload = request.get_json(silent=True) or {}
    country = payload.get("country")
    category = payload.get("category")
    
    if not country or not category:
        return jsonify({"error": "country and category are required"}), 400
    
    try:
        solution_data = SIMULATOR.fetch_un_solution(country, category)
        return jsonify({
            "country": country,
            "category": category,
            "analogous_country": solution_data.get("analogous_country"),
            "solution": solution_data.get("solution"),
            "likelihood": solution_data.get("likelihood"),
        }), 200
    except Exception as exc:
        print(f"[ERROR] get_un_solution failed: {exc}")
        return jsonify({"error": str(exc), "country": country, "category": category}), 500


@app.route('/api/databricks/predict', methods=['POST'])
def databricks_predict():
    print("=" * 70)
    print("[BACKEND] [databricks_predict] ENDPOINT CALLED")
    print("=" * 70)
    print(f"[BACKEND] Request method: {request.method}")
    print(f"[BACKEND] Request URL: {request.url}")
    print(f"[BACKEND] Request headers: {dict(request.headers)}")
    
    payload = request.get_json(silent=True) or {}
    print(f"[BACKEND] Request payload: {json.dumps(payload, indent=2)}")
    
    # Get Databricks credentials from environment
    databricks_token = os.getenv("DATABRICKS_TOKEN")
    databricks_endpoint = os.getenv("DATABRICKS_ENDPOINT")
    
    print(f"[BACKEND] Databricks token present: {bool(databricks_token)}")
    print(f"[BACKEND] Databricks endpoint: {databricks_endpoint}")
    
    if not databricks_token:
        print("[BACKEND] ERROR: DATABRICKS_TOKEN not found in environment!")
        return jsonify({"error": "DATABRICKS_TOKEN not configured"}), 500
    
    if not databricks_endpoint:
        print("[BACKEND] ERROR: DATABRICKS_ENDPOINT not found in environment!")
        return jsonify({"error": "DATABRICKS_ENDPOINT not configured"}), 500
    
    try:
        try:
            import requests
            from requests.exceptions import Timeout as RequestsTimeout, ConnectionError as RequestsConnectionError, HTTPError as RequestsHTTPError
            HAS_REQUESTS = True
        except ImportError:
            HAS_REQUESTS = False
            RequestsTimeout = None
            RequestsConnectionError = None
            RequestsHTTPError = None
            import urllib.request
            import urllib.error
        
        print(f"[BACKEND] Making request to Databricks endpoint: {databricks_endpoint}")
        print(f"[BACKEND] Request payload: {json.dumps(payload, indent=2)}")
        
        if HAS_REQUESTS:
            # Use requests library if available (better error handling)
            # Increased timeout for Databricks serving endpoints which can take longer
            print(f"[BACKEND] Sending POST request to Databricks (timeout: 60s)...")
            response = requests.post(
                databricks_endpoint,
                json=payload,
                headers={
                    'Authorization': f'Bearer {databricks_token}',
                    'Content-Type': 'application/json',
                },
                timeout=(10, 60)  # (connect timeout, read timeout) - 60s for model inference
            )
            print(f"[BACKEND] Databricks response status: {response.status_code}")
            print(f"[BACKEND] Databricks response headers: {dict(response.headers)}")
            
            if response.status_code != 200:
                print(f"[BACKEND] ERROR: HTTP {response.status_code}")
                print(f"[BACKEND] Error body: {response.text}")
                print("=" * 70)
                return jsonify({"error": f"Databricks API error: {response.status_code}", "details": response.text}), response.status_code
            
            result = response.json()
            print(f"[BACKEND] Databricks response: {json.dumps(result, indent=2)}")
            print("=" * 70)
            return jsonify(result), 200
        else:
            # Fallback to urllib
            req = urllib.request.Request(
                databricks_endpoint,
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    'Authorization': f'Bearer {databricks_token}',
                    'Content-Type': 'application/json',
                },
                method='POST'
            )
            
            with urllib.request.urlopen(req, timeout=60) as response:
                result = json.loads(response.read().decode('utf-8'))
                print(f"[BACKEND] Databricks response status: {response.status}")
                print(f"[BACKEND] Databricks response: {json.dumps(result, indent=2)}")
                print("=" * 70)
                return jsonify(result), 200
            
    except RequestsTimeout as e:
        print(f"[BACKEND] ERROR: Request timeout - Databricks took too long to respond")
        print(f"[BACKEND] Timeout details: {str(e)}")
        print("=" * 70)
        return jsonify({
            "error": "Databricks request timeout",
            "message": "The prediction request took too long to complete. The model may be processing a complex request.",
            "details": str(e)
        }), 504
    except RequestsConnectionError as e:
        print(f"[BACKEND] ERROR: Connection error - Could not reach Databricks")
        print(f"[BACKEND] Connection details: {str(e)}")
        print("=" * 70)
        return jsonify({
            "error": "Databricks connection error",
            "message": "Could not establish connection to Databricks endpoint.",
            "details": str(e)
        }), 503
    except RequestsHTTPError as e:
        print(f"[BACKEND] ERROR: HTTP {e.response.status_code}: {e.response.reason}")
        try:
            error_body = e.response.json()
        except:
            error_body = e.response.text
        print(f"[BACKEND] Error body: {error_body}")
        print("=" * 70)
        return jsonify({
            "error": f"Databricks API error: {e.response.status_code}",
            "details": error_body
        }), e.response.status_code
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if hasattr(e, 'read') else "No error body"
        print(f"[BACKEND] ERROR: HTTP {e.code}: {e.reason}")
        print(f"[BACKEND] Error body: {error_body}")
        print("=" * 70)
        return jsonify({"error": f"Databricks API error: {e.code} {e.reason}", "details": error_body}), e.code
    except Exception as exc:
        print(f"[BACKEND] ERROR: {type(exc).__name__}: {str(exc)}")
        import traceback
        traceback.print_exc()
        print("=" * 70)
        return jsonify({
            "error": "Internal server error",
            "message": str(exc),
            "type": type(exc).__name__
        }), 500


@app.route('/api/solutions/simulate', methods=['POST'])
def simulate_solutions():
    payload = request.get_json(silent=True) or {}
    country = payload.get("country")
    year = int(payload.get("year", 2026))
    category = payload.get("category")
    funding_gap_usd = payload.get("funding_gap_usd")
    people_in_need = payload.get("people_in_need")
    stability_index = payload.get("stability_index")

    if not country:
        return jsonify({"error": "country is required"}), 400

    try:
        result = SIMULATOR.generate_final_report(
            country=country,
            year=year,
            category=category,
            funding_gap_usd=funding_gap_usd,
            people_in_need=people_in_need,
            stability_index=stability_index,
        )
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0')
