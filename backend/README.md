# Smart CSV Analyst - Backend

FastAPI backend với RAG + Text-to-Pandas Agent.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Environment Variables

Copy `.env.example` thành `.env` và điền:

```bash
cp .env.example .env
```

Cần có:
- `OPENAI_API_KEY` hoặc `ANTHROPIC_API_KEY`
- `DATABASE_URL` (mặc định: SQLite local)

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Truy cập: http://localhost:8000/docs (Swagger UI)

## Architecture

```
Upload CSV → Auto-Profile → LLM Infer Schema → User Context
    ↓
Embed Schema + Context → Vector Store (ChromaDB)
    ↓
User Question → Router → 
    ├─ RAG: Câu hỏi ý nghĩa/mô tả → Truy vấn vector store → Trả lời
    └─ Code-Gen: Câu hỏi số liệu → Sinh code pandas → Sandbox → Kết quả
```

## Features

- ✅ Upload & validate CSV (≤50MB MVP)
- ✅ Auto-profiling: dtype, null%, unique, stats
- ✅ LLM schema inference (suy đoán ý nghĩa cột)
- ✅ User context editing (bổ sung mô tả cột)
- ✅ Schema-aware RAG (embed metadata + context)
- ✅ Text-to-Pandas agent (sinh code từ câu hỏi)
- ✅ Sandbox execution an toàn
- ✅ Route classification (RAG vs Code-gen)

## API Endpoints

- `POST /api/upload` - Upload CSV
- `GET /api/profile/{dataset_id}` - Lấy profiling
- `PUT /api/context/{dataset_id}` - Cập nhật context cột
- `POST /api/chat/{dataset_id}` - Hỏi đáp
- `GET /api/datasets` - List datasets

## Tech Stack

- **Framework**: FastAPI
- **Data**: Pandas (nhỏ), DuckDB (lớn - future)
- **LLM**: OpenAI/Anthropic (configurable)
- **Vector DB**: ChromaDB (local)
- **Sandbox**: RestrictedPython + subprocess
- **DB**: SQLite/PostgreSQL
