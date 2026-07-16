import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "supersecretkey-change-me")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///claude_clone.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = os.environ.get("FLASK_DEBUG", "True").lower() in ("true", "1", "t", "yes")

# Model Registry
# Maps model_id -> provider and labels
MODEL_REGISTRY = {
    "gpt-4o": {
        "provider": "openai",
        "label": "GPT-4o",
        "real_model_name": "gpt-4o"
    },
    "gemini-2.0-flash": {
        "provider": "gemini",
        "label": "Gemini 2.0 Flash",
        "real_model_name": "gemini-2.0-flash"
    },
    "llama-3.3-70b-versatile": {
        "provider": "groq",
        "label": "Llama 3.3 70B (Groq)",
        "real_model_name": "llama-3.3-70b-versatile"
    },
    "moonshot-v1-8k": {
        "provider": "kimi",
        "label": "Kimi Moonshot v1",
        "real_model_name": "moonshot-v1-8k"
    },
    "anthropic/claude-3.5-sonnet": {
        "provider": "openrouter",
        "label": "Claude 3.5 Sonnet (OpenRouter)",
        "real_model_name": "anthropic/claude-3.5-sonnet"
    }
}
