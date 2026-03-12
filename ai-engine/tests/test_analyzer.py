import pytest
from app.services.incident_analyzer import IncidentAnalyzer
from app.models.incident import AnalyzeRequest


MOCK_ANALYSIS = {
    "incident_title": "OOMKilled pods in payment-service",
    "severity": "high",
    "root_causes": [
        {
            "component": "payment-service",
            "description": "Memory limit too low for traffic spike",
            "confidence": 0.92,
        }
    ],
    "ai_summary": "The payment-service pods are being OOMKilled due to insufficient memory limits.",
    "remediation_steps": [
        {
            "order": 1,
            "action": "Increase memory limit",
            "command": "kubectl set resources deployment/payment-service --limits=memory=512Mi",
            "expected_outcome": "Pods stabilize",
        }
    ],
    "related_services": ["payment-service", "order-service"],
    "estimated_impact": "Checkout failures for ~15% of users",
    "confidence_score": 0.88,
}


@pytest.mark.asyncio
async def test_analyze_returns_structured_response(mock_claude):
    mock_claude.complete_json.return_value = MOCK_ANALYSIS
    analyzer = IncidentAnalyzer(mock_claude)

    request = AnalyzeRequest(
        cluster_id="cluster-1",
        tenant_id="tenant-1",
        signals={"oom_events": 5, "error_rate": 0.45},
    )
    response = await analyzer.analyze(request)

    assert response.incident_title == "OOMKilled pods in payment-service"
    assert response.severity == "high"
    assert len(response.root_causes) == 1
    assert response.confidence_score == 0.88
    mock_claude.complete_json.assert_called_once()


@pytest.mark.asyncio
async def test_analyze_includes_cluster_in_prompt(mock_claude):
    mock_claude.complete_json.return_value = MOCK_ANALYSIS
    analyzer = IncidentAnalyzer(mock_claude)

    request = AnalyzeRequest(
        cluster_id="prod-cluster",
        tenant_id="tenant-abc",
        signals={"cpu_spike": True},
    )
    await analyzer.analyze(request)

    call_args = mock_claude.complete_json.call_args
    user_prompt = call_args.kwargs.get("user") or call_args.args[1]
    assert "prod-cluster" in user_prompt
