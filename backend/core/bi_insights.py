"""AI narrative + Q&A over BI aggregates — reuses the OpenRouter client used
by core.sales_consultant. Prompts are built from aggregated stats, never raw
row dumps, to keep them small and avoid leaking excessive row-level detail."""

import json

from config import LLM_MODEL, api_key_configured
from core.sales_consultant import LLMError, get_openrouter_client


def _require_client():
    client = get_openrouter_client()
    if client is None:
        if not api_key_configured():
            raise LLMError(
                "OPENROUTER_API_KEY is not configured. Set it in backend/.env to enable AI features."
            )
        raise LLMError("Could not initialize the OpenRouter client.")
    return client


def _summarize_for_prompt(bi_result: dict) -> str:
    payload = {
        "kpis": bi_result.get("kpis"),
        "byGrade": (bi_result.get("byGrade") or [])[:8],
        "byCustomer": (bi_result.get("byCustomer") or [])[:8],
        "byRep": (bi_result.get("byRep") or [])[:8],
        "byRegion": (bi_result.get("byRegion") or [])[:8],
        "timeSeries": (bi_result.get("timeSeries") or [])[-12:],
        "forecast": bi_result.get("forecast"),
        "anomalies": (bi_result.get("anomalies") or [])[:8],
        "margin": bi_result.get("margin"),
        "dataQuality": bi_result.get("dataQuality"),
    }
    return json.dumps(payload, ensure_ascii=False)


def generate_bi_narrative(bi_result: dict, language: str = "en") -> str:
    client = _require_client()
    summary = _summarize_for_prompt(bi_result)
    lang_instruction = "Respond in Persian (Farsi)." if language == "fa" else "Respond in English."
    prompt = (
        "You are a sharp sales operations analyst for a steel rebar manufacturer. "
        "Given this JSON summary of a sales dataset's KPIs, breakdowns, trend, forecast and anomalies, "
        "write a concise executive-summary narrative (120-180 words, plain prose, no headers) that: "
        "1) states what's happening (growth/decline, standout grade/customer), "
        "2) calls out the single most important risk or anomaly if any, "
        "3) ends with one concrete, actionable recommendation. "
        f"{lang_instruction}\n\nDATA:\n{summary}"
    )
    try:
        response = client.chat.completions.create(model=LLM_MODEL, messages=[{"role": "user", "content": prompt}])
        text = response.choices[0].message.content
        if text and text.strip():
            return text.strip()
    except Exception as e:
        raise LLMError(f"LLM call failed while generating BI narrative: {e}")
    raise LLMError("LLM returned an empty narrative.")


def answer_bi_question(bi_result: dict, question: str, language: str = "en") -> str:
    client = _require_client()
    summary = _summarize_for_prompt(bi_result)
    lang_instruction = "Respond in Persian (Farsi)." if language == "fa" else "Respond in English."
    prompt = (
        "You are a sales analytics assistant. Answer the user's question strictly using the JSON "
        "sales-data summary below. If the data doesn't contain enough information to answer confidently, "
        "say so plainly instead of guessing. Be concise and use concrete numbers from the data. "
        f"{lang_instruction}\n\nDATA:\n{summary}\n\nQUESTION: {question}"
    )
    try:
        response = client.chat.completions.create(model=LLM_MODEL, messages=[{"role": "user", "content": prompt}])
        text = response.choices[0].message.content
        if text and text.strip():
            return text.strip()
    except Exception as e:
        raise LLMError(f"LLM call failed while answering BI question: {e}")
    raise LLMError("LLM returned an empty answer.")
