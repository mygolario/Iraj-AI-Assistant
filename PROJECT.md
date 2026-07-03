# Project: Iraj AI Assistant

Multi-AI-Agent System for a steel rebar manufacturing Sales Manager.

## Architecture

Full-stack application: **Next.js 16** (App Router) frontend + **FastAPI** Python backend.

### Frontend (`frontend/`)
- **Framework:** Next.js 16.2.10, React 19, Tailwind CSS v4
- **Design System:** Aurora Indigo — dark glass morphism with electric indigo gradients
- **UI:** shadcn-style primitives (custom), Framer Motion animations, Recharts, React Dropzone
- **State:** localStorage persistence, no global store
- **API Client:** Typed fetch wrapper + SSE streaming for chat

### Backend (`backend/`)
- **Framework:** FastAPI + Uvicorn
- **AI Integration:** OpenRouter API (GPT-4o-mini via `openai` SDK)
- **Core Engines:**
  1. **BI Engine** — Parses sales CSV/XLSX, computes KPIs (revenue, tonnage, avg price, conversion rate)
  2. **RAG Engine** — Indexes steel standard PDFs/texts, semantic search, datasheet generation
  3. **Live Scraper** — Scrapes public Telegram channel previews, extracts price indicators
  4. **Sales Consultant** — LLM-powered contract drafts and sales roadmaps (with streaming)
  5. **Chat Copilot** — Context-aware AI assistant with RAG + live market price injection

### Design System: Aurora Indigo
- Near-black indigo void (`#08080d`)
- Electric indigo-to-violet gradient accents
- Glass panels with `backdrop-blur` and subtle borders
- Cyan spark highlights for interactive elements
- Dark-only — no light theme

## Code Layout

```
Iraj-AI-Assistant/
├── backend/
│   ├── main.py                  # FastAPI app entry
│   ├── config.py                # Env loading, paths, CORS
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # OPENROUTER_API_KEY (gitignored)
│   ├── api/
│   │   ├── schemas.py           # Pydantic request/response models
│   │   └── routes/
│   │       ├── bi.py            # POST /api/bi/kpis
│   │       ├── chat.py          # POST /api/chat (SSE streaming)
│   │       ├── market.py        # GET /prices, POST /scrape, /arbitrage
│   │       ├── rag.py           # POST /index, /query, /datasheet, GET /state
│   │       └── sales.py         # POST /contract, /roadmap
│   ├── core/
│   │   ├── bi_engine.py         # KPI computation from spreadsheets
│   │   ├── live_scraper.py      # Telegram scraper + cache
│   │   ├── rag_engine.py        # RAG indexing and retrieval
│   │   └── sales_consultant.py  # LLM generation (non-streaming + SSE)
│   ├── cache/                   # Runtime scraper cache (gitignored)
│   └── uploads/                 # Uploaded standards (gitignored)
├── frontend/
│   ├── app/
│   │   ├── globals.css          # Aurora Indigo design tokens
│   │   ├── layout.tsx           # Root layout (fonts, providers)
│   │   ├── providers.tsx        # Sonner toaster
│   │   └── (app)/
│   │       ├── layout.tsx       # AppShell (sidebar + header + ticker)
│   │       ├── page.tsx         # Dashboard home
│   │       ├── bi/page.tsx      # BI & KPIs
│   │       ├── chat/page.tsx    # AI Chat Copilot
│   │       ├── market/page.tsx  # Live Market Prices
│   │       ├── sales/page.tsx   # Sales & Contracts
│   │       └── standards/page.tsx # Standards Finder (RAG)
│   ├── components/
│   │   ├── layout/              # Sidebar, Header, PriceTicker, CopilotFab
│   │   ├── ui/                  # Button, Card, StatCard, FileDropzone, Markdown
│   │   └── feature/             # Page-level components per route
│   ├── lib/
│   │   ├── api.ts               # Typed API client + SSE stream generator
│   │   ├── types.ts             # TypeScript interfaces
│   │   └── utils.ts             # Helpers (cn, formatCurrency, downloadText)
│   ├── package.json
│   └── AGENTS.md                # Next.js 16 constraints for AI agents
├── PROJECT.md
├── opencode.json
└── .gitignore
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Backend health check |
| POST | `/api/bi/kpis` | Upload sales spreadsheet → KPI + chart data |
| POST | `/api/rag/index` | Index steel standard files into RAG |
| POST | `/api/rag/query` | Semantic search across indexed standards |
| POST | `/api/rag/datasheet` | Compile datasheet from RAG sources |
| GET | `/api/rag/state` | Current index status (record count, files) |
| GET | `/api/market/prices` | Cached live price feeds |
| POST | `/api/market/scrape` | Run scraper on configured Telegram channels |
| POST | `/api/market/arbitrage` | Compare internal avg price vs market index |
| POST | `/api/sales/contract` | Generate contract draft via LLM |
| POST | `/api/sales/roadmap` | Generate sales roadmap via LLM |
| POST | `/api/chat` | Stream AI copilot response (SSE) |

## Pages

| Route | Feature |
|-------|---------|
| `/` | Dashboard — Bento command center (BI summary, prices preview, quick search, calculator) |
| `/bi` | BI & KPIs — Upload spreadsheet, KPI cards, tonnage/revenue charts, records table |
| `/standards` | Standards Finder — Index standards, semantic query, datasheet generator |
| `/market` | Live Market Prices — Scraper config, pricing board, arbitrage check, deal calculator |
| `/sales` | Sales & Contracts — Contract drafter + sales roadmap generator (tabbed) |
| `/chat` | AI Chat Copilot — SSE streaming chat with RAG + market context injection |

## Running

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Set OPENROUTER_API_KEY
uvicorn main:app --port 8000
```

### Frontend
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

## Follow-ups
- [ ] Rewrite backend tests for new FastAPI API structure
- [ ] Add persistent vector DB (Qdrant/ChromaDB) for production RAG
- [ ] Add authentication and multi-user support
- [ ] Light theme toggle
