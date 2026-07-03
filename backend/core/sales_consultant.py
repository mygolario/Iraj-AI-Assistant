from typing import Generator

from config import (
    LLM_MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    api_key_configured,
)


class LLMError(RuntimeError):
    """Raised when the LLM is unavailable or returns no usable output."""


def get_openrouter_client():
    if not OPENROUTER_API_KEY:
        return None
    try:
        from openai import OpenAI

        return OpenAI(base_url=OPENROUTER_BASE_URL, api_key=OPENROUTER_API_KEY)
    except Exception:
        return None


def _require_client():
    client = get_openrouter_client()
    if client is None:
        if not api_key_configured():
            raise LLMError(
                "OPENROUTER_API_KEY is not configured. Set it in backend/.env to enable AI features."
            )
        raise LLMError("Could not initialize the OpenRouter client.")
    return client


def generate_contract_draft(
    buyer: str, seller: str, rebar_grade: str, tonnage: float, price_per_ton: float
) -> str:
    client = _require_client()
    total_price = tonnage * price_per_ton
    prompt = (
        f"You are a legal and sales expert in steel. Generate a formal contract draft in Markdown between "
        f"buyer '{buyer}' and seller '{seller}' for steel rebar of grade '{rebar_grade}', "
        f"quantity {tonnage} tons, unit price {price_per_ton} USD/ton. "
        f"Calculate the total contract price: {total_price} USD. "
        f"Include standard terms like specification of goods, delivery, and payment, and lines for signature."
    )
    try:
        response = client.chat.completions.create(
            model=LLM_MODEL, messages=[{"role": "user", "content": prompt}]
        )
        draft = response.choices[0].message.content
        if draft and draft.strip():
            return draft
    except Exception as e:
        raise LLMError(f"LLM call failed while drafting contract: {e}")
    raise LLMError("LLM returned an empty contract draft.")


def generate_sales_roadmap(company_name: str, target_market: str) -> str:
    client = _require_client()
    prompt = (
        f"Generate a professional, structured sales roadmap in Markdown for steel manufacturer/trader "
        f"'{company_name}' targeting the market '{target_market}'. "
        f"Provide clear, actionable steps for identifying distributors, pitching solutions, "
        f"establishing logistics pipelines, and setting milestones."
    )
    try:
        response = client.chat.completions.create(
            model=LLM_MODEL, messages=[{"role": "user", "content": prompt}]
        )
        roadmap = response.choices[0].message.content
        if roadmap and roadmap.strip():
            return roadmap
    except Exception as e:
        raise LLMError(f"LLM call failed while generating roadmap: {e}")
    raise LLMError("LLM returned an empty roadmap.")


def consult_sales(chat_history: list[dict], system_prompt: str) -> str:
    client = _require_client()
    messages = [{"role": "system", "content": system_prompt}]
    for msg in chat_history:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    try:
        response = client.chat.completions.create(model=LLM_MODEL, messages=messages)
        ans = response.choices[0].message.content
        if ans and ans.strip():
            return ans
    except Exception as e:
        raise LLMError(f"LLM call failed during consultation: {e}")
    raise LLMError("LLM returned an empty response.")


def consult_sales_stream(
    chat_history: list[dict], system_prompt: str
) -> Generator[str, None, None]:
    """Yields streamed content delta strings for SSE. Raises LLMError on failure."""
    client = _require_client()
    messages = [{"role": "system", "content": system_prompt}]
    for msg in chat_history:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    try:
        stream = client.chat.completions.create(
            model=LLM_MODEL, messages=messages, stream=True
        )
        for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except Exception as e:
        raise LLMError(f"LLM stream failed: {e}")
