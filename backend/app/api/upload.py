"""Upload API endpoints"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
import uuid
import os

from app.core.config import settings
from app.db.session import get_session, DatasetModel
from app.services.csv_loader import CSVLoader, format_file_size
from app.services.profiler import Profiler
from app.services.schema_inference import SchemaInference
from app.services.embedding_store import EmbeddingStore
from app.models.schemas import UploadResponse, DatasetProfile

router = APIRouter()

@router.post("/upload", response_model=UploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session)
):
    """Upload and process CSV file"""
    logger.info(f"Uploading file: {file.filename}")
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Validate file size
    max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large: {format_file_size(file_size)}. Max: {settings.MAX_FILE_SIZE_MB}MB"
        )
    
    # Save file
    dataset_id = str(uuid.uuid4())
    file_path = os.path.join(settings.UPLOAD_DIR, f"{dataset_id}.csv")
    
    with open(file_path, 'wb') as f:
        f.write(content)
    
    logger.info(f"File saved: {file_path}")
    
    try:
        # Load and validate CSV
        loader = CSVLoader(file_path)
        loader.validate()
        
        # Profile dataset
        profiler = Profiler(loader)
        profile = profiler.profile_dataset(dataset_id, file_path)
        
        # Infer dataset description with LLM
        try:
            inference = SchemaInference()
            description = inference.infer_dataset_description(profile)
            profile.inferred_description = description
        except Exception as e:
            logger.warning(f"LLM inference failed: {e}")
            profile.inferred_description = f"Dataset chứa {profile.row_count:,} bản ghi với {profile.column_count} cột."
        
        # Store in database
        db_dataset = DatasetModel(
            id=dataset_id,
            file_name=profile.file_name,
            file_path=profile.file_path,
            row_count=profile.row_count,
            column_count=profile.column_count,
            file_size=profile.file_size,
            file_size_bytes=profile.file_size_bytes,
            profile_json=profile.model_dump(),
            inferred_description=profile.inferred_description
        )
        db.add(db_dataset)
        await db.commit()
        
        # Embed schema into vector store
        try:
            embedding_store = EmbeddingStore()
            embedding_store.embed_schema(profile)
        except Exception as e:
            logger.warning(f"Embedding failed: {e}")
        
        logger.info(f"Dataset uploaded and processed: {dataset_id}")
        
        return UploadResponse(
            dataset_id=dataset_id,
            profile=profile,
            message=f"CSV uploaded successfully. {profile.row_count:,} rows, {profile.column_count} columns."
        )
        
    except Exception as e:
        # Cleanup on error
        if os.path.exists(file_path):
            os.remove(file_path)
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
