from fastapi import APIRouter, Depends, HTTPException
from app.models.cost import OptimizeRequest, OptimizeResponse
from app.services.cost_optimizer import CostOptimizer
from app.llm.client import ClaudeClient
from app.utils.clickhouse import get_clickhouse_client, ClickHouseClient

router = APIRouter(prefix="/optimize", tags=["optimize"])


def get_optimizer(
    ch: ClickHouseClient = Depends(get_clickhouse_client),
) -> CostOptimizer:
    return CostOptimizer(ClaudeClient(), ch)


@router.post("", response_model=OptimizeResponse)
async def optimize_costs(
    request: OptimizeRequest,
    optimizer: CostOptimizer = Depends(get_optimizer),
) -> OptimizeResponse:
    try:
        return await optimizer.optimize(request)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Optimization failed: {e}")
