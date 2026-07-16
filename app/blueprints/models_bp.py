from flask import Blueprint, jsonify
from config import MODEL_REGISTRY
from app.registry import is_provider_available

models_bp = Blueprint('models', __name__)

@models_bp.route('/api/models', methods=['GET'])
def get_models():
    """
    Returns available models grouped by provider.
    Includes availability status based on presence of API keys.
    """
    grouped_models = {}
    
    for model_id, info in MODEL_REGISTRY.items():
        provider = info["provider"]
        if provider not in grouped_models:
            grouped_models[provider] = {
                "provider": provider,
                "provider_label": provider.capitalize() if provider != "openai" else "OpenAI",
                "available": is_provider_available(provider),
                "models": []
            }
        
        grouped_models[provider]["models"].append({
            "model_id": model_id,
            "label": info["label"]
        })
    
    # Also add custom model support for OpenRouter if needed
    if "openrouter" in grouped_models:
        grouped_models["openrouter"]["models"].append({
            "model_id": "custom-openrouter",
            "label": "Custom OpenRouter Model..."
        })
        
    return jsonify(list(grouped_models.values()))
