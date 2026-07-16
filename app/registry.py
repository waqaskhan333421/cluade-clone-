import os
from config import MODEL_REGISTRY
from app.providers import (
    OpenAIProvider,
    GeminiProvider,
    GroqProvider,
    KimiProvider,
    OpenRouterProvider
)

# Instantiate the providers (reusable instances)
providers = {
    "openai": OpenAIProvider(),
    "gemini": GeminiProvider(),
    "groq": GroqProvider(),
    "kimi": KimiProvider(),
    "openrouter": OpenRouterProvider()
}

def get_provider_and_model(model_id: str, custom_model_name: str = None) -> tuple:
    """
    Given a model_id, returns (provider_instance, real_model_name).
    If custom_model_name is provided, it can override the default model name (especially for openrouter).
    """
    # Check if this is a custom OpenRouter model request
    if model_id == "custom-openrouter" or (custom_model_name and model_id == "openrouter"):
        return providers["openrouter"], custom_model_name or "anthropic/claude-3.5-sonnet"
        
    # Check if model_id is not in registry but looks like an OpenRouter model ID (e.g. starts with google/ or anthropic/)
    if model_id not in MODEL_REGISTRY:
        if "/" in model_id:
            return providers["openrouter"], model_id
        raise ValueError(f"Model ID '{model_id}' is not in the configuration registry.")
        
    model_config = MODEL_REGISTRY[model_id]
    provider_name = model_config["provider"]
    real_model_name = model_config["real_model_name"]
    
    return providers[provider_name], real_model_name

def is_provider_available(provider_name: str) -> bool:
    """
    Checks if the environment has the appropriate API key loaded for a provider.
    """
    api_keys = {
        "openai": "OPENAI_API_KEY",
        "gemini": "GEMINI_API_KEY",
        "groq": "GROQ_API_KEY",
        "kimi": "KIMI_API_KEY",
        "openrouter": "OPENROUTER_API_KEY"
    }
    
    env_var_name = api_keys.get(provider_name)
    if not env_var_name:
        return False
    return bool(os.environ.get(env_var_name))
