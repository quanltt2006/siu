"""Smart CSV Analyst - Backend Application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys

from app.core.config import settings
from app.api import upload, profile, context, chat
from app.db.session import init_db

# Configure logging
logger.remove()
logger.add(sys.stdout, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>")

app = FastAPI(
    title="Smart CSV Analyst API",
    description="RAG + Text-to-Pandas Agent for CSV data analysis",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(profile.router, prefix="/api", tags=["Profile"])
app.include_router(context.router, prefix="/api", tags=["Context"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])

@app.on_event("startup")
async def startup_event():
    """Initialize database and services on startup"""
    logger.info("Starting Smart CSV Analyst API...")
    await init_db()
    logger.info("Database initialized")
    logger.info(f"LLM Provider: {settings.LLM_PROVIDER}")
    logger.info(f"Max file size: {settings.MAX_FILE_SIZE_MB}MB")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Smart CSV Analyst API...")

@app.get("/")
async def root():
    return {
        "message": "Smart CSV Analyst API",
        "version": "0.1.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
