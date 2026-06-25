'use client';

import React, { useState, useEffect } from 'react';

export default function MeadControl({ currentPath, selectedItemPath, selectedItemIsFile }) {
  const [selectedFileType, setSelectedFileType] = useState('xlsx');
  const [selectedAction, setSelectedAction] = useState('create new folder');
  const [selectedIncrement, setSelectedIncrement] = useState('2');
  const [customIncrement, setCustomIncrement] = useState('');
  const [meadCraterNumber, setMeadCraterNumber] = useState('0');
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedHousing, setSelectedHousing] = useState('create in end-selected folder');
  const [selectedRawFileSource, setSelectedRawFileSource] = useState('use blank file from scratch');
  const [filenameInput, setFilenameInput] = useState('');
  const [selectedSiloConstrained, setSelectedSiloConstrained] = useState('pallet');
  const [showDefaultAppsPopup, setShowDefaultAppsPopup] = useState(false);
  const [showMeadTooltip, setShowMeadTooltip] = useState(false);
  
  const [defaultApps, setDefaultApps] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('filegun-default-apps');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('Error parsing saved default apps:', error);
        }
      }
    }
    
    return {
      none: '',
      xlsx: 'Microsoft Excel',
      xls: 'Microsoft Excel',
      csv: 'Microsoft Excel',
      ts: 'Visual Studio Code',
      tsx: 'Visual Studio Code',
      txt: 'TextEdit',
      html: 'Google Chrome',
      php: 'Visual Studio Code',
      docx: 'Microsoft Word',
      pdf: 'Preview',
      jpg: 'Preview',
      png: 'Preview',
      gif: 'Preview',
      mp4: 'QuickTime Player',
      mp3: 'Music',
      zip: 'Archive Utility',
      json: 'Visual Studio Code',
      xml: 'Visual Studio Code',
      css: 'Visual Studio Code',
      js: 'Visual Studio Code',
      py: 'Python IDLE',
      java: 'IntelliJ IDEA',
      cpp: 'Visual Studio Code',
      md: 'Visual Studio Code'
    };
  });

  // Calculate MeadCraterNumber based on current folder's numbered subfolders + increment
  const calculateMeadCraterNumber = async (targetPath) => {
    try {
      console.log('Calculating MeadCraterNumber for path:', targetPath);
      
      // In Electron, we'll simulate this or use the file system API
      if (window.electronAPI && window.electronAPI.getDirectoryContents) {
        const result = await window.electronAPI.getDirectoryContents(targetPath);
        
        if (result.success && result.items) {
          // Filter for folders only and those that begin with numbers
          const numberedFolders = result.items
            .filter(item => item.isDirectory)
            .map(folder => {
              const match = folder.name.match(/^(\d+)/);
              return match ? parseInt(match[1], 10) : null;
            })
            .filter(num => num !== null);

          console.log('Found numbered folders:', numberedFolders);
          
          // Find the highest number, default to 0 if no numbered folders
          const highestNumber = numberedFolders.length > 0 ? Math.max(...numberedFolders) : 0;
          
          // Get increment value
          const incrementValue = selectedIncrement === 'Custom' 
            ? parseInt(customIncrement || '0', 10) 
            : parseInt(selectedIncrement, 10);

          // Calculate final MeadCraterNumber
          const meadNumber = highestNumber + incrementValue;
          console.log('MeadCraterNumber calculated:', meadNumber);
          setMeadCraterNumber(meadNumber.toString());
        }
      } else {
        // Fallback: just use increment
        const incrementValue = selectedIncrement === 'Custom' 
          ? parseInt(customIncrement || '0', 10) 
          : parseInt(selectedIncrement, 10);
        setMeadCraterNumber(incrementValue.toString());
      }
    } catch (error) {
      console.error('Error calculating MeadCraterNumber:', error);
      const incrementValue = selectedIncrement === 'Custom' 
        ? parseInt(customIncrement || '0', 10) 
        : parseInt(selectedIncrement, 10);
      setMeadCraterNumber(incrementValue.toString());
    }
  };

  // Recalculate MeadCraterNumber when relevant values change
  useEffect(() => {
    let targetPath = currentPath;
    
    if (selectedHousing === 'create in end-selected folder' && selectedItemPath) {
      if (selectedItemIsFile) {
        // If file is selected, use its parent directory
        const lastSlash = selectedItemPath.lastIndexOf('/');
        targetPath = lastSlash > 0 ? selectedItemPath.substring(0, lastSlash) : '/';
      } else {
        // If folder is selected, use the folder itself
        targetPath = selectedItemPath;
      }
    }
    
    if (targetPath) {
      calculateMeadCraterNumber(targetPath);
    }
  }, [currentPath, selectedIncrement, customIncrement, selectedItemPath, selectedItemIsFile, selectedHousing]);

  // Execute mead function based on button clicked
  const executeMeadFunction = async (action) => {
    try {
      const incrementValue = selectedIncrement === 'Custom' 
        ? parseInt(customIncrement || '0', 10) 
        : parseInt(selectedIncrement, 10);
      
      const config = {
        action,
        fileType: selectedFileType,
        filename: filenameInput.trim() || 'untitled project',
        increment: incrementValue,
        housingStrategy: selectedHousing,
        currentPath: currentPath,
        meadCraterNumber: parseInt(meadCraterNumber, 10),
        rawFileSource: selectedRawFileSource
      };
      
      console.log('Executing mead function:', config);
      
      // Determine target path based on housing strategy
      let targetPath = currentPath;
      if (selectedHousing === 'create in end-selected folder' && selectedItemPath) {
        if (selectedItemIsFile) {
          const lastSlash = selectedItemPath.lastIndexOf('/');
          targetPath = lastSlash > 0 ? selectedItemPath.substring(0, lastSlash) : '/';
        } else {
          targetPath = selectedItemPath;
        }
      }
      
      // Generate full name with crater number
      const baseName = `${config.meadCraterNumber} ${config.filename}`;
      
      if (window.electronAPI) {
        if (action === 'create new folder') {
          // Create folder only
          await window.electronAPI.createFolder(targetPath, baseName);
          alert(`✅ Folder created: ${baseName}`);
          await calculateMeadCraterNumber(currentPath);
        } 
        else if (action === '+ folder and file' || action === '+open') {
          // First create the folder
          await window.electronAPI.createFolder(targetPath, baseName);
          
          // Then create the file inside the folder
          const extension = config.fileType === 'none' ? '' : `.${config.fileType}`;
          const fileName = `${baseName}${extension}`;
          const folderPath = `${targetPath}/${baseName}`;
          
          await window.electronAPI.createFile(`${folderPath}/${fileName}`, '');
          
          alert(`✅ Folder and file created: ${baseName}/${fileName}`);
          
          // If +open action, also open the file
          if (action === '+open' && window.electronAPI.openFile) {
            const filePath = `${folderPath}/${fileName}`;
            await window.electronAPI.openFile(filePath);
            console.log('File opened successfully');
          }
          
          await calculateMeadCraterNumber(currentPath);
        }
      }
    } catch (error) {
      console.error('Mead function error:', error);
      alert(`❌ Mead function failed: ${error.message || 'Unknown error'}`);
    }
  };

  // Save default apps to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('filegun-default-apps', JSON.stringify(defaultApps));
    }
  }, [defaultApps]);

  const meadDescription = "r22 - mead function - create new folder (and sometimes a file) in numbered convention";

  return (
    <div className="border border-black p-1" style={{ fontSize: '15px', padding: '5px' }}>
      <div className="flex items-center">
        <span className="font-bold">.mead-lake</span>
        <div className="relative ml-2">
          <span
            className="inline-flex items-center justify-center w-4 h-4 text-xs bg-gray-300 rounded-full cursor-help"
            onMouseEnter={() => setShowMeadTooltip(true)}
            onMouseLeave={() => setShowMeadTooltip(false)}
          >
            ?
          </span>
          {showMeadTooltip && (
            <div className="absolute left-0 bottom-full mb-2 p-2 bg-black text-white text-xs rounded shadow-lg z-10" style={{ width: '300px' }}>
              <div className="mb-2">{meadDescription}</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(meadDescription);
                  alert('Copied to clipboard!');
                }}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* File Type Selection */}
      <div className="flex items-center mt-2 space-x-4">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-sm">filetype</span>
          <div className="flex items-center">
            {['none', 'xlsx', 'xls', 'csv', 'ts', 'tsx', 'txt', 'html', 'php', 'docx'].map((fileType, index) => (
              <button
                key={fileType}
                onClick={() => setSelectedFileType(fileType)}
                className={`px-2 py-1 text-sm border border-gray-300 hover:bg-gray-100 transition-colors ${
                  index === 0 ? 'rounded-l' : ''
                } ${
                  index === 9 ? 'rounded-r' : ''
                } ${
                  index > 0 ? '-ml-px' : ''
                } ${
                  selectedFileType === fileType ? 'bg-blue-100 border-blue-300' : 'bg-white'
                }`}
              >
                {fileType}
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={() => setShowDefaultAppsPopup(true)}
          className="px-3 py-1 text-sm bg-gray-300 hover:bg-gray-400 border border-gray-500 rounded transition-colors"
        >
          default apps
        </button>
        
        {/* Action Buttons */}
        <div className="flex items-center">
          {['create new folder', '+ folder and file', '+open'].map((action, index) => (
            <button
              key={action}
              onClick={() => executeMeadFunction(action)}
              className={`px-2 py-1 text-sm border border-gray-400 transition-colors ${
                index === 0 ? 'rounded-l' : ''
              } ${
                index === 2 ? 'rounded-r' : ''
              } ${
                index > 0 ? '-ml-px' : ''
              }`}
              style={{ 
                backgroundColor: '#ecc9f6',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b4efe3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ecc9f6';
              }}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Housing and Filename Input */}
      <div className="mt-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm">housing</span>
            <select
              value={selectedHousing}
              onChange={(e) => setSelectedHousing(e.target.value)}
              className="border border-gray-300 px-2 py-1 text-sm rounded bg-white hover:bg-gray-50"
            >
              <option value="create in end-selected folder">create in end-selected folder</option>
              <option value="create in cauldron vat paradigm" disabled className="text-gray-400">create in cauldron vat paradigm</option>
              <option value="create in selected column">create in selected column</option>
              <option value="create in selected column's active folder">create in selected column's active folder</option>
            </select>
          </div>
          
          {/* Crater Number + Filename Input */}
          <div className="relative">
            <div className="flex items-center">
              <div
                className="border border-gray-300 px-2 py-1 text-sm rounded-l bg-gray-100 cursor-pointer flex items-center justify-center"
                style={{ width: '80px' }}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => navigator.clipboard.writeText(meadCraterNumber)}
                title="MeadCraterNumber - Click to copy"
              >
                <span className="text-center">{meadCraterNumber}</span>
              </div>
              <input
                type="text"
                value={filenameInput}
                onChange={(e) => setFilenameInput(e.target.value)}
                placeholder="Enter filename here... 'top lettuce brands'"
                className="border border-gray-300 px-3 py-1 text-sm rounded-r -ml-px bg-white"
                style={{ width: '420px' }}
              />
            </div>
            {showTooltip && (
              <div className="absolute bottom-full left-0 mb-1 px-2 py-1 text-xs bg-black text-white rounded whitespace-nowrap z-10">
                MeadCraterNumber - Click to copy
              </div>
            )}
          </div>
        </div>

        {/* Labels */}
        <div className="flex mt-1 space-x-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-transparent">housing</span>
            <div className="text-transparent text-sm">placeholder</div>
          </div>
          <div>
            <div className="flex">
              <div style={{ width: '80px' }} className="text-center">
                <span className="font-bold text-sm">crater</span>
              </div>
              <div style={{ width: '420px' }} className="pl-3">
                <span className="font-bold text-sm">fitem_name_core</span>
              </div>
            </div>
          </div>
          
          {/* Increment Selection */}
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm">increment</span>
            <div className="flex items-center">
              {['1', '2', '5', '10', 'Custom'].map((increment, index) => (
                <button
                  key={increment}
                  onClick={() => setSelectedIncrement(increment)}
                  className={`px-2 py-1 text-sm border border-gray-300 hover:bg-gray-100 transition-colors ${
                    index === 0 ? 'rounded-l' : ''
                  } ${
                    index === 4 && selectedIncrement !== 'Custom' ? 'rounded-r' : ''
                  } ${
                    index > 0 ? '-ml-px' : ''
                  } ${
                    selectedIncrement === increment ? 'bg-blue-100 border-blue-300' : 'bg-white'
                  }`}
                >
                  {increment}
                </button>
              ))}
              {selectedIncrement === 'Custom' && (
                <input
                  type="number"
                  min="0"
                  value={customIncrement}
                  onChange={(e) => setCustomIncrement(e.target.value)}
                  placeholder="0"
                  className="border border-gray-300 hover:bg-gray-100 px-2 py-1 text-sm rounded-r w-16 -ml-px"
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Raw File Source and Silo Constrained */}
        <div className="flex items-center space-x-4 mt-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm">raw file source</span>
            <select
              value={selectedRawFileSource}
              onChange={(e) => setSelectedRawFileSource(e.target.value)}
              className="border border-gray-300 px-2 py-1 text-sm rounded bg-white hover:bg-gray-50"
            >
              <option value="use blank file from scratch">use blank file from scratch</option>
              <option value="use template files from(need more build here)" disabled className="text-gray-400">use template files from(need more build here)</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm">silo-constrained</span>
            <select
              value={selectedSiloConstrained}
              onChange={(e) => setSelectedSiloConstrained(e.target.value)}
              className="border border-gray-300 px-2 py-1 text-sm rounded bg-white hover:bg-gray-50"
            >
              <option value="supra2pallet">supra2pallet</option>
              <option value="supra1pallet">supra1pallet</option>
              <option value="pallet">pallet</option>
              <option value="barrel">barrel</option>
              <option value="cauldron">cauldron</option>
              <option value="vat">vat</option>
              <option value="wok">wok</option>
              <option value="sub1wok">sub1wok</option>
              <option value="sub2wok">sub2wok</option>
              <option value="sub3wok">sub3wok</option>
              <option value="sub4wok">sub4wok</option>
              <option value="sub5wok">sub5wok</option>
              <option value="sub6wok">sub6wok</option>
              <option value="sub7wok">sub7wok</option>
            </select>
          </div>
        </div>
      </div>

      {/* Default Apps Popup */}
      {showDefaultAppsPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Default Applications</h3>
              <button
                onClick={() => setShowDefaultAppsPopup(false)}
                className="w-6 h-6 bg-gray-300 hover:bg-gray-400 rounded flex items-center justify-center text-sm font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              {Object.entries(defaultApps).map(([fileType, app]) => (
                <div key={fileType} className="flex items-center space-x-3">
                  <div className="w-16 text-sm font-medium text-right">
                    {fileType === 'none' ? 'no ext' : `.${fileType}`}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={app}
                      onChange={(e) => setDefaultApps(prev => ({
                        ...prev,
                        [fileType]: e.target.value
                      }))}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Enter application name..."
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  // Reset to defaults
                  setDefaultApps({
                    none: '',
                    xlsx: 'Microsoft Excel',
                    xls: 'Microsoft Excel',
                    csv: 'Microsoft Excel',
                    ts: 'Visual Studio Code',
                    tsx: 'Visual Studio Code',
                    txt: 'TextEdit',
                    html: 'Google Chrome',
                    php: 'Visual Studio Code',
                    docx: 'Microsoft Word'
                  });
                }}
                className="px-4 py-1 text-sm bg-gray-300 hover:bg-gray-400 rounded"
              >
                Reset to Defaults
              </button>
              <button
                onClick={() => setShowDefaultAppsPopup(false)}
                className="px-4 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}