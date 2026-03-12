import pytest
from app.services.query_engine import QueryEngine
from app.models.query import QueryRequest


@pytest.mark.asyncio
async def test_query_returns_answer(mock_claude, mock_ch):
    mock_claude.complete.side_effect = [
        "SELECT avg(metric_value) FROM infrawhisper.metrics WHERE cluster_id = 'c1'",
        "Average CPU usage is 45% over the last hour.",
    ]
    mock_ch.execute.return_value = [{"avg_cpu": 0.45}]

    engine = QueryEngine(mock_claude, mock_ch)
    request = QueryRequest(
        query="What is the average CPU usage?",
        cluster_id="c1",
        tenant_id="t1",
    )
    response = await engine.run(request)

    assert response.answer != ""
    assert response.sql_used is not None
    assert response.data_points == 1


@pytest.mark.asyncio
async def test_query_handles_sql_error_gracefully(mock_claude, mock_ch):
    mock_claude.complete.return_value = "SELECT * FROM infrawhisper.metrics"
    mock_ch.execute.side_effect = Exception("Connection refused")

    engine = QueryEngine(mock_claude, mock_ch)
    request = QueryRequest(
        query="Show me all metrics",
        cluster_id="c1",
        tenant_id="t1",
    )
    response = await engine.run(request)

    assert response.confidence == 0.0
    assert "couldn't execute" in response.answer.lower()


@pytest.mark.asyncio
async def test_query_rejects_dangerous_sql(mock_claude, mock_ch):
    mock_claude.complete.return_value = "DROP TABLE infrawhisper.metrics"

    engine = QueryEngine(mock_claude, mock_ch)
    request = QueryRequest(
        query="Delete all data",
        cluster_id="c1",
        tenant_id="t1",
    )
    response = await engine.run(request)

    assert response.confidence == 0.0
    mock_ch.execute.assert_not_called()
