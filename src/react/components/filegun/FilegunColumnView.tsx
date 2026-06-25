'use client';

import React, { useState, useEffect } from 'react';
import { FilegunItem, FilegunApiResponse } from '../types/filegun.types';
import { getFileIcon, formatFileSize, formatDate } from '@/app/utils/filegun/filegunClientUtils';
import { getFilegunBridge } from '@/app/utils/filegun/websocketBridge';

interface FilegunColumnViewProps {
  initialPath: string;
  onRename: (oldPath: string, newName: string) => Promise<void>;
  onDelete: (path: string) => Promise<void>;
  onPinStatusChange?: () => void;
  onSelectedItemChange?: (selectedPath: string | null, isFile: boolean) => void;
  isMultiSelectEnabled?: boolean;
  selectedItemPaths?: string[];
  showTurtleBar?: boolean;
  onColumnSelectionChange?: (hasSelection: boolean) => void;
}

interface ColumnData {
  path: string;
  items: FilegunItem[];
  selectedItem: string | null;
}

export default function FilegunColumnView({
  initialPath,
  onRename,
  onDelete,
  onPinStatusChange,
  onSelectedItemChange,
  isMultiSelectEnabled = false,
  selectedItemPaths = [],
  showTurtleBar = false,
  onColumnSelectionChange
}: FilegunColumnViewProps) {
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FilegunItem } | null>(null);
  const [pinnedFolders, setPinnedFolders] = useState<Set<string>>(new Set());
  const [emptyColumnCount, setEmptyColumnCount] = useState(0);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [lastClickedItem, setLastClickedItem] = useState<string | null>(null);

  // Load directory contents
  const loadDirectory = async (path: string): Promise<FilegunItem[]> => {
    try {
      const response = await fetch(`/api/filegun/list?path=${encodeURIComponent(path)}`);
      const data: FilegunApiResponse = await response.json();
      return data.success && data.data ? data.data.items || [] : [];
    } catch (error) {
      console.error('Failed to load directory:', error);
      return [];
    }
  };

  // Initialize with root directory
  useEffect(() => {
    const initializeColumns = async () => {
      setIsLoading(true);
      const items = await loadDirectory(initialPath);
      setColumns([{
        path: initialPath,
        items,
        selectedItem: null
      }]);
      setIsLoading(false);
    };

    initializeColumns();
  }, [initialPath]);

  // Fetch pinned folders on component mount
  useEffect(() => {
    fetchPinnedFolders();
  }, []);

  // Calculate how many empty columns we need to fill the screen
  const calculateEmptyColumns = () => {
    const containerWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const columnWidth = 256; // 64 * 4 = 256px (w-64 in Tailwind)
    const usedWidth = columns.length * columnWidth;
    const remainingWidth = containerWidth - usedWidth;
    const emptyColumnsNeeded = Math.max(0, Math.floor(remainingWidth / columnWidth));
    return emptyColumnsNeeded;
  };

  // Update empty column count on window resize
  useEffect(() => {
    const updateEmptyColumns = () => {
      setEmptyColumnCount(calculateEmptyColumns());
    };

    updateEmptyColumns();
    window.addEventListener('resize', updateEmptyColumns);
    return () => window.removeEventListener('resize', updateEmptyColumns);
  }, [columns.length]);

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

  // Handle item selection in a column with double-click for files only
  const handleItemSelect = async (columnIndex: number, item: FilegunItem) => {
    // Always update selection on click (for single-select compatibility)
    const newColumns = [...columns];
    newColumns[columnIndex].selectedItem = item.path;
    setColumns(newColumns);
    
    // Notify parent of selection change (handles both single and multi-select logic)
    if (onSelectedItemChange) {
      onSelectedItemChange(item.path, item.type === 'file');
    }
    
    if (item.type === 'file') {
      // Files require double-click to open
      const currentTime = Date.now();
      const DOUBLE_CLICK_THRESHOLD = 400; // milliseconds
      
      // Check if this is a double-click
      const isDoubleClick = lastClickedItem === item.path && 
                           (currentTime - lastClickTime) < DOUBLE_CLICK_THRESHOLD;
      
      // Update click tracking
      setLastClickTime(currentTime);
      setLastClickedItem(item.path);
      
      // Only open file on double-click
      if (!isDoubleClick) {
        return; // Just select, don't open
      }
      
      // Double-click detected - open file
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
      
      return;
    }

    // For folders, open immediately on single click
    setIsLoading(true);
    const items = await loadDirectory(item.path);
    
    // Remove any columns to the right
    newColumns.splice(columnIndex + 1);
    
    // Add new column with folder contents
    newColumns.push({
      path: item.path,
      items,
      selectedItem: null
    });
    
    setColumns(newColumns);
    setIsLoading(false);
  };

  // Handle context menu
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

  // Rename functionality
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
      
      // Refresh current columns
      const refreshPromises = columns.map(async (column, index) => {
        const items = await loadDirectory(column.path);
        return { ...column, items };
      });
      
      const refreshedColumns = await Promise.all(refreshPromises);
      setColumns(refreshedColumns);
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
      
      // Refresh current columns
      const refreshPromises = columns.map(async (column, index) => {
        const items = await loadDirectory(column.path);
        return { ...column, items };
      });
      
      const refreshedColumns = await Promise.all(refreshPromises);
      setColumns(refreshedColumns);
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

  // Handle column selection - only allow single selection of columns with content
  const handleColumnSelect = (columnId: string, hasContent: boolean) => {
    // Don't allow selection of empty columns
    if (!hasContent) return;
    
    const newSelectedColumns = new Set<string>();
    // If clicking on already selected column, deselect it
    if (selectedColumns.has(columnId)) {
      // Leave set empty (deselect)
    } else {
      // Select only this column (single selection)
      newSelectedColumns.add(columnId);
    }
    setSelectedColumns(newSelectedColumns);
    
    // Notify parent about column selection change
    if (onColumnSelectionChange) {
      onColumnSelectionChange(newSelectedColumns.size > 0);
    }
  };

  if (isLoading && columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading columns...</div>
      </div>
    );
  }

  return (
    <div className="h-full relative" onClick={closeContextMenu}>
      {/* Column Container */}
      <div className="flex h-full overflow-x-auto">
        {columns.map((column, columnIndex) => {
          const columnId = `${column.path}-${columnIndex}`;
          const isSelectedColumn = selectedColumns.has(columnId);
          
          return (
            <React.Fragment key={columnId}>
              {/* Regular Column */}
              <div className="flex-shrink-0 w-64 border-r border-gray-200 bg-white">
            {/* Additional Header Row - with selection functionality */}
            <div 
              className={`kz_filegun_colview_header_level2 border-b border-t border-gray-400 px-3 py-2 ${
                column.items.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed'
              } ${
                selectedColumns.has(`${column.path}-${columnIndex}`) ? '' : 'bg-gray-50'
              }`}
              style={{
                backgroundColor: selectedColumns.has(`${column.path}-${columnIndex}`) ? '#b0cce7' : '',
                height: '30px'
              }}
              onClick={() => handleColumnSelect(`${column.path}-${columnIndex}`, column.items.length > 0)}
            >
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={selectedColumns.has(`${column.path}-${columnIndex}`)}
                  onChange={() => {}} // Handled by parent div onClick
                  className="pointer-events-none"
                  disabled={column.items.length === 0}
                />
              </div>
            </div>

            {/* Column Header */}
            <div className="kz_filegun_colview_header_level1 bg-gray-50 border-b border-t border-gray-400 px-3 py-2">
              <div className="text-xs text-gray-600 truncate" title={column.path}>
                {column.path === '/' ? 'Root' : column.path.split('/').pop() || column.path}
              </div>
            </div>

            {/* Column Content */}
            <div className="overflow-y-auto h-full">
              {column.items.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Empty folder
                </div>
              ) : (
                column.items.map((item) => (
                  <div
                    key={item.path}
                    className={`flex items-center p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 ${
                      isMultiSelectEnabled && selectedItemPaths.includes(item.path) 
                        ? 'bg-blue-100' 
                        : !isMultiSelectEnabled && column.selectedItem === item.path 
                        ? 'bg-blue-100' 
                        : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemSelect(columnIndex, item);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    {/* Icon */}
                    <div className="w-5 text-center mr-2 flex-shrink-0">
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
                          className="w-full px-1 py-0 border rounded text-xs"
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

                    {/* Pin Button for folders */}
                    {item.type === 'folder' && (
                      <div 
                        className={`flex items-center justify-center cursor-pointer mr-1 ${
                          pinnedFolders.has(item.path) ? 'bg-lime-400' : 'bg-gray-200'
                        }`}
                        style={{ width: '20px', height: '100%' }}
                        onClick={(e) => handlePinToggle(item, e)}
                        title={pinnedFolders.has(item.path) ? 'Unpin folder' : 'Pin folder'}
                      >
                        <span className="text-xs font-bold text-gray-700">p</span>
                      </div>
                    )}

                    {/* Arrow for folders */}
                    {item.type === 'folder' && (
                      <div className="text-gray-400 text-xs ml-1">
                        ▶
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Turtle Bar Column - appears immediately after selected column */}
          {showTurtleBar && isSelectedColumn && (
            <div className="flex-shrink-0 w-64 border-r border-gray-200 bg-white">
              {/* Turtle Bar Header Row */}
              <div className="kz_filegun_colview_header_level2 border-b border-t border-gray-400 px-3 py-2 bg-gray-50" style={{ height: '30px' }}>
                <div className="flex items-center justify-center">
                  <span className="text-xs text-gray-600">turtle bar</span>
                </div>
              </div>

              {/* Turtle Bar Column Header */}
              <div className="kz_filegun_colview_header_level1 bg-gray-50 border-b border-t border-gray-400 px-3 py-2">
                <div className="text-xs text-gray-600 truncate">
                  Database Info
                </div>
              </div>
              
              {/* Turtle Bar Items - corresponding to items in selected column */}
              <div className="overflow-y-auto h-full">
                {column.items.map((item, itemIndex) => (
                  <div
                    key={`turtle-${item.path}`}
                    className="flex items-center p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                  >
                    {/* Turtle Icon */}
                    <div className="w-5 text-center mr-2 flex-shrink-0">
                      🐢
                    </div>

                    {/* Turtle Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-600 truncate">
                        coming soon turtle
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
            
        </React.Fragment>
          );
        })}

        {/* Empty columns to fill screen */}
        {Array.from({ length: emptyColumnCount }, (_, index) => (
          <div
            key={`empty-${index}`}
            className="flex-shrink-0 w-64 border-r border-gray-200 bg-white"
          >
            {/* Additional Empty Header Row - disabled since no content */}
            <div 
              className={`kz_filegun_colview_header_level2 border-b border-t border-gray-400 px-3 py-2 cursor-not-allowed bg-gray-50`}
              style={{ height: '30px' }}
              onClick={() => handleColumnSelect(`empty-${index}`, false)}
            >
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => {}} // Handled by parent div onClick
                  className="pointer-events-none"
                  disabled={true}
                />
              </div>
            </div>

            {/* Empty Column Header */}
            <div className="kz_filegun_colview_header_level1 bg-gray-50 border-b border-t border-gray-400 px-3 py-2">
              <div className="text-xs text-gray-600 truncate">
                &nbsp;
              </div>
            </div>
            {/* Empty Column Content */}
            <div className="overflow-y-auto h-full">
              {/* Empty content area */}
            </div>
          </div>
        ))}


        {/* Preview Panel (for selected file) */}
        {columns.length > 0 && (() => {
          const lastColumn = columns[columns.length - 1];
          const selectedItem = lastColumn.items.find(item => item.path === lastColumn.selectedItem);
          
          if (selectedItem && selectedItem.type === 'file') {
            return (
              <div className="flex-shrink-0 w-64 bg-gray-50 border-r">
                <div className="bg-gray-100 border-b px-3 py-2">
                  <div className="text-xs text-gray-600">File Info</div>
                </div>
                <div className="p-3">
                  <div className="text-center mb-3">
                    <div className="text-2xl mb-2">
                      {getFileIcon(selectedItem.name, false)}
                    </div>
                    <div className="text-sm font-medium truncate">
                      {selectedItem.name}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-gray-500">Size:</span> {formatFileSize(selectedItem.size)}
                    </div>
                    <div>
                      <span className="text-gray-500">Modified:</span> {formatDate(new Date(selectedItem.modified))}
                    </div>
                    {selectedItem.extension && (
                      <div>
                        <span className="text-gray-500">Type:</span> {selectedItem.extension.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>

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