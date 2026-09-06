import sys
from pathlib import Path
import pytest
from sqlalchemy import func, select

# Add workspace and w7-pdf-report-generator directory to sys.path
W7_2_DIR = Path(__file__).resolve().parent.parent / "w7-pdf-report-generator"
if str(W7_2_DIR) not in sys.path:
    sys.path.insert(0, str(W7_2_DIR))

from db.config import AsyncLocalSession, create_tables
from models.books import Books
from scripts.seed_books import seed_books


@pytest.mark.asyncio
async def test_seed_books_idempotent():
    # First seed run
    await seed_books()
    async with AsyncLocalSession() as session:
        res1 = await session.execute(select(func.count()).select_from(Books))
        assert res1.scalar() == 60

    # Second seed run (Idempotency checkpoint: count should remain 60)
    await seed_books()
    async with AsyncLocalSession() as session:
        res2 = await session.execute(select(func.count()).select_from(Books))
        assert res2.scalar() == 60


@pytest.mark.asyncio
async def test_book_attributes_and_ranges():
    # Ensure database is seeded
    await seed_books()

    async with AsyncLocalSession() as session:
        res = await session.execute(select(Books).limit(10))
        sample_books = res.scalars().all()
        assert len(sample_books) == 10

        for book in sample_books:
            assert isinstance(book.id, int)
            assert isinstance(book.title, str) and len(book.title) > 0
            assert isinstance(book.price, float) and book.price > 0.0
            assert isinstance(book.rating, int) and 1 <= book.rating <= 5
            assert isinstance(book.url, str) and book.url.startswith("http")
