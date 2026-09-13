"""Chat API endpoints - Main Q&A interface"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger
import uuid
import pandas as pd

from app.db.session import get_session, DatasetModel, ChatHistoryModel
from app.services.csv_loader import CSVLoader
from app.services.router import QuestionRouter
from app.services.text_to_pandas import TextToPandas
from app.services.sandbox_executor import SandboxExecutor
from app.services.embedding_store import EmbeddingStore
from app.core.config import settings
from app.models.schemas import ChatRequest, ChatResponse, ChatMessage, DatasetProfile

router = APIRouter()

# Initialize services (singleton)
question_router = QuestionRouter()
text_to_pandas = TextToPandas()
sandbox_executor = SandboxExecutor()
embedding_store = EmbeddingStore()

def _build_rag_response(question: str, contexts: list, profile: DatasetProfile) -> str:
    """Build RAG response from retrieved contexts"""
    if not contexts:
        return f"Không tìm thấy thông tin liên quan trong dataset '{profile.file_name}'. Hãy thử hỏi cụ thể hơn."
    
    response = f"📚 **Thông tin từ RAG Context**\n\n"
    
    for i, ctx in enumerate(contexts):
        meta = ctx.get('metadata', {})
        doc = ctx.get('document', '')
        
        if meta.get('type') == 'dataset':
            response += f"📊 **Tổng quan Dataset:**\n{doc}\n\n"
        elif meta.get('type') == 'column':
            col_name = meta.get('column_name', '')
            response += f"📋 **Cột `{col_name}`:**\n{doc}\n\n"
    
    response += "\n💡 *Thông tin được truy vấn từ schema và context đã embed. Bạn có thể bổ sung context cho cột để có kết quả chính xác hơn.*"
    
    return response

@router.post("/chat/{dataset_id}", response_model=ChatResponse)
async def chat(
    dataset_id: str,
    request: ChatRequest,
    db: AsyncSession = Depends(get_session)
):
    """Main chat endpoint - handles both RAG and Code-gen"""
    logger.info(f"Chat request for dataset {dataset_id}: {request.question[:50]}...")
    
    # Get dataset
    result = await db.execute(select(DatasetModel).where(DatasetModel.id == dataset_id))
    dataset = result.scalar_one_or_none()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    profile = DatasetProfile(**dataset.profile_json)
    
    # Route question
    route_type = question_router.route(request.question, use_llm=False)
    logger.info(f"Routed to: {route_type}")
    
    # Generate response
    message_id = str(uuid.uuid4())
    
    if route_type == "rag":
        # RAG path
        contexts = embedding_store.query(dataset_id, request.question, n_results=3)
        content = _build_rag_response(request.question, contexts, profile)
        
        response_msg = ChatMessage(
            id=message_id,
            role="assistant",
            content=content,
            route_type="rag"
        )
    
    elif route_type == "code-gen":
        # Code-gen path
        code, explanation = text_to_pandas.generate_code(request.question, profile)
        
        # Load data and execute
        loader = CSVLoader(dataset.file_path)
        df = loader.load_pandas()
        
        exec_result = sandbox_executor.execute(code, df)
        
        if exec_result["success"]:
            content = f"✅ **Text-to-Pandas Agent**\n\n{explanation}\n\n"
            
            # Format result
            result_data = exec_result.get("result")
            if result_data:
                if result_data.get("type") == "dataframe":
                    content += "📊 **Kết quả:**\n"
                    headers = result_data.get("headers", [])
                    rows = result_data.get("rows", [])
                    content += f"\n```\n{headers}\n"
                    for row in rows[:10]:
                        content += f"{row}\n"
                    content += "```"
                elif result_data.get("type") == "number":
                    content += f"\n**Kết quả:** `{result_data.get('data')}`"
                elif result_data.get("type") == "string":
                    content += f"\n**Kết quả:** {result_data.get('data')}"
            
            if exec_result.get("output"):
                content += f"\n\n**Output:**\n```\n{exec_result['output'][:500]}\n```"
        else:
            content = f"❌ **Lỗi thực thi code:**\n\n```\n{exec_result.get('error', 'Unknown error')}\n```\n\nHãy thử hỏi lại hoặc diễn đạt khác đi."
        
        response_msg = ChatMessage(
            id=message_id,
            role="assistant",
            content=content,
            code=code,
            table_data=exec_result.get("result") if exec_result.get("success") else None,
            route_type="code-gen"
        )
    
    else:
        # General response
        content = f"""🤔 Tôi hiểu câu hỏi của bạn. Bạn có thể:

1. **Hỏi về ý nghĩa cột** → "Cột X có ý nghĩa gì?"
2. **Yêu cầu phân tích số liệu** → "Tính trung bình cột Y", "Top 10 giá trị lớn nhất"
3. **So sánh, phân nhóm** → "So sánh Z theo nhóm W"
4. **Tổng quan dataset** → "Dataset này nói về gì?"

Hãy thử một trong các câu hỏi trên!"""
        
        response_msg = ChatMessage(
            id=message_id,
            role="assistant",
            content=content,
            route_type="general"
        )
    
    # Save chat history
    user_msg = ChatHistoryModel(
        id=str(uuid.uuid4()),
        dataset_id=dataset_id,
        role="user",
        content=request.question,
        route_type=route_type
    )
    db.add(user_msg)
    
    assistant_msg = ChatHistoryModel(
        id=message_id,
        dataset_id=dataset_id,
        role="assistant",
        content=response_msg.content,
        code=response_msg.code,
        result_json=response_msg.table_data,
        route_type=route_type
    )
    db.add(assistant_msg)
    await db.commit()
    
    return ChatResponse(message=response_msg, dataset_id=dataset_id)

@router.get("/chat/{dataset_id}/history", response_model=list[ChatMessage])
async def get_chat_history(dataset_id: str, db: AsyncSession = Depends(get_session)):
    """Get chat history for a dataset"""
    result = await db.execute(
        select(ChatHistoryModel)
        .where(ChatHistoryModel.dataset_id == dataset_id)
        .order_by(ChatHistoryModel.created_at.asc())
    )
    messages = result.scalars().all()
    
    return [
        ChatMessage(
            id=m.id,
            role=m.role,
            content=m.content,
            code=m.code,
            table_data=m.result_json,
            route_type=m.route_type,
            timestamp=m.created_at
        )
        for m in messages
    ]
