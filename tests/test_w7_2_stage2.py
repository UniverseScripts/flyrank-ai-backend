import pytest
from pathlib import Path
import sys

W7_2_DIR = Path(__file__).resolve().parent.parent / "w7-pdf-report-generator"
if str(W7_2_DIR) not in sys.path:
    sys.path.insert(0, str(W7_2_DIR))

from scripts.queries import getReportData
from schemas.books_report import BookReport


@pytest.mark.asyncio
async def test_get_report_data_structure_and_values():
    data = await getReportData()

    # Verify Pydantic schema validation
    validated = BookReport.model_validate(data)
    assert validated.total_books == 60
    assert 34.0 < validated.average_price < 36.0
    assert len(validated.top_5_expensive_books) == 5

    # Check top 5 descending order
    prices = [p for _, p in validated.top_5_expensive_books]
    assert prices == sorted(prices, reverse=True)

    # Check rating distribution adds up to total books
    assert sum(count for _, count in validated.books_per_rating) == 60
