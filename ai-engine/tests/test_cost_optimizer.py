import pytest
from app.services.cost_optimizer import CostOptimizer
from app.models.cost import OptimizeRequest


MOCK_COST_ROWS = [
    {
        "namespace": "production",
        "workload": "api-server",
        "resource_type": "memory",
        "avg_requested": 1024.0,
        "avg_used": 256.0,
        "total_cost_usd": 45.0,
        "waste_pct": 75.0,
    }
]

MOCK_OPTIMIZE_RESPONSE = {
    "total_estimated_monthly_savings_usd": 33.75,
    "recommendations": [
        {
            "namespace": "production",
            "workload": "api-server",
            "resource_type": "memory",
            "current_request": 1024.0,
            "recommended_request": 320.0,
            "current_limit": None,
            "recommended_limit": 400.0,
            "waste_percentage": 75.0,
            "estimated_monthly_savings_usd": 33.75,
            "reason": "Memory usage consistently below 25% of request",
        }
    ],
    "summary": "api-server is significantly over-provisioned for memory.",
    "top_offenders": ["api-server"],
}


@pytest.mark.asyncio
async def test_optimize_returns_recommendations(mock_claude, mock_ch):
    mock_ch.execute.return_value = MOCK_COST_ROWS
    mock_claude.complete_json.return_value = MOCK_OPTIMIZE_RESPONSE

    optimizer = CostOptimizer(mock_claude, mock_ch)
    request = OptimizeRequest(cluster_id="c1", tenant_id="t1")
    response = await optimizer.optimize(request)

    assert response.total_estimated_monthly_savings_usd == 33.75
    assert len(response.recommendations) == 1
    assert response.recommendations[0].workload == "api-server"


@pytest.mark.asyncio
async def test_optimize_returns_empty_when_no_waste(mock_claude, mock_ch):
    mock_ch.execute.return_value = []

    optimizer = CostOptimizer(mock_claude, mock_ch)
    request = OptimizeRequest(cluster_id="c1", tenant_id="t1")
    response = await optimizer.optimize(request)

    assert response.total_estimated_monthly_savings_usd == 0.0
    assert response.recommendations == []
    mock_claude.complete_json.assert_not_called()
