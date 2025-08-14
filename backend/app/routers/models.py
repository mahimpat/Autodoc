from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any

from ..auth import get_current_user, get_db
from ..models import User
from ..llm.model_interface import unified_client, ModelConfig

router = APIRouter(prefix="/models", tags=["models"])

@router.get("/available")
def get_available_models(
    user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get all available AI models"""
    
    available_models = unified_client.get_available_models()
    
    # Group models by provider for better UI organization
    grouped_models = {
        "local": {},
        "cloud": {}
    }
    
    for model_id, model_info in available_models.items():
        provider = model_info["provider"].value
        
        model_data = {
            "id": model_id,
            "name": model_info["name"],
            "provider": provider,
            "speed": model_info["speed"],
            "quality": model_info["quality"],
            "description": _get_model_description(model_id, model_info)
        }
        
        if provider == "ollama":
            grouped_models["local"][model_id] = model_data
        else:
            grouped_models["cloud"][model_id] = model_data
    
    return {
        "models": grouped_models,
        "default": "phi3:mini",
        "total_count": len(available_models)
    }

def _get_model_description(model_id: str, model_info: Dict[str, Any]) -> str:
    """Generate description for model"""
    provider = model_info["provider"].value
    speed = model_info["speed"]
    quality = model_info["quality"]
    
    speed_desc = {
        "very_fast": "Very Fast",
        "fast": "Fast", 
        "medium": "Medium",
        "slow": "Slow"
    }.get(speed, speed.title())
    
    quality_desc = {
        "excellent": "Excellent",
        "good": "Good", 
        "fair": "Fair"
    }.get(quality, quality.title())
    
    if provider == "ollama":
        return f"Local model - {speed_desc} • {quality_desc} quality"
    elif provider == "openai":
        return f"OpenAI - {speed_desc} • {quality_desc} quality"
    elif provider == "anthropic":
        return f"Anthropic - {speed_desc} • {quality_desc} quality"
    else:
        return f"{provider.title()} - {speed_desc} • {quality_desc} quality"

@router.get("/providers")
def get_model_providers(
    user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get available model providers and their status"""
    
    providers = {
        "ollama": {
            "name": "Ollama (Local)",
            "description": "Local AI models running on your infrastructure",
            "available": True,
            "type": "local"
        },
        "openai": {
            "name": "OpenAI",
            "description": "GPT-4 and other OpenAI models",
            "available": any(p.value == "openai" for p in unified_client.clients.keys()),
            "type": "cloud"
        },
        "anthropic": {
            "name": "Anthropic",
            "description": "Claude models from Anthropic",
            "available": any(p.value == "anthropic" for p in unified_client.clients.keys()),
            "type": "cloud"
        }
    }
    
    return {"providers": providers}