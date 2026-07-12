# Iraj AI Assistant

Multi-AI-Agent System for a steel rebar manufacturing Sales Manager.

Built with **Next.js 16** (App Router) + **FastAPI** backend, featuring an Aurora Indigo glass design system.

## Features

- **BI & KPIs** — Upload sales spreadsheets, compute revenue/tonnage/price/conversion metrics, interactive charts
- **Standards Finder** — Index steel standard PDFs, semantic search, technical datasheet generation
- **Live Market (Market Notebook)** — NotebookLM-style desk: Fast/Deep research via Sonar Pro (works with zero sources), optional Sources Library (Telegram, web, PDF, Excel, screenshots, paste, internal/competitor), Studio briefing + price digest, vs-internal comparison, Copilot-linked
- **Sales & Contracts** — AI-powered contract drafting and sales roadmap generation
- **AI Chat Copilot** — Context-aware assistant with RAG + live market data injection, SSE streaming

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # Set OPENROUTER_API_KEY
uvicorn main:app --port 8000

# Frontend (new terminal)
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, Framer Motion, Recharts
- **Backend:** Python, FastAPI, OpenRouter API (Gemini Flash + Perplexity Sonar Pro for market web research)
- **Design:** Fintech-Warm / Steel — copper accent, Instrument Serif display, warm paper surfaces

## Project Structure

See [PROJECT.md](./PROJECT.md) for full architecture, API docs, and code layout.
