def generate_contract_draft(buyer: str, seller: str, rebar_grade: str, tonnage: float, price_per_ton: float) -> str:
    """
    Generates contract draft markdown.
    """
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
    return f"""# Sales Roadmap for {company_name}

## Target Market: {target_market}

1. Identify local distributors and contractors in {target_market}.
2. Pitch custom grade solutions and competitive volume pricing.
3. Establish logistics pipelines and delivery milestones.
"""
