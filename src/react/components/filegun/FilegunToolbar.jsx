'use client';

import React, { useState, useEffect } from 'react';

export default function FilegunToolbar({
  currentPath = '',
  onNavigateUp = () => {},
  onRefresh = () => {},
  onCreateFolder = async () => {},
  onCreateFile = async () => {},
  canNavigateUp = false,
  viewMode = 'column',
  onViewModeChange = () => {},
  onNavigateToPath = () => {},
  onPinStatusChange = () => {}
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [pinnedFolders, setPinnedFolders] = useState([]);
  const [showPinnedDropdown, setShowPinnedDropdown] = useState(false);

  // Fetch pinned folders on component mount
  useEffect(() => {
    fetchPinnedFolders();
  }, []);

  // Listen for pin status changes
  useEffect(() => {
    if (onPinStatusChange) {
      fetchPinnedFolders();
    }
  }, [onPinStatusChange]);

  const fetchPinnedFolders = async () => {
    try {
      // For Electron, get pinned folders from database
      if (window.electronAPI && window.electronAPI.dbGetFolders) {
        const result = await window.electronAPI.dbGetFolders({ isPinned: true });
        if (result.success) {
          setPinnedFolders(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching pinned folders:', error);
    }
  };

  const handlePinnedFolderSelect = (folderPath) => {
    if (onNavigateToPath) {
      onNavigateToPath(folderPath);
    }
    setShowPinnedDropdown(false);
  };

  const handleCreate = async () => {
    if (!newItemName.trim() || !showCreateDialog) return;

    try {
      if (showCreateDialog === 'folder') {
        await onCreateFolder(newItemName.trim());
      } else {
        await onCreateFile(newItemName.trim());
      }
      setNewItemName('');
      setShowCreateDialog(null);
    } catch (error) {
      alert(`Error creating ${showCreateDialog}: ${error.message}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      setNewItemName('');
      setShowCreateDialog(null);
    }
  };

  return (
    <div className="bg-white border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm">toolbar25</span>
            <button
              onClick={onNavigateUp}
              disabled={!canNavigateUp}
              className={`px-3 py-1 text-sm rounded ${
                canNavigateUp
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title="Go up one level"
            >
              ↑ Up
            </button>
            
            <button
              onClick={onRefresh}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
              title="Refresh directory"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Current Path */}
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-2">Path:</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
              {currentPath}
            </code>
          </div>

          {/* Pinned Folders Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPinnedDropdown(!showPinnedDropdown)}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center"
              title="Navigate to pinned folders"
            >
              📌 Pinned Folders
              <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPinnedDropdown && (
              <div className="absolute left-0 mt-1 w-64 bg-white border border-gray-300 rounded shadow-lg py-1 z-50">
                {pinnedFolders.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-500">
                    No pinned folders yet
                  </div>
                ) : (
                  pinnedFolders.map((folder) => (
                    <button
                      key={folder.folder_path}
                      onClick={() => handlePinnedFolderSelect(folder.folder_path)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                      title={folder.folder_path}
                    >
                      <span className="text-green-600 mr-2">📁</span>
                      <span className="truncate">{folder.folder_name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Hailstorm Technology Button */}
          <button
            className="px-4 py-2 bg-black text-white font-bold rounded"
            style={{ fontSize: '16px' }}
            title="Hailstorm Technology"
          >
            Hailstorm Technology
          </button>
        </div>

        {/* View Controls and Create Controls */}
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded p-1">
            <button
              onClick={() => onViewModeChange('list')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title="List View"
            >
              ☰ List
            </button>
            <button
              onClick={() => onViewModeChange('column')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'column'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title="Column View"
            >
              ▦ Column
            </button>
          </div>

          {/* Create Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCreateDialog('folder')}
              className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              📁 New Folder
            </button>
            
            <button
              onClick={() => setShowCreateDialog('file')}
              className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              📄 New File
            </button>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="mt-3 p-3 bg-gray-50 rounded border">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium">
              Create new {showCreateDialog}:
            </span>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Enter ${showCreateDialog} name`}
              className="flex-1 px-2 py-1 border rounded text-sm"
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={!newItemName.trim()}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              Create
            </button>
            <button
              onClick={() => {
                setNewItemName('');
                setShowCreateDialog(null);
              }}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}