import pytest
import sys
from pathlib import Path
from httpx import AsyncClient, ASGITransport
import inngest._internal.server_lib as server_lib
from unittest.mock import AsyncMock, patch

W6_DIR = Path(__file__).resolve().parent.parent / "w6-first-background-job"
if str(W6_DIR) not in sys.path:
    sys.path.insert(0, str(W6_DIR))

for mod in list(sys.modules.keys()):
    if mod in ("settings", "settings.config", "main", "schemas", "schemas.reports", "handlers", "handlers.request_validation"):
        del sys.modules[mod]

from main import app, inngest_client, make_report


@pytest.mark.asyncio
async def test_missing_topic_returns_400():
    with patch.object(inngest_client, "send", new_callable=AsyncMock) as mock_send:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/reports", json={})
            assert res.status_code == 400
            assert res.json()["detail"] == "Missing topic"
            mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_empty_or_whitespace_topic_returns_400():
    with patch.object(inngest_client, "send", new_callable=AsyncMock) as mock_send:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # Empty string
            res_empty = await ac.post("/reports", json={"topic": ""})
            assert res_empty.status_code == 400
            assert res_empty.json()["detail"] == "Missing topic"

            # Whitespace string
            res_space = await ac.post("/reports", json={"topic": "   "})
            assert res_space.status_code == 400
            assert res_space.json()["detail"] == "Missing topic"

            mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_invalid_payload_type_returns_400():
    with patch.object(inngest_client, "send", new_callable=AsyncMock) as mock_send:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/reports", json={"topic": ["not", "a", "string"]})
            assert res.status_code == 400
            assert res.json()["detail"] == "Missing topic"
            mock_send.assert_not_called()


def test_make_report_retries_configured():
    # Verify function configuration specifies 2 retries
    assert make_report._opts.retries == 2


@pytest.mark.asyncio
async def test_fail_topic_raises_error_in_build_report_step():
    with patch.object(inngest_client, "send", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = ["mock-event-id"]
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Initiate report with topic='fail'
            res = await ac.post("/reports", json={"topic": "fail"})
            assert res.status_code == 202
            report_id = res.json()["id"]

            # 2. Step 1: Initial call yields sleep step ("do-the-slow-work")
            req_step1 = server_lib.ServerRequest(
                event={"name": "report/requested", "data": {"id": report_id, "topic": "fail"}},
                events=[{"name": "report/requested", "data": {"id": report_id, "topic": "fail"}}],
                steps={},
                ctx=server_lib.ServerRequestCtx(
                    run_id="run-stage3-fail-test",
                    attempt=0,
                    disable_immediate_execution=False,
                    stack=server_lib.ServerRequestCtxStack(stack=[]),
                ),
                use_api=False,
            )
            res_step1 = await ac.post(
                "/api/inngest?fnId=report-api-make-report&stepId=step",
                content=req_step1.model_dump_json(),
                headers={"content-type": "application/json"},
            )
            assert res_step1.status_code == 206
            step_output = res_step1.json()
            assert step_output[0]["displayName"] == "do-the-slow-work"
            sleep_step_id = step_output[0]["id"]

            # 3. Step 2: Memoized sleep step completed, build-report runs and fails
            req_step2 = server_lib.ServerRequest(
                event={"name": "report/requested", "data": {"id": report_id, "topic": "fail"}},
                events=[{"name": "report/requested", "data": {"id": report_id, "topic": "fail"}}],
                steps={sleep_step_id: {"data": None}},
                ctx=server_lib.ServerRequestCtx(
                    run_id="run-stage3-fail-test",
                    attempt=0,
                    disable_immediate_execution=False,
                    stack=server_lib.ServerRequestCtxStack(stack=[]),
                ),
                use_api=False,
            )
            res_step2 = await ac.post(
                "/api/inngest?fnId=report-api-make-report&stepId=step",
                content=req_step2.model_dump_json(),
                headers={"content-type": "application/json"},
            )

            # In Inngest SDK, step execution returns 206 with StepError op or error details
            step_data = res_step2.json()
            assert "The report oven is broken!" in str(step_data), f"Got: {res_step2.status_code} {step_data}"
