import json
import logging
from typing import List, Dict
from openai import OpenAI
from django.conf import settings

logger = logging.getLogger(__name__)


class QuestionGeneratorService:
    """Generate exam-style questions from context chunks using OpenAI"""

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def generate_question(self, context: str, subject: str, question_index: int) -> Dict:
        """Generate a single meaningful MCQ question from a context chunk."""
        prompt = f"""You are an expert examiner for {subject}.
Based on the following text, generate ONE high-quality Multiple Choice Question (MCQ).
The question should test deep understanding of the source material.

Context:
{context[:1500]}

Respond ONLY in this exact JSON format (no markdown, no extra text):
{{
  "question": "<the question text>",
  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "answer": "<the exact text of the correct option from the list above>"
}}"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=400,
            )
            raw = response.choices[0].message.content.strip()
            # Clean JSON if AI adds markdown
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            
            data = json.loads(raw)
            return {
                "text": data.get("question", ""),
                "options": data.get("options", []),
                "correct_answer": data.get("answer", ""),
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            }
        except Exception as e:
            logger.error(f"MCQ generation failed: {e}")
            return {
                "text": f"Which of the following best describes the key concepts in this passage? {context[:50]}...",
                "options": ["Concept A", "Concept B", "None of these", "All of these"],
                "correct_answer": "Concept A",
                "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            }

    def generate_questions_batch(self, contexts: List[str], subject: str) -> Dict:
        """Generate exactly 10 questions. If contexts < 10, repeat some contexts."""
        questions = []
        total_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        
        target_count = 10
        # If no contexts, we can't do much, but the view should handle this.
        if not contexts:
            return {"questions": [], "usage": total_usage}

        # Cycle through contexts until we reach 10 questions
        for i in range(target_count):
            ctx = contexts[i % len(contexts)]
            result = self.generate_question(ctx, subject, i + 1)
            
            questions.append({
                "question_text": result["text"],
                "options": result["options"],
                "correct_answer": result["correct_answer"],
                "context_chunk": ctx,
                "question_index": i + 1,
            })
            # Aggregate usage
            u = result.get("usage", {})
            total_usage["prompt_tokens"] += u.get("prompt_tokens", 0)
            total_usage["completion_tokens"] += u.get("completion_tokens", 0)
            total_usage["total_tokens"] += u.get("total_tokens", 0)
        
        return {
            "questions": questions,
            "usage": total_usage
        }


class AnswerEvaluatorService:
    """Evaluate student answers using AI and return score + feedback"""

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def evaluate_answer(self, question: str, student_answer: str, context: str, subject: str, correct_answer: str = "") -> Dict:
        """
        Evaluate student answer against the source context and correct answer.
        Returns: {score: float (0-10), feedback: str, is_correct: bool}
        """
        prompt = f"""You are an expert evaluator for {subject} exams.
        
Question: {question}
{"Correct Answer: " + correct_answer if correct_answer else ""}

Source Context (ground truth):
{context[:1200]}

Student's Answer:
{student_answer}

{"This is an MCQ question. If the student's answer exactly matches or clearly indicates the correct option, they must receive 10.0/10." if correct_answer else "Evaluate the student's answer strictly on clarity and accuracy."}
1. Accuracy (does it align with the source material?)
2. Completeness (are key points covered?)
3. Clarity (is it well-expressed?)

Respond ONLY in this exact JSON format (no markdown, no extra text):
{{
  "score": <number from 0 to 10>,
  "feedback": "<2-4 sentences of constructive feedback>",
  "strengths": "<what the student got right>",
  "improvements": "<what could be improved>"
}}"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=400,
            )
            raw = response.choices[0].message.content.strip()
            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw)
            return {
                "score": float(data.get("score", 5)),
                "feedback": data.get("feedback", ""),
                "strengths": data.get("strengths", ""),
                "improvements": data.get("improvements", ""),
                "success": True,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            }
        except Exception as e:
            logger.error(f"Answer evaluation failed: {e}")
            return {
                "score": 5.0,
                "feedback": "Answer received. Manual review recommended.",
                "strengths": "",
                "improvements": "",
                "success": False,
            }
