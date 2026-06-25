'use client';

import { useSentinel } from '../hooks/useSentinel';

export default function SentinelStatus() {
  const { status, isLoading } = useSentinel();

  if (isLoading && !status) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm">Sentinel Unavailable</span>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (status.isScanning) return '🔍';
    if (status.isActive) return '🛡️';
    return '⏸️';
  };

  const getStatusColor = () => {
    if (status.isScanning) return 'bg-blue-500';
    if (status.isActive) return 'bg-green-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (status.isScanning) return 'Scanning';
    if (status.isActive) return 'Monitoring';
    return 'Stopped';
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Status Indicator */}
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
        <span className="text-sm font-medium">
          {getStatusIcon()} {getStatusText()}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center space-x-4 text-xs text-gray-600">
        <span title="Files being watched">
          📄 {status.totalFiles.toLocaleString()}
        </span>
        <span title="Folders being watched">
          📁 {status.totalFolders.toLocaleString()}
        </span>
        {status.pendingChanges > 0 && (
          <span title="Pending changes" className="text-orange-600 font-medium">
            ⏳ {status.pendingChanges}
          </span>
        )}
        {status.errorCount > 0 && (
          <span title="Errors" className="text-red-600 font-medium">
            ❌ {status.errorCount}
          </span>
        )}
      </div>

      {/* Last Sync */}
      {status.lastSyncTime && (
        <div className="text-xs text-gray-500" title="Last sync time">
          {new Date(status.lastSyncTime).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}