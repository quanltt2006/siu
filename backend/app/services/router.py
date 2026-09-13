"""Router Service - Classify questions into RAG vs Code-gen"""
from typing import Literal
from loguru import logger

from app.core.config import settings

class QuestionRouter:
    """Route questions to RAG or Code-gen based on intent"""
    
    # Patterns for code generation (statistics, filtering, aggregation)
    CODE_GEN_PATTERNS = [
        'trung bình', 'mean', 'average', 'tổng', 'sum', 'đếm', 'count',
        'lớn nhất', 'max', 'nhỏ nhất', 'min', 'top', 'bottom',
        'phân bố', 'distribution', 'nhóm', 'group', 'lọc', 'filter',
        'so sánh', 'compare', 'tỷ lệ', 'percentage', 'ratio',
        'biểu đồ', 'chart', 'plot', 'vẽ', 'hiển thị', 'show',
        'bao nhiêu', 'how many', 'how much', 'what is',
        'tính', 'calculate', 'compute', 'thống kê', 'statistics',
    ]
    
    # Patterns for RAG (meaning, description, context)
    RAG_PATTERNS = [
        'ý nghĩa', 'nghĩa là', 'có nghĩa', 'giải thích', 'explain',
        'mô tả', 'describe', 'là gì', 'what is', 'tại sao', 'why',
        'context', 'bối cảnh', 'thông tin về', 'information about',
        'dataset này', 'dữ liệu này', 'nói về', 'about',
        'column', 'cột', 'field', 'trường',
    ]
    
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
    
    def route_with_patterns(self, question: str) -> Literal["rag", "code-gen", "general"]:
        """Route using pattern matching (fast, no LLM call)"""
        q = question.lower()
        
        has_code_gen = any(p in q for p in self.CODE_GEN_PATTERNS)
        has_rag = any(p in q for p in self.RAG_PATTERNS)
        
        if has_code_gen and not has_rag:
            return "code-gen"
        if has_rag and not has_code_gen:
            return "rag"
        if has_code_gen and has_rag:
            return "code-gen"  # Prioritize code-gen
        return "general"
    
    def route_with_llm(self, question: str) -> Literal["rag", "code-gen", "general"]:
        """Route using LLM classification (more accurate)"""
        logger.info(f"Routing question with LLM: {question[:50]}...")
        
        prompt = f"""Classify this question into one of three categories:

1. "code-gen": Questions requiring data computation (statistics, filtering, aggregation, comparison, charts)
2. "rag": Questions about meaning, description, context, or explanation of columns/dataset
3. "general": Other questions

Question: {question}

Respond with ONLY the category name (code-gen, rag, or general)."""
        
        try:
            if self.provider == "openai":
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                    max_tokens=10
                )
                result = response.choices[0].message.content.strip().lower()
            else:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=10,
                    messages=[{"role": "user", "content": prompt}]
                )
                result = response.content[0].text.strip().lower()
            
            if "code-gen" in result:
                return "code-gen"
            elif "rag" in result:
                return "rag"
            else:
                return "general"
                
        except Exception as e:
            logger.error(f"LLM routing failed: {e}, falling back to pattern matching")
            return self.route_with_patterns(question)
    
    def route(self, question: str, use_llm: bool = False) -> Literal["rag", "code-gen", "general"]:
        """Route question to appropriate handler"""
        if use_llm:
            return self.route_with_llm(question)
        return self.route_with_patterns(question)
