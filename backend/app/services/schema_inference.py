"""Schema Inference Service - Use LLM to infer column meanings"""
from typing import List, Optional
from loguru import logger

from app.core.config import settings
from app.models.schemas import DatasetProfile, ColumnProfile

class SchemaInference:
    """Use LLM to infer dataset and column meanings"""
    
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self._init_llm()
    
    def _init_llm(self):
        """Initialize LLM client"""
        if self.provider == "openai":
            from openai import OpenAI
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.OPENAI_MODEL
        elif self.provider == "anthropic":
            import anthropic
            self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            self.model = settings.ANTHROPIC_MODEL
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")
    
    def _call_llm(self, prompt: str, system: Optional[str] = None) -> str:
        """Call LLM with prompt"""
        if self.provider == "openai":
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.3,
                max_tokens=1000
            )
            return response.choices[0].message.content
        
        elif self.provider == "anthropic":
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                system=system or "You are a data analyst.",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
    
    def infer_dataset_description(self, profile: DatasetProfile) -> str:
        """Infer what the dataset is about"""
        logger.info("Inferring dataset description with LLM")
        
        col_summary = "\n".join([
            f"- {c.name} ({c.dtype.value}): {c.unique_count} unique, {c.null_percent}% null, samples: {', '.join(c.sample_values[:3])}"
            for c in profile.columns
        ])
        
        prompt = f"""Analyze this CSV dataset and provide a brief description (2-3 sentences) of what it likely contains.

Dataset: {profile.file_name}
Rows: {profile.row_count:,}
Columns: {profile.column_count}

Column Summary:
{col_summary}

Provide a concise description in Vietnamese about what this dataset likely represents. Start with "Dataset này chứa..." and mention the likely domain/purpose."""
        
        try:
            description = self._call_llm(
                prompt,
                system="You are a data analyst. Respond in Vietnamese. Be concise and informative."
            )
            logger.info(f"Inferred description: {description[:100]}...")
            return description
        except Exception as e:
            logger.error(f"LLM inference failed: {e}")
            # Fallback
            return f"Dataset chứa {profile.row_count:,} bản ghi với {profile.column_count} cột. (Mô tả tự động không khả dụng)"
    
    def infer_column_description(self, column: ColumnProfile, dataset_context: str) -> str:
        """Infer meaning of a specific column"""
        logger.info(f"Inferring description for column: {column.name}")
        
        prompt = f"""Given this column from a CSV dataset, infer what it likely represents.

Dataset context: {dataset_context}

Column: {column.name}
Type: {column.dtype.value}
Unique values: {column.unique_count}
Sample values: {', '.join(column.sample_values[:5])}
{f"Range: {column.min} to {column.max}" if column.dtype.value == "number" else ""}
{f"Mean: {column.mean}, Median: {column.median}" if column.dtype.value == "number" and column.mean else ""}

Provide a brief description (1 sentence) in Vietnamese of what this column likely represents. Start with "Cột này có thể là..." """
        
        try:
            description = self._call_llm(
                prompt,
                system="You are a data analyst. Respond in Vietnamese. Be concise."
            )
            return description
        except Exception as e:
            logger.error(f"Column inference failed: {e}")
            return f"Cột {column.name} ({column.dtype.value})"
