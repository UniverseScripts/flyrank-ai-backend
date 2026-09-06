import re
import sys
from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport

W7_2_DIR = Path(__file__).resolve().parent.parent / "w7_2"
if str(W7_2_DIR) not in sys.path:
    sys.path.insert(0, str(W7_2_DIR))

from main import app


@pytest.mark.asyncio
async def test_stage4_api_pipeline():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. POST /reports generates a new report
        res_post = await ac.post("/reports", json={"force": True})
        assert res_post.status_code == 201
        data_post = res_post.json()
        assert "id" in data_post
        assert data_post["file"] == f"/reports/{data_post['id']}/file"
        report_id = data_post["id"]

        # 2. GET /reports/:id returns metadata
        res_meta = await ac.get(f"/reports/{report_id}")
        assert res_meta.status_code == 200
        data_meta = res_meta.json()
        assert data_meta["id"] == report_id
        assert data_meta["file"] == f"/reports/{report_id}/file"

        # 3. GET /reports/:id/file downloads binary PDF
        res_file = await ac.get(f"/reports/{report_id}/file")
        assert res_file.status_code == 200
        assert "application/pdf" in res_file.headers.get("content-type", "")
        assert len(res_file.content) > 0
        pages = len(re.findall(rb"/Type\s*/Page\b", res_file.content))
        assert pages >= 2

        # 4. Unknown id -> 404
        res_404 = await ac.get("/reports/99999")
        assert res_404.status_code == 404

        res_file_404 = await ac.get("/reports/99999/file")
        assert res_file_404.status_code == 404
