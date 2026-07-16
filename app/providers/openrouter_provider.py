import os
import openai
from typing import Generator, List, Dict
from app.providers.base import ChatProvider

class OpenRouterProvider(ChatProvider):
    def __init__(self):
        pass

    def stream_chat(self, messages: List[Dict[str, str]], model: str) -> Generator[str, None, None]:
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OpenRouter API Key is missing. Please add it to your .env file.")
        
        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        
        cleaned_messages = [{"role": msg["role"], "content": msg["content"]} for msg in messages]

        try:
            response = client.chat.completions.create(
                model=model,
                messages=cleaned_messages,
                stream=True,
                extra_headers={
                    "HTTP-Referer": "http://localhost:5000",
                    "X-Title": "Claude Clone App"
                }
            )
            for chunk in response:
                if chunk.choices and len(chunk.choices) > 0:
                    content = chunk.choices[0].delta.content
                    if content is not None:
                        yield content
        except openai.OpenAIError as e:
            raise RuntimeError(f"OpenRouter Error: {str(e)}")
        except Exception as e:
            raise RuntimeError(f"Unexpected OpenRouter Error: {str(e)}")
