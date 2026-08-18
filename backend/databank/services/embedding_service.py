import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Optional
from django.conf import settings

logger = logging.getLogger(__name__)

DATABANK_ROOT = getattr(settings, 'DATABANK_ROOT', Path(settings.BASE_DIR) / 'data-bank')


class PDFProcessor:
    """Extract text chunks from a PDF using PyMuPDF"""

    def extract_chunks(self, pdf_path: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(pdf_path)
            full_text = ""
            for page in doc:
                full_text += page.get_text() + "\n"
            doc.close()

            words = full_text.split()
            chunks = []
            start = 0
            while start < len(words):
                chunk = " ".join(words[start:start + chunk_size])
                if chunk.strip():
                    chunks.append(chunk.strip())
                start += chunk_size - overlap

            return chunks
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            return []

    def get_page_count(self, pdf_path: str) -> int:
        try:
            import fitz
            doc = fitz.open(pdf_path)
            count = doc.page_count
            doc.close()
            return count
        except Exception as e:
            logger.error(f"Page count failed: {e}")
            return 0


class EmbeddingService:
    """Sentence-transformer embeddings using all-MiniLM-L6-v2"""
    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            from sentence_transformers import SentenceTransformer
            cls._model = SentenceTransformer('all-MiniLM-L6-v2')
        return cls._model

    def embed_texts(self, texts: List[str]):
        model = self.get_model()
        return model.encode(texts, show_progress_bar=False)

    def embed_text(self, text: str):
        return self.embed_texts([text])[0]


class FAISSIndexService:
    """
    Per-subject FAISS index.
    Stored at: data-bank/<subject_slug>/index.faiss + chunks.json
    """

    def __init__(self, subject_slug: str):
        self.subject_slug = subject_slug
        self.index_dir = Path(DATABANK_ROOT) / subject_slug
        self.index_dir.mkdir(parents=True, exist_ok=True)
        self.index_path = self.index_dir / "index.faiss"
        self.chunks_path = self.index_dir / "chunks.json"
        self.embedding_service = EmbeddingService()

    def _load_chunks(self) -> List[str]:
        if self.chunks_path.exists():
            with open(self.chunks_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []

    def _save_chunks(self, chunks: List[str]):
        with open(self.chunks_path, 'w', encoding='utf-8') as f:
            json.dump(chunks, f, ensure_ascii=False)

    def index_document(self, pdf_path: str) -> int:
        """Process PDF and add its chunks to the FAISS index. Returns chunk count."""
        import faiss
        import numpy as np

        processor = PDFProcessor()
        new_chunks = processor.extract_chunks(pdf_path)
        if not new_chunks:
            return 0

        existing_chunks = self._load_chunks()
        all_chunks = existing_chunks + new_chunks

        embeddings = self.embedding_service.embed_texts(all_chunks)
        embeddings = np.array(embeddings, dtype='float32')

        dimension = embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(embeddings)

        faiss.write_index(index, str(self.index_path))
        self._save_chunks(all_chunks)

        return len(new_chunks)

    def search(self, query: str, top_k: int = 5) -> List[str]:
        """Semantic search — returns top_k matching chunks."""
        if not self.index_path.exists():
            return []
        import faiss
        import numpy as np

        chunks = self._load_chunks()
        if not chunks:
            return []

        index = faiss.read_index(str(self.index_path))
        query_emb = self.embedding_service.embed_text(query)
        query_emb = np.array([query_emb], dtype='float32')

        k = min(top_k, len(chunks))
        distances, indices = index.search(query_emb, k)

        results = []
        for idx in indices[0]:
            if 0 <= idx < len(chunks):
                results.append(chunks[idx])
        return results

    def get_diverse_contexts(self, n: int = 10) -> List[str]:
        """
        Return n well-spread chunks from the index to generate varied questions.
        Uses uniform sampling across the chunk list.
        """
        chunks = self._load_chunks()
        if not chunks:
            return []

        if len(chunks) <= n:
            return chunks

        import random
        # Uniform spread + shuffle to avoid always same order
        step = len(chunks) // n
        indices = [min(i * step, len(chunks) - 1) for i in range(n)]
        selected = [chunks[i] for i in indices]
        random.shuffle(selected)
        return selected

    def is_indexed(self) -> bool:
        return self.index_path.exists() and self.chunks_path.exists()
