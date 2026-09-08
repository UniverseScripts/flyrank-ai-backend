import pytest
import sys
from pathlib import Path
from httpx import AsyncClient, ASGITransport
import inngest._internal.server_lib as server_lib

W6_DIR = Path(__file__).resolve().parent.parent / "w6-first-background-job"
if str(W6_DIR) not in sys.path:
    sys.path.insert(0, str(W6_DIR))

for mod in list(sys.modules.keys()):
    if mod in ("settings", "settings.config", "main"):
        del sys.modules[mod]

from main import app, inngest_client


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "ok"}


from unittest.mock import AsyncMock, patch
import httpx
import inngest._internal.net as inngest_net


@pytest.mark.asyncio
async def test_inngest_registration_put():
    fake_res = httpx.Response(200, json={"status": 200, "modified": True})
    with patch.object(inngest_net, "fetch_with_thready_safety", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = fake_res
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.put("/api/inngest")
            assert res.status_code == 200
            data = res.json()
            assert "modified" in data


@pytest.mark.asyncio
async def test_say_hello_execution_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Step 1: Initial event trigger (test/hello)
        req_step1 = server_lib.ServerRequest(
            event={"name": "test/hello", "data": {}},
            events=[{"name": "test/hello", "data": {}}],
            steps={},
            ctx=server_lib.ServerRequestCtx(
                run_id="run-test-stage1",
                attempt=0,
                disable_immediate_execution=False,
                stack=server_lib.ServerRequestCtxStack(stack=[]),
            ),
            use_api=False,
        )

        res1 = await ac.post(
            "/api/inngest?fnId=report-api-say-hello&stepId=step",
            content=req_step1.model_dump_json(),
            headers={"content-type": "application/json"},
        )
        assert res1.status_code == 206
        step_output = res1.json()
        assert isinstance(step_output, list)
        assert len(step_output) == 1
        assert step_output[0]["displayName"] == "sleep-for-5s"
        assert step_output[0]["op"] == "Sleep"
        sleep_step_id = step_output[0]["id"]

        # Step 2: Resumed execution after sleep with memoized step
        req_step2 = server_lib.ServerRequest(
            event={"name": "test/hello", "data": {}},
            events=[{"name": "test/hello", "data": {}}],
            steps={sleep_step_id: {"data": None}},
            ctx=server_lib.ServerRequestCtx(
                run_id="run-test-stage1",
                attempt=0,
                disable_immediate_execution=False,
                stack=server_lib.ServerRequestCtxStack(stack=[]),
            ),
            use_api=False,
        )

        res2 = await ac.post(
            "/api/inngest?fnId=report-api-say-hello&stepId=step",
            content=req_step2.model_dump_json(),
            headers={"content-type": "application/json"},
        )
        assert res2.status_code == 200
        assert res2.json() == "Hello from the background!"
