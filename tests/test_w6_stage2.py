import pytest
import sys
import time
from pathlib import Path
from httpx import AsyncClient, ASGITransport
import inngest._internal.server_lib as server_lib

W6_DIR = Path(__file__).resolve().parent.parent / "w6-first-background-job"
if str(W6_DIR) not in sys.path:
    sys.path.insert(0, str(W6_DIR))

for mod in list(sys.modules.keys()):
    if mod in ("settings", "settings.config", "main", "schemas", "schemas.reports"):
        del sys.modules[mod]

from main import app, inngest_client


from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_post_reports_instant_202():
    with patch.object(inngest_client, "send", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = ["mock-event-id"]
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            start = time.time()
            res = await ac.post("/reports", json={"topic": "cats"})
            elapsed = time.time() - start

            # Must respond in well under 1 second with 202 Accepted
            assert elapsed < 1.0, f"Request took too long: {elapsed}s"
            assert res.status_code == 202
            data = res.json()
            assert "id" in data
            assert data["status"] == "pending"
            mock_send.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_reports_polling_lifecycle():
    with patch.object(inngest_client, "send", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = ["mock-event-id"]
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Create a new report
            res_post = await ac.post("/reports", json={"topic": "quantum-computing"})
            assert res_post.status_code == 202
            report_id = res_post.json()["id"]

            # 2. Immediate polling should return pending
            res_pending = await ac.get(f"/reports/{report_id}")
            assert res_pending.status_code == 200
            data_pending = res_pending.json()
            assert data_pending["id"] == report_id
            assert data_pending["topic"] == "quantum-computing"
            assert data_pending["status"] == "pending"

            # 3. Simulate Inngest Step 1: Slow work sleep (8 seconds)
            req_step1 = server_lib.ServerRequest(
                event={"name": "report/requested", "data": {"id": report_id, "topic": "quantum-computing"}},
                events=[{"name": "report/requested", "data": {"id": report_id, "topic": "quantum-computing"}}],
                steps={},
                ctx=server_lib.ServerRequestCtx(
                    run_id="run-stage2-test",
                    attempt=0,
                    disable_immediate_execution=False,
                    stack=server_lib.ServerRequestCtxStack(stack=[]),
                ),
                use_api=False,
            )

            res_inngest_step1 = await ac.post(
                "/api/inngest?fnId=report-api-make-report&stepId=step",
                content=req_step1.model_dump_json(),
                headers={"content-type": "application/json"},
            )
            assert res_inngest_step1.status_code == 206
            step_output = res_inngest_step1.json()
            assert step_output[0]["displayName"] == "do-the-slow-work"
            assert step_output[0]["op"] == "Sleep"
            sleep_step_id = step_output[0]["id"]

            # 4. Simulate Inngest Step 2: Resume with memoized sleep step
            req_step2 = server_lib.ServerRequest(
                event={"name": "report/requested", "data": {"id": report_id, "topic": "quantum-computing"}},
                events=[{"name": "report/requested", "data": {"id": report_id, "topic": "quantum-computing"}}],
                steps={sleep_step_id: {"data": None}},
                ctx=server_lib.ServerRequestCtx(
                    run_id="run-stage2-test",
                    attempt=0,
                    disable_immediate_execution=False,
                    stack=server_lib.ServerRequestCtxStack(stack=[]),
                ),
                use_api=False,
            )

            res_inngest_step2 = await ac.post(
                "/api/inngest?fnId=report-api-make-report&stepId=step",
                content=req_step2.model_dump_json(),
                headers={"content-type": "application/json"},
            )
            # Inngest returns 206 with StepRun output for build-report
            assert res_inngest_step2.status_code == 206
            build_step_output = res_inngest_step2.json()
            assert build_step_output[0]["displayName"] == "build-report"
            assert build_step_output[0]["op"] == "StepRun"

            # 5. Subsequent polling of GET /reports/{id} should report done with result
            res_done = await ac.get(f"/reports/{report_id}")
            assert res_done.status_code == 200
            data_done = res_done.json()
            assert data_done["status"] == "done"
            assert "quantum-computing" in data_done["result"]


@pytest.mark.asyncio
async def test_get_reports_not_found():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/reports/non-existent-id-9999")
        assert res.status_code == 404
        assert res.json()["detail"] == "Report not found"
