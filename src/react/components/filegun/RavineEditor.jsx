import React, { useState, useEffect } from 'react';

export default function RavineEditor({ isOpen, onClose, currentPath }) {
  const [editorContent, setEditorContent] = useState('');
  const [fileName, setFileName] = useState('untitled.txt');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && currentPath) {
      setFileName(currentPath.split('/').pop() || 'untitled.txt');
    }
  }, [isOpen, currentPath]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save file using Electron API
      if (window.electronAPI && currentPath) {
        await window.electronAPI.createFile(currentPath, editorContent);
        console.log('File saved successfully');
      }
    } catch (error) {
      console.error('Error saving file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Editor Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl w-4/5 h-4/5 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold">🏔️ Ravine Editor</span>
            <span className="text-sm text-gray-300">({fileName})</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-100 border-b px-6 py-2 flex items-center space-x-4">
          <button className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50">
            Format
          </button>
          <button className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50">
            Find & Replace
          </button>
          <div className="flex-1"></div>
          <span className="text-xs text-gray-500">
            {editorContent.length} characters | {editorContent.split('\n').length} lines
          </span>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-6 overflow-hidden">
          <textarea
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Start typing..."
            spellCheck={false}
          />
        </div>

        {/* Status Bar */}
        <div className="bg-gray-100 border-t px-6 py-2 rounded-b-lg flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-gray-600">
            <span>UTF-8</span>
            <span>Plain Text</span>
            <span>{currentPath || 'No file'}</span>
          </div>
          <div className="text-xs text-gray-600">
            Line 1, Column 1
          </div>
        </div>
      </div>
    </div>
  );
}