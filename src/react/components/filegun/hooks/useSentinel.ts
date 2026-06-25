'use client';

import { useState, useEffect, useCallback } from 'react';
import { SentinelStatus, SentinelOperation, SentinelSyncResult } from '@/app/utils/filegun/sentinel/SentinelTypes';

interface UseSentinelReturn {
  status: SentinelStatus | null;
  operations: SentinelOperation[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  startSentinel: (path?: string) => Promise<boolean>;
  stopSentinel: () => Promise<boolean>;
  restartSentinel: (path?: string) => Promise<boolean>;
  syncDirectory: (path?: string) => Promise<SentinelSyncResult | null>;
  clearOperations: () => Promise<boolean>;
  cleanupDeleted: () => Promise<boolean>;
  
  // Data fetching
  refreshStatus: () => Promise<void>;
  refreshOperations: () => Promise<void>;
}

export const useSentinel = (): UseSentinelReturn => {
  const [status, setStatus] = useState<SentinelStatus | null>(null);
  const [operations, setOperations] = useState<SentinelOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current status
  const refreshStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/filegun/sentinel');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching Sentinel status:', err);
    }
  }, []);

  // Fetch operations history
  const refreshOperations = useCallback(async () => {
    try {
      const response = await fetch('/api/filegun/sentinel/operations');
      const data = await response.json();
      
      if (data.success) {
        setOperations(data.data);
      } else {
        console.error('Error fetching operations:', data.error);
      }
    } catch (err) {
      console.error('Error fetching operations:', err);
    }
  }, []);

  // Start Sentinel
  const startSentinel = useCallback(async (path?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/filegun/sentinel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', path })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        await refreshOperations();
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error starting Sentinel:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshOperations]);

  // Stop Sentinel
  const stopSentinel = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/filegun/sentinel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error stopping Sentinel:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Restart Sentinel
  const restartSentinel = useCallback(async (path?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/filegun/sentinel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart', path })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        await refreshOperations();
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error restarting Sentinel:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshOperations]);

  // Sync directory
  const syncDirectory = useCallback(async (path?: string): Promise<SentinelSyncResult | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/filegun/sentinel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', path })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await refreshStatus();
        await refreshOperations();
        return data.data;
      } else {
        setError(data.error);
        return null;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error syncing directory:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus, refreshOperations]);

  // Clear operations history
  const clearOperations = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/filegun/sentinel/operations', {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOperations([]);
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error clearing operations:', err);
      return false;
    }
  }, []);

  // Cleanup deleted items
  const cleanupDeleted = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/filegun/sentinel/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await refreshStatus();
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error cleaning up deleted items:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  // Auto-refresh status and operations
  useEffect(() => {
    refreshStatus();
    refreshOperations();

    // Set up polling for status updates
    const statusInterval = setInterval(refreshStatus, 5000); // Every 5 seconds
    const operationsInterval = setInterval(refreshOperations, 10000); // Every 10 seconds

    return () => {
      clearInterval(statusInterval);
      clearInterval(operationsInterval);
    };
  }, [refreshStatus, refreshOperations]);

  return {
    status,
    operations,
    isLoading,
    error,
    
    // Actions
    startSentinel,
    stopSentinel,
    restartSentinel,
    syncDirectory,
    clearOperations,
    cleanupDeleted,
    
    // Data fetching
    refreshStatus,
    refreshOperations
  };
};