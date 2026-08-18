import json
import logging
from typing import List, Dict
from openai import OpenAI
from django.conf import settings
from pathlib import Path
import numpy as np
from ..models import QuestionPaper, QuestionBankQuestion, Semester
from .embedding_service import EmbeddingService, PDFProcessor

logger = logging.getLogger(__name__)

class PrepService:
    """Service for Analyzing Question Papers and Identifying Repetitions"""

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.embedding_service = EmbeddingService()
        self.processor = PDFProcessor()

    def analyze_paper(self, paper_id: int):
        """Extract questions from a paper and update the question bank with repetitions."""
        try:
            paper = QuestionPaper.objects.get(id=paper_id)
            if not paper.file:
                return {"error": "No file associated with this paper"}

            # 1. Extract raw text
            pdf_path = paper.file.path
            chunks = self.processor.extract_chunks(pdf_path, chunk_size=2000, overlap=200)
            full_text = "\n".join(chunks)

            # 2. Use AI to extract discrete questions
            extracted_questions = self._extract_questions_from_text(full_text, paper.course.name)
            
            # 3. Process each question
            processed_count = 0
            new_count = 0
            repeated_count = 0
            
            # Reset existing bank associations for this paper if re-analyzing? 
            # Or just keep adding. Currently adds.

            if not extracted_questions:
                logger.warning(f"No questions extracted from paper {paper_id}")
                return {"error": "AI failed to extract questions from this paper. Ensure the PDF is not scout/image-only."}

            for q_data in extracted_questions:
                processed_count += 1
                q_text = q_data.get("question", "").strip()
                if not q_text:
                    continue

                # Find match using semantic similarity or exact match
                match = self._find_semantic_match(q_text, paper.semester)

                if match:
                    # Increment repetition
                    if paper.year not in match.last_seen_years:
                        match.last_seen_years.append(paper.year)
                        match.repetition_count += 1
                        match.save()
                        repeated_count += 1
                else:
                    # Create new bank entry
                    QuestionBankQuestion.objects.create(
                        semester=paper.semester,
                        text=q_text,
                        solution=q_data.get("solution", ""),
                        repetition_count=1,
                        last_seen_years=[paper.year],
                        relevance_score=0.8 # Initial score
                    )
                    new_count += 1

            paper.is_analyzed = True
            paper.save()

            return {
                "success": True,
                "processed": processed_count,
                "new": new_count,
                "repeated": repeated_count
            }

        except Exception as e:
            logger.error(f"Paper analysis failed: {e}")
            return {"error": str(e)}

    def _extract_questions_from_text(self, text: str, course_name: str) -> List[Dict]:
        """Use LLM to split raw PDF text into discrete, clean question objects."""
        prompt = f"""You are an AI assistant specialized in academic examination papers for the course: {course_name}.
Extract EVERY discrete exam question from the provided raw text.
For each question, also provide a short, accurate solution if possible, otherwise leave it blank.

Raw Text:
{text[:12000]}

Respond ONLY with a JSON object containing a "questions" key:
{{
  "questions": [
    {{
      "question": "Full text of the question...",
      "solution": "Concise bullet-point answer or 'Refer to textbook'..."
    }},
    ...
  ]
}}"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content.strip()
            data = json.loads(content)
            
            if isinstance(data, dict) and "questions" in data:
                return data["questions"]
            return data if isinstance(data, list) else []
        except Exception as e:
            logger.error(f"Extraction failed: {e}")
            return []

    def _find_semantic_match(self, text: str, semester: Semester, threshold: float = 0.85) -> QuestionBankQuestion:
        """Find an existing question in the bank that is semantically similar."""
        bank_qs = QuestionBankQuestion.objects.filter(semester=semester)
        if not bank_qs.exists():
            return None

        # Embed the new question
        new_emb = self.embedding_service.embed_text(text)
        
        # Simple cosine similarity loop (could be optimized with FAISS if bank grows huge)
        best_match = None
        best_score = -1.0

        for bq in bank_qs:
            bq_emb = self.embedding_service.embed_text(bq.text)
            score = np.dot(new_emb, bq_emb) / (np.linalg.norm(new_emb) * np.linalg.norm(bq_emb))
            
            if score > best_score:
                best_score = score
                best_match = bq
                best_match_score = score

        if best_score >= threshold:
            return best_match
        return None

    def generate_one_night_insights(self, course_name: str, questions: List[Dict]):
        """Generate AI strategy and probabilities based on pattern analysis."""
        if not questions:
            return {
                "strategy": "We haven't analyzed enough papers for this course yet to build a reliable strategy. Focus on your syllabus for now.",
                "probabilities": [],
                "tips": ["Review all chapter headings", "Focus on bolded definitions", "Practice basic diagrams"]
            }

        # Summarize the questions for the prompt
        q_summary = "\n".join([f"- {q.get('text', '')[:100]}... (Repeated {q.get('repetition_count', 1)} times)" for q in questions[:25]])
        
        prompt = f"""You are an elite exam analyst for the course '{course_name}'. 
Based on these recurring question patterns from past years, generate a 'One-Night Prep Guide'.

Recurring Patterns:
{q_summary}

Predict the most likely topics and provide a high-speed study strategy.

Respond ONLY with a JSON object:
{{
    "strategy": "A powerful 2-sentence summary of what to focus on.",
    "probabilities": [
        {{"label": "Topic A", "prob": 90}},
        {{"label": "Topic B", "prob": 75}},
        {{"label": "Topic C", "prob": 60}}
    ],
    "tips": [
        "High-impact tip 1 (e.g. Focus on Derivations)",
        "High-impact tip 2 (e.g. Memorize Block Diagrams)",
        "High-impact tip 3"
    ]
}}"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Insight generation failed: {e}")
            return {
                "error": "Failed to generate AI insights",
                "strategy": "Focus on the most repeated questions in the list below.",
                "probabilities": [],
                "tips": []
            }
