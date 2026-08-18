import json
import logging
from typing import List, Dict
from openai import OpenAI
from django.conf import settings

logger = logging.getLogger(__name__)

class PersonalizedFlashcardService:
    """Generate personalized flashcards based on user interests using OpenAI"""

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def generate_personalized_flashcards(self, career_path: str, exams: List[str], subjects: List[str]) -> List[Dict]:
        """
        Generate 5-10 personalized flashcards based on user's academic profile.
        """
        subjects_str = ", ".join(subjects) if subjects else "general academic excellence"
        exams_str = ", ".join(exams) if exams else "upcoming assessments"
        
        prompt = f"""You are a personalized mentor. A student is focusing on the career path: "{career_path}".
They are preparing for: {exams_str}.
Their interested subjects are: {subjects_str}.

Generate 5 high-impact, personalized flashcards (Question/Answer) to help them on their dashboard.
The flashcards should be relevant to their career goals and upcoming challenges.

Respond ONLY in this exact JSON format (no markdown, no extra text):
[
  {{
    "question": "<engaging question>",
    "answer": "<concise, informative answer>",
    "difficulty": "easy|medium|hard"
  }},
  ...
]"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=1000,
            )
            raw = response.choices[0].message.content.strip()
            # Clean JSON if AI adds markdown
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            
            flashcards = json.loads(raw)
            return flashcards
        except Exception as e:
            logger.error(f"Personalized flashcard generation failed: {e}")
            return [
                {"question": "What is the key to deep learning success?", "answer": "Consistent practice and understanding fundamentals.", "difficulty": "easy"},
                {"question": "How should I prepare for upcoming exams?", "answer": "Use active recall and spaced repetition for the best results.", "difficulty": "medium"}
            ]
