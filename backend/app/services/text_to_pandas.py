"""Text-to-Pandas Service - Generate pandas code from natural language"""
from typing import Dict, Any, Optional, Tuple
from loguru import logger

from app.core.config import settings
from app.models.schemas import DatasetProfile

class TextToPandas:
    """Generate pandas code from natural language questions"""
    
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
    
    def _build_schema_context(self, profile: DatasetProfile) -> str:
        """Build schema context for LLM"""
        cols = []
        for c in profile.columns:
            col_info = f"- `{c.name}` ({c.dtype.value})"
            if c.dtype.value == "number":
                col_info += f" [range: {c.min}-{c.max}, mean: {c.mean}]"
            col_info += f" | samples: {', '.join(c.sample_values[:3])}"
            cols.append(col_info)
        
        return "\n".join(cols)
    
    def generate_code(self, question: str, profile: DatasetProfile) -> Tuple[str, str]:
        """Generate pandas code from question"""
        logger.info(f"Generating code for: {question[:50]}...")
        
        schema_context = self._build_schema_context(profile)
        
        system_prompt = """You are a pandas expert. Generate Python pandas code to answer the user's question about a CSV dataset.

Rules:
1. Use pandas library only
2. The CSV is already loaded as variable `df`
3. Return ONLY the code, no explanations
4. Use actual column names from the schema
5. Handle missing values appropriately
6. For aggregation, use groupby when appropriate
7. For top/bottom, use nlargest/nsmallest
8. For statistics, use describe() or specific functions
9. Code should be executable and return a result

Example output format:
```python
result = df['column_name'].mean()
print(f"Mean: {result:.2f}")
```"""
        
        user_prompt = f"""Dataset: {profile.file_name}
Rows: {profile.row_count:,}

Schema:
{schema_context}

Question: {question}

Generate pandas code to answer this question."""
        
        try:
            if self.provider == "openai":
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.1,
                    max_tokens=1000
                )
                code = response.choices[0].message.content
            else:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=1000,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}]
                )
                code = response.content[0].text
            
            # Clean up code (remove markdown code blocks if present)
            code = code.strip()
            if code.startswith("```python"):
                code = code[9:]
            if code.startswith("```"):
                code = code[3:]
            if code.endswith("```"):
                code = code[:-3]
            code = code.strip()
            
            # Generate explanation
            explanation = self._generate_explanation(question, code)
            
            logger.info(f"Generated code: {code[:100]}...")
            return code, explanation
            
        except Exception as e:
            logger.error(f"Code generation failed: {e}")
            # Fallback code
            fallback_code = f"""# Fallback: Basic statistics
import pandas as pd

print("Dataset shape:", df.shape)
print("\\nColumns:", list(df.columns))
print("\\nFirst 5 rows:")
print(df.head())
print("\\nBasic statistics:")
print(df.describe())
"""
            return fallback_code, "Code generation failed, showing basic statistics instead."
    
    def _generate_explanation(self, question: str, code: str) -> str:
        """Generate human-readable explanation of the code"""
        # Simple keyword-based explanation
        q = question.lower()
        
        if 'trung bình' in q or 'mean' in q or 'average' in q:
            return "Tính giá trị trung bình của cột được yêu cầu"
        elif 'tổng' in q or 'sum' in q:
            return "Tính tổng giá trị của cột được yêu cầu"
        elif 'lớn nhất' in q or 'max' in q or 'top' in q:
            return "Lấy các giá trị lớn nhất từ dataset"
        elif 'nhỏ nhất' in q or 'min' in q or 'bottom' in q:
            return "Lấy các giá trị nhỏ nhất từ dataset"
        elif 'nhóm' in q or 'group' in q:
            return "Group by và tính toán thống kê theo nhóm"
        elif 'phân bố' in q or 'distribution' in q:
            return "Phân tích phân bố giá trị"
        elif 'so sánh' in q or 'compare' in q:
            return "So sánh giá trị giữa các nhóm"
        elif 'đếm' in q or 'count' in q:
            return "Đếm số lượng giá trị"
        else:
            return "Thực hiện phân tích dữ liệu theo yêu cầu"
