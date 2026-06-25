// File utility functions for Filegun

export function getFileIcon(filename, isFolder) {
  if (isFolder) return '📁';
  
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const iconMap = {
    // Documents
    'txt': '📄',
    'doc': '📝',
    'docx': '📝',
    'pdf': '📕',
    'xls': '📊',
    'xlsx': '📊',
    'ppt': '📊',
    'pptx': '📊',
    
    // Images
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'png': '🖼️',
    'gif': '🖼️',
    'svg': '🖼️',
    'webp': '🖼️',
    
    // Code
    'js': '📜',
    'jsx': '⚛️',
    'ts': '📘',
    'tsx': '⚛️',
    'html': '🌐',
    'css': '🎨',
    'json': '📋',
    'py': '🐍',
    'java': '☕',
    'cpp': '⚙️',
    'c': '⚙️',
    'go': '🐹',
    'rs': '🦀',
    
    // Media
    'mp3': '🎵',
    'wav': '🎵',
    'mp4': '🎬',
    'avi': '🎬',
    'mov': '🎬',
    'mkv': '🎬',
    
    // Archives
    'zip': '📦',
    'rar': '📦',
    'tar': '📦',
    'gz': '📦',
    '7z': '📦',
    
    // Other
    'exe': '⚡',
    'app': '📱',
    'dmg': '💿',
    'iso': '💿',
  };
  
  return iconMap[extension] || '📄';
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

export function formatDate(date) {
  if (!date || !(date instanceof Date)) return 'Unknown';
  
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 7) {
    return date.toLocaleDateString();
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}