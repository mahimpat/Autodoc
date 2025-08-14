from abc import ABC, abstractmethod
from typing import Iterator, List, Optional, Dict, Any
from enum import Enum
import json
import requests
import openai
import anthropic
from ..settings import settings

class ModelProvider(Enum):
    OLLAMA = "ollama"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"

class ModelConfig:
    """Configuration for different AI models"""
    
    # Ollama models
    OLLAMA_MODELS = {
        "phi3:mini": {"name": "Phi-3 Mini", "provider": ModelProvider.OLLAMA, "speed": "fast", "quality": "good"},
        "mistral:7b": {"name": "Mistral 7B", "provider": ModelProvider.OLLAMA, "speed": "medium", "quality": "good"},
        "llama3:instruct": {"name": "Llama3 Instruct", "provider": ModelProvider.OLLAMA, "speed": "medium", "quality": "excellent"},
    }
    
    # OpenAI models
    OPENAI_MODELS = {
        "gpt-4o": {"name": "GPT-4o", "provider": ModelProvider.OPENAI, "speed": "fast", "quality": "excellent"},
        "gpt-4o-mini": {"name": "GPT-4o Mini", "provider": ModelProvider.OPENAI, "speed": "very_fast", "quality": "good"},
        "gpt-4-turbo": {"name": "GPT-4 Turbo", "provider": ModelProvider.OPENAI, "speed": "medium", "quality": "excellent"},
    }
    
    # Anthropic models
    ANTHROPIC_MODELS = {
        "claude-3-5-sonnet-20241022": {"name": "Claude 3.5 Sonnet", "provider": ModelProvider.ANTHROPIC, "speed": "fast", "quality": "excellent"},
        "claude-3-haiku-20240307": {"name": "Claude 3 Haiku", "provider": ModelProvider.ANTHROPIC, "speed": "very_fast", "quality": "good"},
    }
    
    @classmethod
    def get_all_models(cls) -> Dict[str, Dict[str, Any]]:
        """Get all available models"""
        all_models = {}
        all_models.update(cls.OLLAMA_MODELS)
        
        # Only include cloud models if API keys are configured
        if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
            all_models.update(cls.OPENAI_MODELS)
            
        if hasattr(settings, 'ANTHROPIC_API_KEY') and settings.ANTHROPIC_API_KEY:
            all_models.update(cls.ANTHROPIC_MODELS)
            
        return all_models
    
    @classmethod
    def get_provider_for_model(cls, model_id: str) -> ModelProvider:
        """Get the provider for a specific model"""
        all_models = cls.get_all_models()
        if model_id in all_models:
            return all_models[model_id]["provider"]
        
        # Default to Ollama for unknown models
        return ModelProvider.OLLAMA

class BaseModelClient(ABC):
    """Abstract base class for all model clients"""
    
    @abstractmethod
    def stream_generate(self, prompt: str, model: str, system: Optional[str] = None) -> Iterator[str]:
        """Generate streaming response"""
        pass
    
    @abstractmethod
    def embed_texts(self, texts: List[str], model: Optional[str] = None) -> List[List[float]]:
        """Generate embeddings for texts"""
        pass

class OllamaClient(BaseModelClient):
    """Ollama model client"""
    
    def stream_generate(self, prompt: str, model: str, system: Optional[str] = None) -> Iterator[str]:
        url = f"{settings.OLLAMA_URL}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": True,
        }
        if system:
            payload["system"] = system
            
        with requests.post(url, json=payload, stream=True, timeout=600) as r:
            r.raise_for_status()
            for line in r.iter_lines(decode_unicode=True):
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except Exception:
                    continue
                if isinstance(data, dict) and data.get("response"):
                    yield data["response"]
                if isinstance(data, dict) and data.get("done"):
                    break
    
    def embed_texts(self, texts: List[str], model: Optional[str] = None) -> List[List[float]]:
        url = f"{settings.OLLAMA_URL}/api/embeddings"
        out = []
        embed_model = model or getattr(settings, "OLLAMA_EMBED_MODEL", "all-minilm")
        
        for t in texts:
            payload = {
                "model": embed_model,
                "prompt": t,
            }
            r = requests.post(url, json=payload, timeout=120)
            r.raise_for_status()
            data = r.json()
            out.append(data.get("embedding", []))
        return out

