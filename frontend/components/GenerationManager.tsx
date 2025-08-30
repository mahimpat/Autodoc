'use client';
import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Progress } from './ui/Progress';
import { Badge } from './ui/Badge';

interface GenerationRequest {
  request_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cached';
  queue_position?: number;
  estimated_wait_time?: number;
  result?: string;
  cached?: boolean;
  error?: string;
}

interface QueueStats {
  queues: Record<string, number>;
  active_requests: Record<string, number>;
  capacity_utilization: Record<string, number>;
  cache_hit_rate: number;
}

interface GenerationManagerProps {
  title: string;
  template: string;
  description?: string;
  model?: string;
  onComplete?: (result: string) => void;
  onError?: (error: string) => void;
}

export function GenerationManager({ 
  title, 
  template, 
  description = "", 
  model = "phi3:mini",
  onComplete,
  onError 
}: GenerationManagerProps) {
  const [request, setRequest] = useState<GenerationRequest | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Start generation
  const startGeneration = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/ingest/generate_async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          project: 'default',
          title,
          template,
          description,
          model
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Handle immediate completion (cached results)
      if (result.status === 'completed') {
        setRequest(result);
        setIsGenerating(false);
        if (onComplete) onComplete(result.result);
        return;
      }

      // Start polling for status
      setRequest(result);
      startPolling(result.request_id);

    } catch (error) {
      console.error('Generation start failed:', error);
      setIsGenerating(false);
      if (onError) onError(error instanceof Error ? error.message : 'Generation failed');
    }
  };

  // Start polling for status updates
  const startPolling = (requestId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/ingest/generation_status/${requestId}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch status');
        }

        const status = await response.json();
        setRequest(status);
        setQueueStats(status.queue_stats);

        // Handle completion
        if (status.status === 'completed') {
          clearInterval(interval);
          setPollInterval(null);
          setIsGenerating(false);
          if (onComplete) onComplete(status.result);
        } else if (status.status === 'failed') {
          clearInterval(interval);
          setPollInterval(null);
          setIsGenerating(false);
          if (onError) onError(status.result || 'Generation failed');
        }

      } catch (error) {
        console.error('Status polling failed:', error);
      }
    }, 2000); // Poll every 2 seconds

    setPollInterval(interval);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // Calculate progress
  const getProgress = () => {
    if (!request) return 0;
    
    if (request.status === 'completed') return 100;
    if (request.status === 'failed') return 0;
    if (request.status === 'processing') return 75;
    
    // Estimate progress based on queue position
    if (request.queue_position !== undefined) {
      const totalInQueue = queueStats ? 
        Object.values(queueStats.queues).reduce((a, b) => a + b, 0) : 10;
      const progress = Math.max(10, 70 - (request.queue_position / totalInQueue) * 60);
      return Math.round(progress);
    }
    
    return 25;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'queued': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'cached': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Document Generation
          {request && (
            <Badge className={getStatusBadgeColor(request.status)}>
              {request.cached ? 'Cached' : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Generation Controls */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={startGeneration}
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? 'Generating...' : 'Generate Documentation'}
          </Button>
          
          {isGenerating && request && (
            <Button 
              variant="outline" 
              onClick={() => {
                if (pollInterval) clearInterval(pollInterval);
                setPollInterval(null);
                setIsGenerating(false);
                setRequest(null);
              }}
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Progress Display */}
        {isGenerating && request && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{getProgress()}%</span>
            </div>
            
            <Progress value={getProgress()} className="w-full" />
            
            {/* Queue Information */}
            {request.queue_position !== undefined && request.queue_position > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Queue Position:</span>
                  <span className="font-medium">#{request.queue_position}</span>
                </div>
                
                {request.estimated_wait_time && (
                  <div className="flex justify-between text-sm">
                    <span>Estimated Wait:</span>
                    <span className="font-medium">{formatWaitTime(request.estimated_wait_time)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Processing Status */}
            {request.status === 'processing' && (
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Processing your document...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Queue Statistics */}
        {queueStats && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">System Status</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-600">Active Requests:</span>
                <div className="font-medium">
                  {Object.entries(queueStats.active_requests).map(([instance, count]) => (
                    <div key={instance}>{instance}: {count}</div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Cache Hit Rate:</span>
                <div className="font-medium">{queueStats.cache_hit_rate.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Result Display */}
        {request?.status === 'completed' && request.result && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">
              Generation Complete {request.cached && '(Cached)'}
            </h4>
            <div className="text-sm text-green-700">
              Document generated successfully! 
              {request.cached && ' This result was retrieved from cache for faster delivery.'}
            </div>
          </div>
        )}

        {/* Error Display */}
        {request?.status === 'failed' && (
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">Generation Failed</h4>
            <div className="text-sm text-red-700">
              {request.error || 'An error occurred during generation.'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}