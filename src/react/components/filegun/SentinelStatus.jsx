'use client';

import React from 'react';

export default function SentinelStatus() {
  return (
    <div className="bg-gray-100 border border-gray-300 rounded p-3">
      <h4 className="text-sm font-semibold mb-2">Sentinel Status</h4>
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-600">Files Tracked:</span>
          <span className="font-mono">0</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Folders Tracked:</span>
          <span className="font-mono">0</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Last Scan:</span>
          <span className="font-mono">Never</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Database Size:</span>
          <span className="font-mono">0 KB</span>
        </div>
      </div>
    </div>
  );
}