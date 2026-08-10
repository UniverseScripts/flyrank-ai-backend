import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from w3.db_engine import create_tables
from w3.helpers.seed_3 import seed_3_examples
from w3.main import app


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    await create_tables()
    await seed_3_examples()


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_get_tasks():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/tasks")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3


@pytest.mark.asyncio
async def test_get_task_by_id():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/tasks/1")
        assert response.status_code == 200
        task = response.json()
        assert task["id"] == 1
        assert "title" in task
        assert "done" in task


@pytest.mark.asyncio
async def test_get_task_not_found():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/tasks/999999")
        assert response.status_code == 404
        assert "Task 999999 not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_crud_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create
        create_res = await client.post("/tasks", json={"title": "Integration Test Task", "done": False})
        assert create_res.status_code == 201
        created = create_res.json()
        task_id = created["id"]
        assert created["title"] == "Integration Test Task"
        assert created["done"] is False

        # 2. Read
        get_res = await client.get(f"/tasks/{task_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == task_id

        # 3. Update
        update_res = await client.put(f"/tasks/{task_id}", json={"title": "Updated Task Title", "done": True})
        assert update_res.status_code == 200
        assert update_res.json()["title"] == "Updated Task Title"
        assert update_res.json()["done"] is True

        # 4. Search Filter
        search_res = await client.get("/tasks?search=Updated")
        assert search_res.status_code == 200
        assert any(t["id"] == task_id for t in search_res.json())

        # 5. Delete
        del_res = await client.delete(f"/tasks/{task_id}")
        assert del_res.status_code == 204

        # 6. Verify Deleted
        verify_res = await client.get(f"/tasks/{task_id}")
        assert verify_res.status_code == 404


@pytest.mark.asyncio
async def test_stats_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/stats")
        assert response.status_code == 200
        stats = response.json()
        assert "total_tasks" in stats
        assert "completed_tasks" in stats
        assert "pending_tasks" in stats
        assert stats["total_tasks"] >= 3
