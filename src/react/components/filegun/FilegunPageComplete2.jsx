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
import ChamberControls from './ChamberControls';
import RavineEditor from './RavineEditor';

export default function FilegunPageComplete2() {
  const { user } = useAuth();
  const router = useRouter();
  const [viewMode, setViewMode] = useState('column');
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
  const [paneLayout, setPaneLayout] = useState('horizontal-70-30');
  
  const [isHeaderVisible, setIsHeaderVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('filegun-header-visible');
      return saved === null ? true : saved === 'true';
    }
    return true;
  });
  
  const [chambersVisible, setChambersVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('filegun-chambers-visible');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing saved chambers state:', e);
        }
      }
    }
    return {
      toolbar24: true,
      toolbar25: true,
      sentinelLake: true,
      meadLake: true,
      hemlockViewerPane: true,
      ravineEditor: false
    };
  });

  useEffect(() => {
    const initializePath = async () => {
      const defaultPath = await window.electronAPI.getDownloadsPath();
      setCurrentPath(defaultPath);
      await loadDirectory(defaultPath);
    };
    initializePath();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('filegun-header-visible', isHeaderVisible.toString());
    }
  }, [isHeaderVisible]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('filegun-chambers-visible', JSON.stringify(chambersVisible));
    }
  }, [chambersVisible]);

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
    setOperations(prev => [newOp, ...prev].slice(0, 50));
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
      setSelectedItemPaths(prev => {
        if (prev.includes(selectedPath)) {
          return prev.filter(p => p !== selectedPath);
        }
        return [...prev, selectedPath];
      });
    } else {
      setSelectedItemPaths([]);
      setSelectedItemPath(selectedPath);
      setSelectedItemIsFile(isFile);
    }
  };

  const handleColumnSelectionChange = (hasSelection) => {
    setHasSelectedColumn(hasSelection);
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
    <div className="flex flex-col h-screen bg-white">
      {/* Chamber Controls - Always visible at top */}
      <ChamberControls 
        chambersVisible={chambersVisible}
        onToggleChamber={toggleChamber}
      />

      {/* Header with Menjari Button Bar */}
      {isHeaderVisible && (
        <div className="bg-white border-b">
          <div className="flex items-center justify-between px-4 py-2">
            <MenjariButtonBarFileGunLinks />
            <button
              onClick={() => setIsHeaderVisible(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              ▲ Hide
            </button>
          </div>
        </div>
      )}

      {!isHeaderVisible && (
        <div className="bg-gray-100 border-b px-4 py-1">
          <button
            onClick={() => setIsHeaderVisible(true)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            ▼ Show Header
          </button>
        </div>
      )}

      {/* Toolbar24 */}
      {chambersVisible.toolbar24 && (
        <div className="bg-gray-50 border-b px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-xs font-semibold text-gray-600">TOOLBAR24</span>
              <SentinelStatus />
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>Environment: Development</span>
              <span>•</span>
              <span>Project: Pavilion</span>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar25 */}
      {chambersVisible.toolbar25 && (
        <div className="toolbar25">
          <div className="flex items-center justify-between">
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
            <button
              onClick={() => toggleChamber('ravineEditor')}
              className="mx-4 px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 flex items-center space-x-1"
              title="Open Ravine Editor"
            >
              <span>🏔️</span>
              <span>Editor</span>
            </button>
          </div>
        </div>
      )}

      {/* Sentinel Control Panel */}
      {chambersVisible.sentinelLake && (
        <div className="px-6 py-4 bg-white">
          <SentinelControl />
        </div>
      )}

      {/* Mead Control Panel */}
      {chambersVisible.meadLake && (
        <div className="px-6 py-4 bg-white">
          <MeadControl 
            currentPath={currentPath}
            selectedItemPath={selectedItemPath}
            selectedItemIsFile={selectedItemIsFile}
          />
        </div>
      )}

      {/* Main Content Area with Hemlock Viewer Pane */}
      {chambersVisible.hemlockViewerPane && (
        <div className="flex-1 overflow-hidden border border-black mx-6 mb-6" style={{ height: '80vh' }}>
          <div className="h-full flex flex-col bg-white">
            {/* Hemlock Header Bar */}
            <div className="px-6 py-2 bg-gray-50 border-b flex items-center justify-between">
              <span className="font-bold text-sm">.hemlock_viewer_pane</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPaneLayout('horizontal-50-50')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    paneLayout === 'horizontal-50-50' ? 'bg-blue-200 hover:bg-blue-300' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  horizontal 50-50
                </button>
                <button
                  onClick={() => setPaneLayout('horizontal-70-30')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    paneLayout === 'horizontal-70-30' ? 'bg-blue-200 hover:bg-blue-300' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  horizontal 70-30
                </button>
                <button
                  onClick={() => setPaneLayout('vertical-50-50')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    paneLayout === 'vertical-50-50' ? 'bg-blue-200 hover:bg-blue-300' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  vertical 50-50
                </button>
              </div>
            </div>

            {/* Content Area with Panes */}
            <div className={`flex-1 flex ${paneLayout === 'vertical-50-50' ? 'flex-col' : 'flex-row'} overflow-hidden`}>
              {/* Left Pane - Maple Viewer */}
              <div className={`${
                paneLayout === 'horizontal-70-30' ? 'w-[70%]' : 
                paneLayout === 'horizontal-50-50' ? 'w-1/2' : 
                paneLayout === 'vertical-50-50' ? 'h-1/2 w-full' : ''
              } flex flex-col border-r border-gray-300 bg-white`}>
                
                <div className="px-6 py-2 bg-gray-100 border-b flex items-center justify-between">
                  <span className="font-bold text-sm">.maple_viewer</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsMultiSelectEnabled(!isMultiSelectEnabled)}
                      className={`px-2 py-1 text-xs rounded ${
                        isMultiSelectEnabled ? 'bg-blue-500 text-white' : 'bg-gray-300'
                      }`}
                    >
                      Multi-Select {isMultiSelectEnabled ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => setShowTurtleBar(!showTurtleBar)}
                      className={`px-2 py-1 text-xs rounded ${
                        showTurtleBar ? 'bg-green-500 text-white' : 'bg-gray-300'
                      }`}
                      disabled={!hasSelectedColumn}
                    >
                      🐢 Turtle Bar
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
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
              </div>

              {/* Right Pane - Trench Viewer */}
              <div className={`${
                paneLayout === 'horizontal-70-30' ? 'w-[30%]' : 
                paneLayout === 'horizontal-50-50' ? 'w-1/2' : 
                paneLayout === 'vertical-50-50' ? 'h-1/2 w-full' : ''
              } flex flex-col bg-gray-50`}>
                
                <div className="px-6 py-2 bg-gray-100 border-b">
                  <span className="font-bold text-sm">.trench_viewer</span>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  <div className="bg-white rounded border p-4 mb-4">
                    <h3 className="text-sm font-semibold mb-3">Database Records</h3>
                    <FilegunFoldersTable />
                  </div>

                  {selectedItemPath && (
                    <div className="bg-white rounded border p-4">
                      <h4 className="text-sm font-semibold mb-2">Selected Item</h4>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Path:</span>
                          <span className="font-mono truncate ml-2">{selectedItemPath}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span>{selectedItemIsFile ? 'File' : 'Folder'}</span>
                        </div>
                        {isMultiSelectEnabled && selectedItemPaths.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Selected:</span>
                            <span>{selectedItemPaths.length} items</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <FilegunStatusBar
        operations={operations}
        currentPath={currentPath}
        itemCount={items.length}
      />

      {/* Ravine Editor Popup */}
      <RavineEditor
        isOpen={chambersVisible.ravineEditor}
        onClose={() => toggleChamber('ravineEditor')}
        currentPath={currentPath}
      />
    </div>
  );
}