class OpenAIClient(BaseModelClient):
    """OpenAI model client"""
    
    def __init__(self):
        if not hasattr(settings, 'OPENAI_API_KEY') or not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not configured")
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    
    def stream_generate(self, prompt: str, model: str, system: Optional[str] = None) -> Iterator[str]:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        stream = self.client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            max_tokens=4000,
            temperature=0.7
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                yield chunk.choices[0].delta.content
    
    def embed_texts(self, texts: List[str], model: Optional[str] = None) -> List[List[float]]:
        embed_model = model or "text-embedding-3-small"
        embeddings = []
        
        for text in texts:
            response = self.client.embeddings.create(
                model=embed_model,
                input=text
            )
            embeddings.append(response.data[0].embedding)
        
        return embeddings

class AnthropicClient(BaseModelClient):
    """Anthropic Claude model client"""
    
    def __init__(self):
        if not hasattr(settings, 'ANTHROPIC_API_KEY') or not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not configured")
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    def stream_generate(self, prompt: str, model: str, system: Optional[str] = None) -> Iterator[str]:
        messages = [{"role": "user", "content": prompt}]
        
        kwargs = {
            "model": model,
            "max_tokens": 4000,
            "messages": messages,
            "stream": True
        }
        
        if system:
            kwargs["system"] = system
        
        with self.client.messages.stream(**kwargs) as stream:
            for text in stream.text_stream:
                yield text
    
    def embed_texts(self, texts: List[str], model: Optional[str] = None) -> List[List[float]]:
        # Anthropic doesn't provide embeddings API, fall back to OpenAI or local
        # For now, we'll use a simpler approach or delegate to Ollama
        ollama_client = OllamaClient()
        return ollama_client.embed_texts(texts, "all-minilm")

class UnifiedModelClient:
    """Unified client that routes to appropriate provider"""
    
    def __init__(self):
        self.clients = {}
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize available clients"""
        # Always available: Ollama
        self.clients[ModelProvider.OLLAMA] = OllamaClient()
        
        # Conditionally available: OpenAI
        try:
            if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
                self.clients[ModelProvider.OPENAI] = OpenAIClient()
        except Exception as e:
            print(f"Failed to initialize OpenAI client: {e}")
        
        # Conditionally available: Anthropic
        try:
            if hasattr(settings, 'ANTHROPIC_API_KEY') and settings.ANTHROPIC_API_KEY:
                self.clients[ModelProvider.ANTHROPIC] = AnthropicClient()
        except Exception as e:
            print(f"Failed to initialize Anthropic client: {e}")
    
    def stream_generate(self, prompt: str, model: str, system: Optional[str] = None) -> Iterator[str]:
        """Route generation to appropriate provider"""
        provider = ModelConfig.get_provider_for_model(model)
        
        if provider not in self.clients:
            # Fall back to Ollama
            provider = ModelProvider.OLLAMA
            model = settings.OLLAMA_DEFAULT_MODEL
        
        client = self.clients[provider]
        return client.stream_generate(prompt, model, system)
    
    def embed_texts(self, texts: List[str], model: Optional[str] = None) -> List[List[float]]:
        """Route embedding to appropriate provider (prefer Ollama for consistency)"""
        # For embeddings, we'll prefer Ollama for consistency with vector DB
        ollama_client = self.clients.get(ModelProvider.OLLAMA)
        if ollama_client:
            return ollama_client.embed_texts(texts, model)
        
        # Fallback to OpenAI if available
        openai_client = self.clients.get(ModelProvider.OPENAI)
        if openai_client:
            return openai_client.embed_texts(texts, model)
        
        raise ValueError("No embedding provider available")
    
    def get_available_models(self) -> Dict[str, Dict[str, Any]]:
        """Get all available models based on configured clients"""
        available_models = {}
        
        # Add models for each available provider
        for provider, client in self.clients.items():
            if provider == ModelProvider.OLLAMA:
                available_models.update(ModelConfig.OLLAMA_MODELS)
            elif provider == ModelProvider.OPENAI:
                available_models.update(ModelConfig.OPENAI_MODELS)
            elif provider == ModelProvider.ANTHROPIC:
                available_models.update(ModelConfig.ANTHROPIC_MODELS)
        
        return available_models

# Global instance
unified_client = UnifiedModelClient()