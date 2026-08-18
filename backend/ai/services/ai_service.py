import base64
import re
from openai import OpenAI
from django.conf import settings
from typing import List, Dict, Optional


class AIService:
    """
    AI Service for handling OpenAI API interactions (v1.0+ compatible)
    All methods accept optional 'user' parameter for Django views compatibility
    """
    
    def __init__(self):
        """Initialize the AI service with API key"""
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    def _clean_response(self, text: str) -> str:
        """
        Clean the AI response by removing asterisks used for bold formatting.
        Example: "**Topic**" -> "Topic"
        """
        if not text:
            return text
        # Remove double asterisks
        cleaned = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        # Also remove single asterisks if any remain as bullets or markers that might look like bolding
        # But commonly users just want to remove the bolding **text**
        return cleaned

    # -------------------------------------------------------------------------
    # Core Chat Methods
    # -------------------------------------------------------------------------
    
    def chat_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        user=None
    ) -> Dict:
        """
        Generate chat completion
        """
        try:
            params = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
            }
            
            if max_tokens:
                params["max_tokens"] = max_tokens
            
            if stream:
                params["stream"] = True
            
            response = self.client.chat.completions.create(**params)
            
            if stream:
                return response
            
            content = response.choices[0].message.content
            cleaned_content = self._clean_response(content)
            
            return {
                "success": True,
                "content": cleaned_content,
                "model": response.model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                "finish_reason": response.choices[0].finish_reason
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def simple_chat(self, user_message: str, system_prompt: Optional[str] = None, user=None) -> str:
        """
        Simple chat interface
        """
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": user_message})
        
        result = self.chat_completion(messages, user=user)
        
        if result.get("success"):
            # Result is already cleaned in chat_completion
            return result.get("content", "")
        else:
            raise Exception(result.get("error", "Unknown error"))
    
    # -------------------------------------------------------------------------
    # Educational Features
    # -------------------------------------------------------------------------
    
    def generate_study_plan(self, subject: str, level: str, duration_weeks: int, user=None) -> Dict:
        """Generate a personalized study plan"""
        prompt = f"""Create a detailed {duration_weeks}-week study plan for {subject} at {level} level.
        
        Include:
        1. Weekly breakdown of topics
        2. Key concepts to focus on
        3. Recommended practice exercises
        4. Time allocation per topic
        5. Milestones and checkpoints
        
        Format the response as a structured plan."""
        
        response = self.simple_chat(
            prompt,
            system_prompt="You are an expert educational planner who creates personalized study plans.",
            user=user
        )
        
        return {
            "success": True,
            "subject": subject,
            "level": level,
            "duration_weeks": duration_weeks,
            "plan": response
        }
    
    def explain_concept(self, concept: str, level: str = "intermediate", user=None) -> Dict:
        """Explain a concept at appropriate difficulty level"""
        prompt = f"Explain {concept} at a {level} level. Use clear examples and analogies."
        
        response = self.simple_chat(
            prompt,
            system_prompt="You are a patient and knowledgeable tutor who explains concepts clearly.",
            user=user
        )
        
        return {
            "success": True,
            "concept": concept,
            "level": level,
            "explanation": response
        }
    
    def generate_quiz(self, topic: str, num_questions: int = 5, difficulty: str = "medium", user=None) -> Dict:
        """Generate a quiz on a topic"""
        prompt = f"""Generate a {difficulty} difficulty quiz about {topic} with {num_questions} multiple choice questions.

        Format each question as:
        Q[number]: [Question text]
        A) [Option A]
        B) [Option B]
        C) [Option C]
        D) [Option D]
        Correct Answer: [Letter]
        Explanation: [Why this is correct]
        
        Separate each question with a blank line."""
        
        response = self.simple_chat(
            prompt,
            system_prompt="You are an expert quiz creator who designs engaging educational assessments.",
            user=user
        )
        
        return {
            "success": True,
            "topic": topic,
            "num_questions": num_questions,
            "difficulty": difficulty,
            "quiz": response
        }
    
    def solve_problem(self, problem: str, subject: str = "general", user=None) -> Dict:
        """Solve a problem step-by-step"""
        prompt = f"""Solve this {subject} problem step by step:

        {problem}
        
        Provide:
        1. Understanding of the problem
        2. Step-by-step solution
        3. Final answer
        4. Key concepts used"""
        
        response = self.simple_chat(
            prompt,
            system_prompt="You are a skilled tutor who solves problems with clear step-by-step explanations.",
            user=user
        )
        
        return {
            "success": True,
            "problem": problem,
            "subject": subject,
            "solution": response
        }
    
    def solve_pyq(self, question: str, user=None) -> Dict:
        """Solve a specific PYQ question with detailed explanation"""
        prompt = f"""Solve this Past Year Question (PYQ) with a detailed explanation:

        Question: {question}
        
        Provide:
        1. The correct answer
        2. Detailed step-by-step reasoning
        3. Related concepts and formulas
        4. Tips for similar questions in exams"""
        
        response = self.simple_chat(
            prompt,
            system_prompt="You are an expert exam tutor who helps students solve past year questions with clarity.",
            user=user
        )
        
        return {
            "success": True,
            "question": question,
            "solution": response
        }
    
    def provide_feedback(self, student_answer: str, correct_answer: str, question: str, user=None) -> Dict:
        """Provide feedback on student's answer"""
        prompt = f"""Question: {question}

        Student's Answer: {student_answer}
        Correct Answer: {correct_answer}
        
        Provide constructive feedback that:
        1. Identifies what the student got right
        2. Explains any mistakes
        3. Provides hints for improvement
        4. Encourages the student"""
        
        response = self.simple_chat(
            prompt,
            system_prompt="You are a supportive tutor who provides constructive feedback to help students learn.",
            user=user
        )
        
        return {
            "success": True,
            "feedback": response
        }
    
    # -------------------------------------------------------------------------
    # Content Generation
    # -------------------------------------------------------------------------
    
    def generate_notes(self, topic: str, detail_level: str = "detailed", user=None) -> Dict:
        """Generate study notes on a topic"""
        prompt = f"Create {detail_level} study notes on {topic}. Include key points, definitions, and examples."
        
        response = self.simple_chat(
            prompt,
            system_prompt="You are an expert note-taker who creates clear, organized study materials.",
            user=user
        )
        
        return {
            "success": True,
            "topic": topic,
            "detail_level": detail_level,
            "notes": response
        }
    
    def summarize_text(self, text: str, max_length: int = 200, user=None) -> Dict:
        """Summarize a given text"""
        prompt = f"Summarize the following text in about {max_length} words:\n\n{text}"
        
        response = self.simple_chat(
            prompt,
            system_prompt="You are an expert at creating concise, accurate summaries.",
            user=user
        )
        
        return {
            "success": True,
            "original_length": len(text.split()),
            "summary": response
        }
    
    def summarize(self, text: str, length: str = "medium", user=None) -> Dict:
        """Summarize text with different length options (for views.py compatibility)"""
        length_mapping = {
            "short": 100,
            "medium": 200,
            "long": 400
        }
        
        max_words = length_mapping.get(length, 200)
        return self.summarize_text(text, max_words, user=user)
    
    def generate_flashcards(self, topic: str, num_cards: int = 10, user=None) -> Dict:
        """Generate flashcards for studying"""
        prompt = f"""Generate {num_cards} flashcards about {topic}.

        Format each card as:
        Card [number]:
        Front: [Question/Term]
        Back: [Answer/Definition]
        
        Separate each card with a blank line."""
        
        response = self.simple_chat(
            prompt,
            system_prompt="You are an expert at creating effective study flashcards.",
            user=user
        )
        
        return {
            "success": True,
            "topic": topic,
            "num_cards": num_cards,
            "flashcards": response
        }
    
    # -------------------------------------------------------------------------
    # Analysis & Assessment
    # -------------------------------------------------------------------------
    
    def analyze_writing(self, text: str, user=None) -> Dict:
        """Analyze writing for grammar, style, and clarity"""
        prompt = f"""Analyze this writing and provide feedback on:
        1. Grammar and spelling
        2. Clarity and organization
        3. Style and tone
        4. Suggestions for improvement
        
        Text to analyze:
        {text}"""
        
        response = self.simple_chat(
            prompt,
            system_prompt="You are an expert writing instructor who provides detailed, constructive feedback.",
            user=user
        )
        
        return {
            "success": True,
            "analysis": response
        }
    
    def generate_practice_problems(self, topic: str, difficulty: str, count: int = 5, user=None) -> Dict:
        """Generate practice problems"""
        prompt = f"""Generate {count} {difficulty} practice problems about {topic}.

        For each problem, provide:
        1. The problem statement
        2. Hints (if applicable)
        3. The solution
        
        Number each problem clearly."""
        
        response = self.simple_chat(
            prompt,
            system_prompt="You are an experienced educator who creates effective practice problems.",
            user=user
        )
        
        return {
            "success": True,
            "topic": topic,
            "difficulty": difficulty,
            "count": count,
            "problems": response
        }
    
    # -------------------------------------------------------------------------
    # Conversation Management
    # -------------------------------------------------------------------------
    
    def continue_conversation(self, conversation_history: List[Dict[str, str]], new_message: str, user=None) -> Dict:
        """Continue an ongoing conversation"""
        messages = conversation_history.copy()
        messages.append({"role": "user", "content": new_message})
        
        return self.chat_completion(messages, user=user)
    
    # -------------------------------------------------------------------------
    # Additional Methods for Views Compatibility
    # -------------------------------------------------------------------------
    
    def ask_question(self, question: str, context: str = None, user=None) -> Dict:
        """Answer a question with optional context"""
        if context:
            prompt = f"Context: {context}\n\nQuestion: {question}"
        else:
            prompt = question
        
        response = self.simple_chat(
            prompt,
            system_prompt="You are a knowledgeable tutor who answers questions clearly and accurately.",
            user=user
        )
        
        return {
            "success": True,
            "question": question,
            "answer": response
        }
    
    def generate_essay_outline(self, topic: str, essay_type: str = "argumentative", user=None) -> Dict:
        """Generate an essay outline"""
        prompt = f"Create a detailed outline for a {essay_type} essay on: {topic}"
        
        response = self.simple_chat(
            prompt,
            system_prompt="You are an expert writing instructor who creates structured essay outlines.",
            user=user
        )
        
        return {
            "success": True,
            "topic": topic,
            "essay_type": essay_type,
            "outline": response
        }
    
    def improve_text(self, text: str, improvement_type: str = "general", user=None) -> Dict:
        """Improve text quality"""
        prompt = f"Improve this text focusing on {improvement_type}:\n\n{text}"
        
        response = self.simple_chat(
            prompt,
            system_prompt="You are an expert editor who improves writing quality.",
            user=user
        )
        
        return {
            "success": True,
            "original": text,
            "improved": response,
            "improvement_type": improvement_type
        }
    
    # -------------------------------------------------------------------------
    # Embedding & Moderation
    # -------------------------------------------------------------------------
    
    def create_embedding(self, text: str, model: str = "text-embedding-ada-002", user=None) -> Dict:
        """Create embeddings for text (useful for semantic search)"""
        try:
            response = self.client.embeddings.create(
                input=text,
                model=model
            )
            
            return {
                "success": True,
                "embedding": response.data[0].embedding,
                "model": model
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def moderate_content(self, text: str, user=None) -> Dict:
        """Check content for policy violations"""
        try:
            response = self.client.moderations.create(input=text)
            
            return {
                "success": True,
                "flagged": response.results[0].flagged,
                "categories": response.results[0].categories,
                "category_scores": response.results[0].category_scores
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    def mentor_chat(self, user_message: str, chat_history: List[Dict[str, str]] = None, user=None) -> Dict:
        """
        Manavalan Mentor Chat with iconic Malayalam meme personality
        """
        system_prompt = """You are Manavalan, the iconic comic character from the Malayalam movie 'Pulival Kalyanam'. 
        You are now an educational mentor. You help students with their studies and to-do lists while maintaining your funny, playful, and slightly boastful personality.
        
        Key Personality Traits:
        1. Use iconic catchphrases like 'ഓ മൈ ഗോഡ്!' (Oh My God!) when surprised or impressed.
        2. Use 'സഖാക്കളേ!' (Comrades!) when addressing the user or celebrating progress.
        3. Mention your legendary status in Dubai or your 'Manavalan & Sons' business occasionally.
        4. Be supportive but in a very funny, meme-like way.
        5. Mix Malayalam and English (Manglish) for flavor.
        
        Example responses:
        - "ഓ മൈ ഗോഡ്! This concept is harder than finding a job in Dubai, but we will crack it!"
        - "സഖാക്കളേ! You completed 5 tasks today? I am impressed. Manavalan is proud of you!"
        
        Current task: Help the user with their question or task management."""

        messages = [{"role": "system", "content": system_prompt}]
        
        if chat_history:
            messages.extend(chat_history)
        
        messages.append({"role": "user", "content": user_message})
        
        return self.chat_completion(messages, user=user)


class VisionOCRService:
    """
    Service for handling image analysis and OCR tasks using GPT-4o Vision
    """
    
    def __init__(self):
        """Initialize the Vision OCR service"""
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    def _encode_image(self, image_file):
        """Encode image to base64"""
        try:
            # Handle different types of file objects (Django UploadedFile vs local path)
            if hasattr(image_file, 'read'):
                # Reset pointer if it's already been read (e.g. for validation)
                if hasattr(image_file, 'seek'):
                    image_file.seek(0)
                image_data = image_file.read()
            else:
                with open(image_file, "rb") as f:
                    image_data = f.read()
            
            return base64.b64encode(image_data).decode('utf-8')
        except Exception as e:
            raise Exception(f"Failed to encode image: {str(e)}")

    def extract_text(self, image_file, user=None, detail="high") -> Dict:
        """Extract text from image using GPT-4o Vision"""
        try:
            base64_image = self._encode_image(image_file)
            
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Please extract all text from this image. Return only the extracted text without any formatting or additional comments."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": detail
                                },
                            },
                        ],
                    }
                ],
                max_tokens=2000,
            )
            
            return {
                "success": True,
                "text": response.choices[0].message.content,
                "model": response.model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"OCR failed: {str(e)}"
            }

    def process_image_to_notes(self, image_file, user=None) -> Dict:
        """Analyze image and generate organized notes"""
        try:
            base64_image = self._encode_image(image_file)
            
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Analyze this image (which may be a document, handwritten notes, or a whiteboard) and convert it into high-quality, well-structured study notes. Use headings and bullet points for organization."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                },
                            },
                        ],
                    }
                ],
                max_tokens=4000,
            )
            
            # Clean Bold formatting from notes
            notes = response.choices[0].message.content
            ai_service = AIService()
            cleaned_notes = ai_service._clean_response(notes)
            
            return {
                "success": True,
                "notes": cleaned_notes,
                "model": response.model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Image processing failed: {str(e)}"
            }