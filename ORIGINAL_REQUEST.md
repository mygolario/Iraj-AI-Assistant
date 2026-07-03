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

## Follow-up — 2026-07-03T10:41:09+03:30

# Teamwork Project Prompt — Draft

Production-ready steel rebar manufacturing Sales Manager Assistant: remove mock data and design a beautiful, comprehensive, and personalized UI/UX dashboard.

Working directory: d:/Ario Vibe Coding/Iraj-AI-Assistant
Integrity mode: benchmark

## Requirements

### R1. Eliminate Mock Data & Connect Live Integrations
- **RAG / Standards Finder**: Replace the simple string-overlap search with a real semantic vector index. Use the OpenRouter API key found in the `.env` file (or `OPENROUTER_API_KEY` env var) to generate embeddings (e.g., using `openai` SDK or direct HTTP requests) for document chunks. Parse uploaded PDF and TXT standards, chunk them, embed them, and query them semantically.
- **AI Consultant Chat**: Remove all hardcoded/heuristic chat fallbacks. The assistant chat MUST use the OpenRouter/OpenAI API key to communicate with a real LLM (like `google/gemini-2.5-flash` or similar) to answer user questions, utilizing retrieved context from the RAG index and live pricing feed.
- **Scraper Feed**: Keep the public Telegram scraping mechanism but ensure it scrapes live channels (like `https://t.me/s/steel_prices_iran` and others) rather than relying on local mock HTMLs in normal operation, while maintaining compatibility with the local HTML parser for testing.

### R2. Complete Redesign of UI, UX, and Functionality
- **Aesthetic**: Re-skin the entire Streamlit dashboard to use an **Industrial Steel & Slate** theme (Premium dark mode, brushed metal accents, neon green/cyan indicators, high contrast metrics).
- **Layout & Organization**: Redesign the navigation and page tabs. Group features logically:
  1. **Executive BI Dashboard**: High-level KPIs, beautiful charts (using Streamlit native charts or matplotlib with dark styles), and interactive filters.
  2. **Technical Standards Explorer**: Clean PDF/TXT uploader, semantic query bar, and a sleek PDF/Markdown datasheet generator.
  3. **Live Market Board & Arbitrage**: Live scraper configuration (up to 50 URLs), run-trigger, and an arbitrage analysis panel comparing internal sales prices with external market feeds.
  4. **Co-Writing & Contract Room**: Standard contract drafter and sales roadmap compiler with real-time editing/previewing.
- **Personalization**: Provide a personalized welcome header for a Steel Sales Manager, a workspace summary (e.g., total items in index, number of scraped feeds), and system status widget in the sidebar.

## Acceptance Criteria

### Backend & Integrations
- [ ] RAG search retrieves passages semantically using real embeddings generated via OpenRouter API.
- [ ] Interactive chat answers questions using a real LLM via OpenRouter, utilizing RAG context and live prices.
- [ ] Live scraper successfully pulls from live public channels and caches to `live_prices.json`.
- [ ] No hardcoded responses/heuristics remain in the chatbot.

### UI & UX Design
- [ ] Streamlit layout uses a dark steel/slate color scheme with high visual appeal (matching the "Industrial Steel & Slate" aesthetic).
- [ ] The app dashboard layout is responsive, structured, and easy to navigate.
- [ ] KPI cards use beautiful custom styling (borders, shadow hover effects, clear color contrast).

### Verification
- [ ] Running `python -m unittest tests/verify_app.py` passes all assertions successfully.
- [ ] The Streamlit app runs cleanly via `streamlit run src/app.py` without start-up errors.

## Follow-up — 2026-07-03T10:43:12Z

# Teamwork Project Prompt — Draft

Production-ready steel rebar manufacturing Sales Manager Assistant: Redesign the UI/UX using the "Neon Peach & Ultraviolet" theme, interactive charts, Bento Box homepage, split-screen Copilot chat, and a scrolling price ticker.

Working directory: d:/Ario Vibe Coding/Iraj-AI-Assistant
Integrity mode: benchmark

## Requirements

### R1. Complete UI/UX Redesign: Neon Peach & Ultraviolet Theme
- **Color Palette & Theme**: Update the Streamlit application to a gorgeous glassmorphism style using a deep dark indigo background (`#0e0b1e`), neon sunset peach (`#FF7E5F`), intense coral (`#FF5E62`), and royal violet (`#8B5CF6`) accents. Use custom CSS overlays to create frosted glass panels (`background: rgba(22, 19, 43, 0.6); backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.08);`) with smooth gradients and hover transitions.
- **Bento Box Workspace Home**: Implement a personalized Bento Box welcome dashboard at the top/home of the application. Include:
  - A dynamic welcome header for the Sales Manager.
  - A grid of interactive quick-stats widgets (e.g. total indexed documents in RAG, scraper cache size).
  - High-impact warning cards for live pricing deviations (arbitrage alerts).
- **Navigation**: Replace standard sidebar navigation with a floating, modern selector tab list.

### R2. Interactive Business Intelligence Charts
- **Interactive Visualizations**: Replace static Matplotlib chart images in the dashboard with responsive Streamlit native interactive charts (`st.bar_chart` or `st.area_chart`). Style the charts' colors to use sunset peach (`#FF7E5F`) and royal violet (`#8B5CF6`) themes.
- **Matplotlib Compatibility**: Style the Matplotlib figures generated in `bi_engine.py` to use dark backgrounds and white text so existing test suites in `tests/verify_app.py` pass successfully.

### R3. Split-Screen AI Chat Copilot
- **Copilot Layout**: Redesign the "Sales Consultant" chat tab into a split-screen layout:
  - **Left Panel**: Displays retrieved standards context and live pricing benchmarks.
  - **Right Panel**: Floating scrollable chat window with message history and input.
- **Bubbles**: Apply sunset peach and violet color styling to chat messages.

### R4. Scrolling Price Ticker & Deal Calculator
- **Price Ticker**: Build a horizontal scrolling marquee showing real-time price feeds from public Telegram channels.
- **Interactive Calculator**: Create a profitability calculator in the market board tab where managers can model deal prices, volumes, and custom grades against live-scraped benchmarks.

## Acceptance Criteria

### Aesthetic & UI Design
- [ ] Theme uses the "Neon Peach & Ultraviolet" color palette with responsive glassmorphism styles.
- [ ] Bento Box greeting page is functional.
- [ ] Live scrolling price ticker runs smoothly.
- [ ] Chat layout is split-screen with left-panel context extraction and styled bubbles.

### Interactive Functionality
- [ ] Sales KPIs are rendered using Streamlit native interactive charts.
- [ ] Pricing/arbitrage calculator correctly computes profit margins.

### Verification
- [ ] Running `python -m unittest tests/verify_app.py` and `tests/adversarial_bi_tests.py` passes all assertions successfully.
- [ ] Streamlit application starts clean via `streamlit run src/app.py`.
