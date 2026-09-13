"""Context API endpoints - Manage column context/descriptions"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from loguru import logger
import uuid

from app.db.session import get_session, DatasetModel, ColumnContextModel
from app.services.embedding_store import EmbeddingStore
from app.models.schemas import ContextUpdateRequest, ColumnContext, DatasetProfile

router = APIRouter()

@router.get("/context/{dataset_id}", response_model=list[ColumnContext])
async def get_context(dataset_id: str, db: AsyncSession = Depends(get_session)):
    """Get all column contexts for a dataset"""
    logger.info(f"Getting context for dataset: {dataset_id}")
    
    result = await db.execute(
        select(ColumnContextModel).where(ColumnContextModel.dataset_id == dataset_id)
    )
    contexts = result.scalars().all()
    
    return [ColumnContext(name=c.column_name, user_description=c.user_description) for c in contexts]

@router.put("/context/{dataset_id}")
async def update_context(
    dataset_id: str,
    request: ContextUpdateRequest,
    db: AsyncSession = Depends(get_session)
):
    """Update column contexts for a dataset"""
    logger.info(f"Updating context for dataset: {dataset_id}, {len(request.columns)} columns")
    
    # Verify dataset exists
    result = await db.execute(select(DatasetModel).where(DatasetModel.id == dataset_id))
    dataset = result.scalar_one_or_none()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Delete existing contexts
    await db.execute(
        delete(ColumnContextModel).where(ColumnContextModel.dataset_id == dataset_id)
    )
    
    # Insert new contexts
    for col_ctx in request.columns:
        db_context = ColumnContextModel(
            id=str(uuid.uuid4()),
            dataset_id=dataset_id,
            column_name=col_ctx.name,
            user_description=col_ctx.user_description
        )
        db.add(db_context)
    
    await db.commit()
    
    # Re-embed schema with new context
    try:
        profile = DatasetProfile(**dataset.profile_json)
        embedding_store = EmbeddingStore()
        embedding_store.embed_schema(profile, request.columns)
        logger.info("Schema re-embedded with new context")
    except Exception as e:
        logger.warning(f"Re-embedding failed: {e}")
    
    return {
        "message": f"Updated {len(request.columns)} column contexts",
        "dataset_id": dataset_id
    }

@router.get("/context/{dataset_id}/{column_name}", response_model=ColumnContext)
async def get_column_context(
    dataset_id: str,
    column_name: str,
    db: AsyncSession = Depends(get_session)
):
    """Get context for a specific column"""
    result = await db.execute(
        select(ColumnContextModel).where(
            ColumnContextModel.dataset_id == dataset_id,
            ColumnContextModel.column_name == column_name
        )
    )
    context = result.scalar_one_or_none()
    
    if not context:
        raise HTTPException(status_code=404, detail="Column context not found")
    
    return ColumnContext(name=context.column_name, user_description=context.user_description)
