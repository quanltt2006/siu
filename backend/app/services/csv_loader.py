"""CSV Loader Service - Handles CSV reading with tier support"""
import pandas as pd
import duckdb
from pathlib import Path
from typing import Optional, Tuple
from loguru import logger

from app.core.config import settings

class CSVLoader:
    """Load CSV files with tier-based strategy"""
    
    TIER1_MAX_BYTES = 50 * 1024 * 1024  # 50MB
    TIER2_MAX_BYTES = 1024 * 1024 * 1024  # 1GB
    
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.file_size = self.file_path.stat().st_size
        self.tier = self._determine_tier()
    
    def _determine_tier(self) -> int:
        """Determine which tier to use based on file size"""
        if self.file_size <= self.TIER1_MAX_BYTES:
            return 1
        elif self.file_size <= self.TIER2_MAX_BYTES:
            return 2
        else:
            raise ValueError(f"File too large: {self.file_size / (1024*1024):.1f}MB. Max supported: 1GB")
    
    def load_pandas(self, nrows: Optional[int] = None) -> pd.DataFrame:
        """Load CSV into pandas DataFrame (Tier 1)"""
        if self.tier != 1:
            logger.warning(f"File is Tier {self.tier}, but loading with pandas")
        
        logger.info(f"Loading CSV with pandas: {self.file_path.name}")
        df = pd.read_csv(self.file_path, nrows=nrows)
        logger.info(f"Loaded {len(df)} rows, {len(df.columns)} columns")
        return df
    
    def load_duckdb(self) -> duckdb.DuckDBPyConnection:
        """Load CSV with DuckDB for large files (Tier 2)"""
        if self.tier != 2:
            logger.info(f"File is Tier {self.tier}, using DuckDB anyway")
        
        logger.info(f"Loading CSV with DuckDB: {self.file_path.name}")
        con = duckdb.connect()
        con.execute(f"CREATE TABLE data AS SELECT * FROM read_csv_auto('{self.file_path}')")
        return con
    
    def get_preview(self, n_rows: int = 5) -> Tuple[pd.DataFrame, int]:
        """Get preview of data without loading entire file"""
        if self.tier == 1:
            df = pd.read_csv(self.file_path, nrows=n_rows)
            # Get total row count
            total = sum(1 for _ in open(self.file_path)) - 1
            return df, total
        else:
            con = duckdb.connect()
            df = con.execute(f"SELECT * FROM read_csv_auto('{self.file_path}') LIMIT {n_rows}").df()
            total = con.execute(f"SELECT COUNT(*) FROM read_csv_auto('{self.file_path}')").fetchone()[0]
            con.close()
            return df, total
    
    def validate(self) -> bool:
        """Validate CSV file"""
        try:
            # Check if file exists
            if not self.file_path.exists():
                raise FileNotFoundError(f"File not found: {self.file_path}")
            
            # Check file size
            if self.file_size > self.TIER2_MAX_BYTES:
                raise ValueError(f"File too large: {self.file_size / (1024*1024):.1f}MB")
            
            # Try to read header
            df = pd.read_csv(self.file_path, nrows=0)
            if len(df.columns) == 0:
                raise ValueError("CSV has no columns")
            
            logger.info(f"CSV validated: {len(df.columns)} columns")
            return True
            
        except Exception as e:
            logger.error(f"CSV validation failed: {e}")
            raise

def format_file_size(size_bytes: int) -> str:
    """Format file size in human-readable format"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
