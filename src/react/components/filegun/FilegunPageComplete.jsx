'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, useRouter } from '../../adapters/electronAdapter';
import FilegunExplorer from './FilegunExplorer';
import FilegunColumnView from './FilegunColumnView';
import FilegunToolbar from './FilegunToolbar';
import FilegunStatusBar from './FilegunStatusBar';
import SentinelControl from './SentinelControl';
import SentinelStatus from './SentinelStatus';
import MeadControl from './MeadControl';
import MenjariButtonBarFileGunLinks from '../MenjariButtonBarFileGunLinks';
import FilegunFoldersTable from '../shared/FilegunFoldersTable';

export default function FilegunPageComplete() {
  const { user } = useAuth();
  const router = useRouter();
  const [viewMode, setViewMode] = useState('column'); // Default to column view
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [operations, setOperations] = useState([]);
  const [selectedItemPath, setSelectedItemPath] = useState(null);
  const [selectedItemIsFile, setSelectedItemIsFile] = useState(false);
  const [selectedItemPaths, setSelectedItemPaths] = useState([]);
  const [isMultiSelectEnabled, setIsMultiSelectEnabled] = useState(false);
  const [hasSelectedColumn, setHasSelectedColumn] = useState(false);
  const [showTurtleBar, setShowTurtleBar] = useState(false);
  
  const [isHeaderVisible, setIsHeaderVisible] = useState(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('filegun-header-visible');
      return saved === null ? true : saved === 'true';
    }
    return true;
  });
  
  // Chamber visibility states
  const [chambersVisible, setChambersVisible] = useState({
    toolbar24: true,
    toolbar25: true,
    sentinelLake: true,
    meadLake: true,
    hemlockViewerPane: true,
    ravineEditor: false
  });
  
  // Layout mode for maple/trench panes
  const [paneLayout, setPaneLayout] = useState('horizontal-70-30');

  // Initialize with default path
  useEffect(() => {
    const initializePath = async () => {
      const defaultPath = await window.electronAPI.getDownloadsPath();
      setCurrentPath(defaultPath);
      await loadDirectory(defaultPath);
    };
    initializePath();
  }, []);

  // Save header visibility to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('filegun-header-visible', isHeaderVisible.toString());
    }
  }, [isHeaderVisible]);

  const loadDirectory = async (path) => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.getDirectoryContents(path);
      if (result.success) {
        const formattedItems = (result.items || []).map(item => ({
          path: item.path,
          name: item.name,
          type: item.isDirectory ? 'folder' : 'file',
          size: item.size || 0,
          modified: item.modifiedAt || new Date().toISOString(),
          extension: item.isDirectory ? null : item.name.split('.').pop()?.toLowerCase(),
          isHidden: item.name.startsWith('.')
        }));
        setItems(formattedItems);
        setCurrentPath(path);
      }
    } catch (error) {
      console.error('Error loading directory:', error);
      addOperation('load', 'error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addOperation = (action, status, error = null) => {
    const newOp = {
      id: Date.now(),
      action,
      status,
      error,
      timestamp: new Date()
    };
    setOperations(prev => [newOp, ...prev].slice(0, 50)); // Keep last 50 operations
  };

  const handleNavigateUp = async () => {
    const separator = currentPath.includes('\\') ? '\\' : '/';
    const parentPath = currentPath.split(separator).slice(0, -1).join(separator) || '/';
    if (parentPath !== currentPath) {
      await loadDirectory(parentPath);
    }
  };

  const handleRefresh = async () => {
    addOperation('refresh', 'pending');
    await loadDirectory(currentPath);
    addOperation('refresh', 'success');
  };

  const handleCreateFolder = async (name) => {
    addOperation('create folder', 'pending');
    try {
      await window.electronAPI.createFolder(currentPath, name);
      await loadDirectory(currentPath);
      addOperation('create folder', 'success');
    } catch (error) {
      addOperation('create folder', 'error', error.message);
      throw error;
    }
  };

  const handleCreateFile = async (name) => {
    addOperation('create file', 'pending');
    try {
      const separator = currentPath.includes('\\') ? '\\' : '/';
      const filePath = currentPath + separator + name;
      await window.electronAPI.createFile(filePath, '');
      await loadDirectory(currentPath);
      addOperation('create file', 'success');
    } catch (error) {
      addOperation('create file', 'error', error.message);
      throw error;
    }
  };

  const handleRename = async (oldPath, newName) => {
    addOperation('rename', 'pending');
    try {
      await window.electronAPI.renameFile(oldPath, newName);
      await loadDirectory(currentPath);
      addOperation('rename', 'success');
    } catch (error) {
      addOperation('rename', 'error', error.message);
      throw error;
    }
  };

  const handleDelete = async (itemPath) => {
    addOperation('delete', 'pending');
    try {
      await window.electronAPI.deleteFile(itemPath);
      await loadDirectory(currentPath);
      addOperation('delete', 'success');
    } catch (error) {
      addOperation('delete', 'error', error.message);
      throw error;
    }
  };

  const handleSelectedItemChange = (selectedPath, isFile) => {
    if (isMultiSelectEnabled) {
      // Multi-select mode: toggle selection
      setSelectedItemPaths(prev => {
        if (prev.includes(selectedPath)) {
          return prev.filter(p => p !== selectedPath);
        }
        return [...prev, selectedPath];
      });
      // In multi-select, we don't update single selection
    } else {
      // Single select mode: clear multi-selection and set single selection
      setSelectedItemPaths([]);
      setSelectedItemPath(selectedPath);
      setSelectedItemIsFile(isFile);
    }
  };

  const handleColumnSelectionChange = (hasSelection) => {
    setHasSelectedColumn(hasSelection);
    // Hide turtle bar if no columns are selected
    if (!hasSelection) {
      setShowTurtleBar(false);
    }
  };

  const toggleChamber = (chamber) => {
    setChambersVisible(prev => ({
      ...prev,
      [chamber]: !prev[chamber]
    }));
  };

  const canNavigateUp = currentPath && currentPath !== '/' && currentPath.length > 3;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Menjari Button Bar - Always visible at top */}
      {isHeaderVisible && (
        <div className="px-4 py-2 bg-white border-b">
          <MenjariButtonBarFileGunLinks />
        </div>
      )}

      {/* Header Toggle Button */}
      <div className="flex justify-between items-center px-4 py-1 bg-gray-100 border-b">
        <button
          onClick={() => setIsHeaderVisible(!isHeaderVisible)}
          className="text-xs text-gray-600 hover:text-gray-900"
        >
          {isHeaderVisible ? '▲ Hide Header' : '▼ Show Header'}
        </button>
        <div className="text-xs text-gray-500">
          Filegun Page - Full Implementation
        </div>
      </div>

      {/* Toolbar 24 */}
      {chambersVisible.toolbar24 && (
        <div className="bg-white border-b px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-sm">toolbar24</span>
              <button
                onClick={() => toggleChamber('toolbar24')}
                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Hide
              </button>
              <button
                onClick={() => setIsMultiSelectEnabled(!isMultiSelectEnabled)}
                className={`px-3 py-1 text-sm rounded ${
                  isMultiSelectEnabled 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {isMultiSelectEnabled ? '☑ Multi-Select ON' : '☐ Multi-Select OFF'}
              </button>
              {isMultiSelectEnabled && selectedItemPaths.length > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedItemPaths.length} items selected
                </span>
              )}
              <button
                onClick={() => setShowTurtleBar(!showTurtleBar)}
                className={`px-3 py-1 text-sm rounded ${
                  showTurtleBar 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
                disabled={!hasSelectedColumn}
              >
                🐢 {showTurtleBar ? 'Hide' : 'Show'} Turtle Bar
              </button>
              <div className="text-sm text-gray-500">Environment: Development Only</div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setPaneLayout('horizontal-70-30')}
                className={`px-2 py-1 text-xs rounded ${
                  paneLayout === 'horizontal-70-30' ? 'bg-blue-500 text-white' : 'bg-gray-300'
                }`}
              >
                70/30
              </button>
              <button
                onClick={() => setPaneLayout('horizontal-50-50')}
                className={`px-2 py-1 text-xs rounded ${
                  paneLayout === 'horizontal-50-50' ? 'bg-blue-500 text-white' : 'bg-gray-300'
                }`}
              >
                50/50
              </button>
              <button
                onClick={() => setPaneLayout('vertical-50-50')}
                className={`px-2 py-1 text-xs rounded ${
                  paneLayout === 'vertical-50-50' ? 'bg-blue-500 text-white' : 'bg-gray-300'
                }`}
              >
                Vertical
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar 25 (Main Toolbar) */}
      {chambersVisible.toolbar25 && (
        <FilegunToolbar
          currentPath={currentPath}
          onNavigateUp={handleNavigateUp}
          onRefresh={handleRefresh}
          onCreateFolder={handleCreateFolder}
          onCreateFile={handleCreateFile}
          canNavigateUp={canNavigateUp}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNavigateToPath={loadDirectory}
        />
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex ${
        paneLayout === 'vertical-50-50' ? 'flex-col' : 'flex-row'
      } overflow-hidden`}>
        {/* Left Panel - Maple Viewer */}
        <div className={`${
          paneLayout === 'horizontal-70-30' ? 'w-[70%]' : 
          paneLayout === 'horizontal-50-50' ? 'w-1/2' :
          'h-1/2'
        } flex flex-col border-r border-gray-300`}>
          
          {/* Sentinel Lake */}
          {chambersVisible.sentinelLake && (
            <div className="p-4 bg-white border-b">
              <SentinelControl />
            </div>
          )}

          {/* Mead Lake */}
          {chambersVisible.meadLake && (
            <div className="p-4 bg-white border-b">
              <MeadControl />
            </div>
          )}

          {/* Hemlock Viewer Pane - File Browser */}
          {chambersVisible.hemlockViewerPane && (
            <div className="flex-1 bg-white overflow-hidden">
              <div className="bg-gray-100 border-b px-3 py-2">
                <span className="font-bold text-sm">hemlock_viewer_pane</span>
              </div>
              {viewMode === 'column' ? (
                <FilegunColumnView
                  initialPath={currentPath}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onSelectedItemChange={handleSelectedItemChange}
                  isMultiSelectEnabled={isMultiSelectEnabled}
                  selectedItemPaths={selectedItemPaths}
                  showTurtleBar={showTurtleBar}
                  onColumnSelectionChange={handleColumnSelectionChange}
                />
              ) : (
                <FilegunExplorer
                  items={items}
                  isLoading={isLoading}
                  onNavigate={loadDirectory}
                  onRename={handleRename}
                  onDelete={handleDelete}
                />
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Trench Viewer */}
        <div className={`${
          paneLayout === 'horizontal-70-30' ? 'w-[30%]' : 
          paneLayout === 'horizontal-50-50' ? 'w-1/2' :
          'h-1/2'
        } flex flex-col bg-gray-50`}>
          <div className="bg-gray-100 border-b px-3 py-2">
            <span className="font-bold text-sm">trench_viewer</span>
          </div>
          
          {/* Database Table View */}
          <div className="flex-1 overflow-auto p-4">
            <h3 className="text-sm font-semibold mb-3">Database Records</h3>
            <FilegunFoldersTable />
            
            {/* Sentinel Status */}
            <div className="mt-4">
              <SentinelStatus />
            </div>
            
            {/* Selected Item Info */}
            {selectedItemPath && (
              <div className="mt-4 bg-white rounded border p-3">
                <h4 className="text-sm font-semibold mb-2">Selected Item</h4>
                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-gray-600">Path:</span> {selectedItemPath}
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span> {selectedItemIsFile ? 'File' : 'Folder'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <FilegunStatusBar
        operations={operations}
        currentPath={currentPath}
        itemCount={items.length}
      />
    </div>
  );
}