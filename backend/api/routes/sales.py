from fastapi import APIRouter, HTTPException

from api.schemas import ContractRequest, RoadmapRequest
from core.sales_consultant import LLMError, generate_contract_draft, generate_sales_roadmap

router = APIRouter(prefix="/api/sales", tags=["sales"])


@router.post("/contract")
async def contract(req: ContractRequest):
    try:
        markdown = generate_contract_draft(
            req.buyer, req.seller, req.rebar_grade, req.tonnage, req.price_per_ton
        )
    except LLMError as e:
        raise HTTPException(503, str(e))
    return {"markdown": markdown}


@router.post("/roadmap")
async def roadmap(req: RoadmapRequest):
    try:
        markdown = generate_sales_roadmap(req.company_name, req.target_market)
    except LLMError as e:
        raise HTTPException(503, str(e))
    return {"markdown": markdown}
