import re
from pathlib import Path
import pytest
import sys

W7_2_DIR = Path(__file__).resolve().parent.parent / "w7_2"
if str(W7_2_DIR) not in sys.path:
    sys.path.insert(0, str(W7_2_DIR))

from render_pdf import render_pdf_report


@pytest.mark.asyncio
async def test_render_pdf_report_generates_multipage_pdf():
    # Provide 60 books in dataset
    data = {
        "date": "2026-09-05",
        "total_books": 60,
        "average_price": 35.0,
        "top_5_books": [{"title": f"Top Book {i}", "price": f"£{50 + i}"} for i in range(5)],
        "all_books": [{"title": f"Book Title {i}", "price": f"£{20 + i}"} for i in range(60)]
    }

    # Execute PDF generation
    await render_pdf_report(data)

    pdf_path = W7_2_DIR / "reports" / "test.pdf"
    assert pdf_path.exists(), "Expected reports/test.pdf to be generated"

    content = pdf_path.read_bytes()
    assert len(content) > 0

    # Verify PDF contains at least 2 pages
    page_count = len(re.findall(rb"/Type\s*/Page\b", content))
    assert page_count >= 2, f"Expected at least 2 pages, got {page_count}"
