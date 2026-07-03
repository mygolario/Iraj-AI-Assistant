# Iraj AI Assistant — E2E Test Infrastructure Specifications

This document outlines the detailed 4-tier E2E testing framework designed for the Iraj AI Assistant project. The testing suite validates all three backend engines (`bi_engine.py`, `rag_engine.py`, and `live_scraper.py`) and their interactions under normal, edge-case, and integrated real-world scenarios.

---

## 1. Feature Coverage & System Boundaries

The automated verification suite covers:
1. **BI & KPI Engine (`src/bi_engine.py`)**: Responsible for reading sales spreadsheets (CSV/XLSX), calculating major sales KPIs (Revenue, Total Tonnage, Avg Price, and Conversion Rate to 2 decimal places), and generating matplotlib figures.
2. **RAG & Standards Engine (`src/rag_engine.py`)**: Parses and indexes steel standards documents (text/PDF), and processes user queries to return semantic matches.
3. **Scraper & Feed Engine (`src/live_scraper.py`)**: Periodically scrapes Telegram web previews (`t.me/s/...`), extracts prices and text details, and caches them locally in `live_prices.json`.

---

## 2. The 4-Tier Test Architecture

### Tier 1: Feature Coverage (>= 5 test cases per engine)
Ensures standard, happy-path functionality of each core component.

#### A. BI & KPI Engine (`bi_engine.py`)
- **TC-BI-F1: Standard CSV Parsing**: Load a valid CSV file. Confirm metrics are correctly computed.
- **TC-BI-F2: Standard XLSX Ingestion**: Load a valid Excel file. Confirm metrics computed are identical to the CSV version.
- **TC-BI-F3: KPI Precision**: Validate that computed values for Revenue, Tonnage, Average Price, and Conversion Rate match exact pre-calculated values and are floats rounded to 2 decimal places.
- **TC-BI-F4: Chart Rendering**: Verify `generate_charts()` returns a list of `matplotlib.figure.Figure` objects that can be rendered without errors.
- **TC-BI-F5: Conversion Rate Math**: Test with specific conversion ratios (e.g. 50% closed status) to verify that the conversion rate is calculated based on converted entries over total inquiries.

#### B. RAG & Standards Engine (`rag_engine.py`)
- **TC-RAG-F1: Plain Text Indexing**: Verify `index_document()` returns `True` for a standard text specification file.
- **TC-RAG-F2: PDF Indexing**: Verify `index_document()` returns `True` for a valid PDF specification file.
- **TC-RAG-F3: Basic Query Retrieval**: Query for an exact term in the indexed document (e.g., "yield strength") and verify matching passages are returned.
- **TC-RAG-F4: Match Metadata Verification**: Ensure the query result returns metadata including source filename and standard name.
- **TC-RAG-F5: Semantic Lookup**: Query for synonyms (e.g. searching "yield point" instead of "yield strength") and verify relevant passages are still matched.

#### C. Scraper & Feed Engine (`live_scraper.py`)
- **TC-SCR-F1: Channel Scraping Execution**: Scrape mock Telegram web preview URLs. Verify it returns a list of parsed items.
- **TC-SCR-F2: Price Extraction**: Verify that price strings (e.g., "24,500 Tomans", "$550/t") are parsed into floats.
- **TC-SCR-F3: News/Text Extraction**: Verify that text content, timestamp, and origin channel are extracted from posts.
- **TC-SCR-F4: Cache Serialization**: Verify parsed results are saved into `live_prices.json`.
- **TC-SCR-F5: Cache Read-back**: Verify `read_cached_prices()` reads the saved cache without triggering fresh network calls.

---

### Tier 2: Boundary & Corner Cases (>= 5 test cases per engine)
Tests stability, error handling, and robust behavior under unexpected or dirty inputs.

