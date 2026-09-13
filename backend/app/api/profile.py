"""Profile API endpoints"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger
from typing import List

from app.db.session import get_session, DatasetModel
from app.models.schemas import DatasetProfile

router = APIRouter()

@router.get("/datasets", response_model=List[DatasetProfile])
async def list_datasets(db: AsyncSession = Depends(get_session)):
    """List all uploaded datasets"""
    logger.info("Listing all datasets")
    
    result = await db.execute(select(DatasetModel).order_by(DatasetModel.created_at.desc()))
    datasets = result.scalars().all()
    
    return [DatasetModel(**ds.__dict__).profile_json for ds in datasets]

@router.get("/profile/{dataset_id}", response_model=DatasetProfile)
async def get_profile(dataset_id: str, db: AsyncSession = Depends(get_session)):
    """Get dataset profile"""
    logger.info(f"Getting profile for dataset: {dataset_id}")
    
    result = await db.execute(select(DatasetModel).where(DatasetModel.id == dataset_id))
    dataset = result.scalar_one_or_none()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    return DatasetProfile(**dataset.profile_json)

@router.delete("/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str, db: AsyncSession = Depends(get_session)):
    """Delete dataset and all associated data"""
    logger.info(f"Deleting dataset: {dataset_id}")
    
    result = await db.execute(select(DatasetModel).where(DatasetModel.id == dataset_id))
    dataset = result.scalar_one_or_none()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Delete file
    import os
    if os.path.exists(dataset.file_path):
        os.remove(dataset.file_path)
    
    # Delete embeddings
    try:
        from app.services.embedding_store import EmbeddingStore
        embedding_store = EmbeddingStore()
        embedding_store.delete_dataset(dataset_id)
    except Exception as e:
        logger.warning(f"Failed to delete embeddings: {e}")
    
    # Delete from database
    await db.delete(dataset)
    await db.commit()
    
    return {"message": f"Dataset {dataset_id} deleted successfully"}
