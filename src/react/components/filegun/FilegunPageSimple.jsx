'use client';

import { useEffect, useState } from 'react';
import { useAuth, useRouter } from '../../adapters/electronAdapter';

export default function FilegunPageSimple() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState('/');
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath]);

  const loadDirectory = async (path) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getDirectoryContents(path);
      if (result.success) {
        setItems(result.items || []);
      }
    } catch (error) {
      console.error('Error loading directory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item) => {
    if (item.isDirectory) {
      setCurrentPath(item.path);
    } else {
      setSelectedItem(item);
      window.electronAPI.openFile(item.path);
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt('Enter folder name:');
    if (name) {
      await window.electronAPI.createFolder(currentPath, name);
      loadDirectory(currentPath);
    }
  };

  const handleDelete = async () => {
    if (selectedItem && confirm(`Delete ${selectedItem.name}?`)) {
      await window.electronAPI.deleteFile(selectedItem.path);
      setSelectedItem(null);
      loadDirectory(currentPath);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">Filegun</h1>
            <span className="text-sm text-gray-500">Path: {currentPath}</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCreateFolder}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              New Folder
            </button>
            <button
              onClick={handleDelete}
              disabled={!selectedItem}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item, index) => (
              <div
                key={index}
                onClick={() => handleItemClick(item)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedItem?.path === item.path
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">
                    {item.isDirectory ? '📁' : '📄'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.isDirectory ? 'Folder' : `${item.size || 0} bytes`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}