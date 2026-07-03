# Project: Iraj AI Assistant

Multi-AI-Agent System for a steel rebar manufacturing Sales Manager.

## Architecture
The system consists of a Streamlit frontend and a Python-based backend that orchestrates 4 specialized agents:
1. **BI & KPI Analyst Agent**:
   - Inputs: Sales CSV/XLSX spreadsheets.
   - Core Logic: Computes Revenue, Total Tonnage, Avg Price, and Conversion Rate (to 2 decimal places).
   - Output: Interactive charts & metrics for Streamlit.
2. **Standards & Datasheet Agent**:
   - Inputs: Steel standard PDFs/text files, user queries.
   - Core Logic: A local RAG pipeline that parses, indexes, and queries specifications (DIN, SAE, ASTM, JIS, GB/T, BS).
   - Output: RAG-retrieved source passages and dynamic datasheet summaries.
3. **Sales Consultant & Contract Agent**:
   - Inputs: Co-writing chat instructions, strategy documents, contract drafts.
   - Core Logic: Interacts with the LLM to generate sales roadmaps and legal agreements.
   - Output: Formatted markdown or text drafts.
4. **Live Price & News Agent**:
   - Inputs: Up to 50 public Telegram web preview URLs (e.g. `t.me/s/...`) and websites.
   - Core Logic: Configurable web scraper that extracts text and price indicators, parses currency/numeric values, and caches them.
   - Output: Local JSON file feed (`live_prices.json`) displaying parsed prices and news.

## Code Layout
- `/src/`
  - `__init__.py`
  - `bi_engine.py` - Core BI and KPI calculation algorithms
  - `rag_engine.py` - RAG storage, parsing, indexing, and retrieval logic
  - `sales_consultant.py` - Sales Consultant chat and contract generation
  - `live_scraper.py` - Telegram and web scraping and parsing code
  - `app.py` - Main Streamlit dashboard application
- `/tests/`
  - `generate_mock_data.py` - Generates mock sales spreadsheets, standards text, and Telegram preview HTMLs
  - `verify_app.py` - Automated test suite for BI, RAG, and Scraper

## Milestones
| # | Name | Scope | Dependencies | Status | Conversation ID |
|---|------|-------|-------------|--------|-----------------|
| 1 | E2E Testing Track | Implement E2E test infra, `generate_mock_data.py`, `verify_app.py` skeleton/tests | None | DONE | 65d31d50-4296-4139-9260-af255c08b31a |
| 2 | BI & KPI Engine | Implement `src/bi_engine.py` and verify math to 2 decimal places | M1 | PLANNED | TBD |
| 3 | RAG & Standards | Implement `src/rag_engine.py` and local PDF/text parser and vector database/semantic lookup | M1 | PLANNED | TBD |
| 4 | Scraper & Feed | Implement `src/live_scraper.py` for public Telegram channels, caching to JSON | M1 | PLANNED | TBD |
| 5 | Sales Consultant | Implement `src/sales_consultant.py` for drafting contracts and roadmaps | M1 | PLANNED | TBD |
| 6 | Streamlit Web UI | Implement `src/app.py` integrating all agents and file uploads | M2, M3, M4, M5 | PLANNED | TBD |
| 7 | Adversarial Hardening | White-box analysis and Tier 5 adversarial testing of implementation | M6 | PLANNED | TBD |

## Interface Contracts
### `bi_engine.py`
- `calculate_kpis(file_path: str) -> dict`: Returns `{"revenue": float, "tonnage": float, "avg_price": float, "conversion_rate": float}`.
- `generate_charts(file_path: str) -> list[matplotlib.figure.Figure]`: Returns a list of figures for visualization.

### `rag_engine.py`
- `index_document(file_path: str) -> bool`: Parses and indexes a standard file.
- `query_standards(query_str: str) -> list[dict]`: Queries the index and returns matching passages with metadata.

### `live_scraper.py`
- `scrape_channels(urls: list[str]) -> list[dict]`: Scrapes Telegram channel previews, parses price data, and writes to `live_prices.json`.
- `read_cached_prices() -> list[dict]`: Reads the cached scraper output.

### `sales_consultant.py`
- `generate_contract_draft(buyer: str, seller: str, rebar_grade: str, tonnage: float, price_per_ton: float) -> str`: Generates contract draft markdown.
- `generate_sales_roadmap(company_name: str, target_market: str) -> str`: Generates a sales roadmap markdown.
