import asyncio
import time
import hashlib
import json
import redis
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

class RequestPriority(Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3

class RequestStatus(Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CACHED = "cached"

class ModelInstance(Enum):
    FAST = "fast"
    NORMAL = "normal" 
    PRIORITY = "priority"

@dataclass
class GenerationRequest:
    request_id: str
    user_id: int
    prompt: str
    model: str
    priority: RequestPriority
    template: str = ""
    content_hash: str = ""
    created_at: float = field(default_factory=time.time)
    estimated_duration: int = 60  # seconds
    user_tier: str = "free"  # free, premium, enterprise
    
    def __post_init__(self):
        # Generate content hash for caching
        content_str = f"{self.prompt}:{self.model}:{self.template}"
        self.content_hash = hashlib.md5(content_str.encode()).hexdigest()

class HybridQueueManager:
    def __init__(self):
        # Multiple queues by priority
        self.queues = {
            RequestPriority.CRITICAL: [],
            RequestPriority.HIGH: [],
            RequestPriority.NORMAL: [],
            RequestPriority.LOW: []
        }
        
        # Active requests by model instance
        self.active_requests = {
            ModelInstance.PRIORITY: {},
            ModelInstance.NORMAL: {},
            ModelInstance.FAST: {}
        }
        
        # Capacity limits per instance
        self.capacity_limits = {
            ModelInstance.PRIORITY: 2,  # Primary instance
            ModelInstance.NORMAL: 2,    # Secondary instance  
            ModelInstance.FAST: 3       # Fast instance
        }
        
        # Results cache
        self.redis_client = redis.Redis(host='localhost', port=6379, db=1, decode_responses=True)
        self.cache_ttl = 3600 * 24  # 24 hours
        
        # User request tracking
        self.user_active_requests = defaultdict(int)
        self.user_rate_limits = {
            "free": 3,      # max 3 concurrent requests
            "premium": 8,   # max 8 concurrent requests
            "enterprise": 15 # max 15 concurrent requests
        }
        
        # Performance metrics
        self.metrics = {
            "total_requests": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "average_wait_time": 0,
            "instance_utilization": defaultdict(float)
        }
        
    def _get_cache_key(self, request: GenerationRequest) -> str:
        """Generate cache key for request"""
        return f"doc_gen:{request.content_hash}"
        
    def _check_cache(self, request: GenerationRequest) -> Optional[str]:
        """Check if result exists in cache"""
        cache_key = self._get_cache_key(request)
        try:
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                self.metrics["cache_hits"] += 1
                logger.info(f"Cache hit for request {request.request_id}")
                return cached_result
            else:
                self.metrics["cache_misses"] += 1
                return None
        except Exception as e:
            logger.error(f"Cache check failed: {e}")
            return None
            
    def _cache_result(self, request: GenerationRequest, result: str):
        """Cache the result"""
        cache_key = self._get_cache_key(request)
        try:
            self.redis_client.setex(cache_key, self.cache_ttl, result)
            logger.info(f"Cached result for request {request.request_id}")
        except Exception as e:
            logger.error(f"Failed to cache result: {e}")
            
    def _determine_model_instance(self, request: GenerationRequest) -> ModelInstance:
        """Determine which model instance to use"""
        # Critical/High priority -> Priority instance
        if request.priority in [RequestPriority.CRITICAL, RequestPriority.HIGH]:
            return ModelInstance.PRIORITY
            
        # Simple requests -> Fast instance
        if (request.estimated_duration < 30 or 
            request.template in ["simple_summary", "quick_notes"]):
            return ModelInstance.FAST
            
        # Default -> Normal instance
        return ModelInstance.NORMAL
        
    def _can_accept_request(self, request: GenerationRequest) -> Tuple[bool, str]:
        """Check if request can be accepted"""
        # Check user rate limits
        user_limit = self.user_rate_limits.get(request.user_tier, 3)
        if self.user_active_requests[request.user_id] >= user_limit:
            return False, f"User rate limit exceeded ({user_limit} concurrent requests)"
            
        # Check if queues are too full
        total_queued = sum(len(queue) for queue in self.queues.values())
        if total_queued > 100:  # Global queue limit
            return False, "System overloaded, please try again later"
            
        return True, "OK"
        
    async def add_request(self, request: GenerationRequest) -> Tuple[str, str]:
        """Add request to appropriate queue"""
        self.metrics["total_requests"] += 1
        
        # Check cache first
        cached_result = self._check_cache(request)
        if cached_result:
            return RequestStatus.CACHED.value, cached_result
            
        # Check if request can be accepted
        can_accept, reason = self._can_accept_request(request)
        if not can_accept:
            return RequestStatus.FAILED.value, reason
            
        # Add to appropriate priority queue
        self.queues[request.priority].append(request)
        self.user_active_requests[request.user_id] += 1
        
        logger.info(f"Added request {request.request_id} to {request.priority.name} queue")
        
        # Start processing
        asyncio.create_task(self._process_queues())
        
        return RequestStatus.QUEUED.value, "Request queued successfully"
        
    async def _process_queues(self):
        """Process requests from all queues based on priority and capacity"""
        for priority in [RequestPriority.CRITICAL, RequestPriority.HIGH, 
                        RequestPriority.NORMAL, RequestPriority.LOW]:
            
            queue = self.queues[priority]
            if not queue:
                continue
                
            # Try to process requests from this priority level
            while queue:
                request = queue[0]
                instance = self._determine_model_instance(request)
                
                # Check if instance has capacity
                active_count = len(self.active_requests[instance])
                if active_count >= self.capacity_limits[instance]:
                    break  # Instance full, try lower priority
                    
                # Remove from queue and start processing
                request = queue.pop(0)
                self.active_requests[instance][request.request_id] = request
                
                # Process in background
                asyncio.create_task(self._process_request(request, instance))
                
    async def _process_request(self, request: GenerationRequest, instance: ModelInstance):
        """Process individual request on specified instance"""
        start_time = time.time()
        
        try:
            from .model_interface import unified_client
            
            # Get the appropriate Ollama URL based on instance
            instance_urls = {
                ModelInstance.PRIORITY: "http://ollama-primary:11434",
                ModelInstance.NORMAL: "http://ollama-secondary:11434", 
                ModelInstance.FAST: "http://ollama-fast:11434"
            }
            
            # Override the client's URL for this request
            original_url = unified_client.ollama_url
            unified_client.ollama_url = instance_urls[instance]
            
            logger.info(f"Processing request {request.request_id} on {instance.value} instance")
            
            # Generate response
            response = ""
            async for token in unified_client.stream_generate_async(
                request.prompt, 
                model=request.model
            ):
                response += token
                
            # Cache the result
            self._cache_result(request, response)
            
            # Update metrics
            processing_time = time.time() - start_time
            self.metrics["average_wait_time"] = (
                (self.metrics["average_wait_time"] * (self.metrics["total_requests"] - 1) + 
                 processing_time) / self.metrics["total_requests"]
            )
            
            logger.info(f"Completed request {request.request_id} in {processing_time:.2f}s")
            
            # Store result (you'll implement result storage)
            await self._store_result(request.request_id, response, RequestStatus.COMPLETED)
            
        except Exception as e:
            logger.error(f"Error processing request {request.request_id}: {e}")
            await self._store_result(request.request_id, str(e), RequestStatus.FAILED)
            
        finally:
            # Restore original URL
            unified_client.ollama_url = original_url
            
            # Clean up
            self.active_requests[instance].pop(request.request_id, None)
            self.user_active_requests[request.user_id] -= 1
            
            # Process next requests
            await self._process_queues()
            
    async def _store_result(self, request_id: str, result: str, status: RequestStatus):
        """Store request result (implement based on your storage system)"""
        # This would typically store in your database
        # For now, we'll use Redis for temporary storage
        result_key = f"result:{request_id}"
        status_key = f"status:{request_id}"
        
        try:
            self.redis_client.setex(result_key, 3600, result)  # 1 hour TTL
            self.redis_client.setex(status_key, 3600, status.value)
        except Exception as e:
            logger.error(f"Failed to store result: {e}")
            
    def get_request_status(self, request_id: str) -> Tuple[RequestStatus, Optional[str]]:
        """Get request status and result if available"""
        try:
            status_str = self.redis_client.get(f"status:{request_id}")
            if not status_str:
                return RequestStatus.FAILED, "Request not found"
                
            status = RequestStatus(status_str)
            
            if status == RequestStatus.COMPLETED:
                result = self.redis_client.get(f"result:{request_id}")
                return status, result
            elif status == RequestStatus.FAILED:
                error = self.redis_client.get(f"result:{request_id}")
                return status, error
            else:
                return status, None
                
        except Exception as e:
            logger.error(f"Error getting request status: {e}")
            return RequestStatus.FAILED, str(e)
            
    def get_queue_stats(self) -> Dict:
        """Get current queue statistics"""
        stats = {
            "queues": {
                priority.name: len(queue) 
                for priority, queue in self.queues.items()
            },
            "active_requests": {
                instance.value: len(requests)
                for instance, requests in self.active_requests.items()
            },
            "capacity_utilization": {
                instance.value: len(requests) / self.capacity_limits[instance] * 100
                for instance, requests in self.active_requests.items()
            },
            "metrics": self.metrics,
            "cache_hit_rate": (
                self.metrics["cache_hits"] / 
                (self.metrics["cache_hits"] + self.metrics["cache_misses"]) * 100
                if (self.metrics["cache_hits"] + self.metrics["cache_misses"]) > 0 else 0
            )
        }
        return stats
        
    def get_user_queue_position(self, user_id: int, request_id: str) -> int:
        """Get user's position in queue"""
        position = 0
        
        # Check all queues in priority order
        for priority in [RequestPriority.CRITICAL, RequestPriority.HIGH, 
                        RequestPriority.NORMAL, RequestPriority.LOW]:
            for i, request in enumerate(self.queues[priority]):
                if request.request_id == request_id:
                    return position + i
                    
            position += len(self.queues[priority])
            
        # Check if in active processing
        for instance_requests in self.active_requests.values():
            if request_id in instance_requests:
                return 0  # Currently processing
                
        return -1  # Not found

# Global queue manager instance
hybrid_queue = HybridQueueManager()