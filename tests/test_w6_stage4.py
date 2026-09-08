import pytest
import sys
from pathlib import Path
from httpx import AsyncClient, ASGITransport
import inngest
import inngest._internal.server_lib as server_lib
from unittest.mock import AsyncMock, patch

W6_DIR = Path(__file__).resolve().parent.parent / "w6-first-background-job"
if str(W6_DIR) not in sys.path:
    sys.path.insert(0, str(W6_DIR))

for mod in list(sys.modules.keys()):
    if mod in ("settings", "settings.config", "main", "schemas", "schemas.reports", "handlers", "handlers.request_validation"):
        del sys.modules[mod]

from main import app, inngest_client, heartbeat


def test_heartbeat_cron_trigger_configured():
    # Verify function is registered with TriggerCron('* * * * *')
    assert hasattr(heartbeat, "_triggers")
    triggers = heartbeat._triggers
    assert len(triggers) == 1
    trigger = triggers[0]
    assert isinstance(trigger, inngest.TriggerCron)
    assert trigger.cron == "* * * * *"


@pytest.mark.asyncio
async def test_heartbeat_summary_calculation():
    # Seed app.state.reports_map with known states
    app.state.reports_map = {
        "rep-1": {"id": "rep-1", "topic": "ai", "status": "pending"},
        "rep-2": {"id": "rep-2", "topic": "databases", "status": "pending"},
        "rep-3": {"id": "rep-3", "topic": "clouds", "status": "done", "result": "summary"},
        "rep-4": {"id": "rep-4", "topic": "security", "status": "done", "result": "summary"},
        "rep-5": {"id": "rep-5", "topic": "networks", "status": "done", "result": "summary"},
        "rep-6": {"id": "rep-6", "topic": "fail", "status": "failed"},
    }

    # 1. Direct handler test
    summary = await heartbeat._handler(None)
    assert summary == "Heartbeat: 2 pending, 3 done, 1 failed"

    # 2. Inngest serve endpoint execution test
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        req = server_lib.ServerRequest(
            event={"name": "inngest/scheduled.timer", "data": {}},
            events=[{"name": "inngest/scheduled.timer", "data": {}}],
            steps={},
            ctx=server_lib.ServerRequestCtx(
                run_id="run-cron-test",
                attempt=0,
                disable_immediate_execution=False,
                stack=server_lib.ServerRequestCtxStack(stack=[]),
            ),
            use_api=False,
        )
        res = await ac.post(
            "/api/inngest?fnId=report-api-heartbeat&stepId=step",
            content=req.model_dump_json(),
            headers={"content-type": "application/json"},
        )
        assert res.status_code == 200
        assert res.json() == "Heartbeat: 2 pending, 3 done, 1 failed"


@pytest.mark.asyncio
async def test_failed_report_status_tracked_by_heartbeat():
    app.state.reports_map.clear()
    with patch.object(inngest_client, "send", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = ["mock-event-id"]
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Initiate fail report
            res = await ac.post("/reports", json={"topic": "fail"})
            assert res.status_code == 202
            report_id = res.json()["id"]

            # Initial status is pending
            assert app.state.reports_map[report_id]["status"] == "pending"

            # 2. Simulate step 1 (sleep)
            req_step1 = server_lib.ServerRequest(
                event={"name": "report/requested", "data": {"id": report_id, "topic": "fail"}},
                events=[{"name": "report/requested", "data": {"id": report_id, "topic": "fail"}}],
                steps={},
                ctx=server_lib.ServerRequestCtx(
                    run_id="run-stage4-fail-test",
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
            sleep_step_id = res_step1.json()[0]["id"]

            # 3. Simulate step 2 (build-report step which fails)
            req_step2 = server_lib.ServerRequest(
                event={"name": "report/requested", "data": {"id": report_id, "topic": "fail"}},
                events=[{"name": "report/requested", "data": {"id": report_id, "topic": "fail"}}],
                steps={sleep_step_id: {"data": None}},
                ctx=server_lib.ServerRequestCtx(
                    run_id="run-stage4-fail-test",
                    attempt=0,
                    disable_immediate_execution=False,
                    stack=server_lib.ServerRequestCtxStack(stack=[]),
                ),
                use_api=False,
            )
            await ac.post(
                "/api/inngest?fnId=report-api-make-report&stepId=step",
                content=req_step2.model_dump_json(),
                headers={"content-type": "application/json"},
            )

            # Assert status updated to 'failed' in app.state.reports_map
            assert app.state.reports_map[report_id]["status"] == "failed"

            # 4. Trigger heartbeat and verify the failed count is tracked
            summary = await heartbeat._handler(None)
            assert summary == "Heartbeat: 0 pending, 0 done, 1 failed"
