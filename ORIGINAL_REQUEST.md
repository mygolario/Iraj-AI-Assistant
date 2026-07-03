# Original User Request

## Initial Request — 2026-07-03T00:57:18+03:30

A production-ready Multi-AI-Agent System designed for daily use by the Sales Manager of a steel rebar manufacturing company, helping with Business Intelligence, KPI reporting, content writing, standard lookup (DIN, SAE, ASTM, JIS, GB/T, BS), contract creation, and live Telegram/Web data extraction for pricing and market trends.

Working directory: d:/Ario Vibe Coding/Iraj-AI-Assistant
Integrity mode: development

## Requirements

### R1. Multi-Agent Orchestration System
A Python-based multi-agent backend containing:
1. **BI & KPI Analyst Agent**: Processes uploaded CSV/Excel sales data to compute and visualize sales KPIs.
2. **Standards & Datasheet Agent**: Uses local PDF RAG and dynamic web search to lookup steel standards (DIN, SAE, ASTM, JIS, GB/T, BS) and output product datasheets.
3. **Sales Consultant & Contract Agent**: Generates sales roadmaps, strategy documents, and drafts legal sales agreements or contracts.
4. **Live Price & News Agent**: Periodically scrapes web previews of public Telegram channels (e.g., `t.me/s/channel`) and specified websites to parse and present live commodity prices (gold, steel, raw materials) and news.

### R2. Streamlit Dashboard Web UI
An interactive Streamlit-based user interface organized into functional sections:
- **BI Dashboard**: Upload sales data, view key KPIs, and display interactive charts.
- **Standards Finder & Datasheet Generator**: File upload for PDFs, search input, and PDF datasheet export.
- **Sales Consultant**: Chat interface to co-write sales contracts and roadmaps.
- **Live Market Feed**: Display parsed prices and recent news from the live scraper.

### R3. RAG Storage & Retrieval
A local document parsing and indexing pipeline (e.g. using LangChain, Chroma/FAISS, or simple semantic text matching) that processes uploaded steel standard PDFs/text files and enables precise querying.

### R4. Configurable Live Scraper
A lightweight background scraper that reads a list of up to 50 Telegram web preview URLs and website links, extracts recent text and numeric price indicators, and caches the results in a local file (e.g. JSON or SQLite).

## Verification Plan

### Automated Verification
The system must include two scripts to programmatically generate data and verify functionality:
1. `generate_mock_data.py`: Generates mock sales spreadsheets (CSV/XLSX), mock steel standards text files, and mock Telegram/web HTML files.
2. `verify_app.py`: A test script that:
   - Verifies the BI engine correctly calculates KPIs (Revenue, Total Tonnage, Avg Price, Conversion Rate) using the mock sales spreadsheet.
   - Verifies the RAG pipeline correctly parses and indexes mock standards, and retrieves correct specifications for a query.
   - Verifies the live scraper parses a local mock HTML file representing a Telegram channel and extracts the correct commodity price.

### Manual Verification
- Run the Streamlit app locally (`streamlit run app.py`) and verify all tabs load and display elements without errors.

## Acceptance Criteria

### Backend & Orchestration
- [ ] Implement all 4 specialized agents as modules/classes with clear interfaces.
- [ ] Math validation: the BI engine calculates revenue and tonnage correctly to 2 decimal places.
- [ ] RAG validation: queries for specific grades return correct compositions or mechanical properties from indexed documents.

### Live Scraper
- [ ] Scraper extracts text and currency/numeric price values from HTML without relying on third-party Telegram API keys (by fetching `t.me/s/channel`).
- [ ] Successfully caches scraper outputs locally in JSON format.

### Streamlit UI
- [ ] The app launches cleanly via `streamlit run app.py` on the default port.
- [ ] The user can upload CSV/Excel files and view KPI cards and line/bar charts.
- [ ] The user can query standard documents and see RAG-retrieved sources.

### Verification Run
- [ ] Running `python verify_app.py` passes all assertions successfully.
