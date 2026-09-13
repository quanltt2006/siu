"""Database session management"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, JSON
from datetime import datetime
import os

from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

class DatasetModel(Base):
    __tablename__ = "datasets"
    
    id = Column(String, primary_key=True)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    row_count = Column(Integer, nullable=False)
    column_count = Column(Integer, nullable=False)
    file_size = Column(String, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    profile_json = Column(JSON, nullable=False)
    inferred_description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ColumnContextModel(Base):
    __tablename__ = "column_contexts"
    
    id = Column(String, primary_key=True)
    dataset_id = Column(String, nullable=False, index=True)
    column_name = Column(String, nullable=False)
    user_description = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ChatHistoryModel(Base):
    __tablename__ = "chat_history"
    
    id = Column(String, primary_key=True)
    dataset_id = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    code = Column(Text, nullable=True)
    result_json = Column(JSON, nullable=True)
    route_type = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_session() -> AsyncSession:
    """Get database session"""
    async with async_session() as session:
        yield session
