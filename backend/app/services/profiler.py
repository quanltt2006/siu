"""Profiler Service - Auto-profile CSV data"""
import pandas as pd
import numpy as np
from typing import List
from loguru import logger

from app.models.schemas import ColumnProfile, DatasetProfile, DtypeEnum
from app.services.csv_loader import CSVLoader, format_file_size

class Profiler:
    """Auto-profile CSV data"""
    
    def __init__(self, loader: CSVLoader):
        self.loader = loader
    
    def detect_dtype(self, series: pd.Series) -> DtypeEnum:
        """Detect column dtype"""
        non_null = series.dropna()
        if len(non_null) == 0:
            return DtypeEnum.STRING
        
        # Check numeric
        numeric_count = pd.to_numeric(non_null, errors='coerce').notna().sum()
        if numeric_count / len(non_null) > 0.8:
            return DtypeEnum.NUMBER
        
        # Check boolean
        bool_values = {'true', 'false', '0', '1', 'yes', 'no'}
        bool_count = non_null.astype(str).str.lower().isin(bool_values).sum()
        if bool_count / len(non_null) > 0.8:
            return DtypeEnum.BOOLEAN
        
        # Check date
        date_count = pd.to_datetime(non_null, errors='coerce').notna().sum()
        if date_count / len(non_null) > 0.8:
            return DtypeEnum.DATE
        
        return DtypeEnum.STRING
    
    def get_sample_values(self, series: pd.Series, n: int = 5) -> List[str]:
        """Get sample values from column"""
        unique = series.dropna().unique()
        return [str(v) for v in unique[:n]]
    
    def compute_stats(self, series: pd.Series, dtype: DtypeEnum) -> dict:
        """Compute statistics for column"""
        stats = {}
        
        if dtype == DtypeEnum.NUMBER:
            numeric = pd.to_numeric(series, errors='coerce').dropna()
            if len(numeric) > 0:
                stats['min'] = float(numeric.min())
                stats['max'] = float(numeric.max())
                stats['mean'] = round(float(numeric.mean()), 2)
                stats['median'] = round(float(numeric.median()), 2)
        else:
            non_null = series.dropna().astype(str)
            if len(non_null) > 0:
                sorted_vals = sorted(non_null.unique())
                stats['min'] = sorted_vals[0]
                stats['max'] = sorted_vals[-1]
        
        return stats
    
    def profile_column(self, name: str, series: pd.Series) -> ColumnProfile:
        """Profile a single column"""
        dtype = self.detect_dtype(series)
        null_count = int(series.isna().sum())
        null_percent = round((null_count / len(series)) * 100, 2)
        unique_count = int(series.nunique())
        sample_values = self.get_sample_values(series)
        stats = self.compute_stats(series, dtype)
        
        return ColumnProfile(
            name=name,
            dtype=dtype,
            null_count=null_count,
            null_percent=null_percent,
            unique_count=unique_count,
            sample_values=sample_values,
            **stats
        )
    
    def profile_dataset(self, dataset_id: str, file_path: str) -> DatasetProfile:
        """Profile entire dataset"""
        logger.info(f"Profiling dataset: {file_path}")
        
        # Load data
        df = self.loader.load_pandas()
        
        # Profile each column
        columns = []
        for col in df.columns:
            col_profile = self.profile_column(col, df[col])
            columns.append(col_profile)
        
        # Create dataset profile
        profile = DatasetProfile(
            id=dataset_id,
            file_name=self.loader.file_path.name,
            file_path=file_path,
            row_count=len(df),
            column_count=len(df.columns),
            file_size=format_file_size(self.loader.file_size),
            file_size_bytes=self.loader.file_size,
            columns=columns
        )
        
        logger.info(f"Profiled: {profile.row_count} rows, {profile.column_count} columns")
        return profile
