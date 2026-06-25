'use client';

import { useState, useEffect } from 'react';
import { FilegunItem } from '../types/filegun.types';
import { getFileIcon, formatFileSize, formatDate } from '@/app/utils/filegun/filegunClientUtils';
import { getFilegunBridge } from '@/app/utils/filegun/websocketBridge';

interface FilegunExplorerProps {
  items: FilegunItem[];
  isLoading: boolean;
  onNavigate: (path: string) => void;
  onRename: (oldPath: string, newName: string) => Promise<void>;
  onDelete: (path: string) => Promise<void>;
  onPinStatusChange?: () => void;
}

export default function FilegunExplorer({
  items,
  isLoading,
  onNavigate,
  onRename,
  onDelete,
  onPinStatusChange
}: FilegunExplorerProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FilegunItem } | null>(null);
  const [pinnedFolders, setPinnedFolders] = useState<Set<string>>(new Set());

  // Fetch pinned folders on component mount
  useEffect(() => {
    fetchPinnedFolders();
  }, []);

  const fetchPinnedFolders = async () => {
    try {
      const response = await fetch('/api/filegun/pin');
      const result = await response.json();
      if (result.success) {
        const pinnedPaths = new Set(result.data.map((folder: any) => folder.folder_path));
        setPinnedFolders(pinnedPaths);
      }
    } catch (error) {
      console.error('Error fetching pinned folders:', error);
    }
  };

  const handlePinToggle = async (item: FilegunItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (item.type !== 'folder') return;

    const isPinned = pinnedFolders.has(item.path);
    const newPinnedState = !isPinned;

    try {
      const response = await fetch('/api/filegun/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: item.path,
          isPinned: newPinnedState
        })
      });

      const result = await response.json();
      if (result.success) {
        const newPinnedFolders = new Set(pinnedFolders);
        if (newPinnedState) {
          newPinnedFolders.add(item.path);
        } else {
          newPinnedFolders.delete(item.path);
        }
        setPinnedFolders(newPinnedFolders);
        
        // Notify parent component that pin status changed
        if (onPinStatusChange) {
          onPinStatusChange();
        }
      } else {
        alert(`Error ${newPinnedState ? 'pinning' : 'unpinning'} folder: ${result.error}`);
      }
    } catch (error) {
      console.error('Error toggling pin status:', error);
      alert('Error updating pin status');
    }
  };

  const handleItemClick = async (item: FilegunItem) => {
    if (item.type === 'folder') {
      onNavigate(item.path);
    } else if (item.type === 'file') {
      // Open file using WebSocket bridge
      console.log('Opening file via WebSocket bridge:', item.path);
      
      try {
        const bridge = getFilegunBridge();
        const success = await bridge.openFile(item.path);
        
        if (success) {
          console.log('✅ File opened successfully');
        } else {
          console.error('❌ Failed to open file');
          alert('Failed to open file. Make sure the Filegun Bridge server is running.');
        }
      } catch (error) {
        console.error('Error opening file:', error);
        alert('Error connecting to Filegun Bridge. Make sure the bridge server is running.');
      }
    }
  };

  const handleItemDoubleClick = (item: FilegunItem) => {
    if (item.type === 'folder') {
      onNavigate(item.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FilegunItem) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const startRename = (item: FilegunItem) => {
    setRenamingItem(item.path);
    setRenameValue(item.name);
    closeContextMenu();
  };

  const handleRename = async () => {
    if (!renamingItem || !renameValue.trim()) return;

    try {
      await onRename(renamingItem, renameValue.trim());
      setRenamingItem(null);
      setRenameValue('');
    } catch (error) {
      alert(`Error renaming: ${error.message}`);
    }
  };

  const handleDelete = async (item: FilegunItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      await onDelete(item.path);
      closeContextMenu();
    } catch (error) {
      alert(`Error deleting: ${error.message}`);
    }
  };

  const cancelRename = () => {
    setRenamingItem(null);
    setRenameValue('');
  };

  const handleRenameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };

  // Close context menu when clicking elsewhere
  const handleGlobalClick = () => {
    closeContextMenu();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full relative" onClick={handleGlobalClick}>
      {items.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">No items in this directory</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1 p-4">
          {items.map((item) => (
            <div
              key={item.path}
              className={`flex items-center p-2 rounded hover:bg-gray-100 cursor-pointer select-none ${
                selectedItems.includes(item.path) ? 'bg-blue-100' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleItemClick(item);
              }}
              onDoubleClick={() => handleItemDoubleClick(item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
            >
              {/* Icon */}
              <div className="w-6 text-center mr-3">
                {getFileIcon(item.name, item.type === 'folder')}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                {renamingItem === item.path ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyPress={handleRenameKeyPress}
                    onBlur={handleRename}
                    className="w-full px-1 py-0 border rounded text-sm"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="truncate text-sm">
                    {item.name}
                    {item.isHidden && (
                      <span className="text-gray-400 ml-1">(hidden)</span>
                    )}
                  </div>
                )}
              </div>

              {/* Size */}
              <div className="w-16 text-right text-xs text-gray-500 mr-4">
                {item.type === 'file' ? formatFileSize(item.size) : '—'}
              </div>

              {/* Modified Date */}
              <div className="w-32 text-right text-xs text-gray-500">
                {formatDate(new Date(item.modified))}
              </div>

              {/* Pin Button - Only for folders */}
              {item.type === 'folder' && (
                <div 
                  className={`flex items-center justify-center cursor-pointer ml-1 ${
                    pinnedFolders.has(item.path) ? 'bg-lime-400' : 'bg-gray-200'
                  }`}
                  style={{ width: '20px', height: '100%' }}
                  onClick={(e) => handlePinToggle(item, e)}
                  title={pinnedFolders.has(item.path) ? 'Unpin folder' : 'Pin folder'}
                >
                  <span className="text-xs font-bold text-gray-700">p</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="absolute bg-white border border-gray-300 rounded shadow-lg py-1 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => startRename(contextMenu.item)}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            Rename
          </button>
          <button
            onClick={() => handleDelete(contextMenu.item)}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
          <hr className="my-1" />
          <div className="px-4 py-1 text-xs text-gray-500">
            {contextMenu.item.type === 'file' ? formatFileSize(contextMenu.item.size) : 'Folder'}
          </div>
        </div>
      )}
    </div>
  );
}