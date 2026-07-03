import os
from openai import OpenAI

def get_openrouter_client():
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        try:
            import streamlit as st
            api_key = st.secrets.get("OPENROUTER_API_KEY")
        except Exception:
            pass
    if not api_key:
        return None
    try:
        return OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key
        )
    except Exception:
        return None

def generate_contract_draft(buyer: str, seller: str, rebar_grade: str, tonnage: float, price_per_ton: float) -> str:
    """
    Generates contract draft markdown.
    """
    client = get_openrouter_client()
    if client:
        try:
            prompt = (
                f"You are a legal and sales expert in steel. Generate a formal contract draft in Markdown between "
                f"buyer '{buyer}' and seller '{seller}' for steel rebar of grade '{rebar_grade}', "
                f"quantity {tonnage} tons, unit price {price_per_ton} USD/ton. "
                f"Calculate the total contract price: {tonnage * price_per_ton} USD. "
                f"Include standard terms like specification of goods, delivery, and payment, and lines for signature."
            )
            response = client.chat.completions.create(
                model="google/gemini-2.5-flash",
                messages=[{"role": "user", "content": prompt}]
            )
            draft = response.choices[0].message.content
            if draft and draft.strip():
                return draft
        except Exception:
            pass

    total_price = tonnage * price_per_ton
    return f"""# Steel Rebar Sales Agreement

**Buyer**: {buyer}
**Seller**: {seller}

## Specification of Goods
- **Product**: Steel Rebar
- **Grade**: {rebar_grade}
- **Quantity**: {tonnage} tons
- **Unit Price**: {price_per_ton} USD/ton
- **Total Contract Price**: {total_price} USD

Signed by:
_________________ (Buyer)
_________________ (Seller)
"""

def generate_sales_roadmap(company_name: str, target_market: str) -> str:
    """
    Generates a sales roadmap markdown.
    """
    client = get_openrouter_client()
    if client:
        try:
            prompt = (
                f"Generate a professional, structured sales roadmap in Markdown for steel manufacturer/trader '{company_name}' "
                f"targeting the market '{target_market}'. "
                f"Provide clear, actionable steps for identifying distributors, pitching solutions, establishing logistics pipelines, and setting milestones."
            )
            response = client.chat.completions.create(
                model="google/gemini-2.5-flash",
                messages=[{"role": "user", "content": prompt}]
            )
            roadmap = response.choices[0].message.content
            if roadmap and roadmap.strip():
                return roadmap
        except Exception:
            pass

    return f"""# Sales Roadmap for {company_name}

## Target Market: {target_market}

1. Identify local distributors and contractors in {target_market}.
2. Pitch custom grade solutions and competitive volume pricing.
3. Establish logistics pipelines and delivery milestones.
"""

def consult_sales(chat_history: list[dict], system_prompt: str) -> str | None:
    """
    Communicates with google/gemini-2.5-flash via OpenRouter.
    """
    client = get_openrouter_client()
    if not client:
        return None
    try:
        messages = [{"role": "system", "content": system_prompt}]
        for msg in chat_history:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        response = client.chat.completions.create(
            model="google/gemini-2.5-flash",
            messages=messages
        )
        ans = response.choices[0].message.content
        if ans and ans.strip():
            return ans
    except Exception:
        pass
    return None
