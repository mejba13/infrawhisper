import json
from app.llm.client import ClaudeClient
from app.llm.prompts import COST_OPTIMIZER_SYSTEM, COST_OPTIMIZER_USER
from app.llm.structured_output import parse_response
from app.models.cost import OptimizeRequest, OptimizeResponse
from app.utils.clickhouse import ClickHouseClient


class CostOptimizer:
    def __init__(self, claude: ClaudeClient, ch: ClickHouseClient) -> None:
        self._claude = claude
        self._ch = ch

    async def optimize(self, request: OptimizeRequest) -> OptimizeResponse:
        namespace_filter = ""
        if request.namespace:
            namespace_filter = f"AND namespace = '{request.namespace}'"

        query = f"""
            SELECT
                namespace,
                workload,
                resource_type,
                avg(requested) AS avg_requested,
                avg(used) AS avg_used,
                sum(cost_usd) AS total_cost_usd,
                (1 - avg(used) / nullIf(avg(requested), 0)) * 100 AS waste_pct
            FROM infrawhisper.costs
            WHERE cluster_id = '{request.cluster_id}'
              AND tenant_id = '{request.tenant_id}'
              {namespace_filter}
              AND date >= today() - INTERVAL {request.time_range_days} DAY
            GROUP BY namespace, workload, resource_type
            HAVING waste_pct > 30
            ORDER BY total_cost_usd DESC
            LIMIT 50
        """
        rows = await self._ch.execute(query)

        if not rows:
            return OptimizeResponse(
                total_estimated_monthly_savings_usd=0.0,
                recommendations=[],
                summary="No significant cost optimization opportunities found in the selected time range.",
                top_offenders=[],
            )

        user_prompt = COST_OPTIMIZER_USER.format(
            cluster_id=request.cluster_id,
            namespace=request.namespace or "all",
            days=request.time_range_days,
            cost_data_json=json.dumps(rows, indent=2, default=str),
        )
        raw = await self._claude.complete_json(
            system=COST_OPTIMIZER_SYSTEM,
            user=user_prompt,
        )
        return parse_response(raw, OptimizeResponse)
