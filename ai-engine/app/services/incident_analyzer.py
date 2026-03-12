import json
from app.llm.client import ClaudeClient
from app.llm.prompts import INCIDENT_ANALYZER_SYSTEM, INCIDENT_ANALYZER_USER
from app.llm.structured_output import parse_response
from app.models.incident import AnalyzeRequest, AnalyzeResponse


class IncidentAnalyzer:
    def __init__(self, claude: ClaudeClient) -> None:
        self._claude = claude

    async def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        user_prompt = INCIDENT_ANALYZER_USER.format(
            cluster_id=request.cluster_id,
            context_window_minutes=request.context_window_minutes,
            signals_json=json.dumps(request.signals, indent=2),
        )
        raw = await self._claude.complete_json(
            system=INCIDENT_ANALYZER_SYSTEM,
            user=user_prompt,
        )
        return parse_response(raw, AnalyzeResponse)
