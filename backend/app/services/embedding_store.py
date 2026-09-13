"""Embedding Store Service - RAG with ChromaDB"""
import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import List, Optional, Dict, Any
from loguru import logger

from app.core.config import settings
from app.models.schemas import DatasetProfile, ColumnContext

class EmbeddingStore:
    """Schema-aware RAG using ChromaDB"""
    
    def __init__(self):
        self.client = chromadb.Client(ChromaSettings(
            persist_directory=settings.CHROMA_PERSIST_DIR,
            anonymized_telemetry=False
        ))
        logger.info(f"ChromaDB initialized at {settings.CHROMA_PERSIST_DIR}")
    
    def _get_collection(self, dataset_id: str):
        """Get or create collection for dataset"""
        return self.client.get_or_create_collection(
            name=f"dataset_{dataset_id}",
            metadata={"hnsw:space": "cosine"}
        )
    
    def embed_schema(self, profile: DatasetProfile, contexts: List[ColumnContext] = None):
        """Embed schema metadata into vector store"""
        logger.info(f"Embedding schema for dataset: {profile.id}")
        collection = self._get_collection(profile.id)
        
        contexts_dict = {c.name: c.user_description for c in (contexts or [])}
        
        # Embed dataset-level document
        dataset_doc = f"""Dataset: {profile.file_name}
Rows: {profile.row_count:,}
Columns: {profile.column_count}
Description: {profile.inferred_description or 'N/A'}
"""
        
        documents = [dataset_doc]
        ids = [f"{profile.id}_dataset"]
        metadatas = [{"type": "dataset", "file_name": profile.file_name}]
        
        # Embed column-level documents
        for col in profile.columns:
            user_desc = contexts_dict.get(col.name, "")
            col_doc = f"""Column: {col.name}
Type: {col.dtype.value}
Unique values: {col.unique_count}
Null percentage: {col.null_percent}%
Sample values: {', '.join(col.sample_values[:5])}
"""
            if col.dtype.value == "number" and col.mean is not None:
                col_doc += f"Range: {col.min} to {col.max}, Mean: {col.mean}, Median: {col.median}\n"
            
            if user_desc:
                col_doc += f"User description: {user_desc}\n"
            
            documents.append(col_doc)
            ids.append(f"{profile.id}_col_{col.name}")
            metadatas.append({
                "type": "column",
                "column_name": col.name,
                "dtype": col.dtype.value,
                "user_description": user_desc
            })
        
        collection.upsert(documents=documents, ids=ids, metadatas=metadatas)
        logger.info(f"Embedded {len(documents)} documents for dataset {profile.id}")
    
    def query(self, dataset_id: str, question: str, n_results: int = 3) -> List[Dict[str, Any]]:
        """Query vector store for relevant context"""
        logger.info(f"Querying RAG for dataset {dataset_id}: {question[:50]}...")
        collection = self._get_collection(dataset_id)
        
        results = collection.query(
            query_texts=[question],
            n_results=n_results
        )
        
        contexts = []
        if results['documents'] and results['documents'][0]:
            for i, doc in enumerate(results['documents'][0]):
                contexts.append({
                    "document": doc,
                    "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                    "distance": results['distances'][0][i] if results['distances'] else None,
                    "id": results['ids'][0][i] if results['ids'] else None,
                })
        
        logger.info(f"Found {len(contexts)} relevant documents")
        return contexts
    
    def delete_dataset(self, dataset_id: str):
        """Delete all embeddings for a dataset"""
        try:
            self.client.delete_collection(f"dataset_{dataset_id}")
            logger.info(f"Deleted embeddings for dataset {dataset_id}")
        except Exception as e:
            logger.warning(f"Failed to delete embeddings: {e}")
