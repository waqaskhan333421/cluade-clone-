import os
from typing import Generator, List, Dict
from google import genai
from app.providers.base import ChatProvider

class GeminiProvider(ChatProvider):
    def __init__(self):
        pass

    def stream_chat(self, messages: List[Dict[str, str]], model: str) -> Generator[str, None, None]:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("Gemini API Key is missing. Please add it to your .env file.")

        client = genai.Client(api_key=api_key)
        
        # Build chat history from messages (excluding the last one which is sent as the active prompt)
        history = []
        for msg in messages[:-1]:
            # Convert 'assistant' or other roles to 'model' for Gemini compatibility
            role = "user" if msg["role"] == "user" else "model"
            history.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })
            
        last_message = messages[-1]["content"] if messages else ""

        try:
            # Create a chat session with the historical turns
            chat = client.chats.create(model=model, history=history)
            response = chat.send_message_stream(last_message)
            for chunk in response:
                if chunk.text is not None:
                    yield chunk.text
        except Exception as e:
            raise RuntimeError(f"Gemini Error: {str(e)}")
