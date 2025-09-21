/**
 * React hook for event processing with spawner
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { EventProcessor, createEventProcessor, EventProcessingOptions } from '@/lib/spawner/event-processor';
import { SpawnResult } from '@/lib/spawner/types';
import { useQueryClient } from '@tanstack/react-query';

export interface UseEventProcessorOptions extends Partial<EventProcessingOptions> {
  onSuccess?: (results: SpawnResult[]) => void;
  onError?: (error: Error) => void;
  autoRefresh?: boolean;
}

export interface EventProcessorState {
  isProcessing: boolean;
  stats: {
    status: string;
    workers: number;
    queued: number;
    processedCount: number;
    metrics: {
      totalTasks: number;
      completedTasks: number;
      failedTasks: number;
      averageTime: number;
    };
  };
  errors: Error[];
}

export function useEventProcessor(options: UseEventProcessorOptions = {}) {
  const queryClient = useQueryClient();
  const processorRef = useRef<EventProcessor | null>(null);
  const [state, setState] = useState<EventProcessorState>({
    isProcessing: false,
    stats: {
      status: 'idle',
      workers: 0,
      queued: 0,
      processedCount: 0,
      metrics: {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageTime: 0
      }
    },
    errors: []
  });

  // Initialize processor
  useEffect(() => {
    processorRef.current = createEventProcessor({
      batchSize: options.batchSize,
      deduplicationEnabled: options.deduplicationEnabled,
      enrichmentEnabled: options.enrichmentEnabled,
      validateLocation: options.validateLocation
    });

    // Update stats periodically
    const interval = setInterval(() => {
      if (processorRef.current) {
        const stats = processorRef.current.getStats();
        setState(prev => ({
          ...prev,
          stats: {
            ...stats,
            processedCount: stats.processedCount || 0
          }
        }));
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (processorRef.current) {
        processorRef.current.shutdown();
      }
    };
  }, []);

  /**
   * Process Eventbrite events
   */
  const processEventbriteEvents = useCallback(async (events: any[]) => {
    if (!processorRef.current) return;

    setState(prev => ({ ...prev, isProcessing: true, errors: [] }));

    try {
      const results = await processorRef.current.processEventbriteEvents(events);
      
      // Handle results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (failed.length > 0) {
        setState(prev => ({
          ...prev,
          errors: failed.map(f => f.error).filter((err): err is Error => err !== undefined)
        }));
      }

      // Invalidate queries if autoRefresh is enabled
      if (options.autoRefresh && successful.length > 0) {
        await queryClient.invalidateQueries({ queryKey: ['events'] });
      }

      // Call success callback
      if (options.onSuccess) {
        options.onSuccess(results);
      }

      return results;
    } catch (error) {
      const err = error as Error;
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, err]
      }));
      
      if (options.onError) {
        options.onError(err);
      }
      
      throw error;
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [queryClient, options]);

  /**
   * Process Yelp events
   */
  const processYelpEvents = useCallback(async (events: any[]) => {
    if (!processorRef.current) return;

    setState(prev => ({ ...prev, isProcessing: true, errors: [] }));

    try {
      const results = await processorRef.current.processYelpEvents(events);
      
      // Handle results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (failed.length > 0) {
        setState(prev => ({
          ...prev,
          errors: failed.map(f => f.error).filter((err): err is Error => err !== undefined)
        }));
      }

      // Invalidate queries if autoRefresh is enabled
      if (options.autoRefresh && successful.length > 0) {
        await queryClient.invalidateQueries({ queryKey: ['events'] });
      }

      // Call success callback
      if (options.onSuccess) {
        options.onSuccess(results);
      }

      return results;
    } catch (error) {
      const err = error as Error;
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, err]
      }));
      
      if (options.onError) {
        options.onError(err);
      }
      
      throw error;
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [queryClient, options]);

  /**
   * Process manual event submission
   */
  const processManualEvent = useCallback(async (eventData: any) => {
    if (!processorRef.current) return;

    setState(prev => ({ ...prev, isProcessing: true, errors: [] }));

    try {
      const result = await processorRef.current.processManualEvent(eventData);
      
      if (!result.success && result.error) {
        setState(prev => ({
          ...prev,
          errors: [result.error].filter((err): err is Error => err instanceof Error)
        }));
      }

      // Invalidate queries if successful
      if (result.success && options.autoRefresh) {
        await queryClient.invalidateQueries({ queryKey: ['events'] });
      }

      // Call success callback
      if (result.success && options.onSuccess) {
        options.onSuccess([result]);
      }

      return result;
    } catch (error) {
      const err = error as Error;
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, err]
      }));
      
      if (options.onError) {
        options.onError(err);
      }
      
      throw error;
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [queryClient, options]);

  /**
   * Clear errors
   */
  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, errors: [] }));
  }, []);

  /**
   * Get current processor stats
   */
  const refreshStats = useCallback(() => {
    if (processorRef.current) {
      const stats = processorRef.current.getStats();
      setState(prev => ({
        ...prev,
        stats: {
          ...stats,
          processedCount: stats.processedCount || 0
        }
      }));
    }
  }, []);

  return {
    // State
    isProcessing: state.isProcessing,
    stats: state.stats,
    errors: state.errors,
    
    // Actions
    processEventbriteEvents,
    processYelpEvents,
    processManualEvent,
    clearErrors,
    refreshStats
  };
}