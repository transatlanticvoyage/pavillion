import React, { useEffect, useState } from 'react';
import FilegunExplorer from './FilegunExplorer';
import FilegunColumnView from './FilegunColumnView';
import FilegunToolbar from './FilegunToolbar';
import FilegunStatusBar from './FilegunStatusBar';
import SentinelControl from './SentinelControl';
import SentinelStatus from './SentinelStatus';
import MeadControl from './MeadControl';
import { useFilegunDirectory } from './hooks/useFilegunDirectory';
import { useFilegunOperations } from './hooks/useFilegunOperations';
import MenjariButtonBarFileGunLinks from '../MenjariButtonBarFileGunLinks';
import FilegunFoldersTable from '../shared/FilegunFoldersTable';

export default function FilegunPageElectron() {
  const [viewMode, setViewMode] = useState('column'); // Default to column view
  const [toolbarKey, setToolbarKey] = useState(0); // Force toolbar refresh
  const [selectedItemPath, setSelectedItemPath] = useState(null);
  const [selectedItemIsFile, setSelectedItemIsFile] = useState(false);
  const [selectedItemPaths, setSelectedItemPaths] = useState([]);
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
  
  // Multi-select state
  const [isMultiSelectEnabled, setIsMultiSelectEnabled] = useState(false);
  
  // Turtle bar state
  const [showTurtleBar, setShowTurtleBar] = useState(false);
  const [hasSelectedColumn, setHasSelectedColumn] = useState(false);
  
  const {
    currentPath,
    items,
    isLoading,
    error,
    navigateToPath,
    navigateUp,
    refresh
  } = useFilegunDirectory('/');

  const {
    operations,
    isLoading: isOperationLoading,
    createFolder,
    createFile,
    renameItem,
    deleteItem
  } = useFilegunOperations();

  // Save header visibility state to localStorage and update body class
  useEffect(() => {
    localStorage.setItem('filegun-header-visible', isHeaderVisible.toString());
    
    // Add/remove class on body to hide main header
    if (isHeaderVisible) {
      document.body.classList.remove('filegun-hide-main-header');
    } else {
      document.body.classList.add('filegun-hide-main-header');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('filegun-hide-main-header');
    };
  }, [isHeaderVisible]);

  const handleCreateFolder = async (name) => {
    await createFolder(currentPath, name);
    refresh();
  };

  const handleCreateFile = async (name) => {
    await createFile(currentPath, name);
    refresh();
  };

  const handleRename = async (oldPath, newName) => {
    await renameItem(oldPath, newName);
    refresh();
  };

  const handleDelete = async (itemPath) => {
    await deleteItem(itemPath);
    refresh();
  };

  const handlePinStatusChange = () => {
    // Force toolbar to refresh by changing its key
    setToolbarKey(prev => prev + 1);
  };

  const handleSelectedItemChange = (selectedPath, isFile) => {
    if (isMultiSelectEnabled && selectedPath) {
      // Multi-select mode: toggle selection
      setSelectedItemPaths(prev => {
        if (prev.includes(selectedPath)) {
          // Item already selected, remove it
          return prev.filter(path => path !== selectedPath);
        } else {
          // Item not selected, add it
          return [...prev, selectedPath];
        }
      });
      // Keep the single selection for compatibility
      setSelectedItemPath(selectedPath);
      setSelectedItemIsFile(isFile);
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setIsHeaderVisible(!isHeaderVisible)}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors mr-4"
            >
              {isHeaderVisible ? 'Hide Page Header' : 'Show Page Header'}
            </button>
            <h1 className="text-2xl font-bold text-gray-800">
              <span style={{ color: '#650d0d' }}>🔫</span> Filegun
            </h1>
            <span className="font-bold text-sm ml-6">chamber controlyar buttons</span>
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => toggleChamber('toolbar24')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  chambersVisible.toolbar24 ? 'bg-blue-200 hover:bg-blue-300' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                toolbar24
              </button>
              <button
                onClick={() => toggleChamber('toolbar25')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  chambersVisible.toolbar25 ? 'bg-blue-200 hover:bg-blue-300' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                toolbar25
              </button>
              <button
                onClick={() => toggleChamber('sentinelLake')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  chambersVisible.sentinelLake ? 'bg-blue-200 hover:bg-blue-300' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                sentinel-lake
              </button>
              <button
                onClick={() => toggleChamber('meadLake')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  chambersVisible.meadLake ? 'bg-blue-200 hover:bg-blue-300' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                mead-lake
              </button>
              <button
                onClick={() => toggleChamber('hemlockViewerPane')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  chambersVisible.hemlockViewerPane ? 'bg-blue-200 hover:bg-blue-300' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                hemlock_viewer_pane
              </button>
              <button
                onClick={() => toggleChamber('ravineEditor')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  chambersVisible.ravineEditor ? 'bg-blue-200 hover:bg-blue-300' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                ravine_editor (popup)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar24 */}
      {chambersVisible.toolbar24 && (
        <div className="bg-white border-b px-4 py-3 toolbar24">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="font-bold text-sm">toolbar24</span>
            </div>
            <div className="flex items-center space-x-6">
              <MenjariButtonBarFileGunLinks />
              <SentinelStatus />
              <div className="text-right">
                <div className="text-sm text-gray-500">Environment: Pavillion Desktop</div>
                <div className="text-xs text-gray-400">Project: Tregnar</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {chambersVisible.toolbar25 && (
        <div className="toolbar25">
          <FilegunToolbar
            key={toolbarKey}
            currentPath={currentPath}
            onNavigateUp={navigateUp}
            onRefresh={refresh}
            onCreateFolder={handleCreateFolder}
            onCreateFile={handleCreateFile}
            canNavigateUp={currentPath !== '/'}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onNavigateToPath={navigateToPath}
            onPinStatusChange={handlePinStatusChange}
          />
        </div>
      )}

      {/* Sentinel Control Panel */}
      {chambersVisible.sentinelLake && (
        <div className="px-6 sentinel-lake">
          <SentinelControl />
        </div>
      )}

      {/* Mead Control Panel */}
      {chambersVisible.meadLake && (
        <div className="px-6 mead-lake">
          <MeadControl 
            currentPath={currentPath} 
            selectedItemPath={selectedItemPath}
            selectedItemIsFile={selectedItemIsFile}
          />
        </div>
      )}

      {/* Main Content */}
      {chambersVisible.hemlockViewerPane && (
        <div className="overflow-hidden hemlock_viewer_pane border border-black" style={{ height: '80vh' }}>
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-600 mb-2">❌ Error</div>
                <div className="text-gray-600">{error}</div>
                <button
                  onClick={refresh}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="px-6 py-2 flex items-center justify-between">
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
              
              <div className={`flex-1 overflow-hidden flex ${paneLayout === 'vertical-50-50' ? 'flex-col' : 'flex-row'}`}>
                {/* Maple Viewer Pane */}
                <div className={`maple_viewer_pane border border-black overflow-hidden flex flex-col ${
                  paneLayout === 'horizontal-50-50' ? 'w-1/2' :
                  paneLayout === 'horizontal-70-30' ? 'w-[70%]' :
                  'h-1/2'
                }`}>
                  <div className="px-6 py-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm">.maple_viewer_pane</span>
                      <button
                        onClick={() => setShowTurtleBar(!showTurtleBar)}
                        disabled={!hasSelectedColumn}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          !hasSelectedColumn 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : showTurtleBar 
                            ? 'bg-blue-200 hover:bg-blue-300' 
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        {showTurtleBar ? 'hide turtle bar' : 'show turtle bar'}
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setIsMultiSelectEnabled(!isMultiSelectEnabled);
                          // Clear selections when toggling multi-select
                          if (isMultiSelectEnabled) {
                            setSelectedItemPaths([]);
                          }
                        }}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          isMultiSelectEnabled ? 'bg-blue-200 hover:bg-blue-300' : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        {isMultiSelectEnabled ? 'disable multi select' : 'enable multi select'}
                      </button>
                      {isMultiSelectEnabled && selectedItemPaths.length > 0 && (
                        <span className="text-sm text-gray-600">
                          ({selectedItemPaths.length} selected)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Information */}
                  <div className="px-6 py-2 bg-gray-100 border-b text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">
                        {items.length} items
                      </span>
                      <span className="text-gray-500">
                        Path: {currentPath}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {viewMode === 'column' ? (
                      <FilegunColumnView
                        initialPath={currentPath}
                        onRename={handleRename}
                        onDelete={handleDelete}
                        onPinStatusChange={handlePinStatusChange}
                        onSelectedItemChange={handleSelectedItemChange}
                        isMultiSelectEnabled={isMultiSelectEnabled}
                        selectedItemPaths={selectedItemPaths}
                        showTurtleBar={showTurtleBar}
                        onColumnSelectionChange={handleColumnSelectionChange}
                      />
                    ) : (
                      <div className="h-full overflow-auto">
                        <FilegunExplorer
                          items={items}
                          isLoading={isLoading || isOperationLoading}
                          onNavigate={navigateToPath}
                          onRename={handleRename}
                          onDelete={handleDelete}
                          onPinStatusChange={handlePinStatusChange}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Trench Viewer Pane */}
                <div className={`trench_viewer_pane border border-black overflow-hidden ${
                  paneLayout === 'horizontal-50-50' ? 'w-1/2' :
                  paneLayout === 'horizontal-70-30' ? 'w-[30%]' :
                  'h-1/2'
                }`}>
                  <div className="px-6 py-2">
                    <span className="font-bold text-sm">.trench_viewer_pane</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <FilegunFoldersTable config={{
                      showHeader: false,
                      showCreateButtons: false,
                      showNubraKite: true,
                      enableInlineEdit: false,
                      enableRowSelection: false,
                      showPagination: true,
                      showSearch: true,
                      defaultItemsPerPage: 50,
                      filterFolderPaths: selectedItemPaths.length > 0 ? selectedItemPaths : undefined,
                      containerClassName: 'h-full',
                      tableClassName: 'text-xs'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ravine Editor Popup - Right Half Screen */}
      {chambersVisible.ravineEditor && (
        <div className="fixed top-0 right-0 w-1/2 h-full bg-white border-l border-gray-300 shadow-lg z-50 ravine-editor-chamber">
          <div className="p-4">
            <div className="flex items-center mb-4">
              <button
                onClick={() => toggleChamber('ravineEditor')}
                className="w-5 h-5 bg-gray-300 hover:bg-gray-400 border border-gray-400 mr-2 flex items-center justify-center text-xs font-bold"
                title="Close ravine editor"
              >
                ×
              </button>
              <div className="font-bold text-base">ravine-editor-chamber</div>
            </div>
            <div className="text-gray-500">Ravine editor content will be placed here...</div>
          </div>
        </div>
      )}
    </div>
  );
}