import requests
import json
import asyncio
import aiohttp
from typing import Iterator, List, AsyncIterator, Dict
import os
import logging
import time
from datetime import datetime, timedelta
from .model_interface import unified_client as base_client

logger = logging.getLogger(__name__)

class HybridModelClient:
    """Enhanced model client with multi-instance support and load balancing"""
    
    def __init__(self):
        self.primary_url = os.getenv("OLLAMA_PRIMARY_URL", "http://localhost:11434")
        self.secondary_url = os.getenv("OLLAMA_SECONDARY_URL", "http://localhost:11435")
        self.fast_url = os.getenv("OLLAMA_FAST_URL", "http://localhost:11436")
        self.default_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        
        # Health tracking
        self.instance_health = {
            "primary": {"last_check": None, "healthy": True, "response_time": 0, "active_requests": 0},
            "secondary": {"last_check": None, "healthy": True, "response_time": 0, "active_requests": 0},
            "fast": {"last_check": None, "healthy": True, "response_time": 0, "active_requests": 0}
        }
        
        # Instance limits
        self.instance_limits = {
            "primary": 2,
            "secondary": 2,
            "fast": 3
        }
        
    async def _check_instance_health(self, url: str, instance_name: str) -> bool:
        """Check if an instance is healthy"""
        try:
            start_time = time.time()
            
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{url}/api/tags", timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        response_time = time.time() - start_time
                        self.instance_health[instance_name].update({
                            "last_check": datetime.now(),
                            "healthy": True,
                            "response_time": response_time
                        })
                        logger.debug(f"Health check OK for {instance_name}: {response_time:.2f}s")
                        return True
                    else:
                        self.instance_health[instance_name].update({
                            "last_check": datetime.now(),
                            "healthy": False,
                            "response_time": 999
                        })
                        logger.warning(f"Health check failed for {instance_name}: status {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"Health check failed for {instance_name}: {e}")
            self.instance_health[instance_name].update({
                "last_check": datetime.now(),
                "healthy": False,
                "response_time": 999
            })
            return False
            
    async def _get_best_instance(self, priority: str = "normal", estimated_duration: int = 60) -> str:
        """Get the best available instance based on priority, health, and load"""
        # Health check if needed (every 60 seconds)
        now = datetime.now()
        for instance_name in self.instance_health:
            last_check = self.instance_health[instance_name]["last_check"]
            if not last_check or (now - last_check).seconds > 60:
                url_map = {
                    "primary": self.primary_url,
                    "secondary": self.secondary_url,
                    "fast": self.fast_url
                }
                await self._check_instance_health(url_map[instance_name], instance_name)
        
        # Get healthy instances
        healthy_instances = [
            (name, data) for name, data in self.instance_health.items()
            if data["healthy"] and data["active_requests"] < self.instance_limits[name]
        ]
        
        if not healthy_instances:
            logger.warning("No healthy instances available, using default")
            return self.default_url
        
        # Select instance based on priority
        if priority == "high":
            # Prefer primary, then secondary
            for name in ["primary", "secondary", "fast"]:
                if any(inst[0] == name for inst in healthy_instances):
                    url_map = {
                        "primary": self.primary_url,
                        "secondary": self.secondary_url,
                        "fast": self.fast_url
                    }
                    return url_map[name]
                    
        elif priority == "fast" or estimated_duration < 30:
            # Prefer fast instance for quick tasks
            for name in ["fast", "secondary", "primary"]:
                if any(inst[0] == name for inst in healthy_instances):
                    url_map = {
                        "primary": self.primary_url,
                        "secondary": self.secondary_url,
                        "fast": self.fast_url
                    }
                    return url_map[name]
        else:
            # Normal priority - load balance
            # Sort by load (active requests + response time factor)
            healthy_instances.sort(key=lambda x: (
                x[1]["active_requests"] + x[1]["response_time"] * 0.1
            ))
            
            instance_name = healthy_instances[0][0]
            url_map = {
                "primary": self.primary_url,
                "secondary": self.secondary_url,
                "fast": self.fast_url
            }
            return url_map[instance_name]
        
        # Fallback
        return self.default_url
    
    def embed_texts(self, texts: List[str], model: str = "nomic-embed-text") -> List[List[float]]:
        """Generate embeddings using the base client (embeddings don't need load balancing)"""
        return base_client.embed_texts(texts, model)
    
    def stream_generate(self, prompt: str, model: str = "phi3:mini", system: str = None, priority: str = "normal", estimated_duration: int = 60) -> Iterator[str]:
        """Stream generation from best available instance (synchronous)"""
        # Use async method in sync context
        loop = None
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        async def _async_stream():
            async for token in self.stream_generate_async(prompt, model, system, priority, estimated_duration):
                yield token
                
        # Convert async iterator to sync
        gen = _async_stream()
        while True:
            try:
                yield loop.run_until_complete(gen.__anext__())
            except StopAsyncIteration:
                break
    
    async def stream_generate_async(self, prompt: str, model: str = "phi3:mini", system: str = None, priority: str = "normal", estimated_duration: int = 60) -> AsyncIterator[str]:
        """Stream generation from best available instance (async)"""
        # Get best instance for this request
        instance_url = await self._get_best_instance(priority, estimated_duration)
        
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": True
        }
        
        if system:
            payload["system"] = system
        
        # Track which instance we're using
        instance_name = None
        for name, url in [("primary", self.primary_url), ("secondary", self.secondary_url), ("fast", self.fast_url)]:
            if instance_url == url:
                instance_name = name
                break
        
        logger.info(f"Generating with model {model} on {instance_name or 'default'} instance (priority: {priority})")
        
        try:
            # Increment active request count
            if instance_name:
                self.instance_health[instance_name]["active_requests"] += 1
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{instance_url}/api/generate", 
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=300)  # 5 minutes
                ) as response:
                    response.raise_for_status()
                    
                    async for line in response.content:
                        if line:
                            try:
                                data = json.loads(line)
                                if "response" in data:
                                    yield data["response"]
                                if data.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue
                                
        except Exception as e:
            logger.error(f"Generation error on {instance_name or 'default'} instance: {e}")
            yield f"[Error: {str(e)}]"
        finally:
            # Decrement active request count
            if instance_name:
                self.instance_health[instance_name]["active_requests"] = max(0, 
                    self.instance_health[instance_name]["active_requests"] - 1)
    
    def get_health_status(self) -> Dict:
        """Get health status of all instances"""
        return {
            "instances": self.instance_health,
            "limits": self.instance_limits,
            "urls": {
                "primary": self.primary_url,
                "secondary": self.secondary_url,
                "fast": self.fast_url,
                "default": self.default_url
            },
            "utilization": {
                name: (data["active_requests"] / self.instance_limits[name]) * 100
                for name, data in self.instance_health.items()
            }
        }

# Global hybrid client instance
hybrid_client = HybridModelClient()