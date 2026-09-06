import pytest
from httpx import AsyncClient, ASGITransport
import sys
from pathlib import Path

W7_2_DIR = Path(__file__).resolve().parent.parent / "w7-pdf-report-generator"
if str(W7_2_DIR) not in sys.path:
    sys.path.insert(0, str(W7_2_DIR))

from main import app


@pytest.mark.asyncio
async def test_stage5_idempotent_generation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. First POST with force: true creates a new report (201 Created)
        res1 = await ac.post("/reports", json={"force": True})
        assert res1.status_code == 201
        data1 = res1.json()
        assert "id" in data1
        report_id_1 = data1["id"]

        # 2. Second rapid POST without force returns the existing report (200 OK, same id)
        res2 = await ac.post("/reports")
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["id"] == report_id_1
        assert data2["file"] == f"/reports/{report_id_1}/file"

        # 3. Third rapid POST with force: false still returns existing report (200 OK, same id)
        res3 = await ac.post("/reports", json={"force": False})
        assert res3.status_code == 200
        data3 = res3.json()
        assert data3["id"] == report_id_1

        # 4. Fourth POST with force: true skips check and creates new report (201 Created, new id)
        res4 = await ac.post("/reports", json={"force": True})
        assert res4.status_code == 201
        data4 = res4.json()
        assert data4["id"] > report_id_1
