'use client';

import { FilegunOperation } from '../types/filegun.types';

interface FilegunStatusBarProps {
  operations: FilegunOperation[];
  currentPath: string;
  itemCount: number;
}

export default function FilegunStatusBar({
  operations,
  currentPath,
  itemCount
}: FilegunStatusBarProps) {
  const recentOperation = operations[0];
  const pendingCount = operations.filter(op => op.status === 'pending').length;
  const errorCount = operations.filter(op => op.status === 'error').length;

  return (
    <div className="bg-gray-100 border-t px-4 py-2 text-sm">
      <div className="flex items-center justify-between">
        {/* Left side - Current status */}
        <div className="flex items-center space-x-4">
          <span className="text-gray-600">
            {itemCount} items
          </span>
          
          {recentOperation && (
            <div className="flex items-center space-x-2">
              {recentOperation.status === 'pending' && (
                <span className="text-blue-600">
                  🔄 {recentOperation.action}ing...
                </span>
              )}
              {recentOperation.status === 'success' && (
                <span className="text-green-600">
                  ✅ {recentOperation.action} completed
                </span>
              )}
              {recentOperation.status === 'error' && (
                <span className="text-red-600">
                  ❌ {recentOperation.action} failed: {recentOperation.error}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right side - Operation counts */}
        <div className="flex items-center space-x-4">
          {pendingCount > 0 && (
            <span className="text-blue-600">
              {pendingCount} pending
            </span>
          )}
          
          {errorCount > 0 && (
            <span className="text-red-600">
              {errorCount} errors
            </span>
          )}
          
          <span className="text-gray-500">
            Path: {currentPath}
          </span>
        </div>
      </div>
    </div>
  );
}