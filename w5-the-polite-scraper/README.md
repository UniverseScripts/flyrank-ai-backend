# Week 5 (Assignment A9) - The Polite Scraper

> A deterministic, polite web scraping pipeline that traverses catalogue pages, normalizes unstructured HTML data, strictly validates records against Pydantic schemas, and outputs structured datasets with full execution telemetry.

---

## Target Classification (Stage 0)
- **Target Site**: Books to Scrape (`https://books.toscrape.com/`)
- **Purpose**: Public practice sandbox built explicitly for testing and learning web scrapers.
- **Scope**: Exactly the first 3 catalogue pages (60 book records total).
- **Data Collected**: Book title, canonical product URL, raw price text, normalized numeric price in GBP (`price_gbp`), stock availability, star rating, product description (null when omitted), source page URL, and extraction timestamp.
- **robots.txt Check**: `https://books.toscrape.com/robots.txt` returned HTTP 404 ("no robots file found").
- **Appropriateness**: The target site is explicitly a non-commercial, purpose-built scraping sandbox.
- **Compliance Declaration**: *"I will not reuse this code on another site without checking its rules and terms first."*

---

## Politeness Rules & Engineering Standards

1. **User-Agent**: Honest identification header sent on every request:
   ```text
   FlyRankInternship-A9/1.0 (+https://github.com/UniverseScripts/flyrank-ai-backend)
   ```
2. **Rate Limiting**: Enforced $\ge 500\text{ ms}$ delay between consecutive live network requests.
3. **Timeout Guard**: Strict $5.0\text{s}$ timeout on all HTTP requests to prevent worker thread starvation.
4. **Local Disk Caching**: Raw HTML documents are cached to `cache/*.html`. Development iterations and subsequent runs read directly from local disk rather than repeatedly querying the remote host.
5. **Fault Isolation**: Per-page exception handling ensures a single broken or malformed page is logged, skipped, and reported in telemetry without terminating the overall run.
6. **No-Browser Rationale**: The target payload is fully rendered server-side. Spinning up headless browser instances (Playwright/Puppeteer) would introduce unnecessary memory, CPU, and latency overhead.

---

## Quickstart

### 1. Installation
```bash
uv pip install -r requirements.txt
```

### 2. Execute the Scraper Pipeline
```bash
uv run --directory . python main.py
```

Outputs are written to `output/`:
- `output/books.json`: Extracted dataset containing 60 validated book records.
- `output/run-report.json`: Execution telemetry and audit summary.
- `output/errors.json`: Logged errors encountered during the crawl.

---

## Record Schema (Pydantic)

| Field | Type | Description | Required |
|---|---|---|---|
| `title` | `str` | Cleaned title from product header | Yes |
| `product_url` | `str` | Absolute canonical URL of book details | Yes |
| `price_text` | `str` | Raw string representation (e.g. `£51.77`) | Yes |
| `price_gbp` | `float` | Clean float value normalized in GBP | Yes |
| `availability_text` | `str` | Stock status and quantity text | Yes |
| `rating_text` | `str` | Rating string (`One`, `Two`, `Three`, etc.) | Yes |
| `description` | `str \| null` | Product synopsis (`null` if omitted) | No |
| `source_page` | `str` | Discovery catalogue page URL | Yes |
| `fetched_at` | `str` (ISO-8601) | Timestamp of extraction | Yes |

---

## Telemetry Evidence (`output/run-report.json`)

```json
{
  "start_time": "2026-08-26T12:45:11.201920Z",
  "duration": "PT0.384465S",
  "pages_crawled": 3,
  "discovered_books": 60,
  "cache_hits": 3,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 0
}
```

---

## Running Edge Case Tests
Execute unit tests for HTML edge cases, price parsing anomalies, and malformed tags:
```bash
uv run --directory . python -m test_edge_cases
```
