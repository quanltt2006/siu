"""Pydantic models/schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime
from enum import Enum

class DtypeEnum(str, Enum):
    STRING = "string"
    NUMBER = "number"
    DATE = "date"
    BOOLEAN = "boolean"
    MIXED = "mixed"

class ColumnProfile(BaseModel):
    name: str
    dtype: DtypeEnum
    null_count: int
    null_percent: float
    unique_count: int
    sample_values: List[str] = Field(default_factory=list)
    min: Optional[Any] = None
    max: Optional[Any] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    description: Optional[str] = None

class DatasetProfile(BaseModel):
    id: str
    file_name: str
    file_path: str
    row_count: int
    column_count: int
    file_size: str
    file_size_bytes: int
    columns: List[ColumnProfile]
    inferred_description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ColumnContext(BaseModel):
    name: str
    user_description: str

class ContextUpdateRequest(BaseModel):
    columns: List[ColumnContext]

class ChatMessage(BaseModel):
    id: str
    role: Literal["user", "assistant", "system"]
    content: str
    code: Optional[str] = None
    table_data: Optional[Dict[str, Any]] = None
    chart_data: Optional[Dict[str, Any]] = None
    route_type: Optional[Literal["rag", "code-gen", "general"]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    question: str
    history: Optional[List[ChatMessage]] = None

class ChatResponse(BaseModel):
    message: ChatMessage
    dataset_id: str

class UploadResponse(BaseModel):
    dataset_id: str
    profile: DatasetProfile
    message: str

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
