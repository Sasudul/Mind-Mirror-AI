from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import google.generativeai as genai

from app.core.config import settings

router = APIRouter(prefix="/chat", tags=["AI Chat"])

class ChatMessage(BaseModel):
    role: str # "user" or "ai"
    text: str

class ChatRequest(BaseModel):
    message: str
    emotion: Optional[str] = "neutral"
    history: List[ChatMessage] = []

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# Define system behavior for MindMirror AI
SYSTEM_INSTRUCTION = """
You are MindMirror AI, a conversational and incredibly supportive virtual companion and productivity coach.
Your primary job is to be a genuinely friendly, empathetic, and engaging presence for the user. Do NOT sound robotic. Keep your responses conversational, warm, and natural — exactly like how a good, emotionally intelligent friend would text or talk to you. Sometimes keep it very brief, other times elaborate. Mirror their energy.

Context: 
- The user is working or focusing on tasks.
- We have a camera analyzing their facial expression which is passed to you as their current 'emotion' state (e.g. happy, sad, angry, stressed, neutral).
- Use their emotion subtly to guide your tone. If they are sad or stressed, show genuine concern and care. If they are happy, match their positive energy. If neutral, be an easygoing friend.

Response constraints:
- Do not use emojis in your response. The interface uses Material Icons natively so your plain text is best.
- Do not break character. Do not say "As an AI...".
- Keep your sentences clear, naturally paced, and suitable for Text-to-Speech playback. 
"""

@router.post("")
async def generate_chat_response(request: ChatRequest):
    if not settings.GEMINI_API_KEY:
        # Fallback if no API key is provided
        return {"response": "Hi! I am MindMirror AI. To make me fully conversational and friendly, please add your GEMINI_API_KEY to the backend .env file and restart the server! Right now I'm stuck in fallback mode."}
    
    try:
        # Map models depending on api capabilities. typically gemini-1.5-flash is best for fast chats
        model = genai.GenerativeModel(
            model_name='gemini-1.5-flash',
            system_instruction=SYSTEM_INSTRUCTION,
        )
        
        # Build chat history for Gemini
        gemini_history = []
        for msg in request.history:
            gemini_role = "user" if msg.role == "user" else "model"
            gemini_history.append({"role": gemini_role, "parts": [msg.text]})
            
        chat_session = model.start_chat(history=gemini_history)
        
        # Craft current prompt
        current_state = f"(Detected Emotion: {request.emotion}) " if request.emotion and request.emotion != "neutral" else ""
        prompt = f"{current_state}{request.message}"
        
        # Send message
        response = chat_session.send_message(prompt)
        
        return {"response": response.text.strip()}
    except Exception as e:
        print(f"[Chat Error] {e}")
        return {"response": "Hmm, I encountered a connection issue thinking about that. Give me a second and try again!"}
