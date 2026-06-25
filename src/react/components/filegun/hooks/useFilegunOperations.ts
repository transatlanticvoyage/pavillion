'use client';

import { useState, useCallback } from 'react';
import { FilegunOperation, FilegunApiResponse } from '../types/filegun.types';
import { sanitizeFilename } from '@/app/utils/filegun/filegunClientSecurity';

export const useFilegunOperations = () => {
  const [operations, setOperations] = useState<FilegunOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addOperation = useCallback((operation: Omit<FilegunOperation, 'timestamp' | 'status'>) => {
    const newOperation: FilegunOperation = {
      ...operation,
      timestamp: new Date(),
      status: 'pending'
    };
    
    setOperations(prev => [newOperation, ...prev]);
    return newOperation;
  }, []);

  const updateOperation = useCallback((operation: FilegunOperation, status: 'success' | 'error', error?: string) => {
    setOperations(prev => prev.map(op => 
      op === operation 
        ? { ...op, status, error }
        : op
    ));
  }, []);

  const createFolder = useCallback(async (parentPath: string, folderName: string) => {
    const sanitizedName = sanitizeFilename(folderName);
    if (!sanitizedName) {
      throw new Error('Invalid folder name');
    }

    const operation = addOperation({ action: 'create', source: `${parentPath}/${sanitizedName}` });
    setIsLoading(true);

    try {
      const response = await fetch('/api/filegun/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: parentPath,
          name: sanitizedName,
          type: 'folder'
        })
      });

      const data: FilegunApiResponse = await response.json();

      if (data.success) {
        updateOperation(operation, 'success');
        return data;
      } else {
        updateOperation(operation, 'error', data.error);
        throw new Error(data.error);
      }
    } catch (error) {
      updateOperation(operation, 'error', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [addOperation, updateOperation]);

  const createFile = useCallback(async (parentPath: string, fileName: string, content: string = '') => {
    const sanitizedName = sanitizeFilename(fileName);
    if (!sanitizedName) {
      throw new Error('Invalid file name');
    }

    const operation = addOperation({ action: 'create', source: `${parentPath}/${sanitizedName}` });
    setIsLoading(true);

    try {
      const response = await fetch('/api/filegun/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: parentPath,
          name: sanitizedName,
          type: 'file',
          content
        })
      });

      const data: FilegunApiResponse = await response.json();

      if (data.success) {
        updateOperation(operation, 'success');
        return data;
      } else {
        updateOperation(operation, 'error', data.error);
        throw new Error(data.error);
      }
    } catch (error) {
      updateOperation(operation, 'error', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [addOperation, updateOperation]);

  const renameItem = useCallback(async (oldPath: string, newName: string) => {
    const sanitizedName = sanitizeFilename(newName);
    if (!sanitizedName) {
      throw new Error('Invalid name');
    }

    const operation = addOperation({ action: 'rename', source: oldPath, target: sanitizedName });
    setIsLoading(true);

    try {
      const response = await fetch('/api/filegun/rename', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPath,
          newName: sanitizedName
        })
      });

      const data: FilegunApiResponse = await response.json();

      if (data.success) {
        updateOperation(operation, 'success');
        return data;
      } else {
        updateOperation(operation, 'error', data.error);
        throw new Error(data.error);
      }
    } catch (error) {
      updateOperation(operation, 'error', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [addOperation, updateOperation]);

  const deleteItem = useCallback(async (itemPath: string) => {
    const operation = addOperation({ action: 'delete', source: itemPath });
    setIsLoading(true);

    try {
      const response = await fetch('/api/filegun/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: itemPath
        })
      });

      const data: FilegunApiResponse = await response.json();

      if (data.success) {
        updateOperation(operation, 'success');
        return data;
      } else {
        updateOperation(operation, 'error', data.error);
        throw new Error(data.error);
      }
    } catch (error) {
      updateOperation(operation, 'error', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [addOperation, updateOperation]);

  const clearOperations = useCallback(() => {
    setOperations([]);
  }, []);

  return {
    operations,
    isLoading,
    createFolder,
    createFile,
    renameItem,
    deleteItem,
    clearOperations
  };
};