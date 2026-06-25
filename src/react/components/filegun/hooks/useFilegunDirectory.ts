'use client';

import { useState, useEffect, useCallback } from 'react';
import { FilegunItem, FilegunApiResponse } from '../types/filegun.types';

export const useFilegunDirectory = (initialPath: string = '/') => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [items, setItems] = useState<FilegunItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/filegun/list?path=${encodeURIComponent(path)}`);
      const data: FilegunApiResponse = await response.json();

      if (data.success && data.data) {
        setItems(data.data.items || []);
        setCurrentPath(path);
      } else {
        setError(data.error || 'Failed to load directory');
        setItems([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load directory');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const navigateToPath = useCallback((path: string) => {
    loadDirectory(path);
  }, [loadDirectory]);

  const navigateUp = useCallback(() => {
    if (currentPath === '/') return;
    
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    navigateToPath(parentPath);
  }, [currentPath, navigateToPath]);

  const refresh = useCallback(() => {
    loadDirectory(currentPath);
  }, [currentPath, loadDirectory]);

  // Load initial directory
  useEffect(() => {
    loadDirectory(initialPath);
  }, [initialPath, loadDirectory]);

  return {
    currentPath,
    items,
    isLoading,
    error,
    navigateToPath,
    navigateUp,
    refresh,
    setCurrentPath
  };
};