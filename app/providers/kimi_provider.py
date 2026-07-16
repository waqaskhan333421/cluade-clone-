import os
import openai
from typing import Generator, List, Dict
from app.providers.base import ChatProvider

class KimiProvider(ChatProvider):
    def __init__(self):
        pass

    def stream_chat(self, messages: List[Dict[str, str]], model: str) -> Generator[str, None, None]:
        api_key = os.environ.get("KIMI_API_KEY")
        if not api_key:
            raise ValueError("Kimi API Key is missing. Please add it to your .env file.")
        
        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://api.moonshot.cn/v1"
        )
        
        cleaned_messages = [{"role": msg["role"], "content": msg["content"]} for msg in messages]

        try:
            response = client.chat.completions.create(
                model=model,
                messages=cleaned_messages,
                stream=True
            )
            for chunk in response:
                if chunk.choices and len(chunk.choices) > 0:
                    content = chunk.choices[0].delta.content
                    if content is not None:
                        yield content
        except openai.OpenAIError as e:
            raise RuntimeError(f"Kimi Error: {str(e)}")
        except Exception as e:
            raise RuntimeError(f"Unexpected Kimi Error: {str(e)}")
