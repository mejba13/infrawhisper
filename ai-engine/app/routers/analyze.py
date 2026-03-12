from fastapi import APIRouter, Depends, HTTPException
from app.models.incident import AnalyzeRequest, AnalyzeResponse
from app.services.incident_analyzer import IncidentAnalyzer
from app.llm.client import ClaudeClient

router = APIRouter(prefix="/analyze", tags=["analyze"])


def get_analyzer() -> IncidentAnalyzer:
    return IncidentAnalyzer(ClaudeClient())


@router.post("", response_model=AnalyzeResponse)
async def analyze_incident(
    request: AnalyzeRequest,
    analyzer: IncidentAnalyzer = Depends(get_analyzer),
) -> AnalyzeResponse:
    try:
        return await analyzer.analyze(request)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {e}")
