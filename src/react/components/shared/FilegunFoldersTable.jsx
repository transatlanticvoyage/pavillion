'use client';

import React, { useState, useEffect } from 'react';

export default function FilegunFoldersTable() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.dbGetFolders) {
        const result = await window.electronAPI.dbGetFolders({});
        if (result.success) {
          setFolders(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading folders...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="text-left p-1">Name</th>
            <th className="text-left p-1">Path</th>
            <th className="text-left p-1">Pinned</th>
          </tr>
        </thead>
        <tbody>
          {folders.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center p-2 text-gray-500">
                No folders tracked yet
              </td>
            </tr>
          ) : (
            folders.map((folder) => (
              <tr key={folder.folder_id} className="border-b hover:bg-gray-50">
                <td className="p-1">{folder.folder_name || 'Unnamed'}</td>
                <td className="p-1 text-gray-600 truncate max-w-xs" title={folder.folder_path}>
                  {folder.folder_path}
                </td>
                <td className="p-1">
                  {folder.is_pinned ? '📌' : ''}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}