#### A. BI & KPI Engine (`bi_engine.py`)
- **TC-BI-B1: Empty/Header-Only Files**: Verify calculations return `0.0` or default values and do not trigger division-by-zero errors.
- **TC-BI-B2: Extremely Large Values**: Verify that extremely large tonnage or prices do not cause overflows.
- **TC-BI-B3: Missing / Null Fields**: Feed a file with empty cells in key columns and verify default values or row-skipping logic handles it gracefully.
- **TC-BI-B4: Corrupt Format**: Verify that passing binary garbage files with a `.csv` extension raises a clear error.
- **TC-BI-B5: Column Layout Drift**: Verify that target fields are matched by column name rather than hardcoded column positions.

#### B. RAG & Standards Engine (`rag_engine.py`)
- **TC-RAG-B1: Non-Existent Document**: Verify `index_document()` returns `False` or raises clean `FileNotFoundError` when target path does not exist.
- **TC-RAG-B2: Empty File Indexing**: Verify indexing an empty file returns `False` or handles it gracefully.
- **TC-RAG-B3: Zero Match Query**: Query for unrelated terms (e.g., "banana cake recipe") and verify it returns `[]` without error.
- **TC-RAG-B4: Re-indexing / Collision**: Verify indexing the same file twice does not create duplicate database entries.
- **TC-RAG-B5: Injection / Special Characters**: Verify that queries with SQL syntax or special characters (`'`, `"`, `$`, emojis) are sanitized.

#### C. Scraper & Feed Engine (`live_scraper.py`)
- **TC-SCR-B1: Network Failures (404/Invalid URLs)**: Verify scraper logs a warning and proceeds with the remaining URLs.
- **TC-SCR-B2: Empty Channel Previews**: Verify that channels with no messages return empty lists.
- **TC-SCR-B3: Malformed HTML Layouts**: Verify that pages with broken tags are parsed partially without crashing.
- **TC-SCR-B4: Currency/Numeric Ambiguities**: Verify that messages containing multiple numbers extract correct price per rebar size.
- **TC-SCR-B5: Rate Limiting & High URL Volume**: Verify scraper throttle delay prevents IP bans under high URL counts.

---

### Tier 3: Cross-Feature Combinations (Pairwise Integration)
Validates interactions between different subsystems.

- **TC-X-1: BI Engine + Scraper Comparison**:
  Compare historical sales average price (BI Engine) against live scraped market prices (Scraper Engine) to calculate deviation / margin.
- **TC-X-2: RAG Engine + BI Validation**:
  Filter sales records by rebar grades found inside the indexed standards documents to ensure sales records comply with standard naming profiles.
- **TC-X-3: Scraper + RAG Enrichment**:
  Extract raw standard mentions (e.g., "JIS SD390") from live scraped posts and look up their specification details in the RAG index.
- **TC-X-4: Full Pipeline Sync**:
  Simulate a sequence where the scraper cache updates, a standard is indexed, and a sales report is processed, verifying they do not corrupt each other's configurations.

---

## 4. Tier 4: Real-World Scenarios
Tests complete end-to-end user workflows.

- **TC-RW-1: Weekly Sales & Competitive Report**:
  A Sales Manager processes weekly CSV sales logs, generates charts, pulls the latest Telegram prices, and computes the deviation of internal pricing from external market benchmarks.
- **TC-RW-2: Customer Negotiation & Compliance**:
  A client requests a quote for a custom grade. The system queries RAG for compliance mechanical properties, extracts current market prices from the scraper cache, looks up historical prices for similar grades from the BI engine, and outputs a synthesized pricing recommendation.

---

## 5. Mock Data Generation (`tests/generate_mock_data.py`)
Mock datasets must be created deterministically (with fixed random seeds) to yield reproducible test outputs:
- **Sales Data**: Generate `mock_sales.csv` and `mock_sales.xlsx` with realistic columns (`Date`, `Customer`, `Rebar Grade`, `Tonnage`, `Unit Price`, `Status`, `Conversion`).
- **Standards**: Generate text and PDF files containing clear keywords (DIN, ASTM, JIS, GB/T, BS) with mock tensile and yield specifications.
- **Telegram HTML**: Generate local files mimicking the layout of `t.me/s/...` with classes like `tgme_widget_message_wrap` and `tgme_widget_message_text`.
