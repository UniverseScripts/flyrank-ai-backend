# FlyRank AI - Backend Engineering Track

A comprehensive backend engineering portfolio featuring asynchronous REST APIs, relational database integrations, containerized architectures, cryptographic authentication, polite web scrapers, LLM-backed classification endpoints, and automated PDF reporting pipelines.

---

## Weekly Curriculum & Project Index

| Assignment | Directory | Core Technologies | Architectural Highlights |
|---|---|---|---|
| **Week 2** (A1) | [**Build Your First CRUD API**](./w2-build-your-first-crud-api/README.md) | FastAPI, Pydantic v2, Uvicorn | In-memory Task REST API, interactive OpenAPI Swagger UI documentation, strict request/response schemas. |
| **Week 3** (A2 & A3) | [**Connecting CRUD to Database**](./w3-connecting-crud-to-database/README.md) | SQLAlchemy 2.0 AsyncIO, SQLite (`aiosqlite`), PostgreSQL, Docker Compose | Serverless SQLite persistence migrated to containerized PostgreSQL orchestrated via Docker Compose. |
| **Week 4** (A4) | [**Auth · Login & Protect**](./w4-auth-login-and-protect/README.md) | Supabase Auth, JWT, FastAPI Security | External IdP authentication, cryptographic JWT bearer token verification middleware, protected route dependencies. |
| **Week 5** (A9) | [**The Polite Scraper**](./w5-the-polite-scraper/README.md) | Requests, BeautifulSoup4, Pydantic v2 | Respectful web scraping pipeline with honest User-Agent headers, rate limiting, local disk caching, and execution telemetry. |
| **Week 6** (A7) | [**Your First Background Job**](./w6-first-background-job/README.md) | Inngest, FastAPI, Uvicorn | Durable background jobs, step execution (`step.sleep`, `step.run`), and event-driven workflow engine. |
| **Week 7** (A17) | [**Put an LLM Behind Your API**](./w7-put-an-llm-behind-your-api/README.md) | OpenAI SDK, Pydantic v2, OpenRouter / Ollama | Support ticket classifier with strict structured output, provider abstraction, automated repair retries, and token cost telemetry. |
| **Week 7** (A8) | [**PDF Report Generator**](./w7-pdf-report-generator/README.md) | Playwright, SQLAlchemy AsyncIO, Jinja2, SQLite | Multi-page PDF generation pipeline with SQL aggregations, CSS print page-breaks, caching, and idempotency protection. |

---

## Global Environment & Tooling

The entire repository is managed using modern Python tooling (`uv`):

### Prerequisites
- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (recommended package manager)
- Docker & Docker Compose (for Week 3 containerization)

### Environment Configuration
Sensitive credentials and configuration parameters are loaded via environment files. Copy the relevant `.env.example` templates in each assignment directory or define workspace-level variables in the root `.env`.

---

## Repository Structure

```text
├── w2-build-your-first-crud-api/   # In-memory Task CRUD API
├── w3-connecting-crud-to-database/ # Database persistence (SQLite + Docker Compose PostgreSQL)
├── w4-auth-login-and-protect/      # Supabase Auth & JWT middleware
├── w5-the-polite-scraper/          # Polite web scraping pipeline & telemetry
├── w6-first-background-job/        # Inngest background job & workflow engine
├── w7-put-an-llm-behind-your-api/  # Support ticket classifier with LLM abstraction
├── w7-pdf-report-generator/        # Database-driven PDF report generator
├── tests/                          # Automated integration and regression test suites
├── static/                         # Architectural diagrams and preview screenshots
└── README.md                       # Master portfolio index
```

---

## Verification & Testing

All assignments are backed by automated tests:
- **Week 3 Integration Tests**: `uv run pytest tests/test_w3_api.py -v`
- **Week 5 Scraper Edge Cases**: `uv run --directory w5-the-polite-scraper python -m test_edge_cases`
- **Week 7 LLM Eval Suite**: `uv run --directory w7-put-an-llm-behind-your-api python -m evals.run_eval`
- **Week 7 PDF Report Generator Stages 1–5**: `uv run --directory w7-pdf-report-generator pytest ../tests/test_w7_2_stage1.py ../tests/test_w7_2_stage2.py ../tests/test_w7_2_stage3.py ../tests/test_w7_2_stage4.py ../tests/test_w7_2_stage5.py -v`