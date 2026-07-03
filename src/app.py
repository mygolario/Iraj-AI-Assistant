import streamlit as st

st.set_page_config(page_title="Iraj AI Assistant — Migrated", page_icon="🚀", layout="centered")

st.title("🚀 Iraj AI Assistant has moved")

st.markdown(
    """
    This Streamlit app has been **fully rebuilt** as a modern full-stack application:

    | Old Stack | New Stack |
    |-----------|-----------|
    | Python Streamlit | **Next.js 16** + **FastAPI** |
    | Monolithic `app.py` | Modular API routes + React components |
    | Embedded charts | Recharts + Framer Motion |
    | Single-process | Frontend + backend decoupled |

    ### What changed?
    - **Frontend:** Next.js 16 App Router with Aurora Indigo glass design
    - **Backend:** FastAPI with 12 REST endpoints + SSE streaming chat
    - **All real:** No mock data — live spreadsheet parsing, RAG, scraper, LLM integration

    ### Next steps
    The new version will be deployed separately. Check the GitHub repo for updates:
    [github.com/mygolario/Iraj-AI-Assistant](https://github.com/mygolario/Iraj-AI-Assistant)
    """
)

st.info("This page is a redirect stub. The full app is now a Next.js + FastAPI deployment.")
