# Iraj AI Assistant — Test Execution & Coverage Summary

This document explains how to set up, run, and verify the automated E2E test suite for the Iraj AI Assistant.

---

## 1. How to Run the Tests

To run the automated tests locally, execute the following commands in the project root directory:

### Step 1: Generate Mock Datasets
Before running the tests, run the mock generator to create the necessary test files (sales spreadsheets, mock standard documents, and Telegram HTML web previews):
```bash
python tests/generate_mock_data.py
```

### Step 2: Run the Verification Suite
Execute the test suite using Python's standard `unittest` framework:
```bash
python -m unittest tests/verify_app.py
```

---

## 2. Test Coverage Summary

The verification framework covers **37 E2E tests** spanning 4 tiers:

### Tier 1: Feature Coverage (15 tests)
- **BI Engine**: Tests standard CSV parsing, standard XLSX parsing, KPI math precision (floats rounded to 2 decimal places), matplotlib Figure generation, and conversion rate calculations.
- **RAG Engine**: Tests plain text document indexing, PDF document indexing, basic query keyword search, match metadata validation (checking source, standard, page, text), and semantic lookup for synonyms.
- **Scraper Engine**: Tests Telegram preview scraping, JSON cache serialization, cache deserialization, multi-channel aggregation, and price pattern extraction.

### Tier 2: Boundary & Corner Cases (16 tests)
- **BI Engine**: Tests empty/header-only files, extremely large numbers (overflow protection), missing/null fields handling, zero tonnage transaction math (division-by-zero safety), negative values filtering, and binary corrupt file rejection.
- **RAG Engine**: Tests non-existent file path handling, empty file indexing, zero-match query returning empty list, re-indexing collision prevention, and special character sanitization.
- **Scraper Engine**: Tests invalid URL domain filtering, empty channel previews, malformed HTML tag parsing, and cache file write permission safety.

### Tier 3: Cross-Feature Integration (4 tests)
- **TC-X-1 (BI + Scraper)**: Computes margin deviation between BI average sales price and live scraped price.
- **TC-X-2 (RAG + BI)**: Restricts and validates sales records based on standard profiles loaded into RAG.
- **TC-X-3 (Scraper + RAG)**: Extracts standard IDs from raw Telegram posts and searches their details in RAG.
- **TC-X-4 (Full Sync)**: Runs scraper, RAG indexing, and BI KPI logic sequentially to verify data consistency.

### Tier 4: Real-World Scenarios (2 tests)
- **TC-RW-1 (Weekly Sales Report)**: Simulates the Weekly Sales Executive dashboard pipeline compiling market benchmarks and sales logs.
- **TC-RW-2 (Quote Negotiation)**: Simulates retrieving standard compliance specs, getting market price feeds, checking customer averages, and recommending a contract quote.
