let streamData = {};
let currentStream = null;
let selectedFolder = null;
let finderHistory = [];
let finderHistoryIndex = -1;
let finderColumns = [];
let finderSelectedFiles = new Set();
let finderCurrentPath = '';
let finderSortBy = 'name';
let finderViewMode = 'column';
let finderSearchTerm = '';
let recentPaths = [];
let currentSelectedFolderPath = null;
let clipboardFiles = [];
let clipboardOperation = null;

document.addEventListener('DOMContentLoaded', async () => {
  initializeTabs();
  initializeDropdownMenu();
  initializeColumnWidthControls();
  initializeAddFolderButton();
  initializeDragAndDrop();
  initializeContextMenu();
  initializeFinderContextMenu();
  initializeSiloJContextMenus();
  initializeFinderView();
  initializeStreamManagement();
  initializeFinderResize();
  initializeSiloLResize();
  initializeSiloLStreamSelect();
  initializeClipboardOperations();
  initializeRefreshHandler();
  initializeJupiterFileHandler();
  initializeGazeboStreamHandler();
  initializeMeridianBoard();
  initializePasteButtons();
  await initializeCloudStorage();
  await loadElevatedFolders();
  await loadBasinFolders();
  await loadConfiguration();
  
  // Check for Gazebo file selection on startup
  checkForGazeboFileSelection();
  initializePistolPopup();
  
  // Initialize Jupiter action buttons
  initializeJupiterActions();
});

// Update the active drum indicator
function updateActiveDrumIndicator(drumNumber) {
  const indicatorText = document.getElementById('active-drum-text');
  if (!indicatorText) return;
  
  switch(drumNumber) {
    case 1:
      indicatorText.textContent = 'drum 1 - silo j';
      break;
    case 2:
      indicatorText.textContent = 'drum 2 - silo l - designated items';
      break;
    case 3:
      indicatorText.textContent = 'drum 3 - left of silo m - main viewer pane';
      break;
    default:
      indicatorText.textContent = 'none selected';
  }
}

// Simple function to get the target folder for paste operations
function getTargetPasteFolder() {
  // Just use the current finder path - simple and straightforward
  if (finderCurrentPath) {
    console.log(`Pasting to current folder: ${finderCurrentPath}`);
    return finderCurrentPath;
  }
  
  console.log('No current folder available for paste');
  return null;
}

function initializeDropdownMenu() {
  const dropdownToggle = document.getElementById('more-dropdown');
  const dropdownMenu = document.getElementById('more-menu');
  
  if (!dropdownToggle || !dropdownMenu) return;
  
  // Toggle dropdown on click
  dropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove('show');
    }
  });
  
  // Handle dropdown item clicks
  const dropdownItems = dropdownMenu.querySelectorAll('.dropdown-item');
  dropdownItems.forEach(item => {
    item.addEventListener('click', () => {
      // Close the dropdown after selection
      dropdownMenu.classList.remove('show');
      // The regular tab click handler will handle the rest
    });
  });
}

function initializeColumnWidthControls() {
  const columnWidthControls = document.getElementById('column-width-controls');
  let currentColumnWidth = 300; // Default width
  
  // Handle column width button clicks
  const widthButtons = columnWidthControls.querySelectorAll('.width-button:not(.width-label)');
  widthButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      widthButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      button.classList.add('active');
      
      // Get the width value
      const width = button.dataset.width;
      
      if (width === 'auto') {
        // Set columns to auto width (100%)
        currentColumnWidth = 'auto';
        updateFinderColumnWidths('auto');
      } else {
        // Set fixed pixel width
        currentColumnWidth = parseInt(width);
        updateFinderColumnWidths(currentColumnWidth);
      }
    });
  });
}

function updateFinderColumnWidths(width) {
  const finderColumns = document.getElementById('finder-columns');
  if (!finderColumns) return;
  
  const columns = finderColumns.querySelectorAll('.finder-column');
  columns.forEach(column => {
    if (width === 'auto') {
      // Auto width - fit content
      column.style.width = 'auto';
      column.style.minWidth = '200px';
      column.style.maxWidth = 'none';
    } else {
      // Fixed pixel width
      column.style.width = width + 'px';
      column.style.minWidth = width + 'px';
      column.style.maxWidth = width + 'px';
    }
  });
}

function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    // Skip the dropdown toggle button
    if (button.id === 'more-dropdown') return;
    
    button.addEventListener('click', async () => {
      const groupId = button.dataset.group;
      
      // If no groupId, skip (for dropdown toggle)
      if (!groupId) return;
      
      // Remove active from all buttons including dropdown items
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.dropdown-item').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      document.querySelectorAll('.stream-group').forEach(group => {
        group.classList.remove('active');
      });
      document.getElementById(`group-${groupId}`).classList.add('active');
      
      const addFolderBtn = document.getElementById('add-folder-btn');
      const streamManagement = document.getElementById('stream-management');
      const columnWidthControls = document.getElementById('column-width-controls');
      
      if (groupId === 'finder') {
        addFolderBtn.style.display = 'none';
        streamManagement.style.display = 'flex';
        columnWidthControls.style.display = 'flex'; // Show column width controls for Floodtrain View
        if (finderColumns.length === 0) {
          const downloadsPath = await window.electronAPI.getDownloadsPath();
          navigateToFolder(downloadsPath);
        }
      } else if (groupId === 'jupiter') {
        addFolderBtn.style.display = 'none';
        streamManagement.style.display = 'none';
        columnWidthControls.style.display = 'none'; // Hide for other views
      } else if (groupId === 'filegun' || groupId === 'folderjar' || groupId === 'fobjectjar') {
        addFolderBtn.style.display = 'none';
        streamManagement.style.display = 'none';
        columnWidthControls.style.display = 'none'; // Hide for other views
        // Initialize the page if it's the first time
        if (groupId === 'filegun' && !window.filegunInitialized) {
          initializeFilegun();
          window.filegunInitialized = true;
        } else if (groupId === 'folderjar' && !window.folderjarInitialized) {
          initializeFolderJar();
          window.folderjarInitialized = true;
        } else if (groupId === 'fobjectjar' && !window.fobjectjarInitialized) {
          initializeFobjectJar();
          window.fobjectjarInitialized = true;
        }
      } else {
        addFolderBtn.style.display = 'block';
        streamManagement.style.display = 'none';
        columnWidthControls.style.display = 'none'; // Hide for other views
      }
    });
  });
}

function initializeAddFolderButton() {
  const addFolderBtn = document.getElementById('add-folder-btn');
  addFolderBtn.addEventListener('click', async () => {
    const folders = await window.electronAPI.selectFolder();
    if (folders) {
      const activeStream = getActiveStream();
      if (activeStream) {
        let hasNewItems = false;
        folders.forEach(folderPath => {
          const result = addFolderToStream(activeStream, folderPath);
          if (result.success) {
            hasNewItems = true;
          }
        });
        if (hasNewItems) {
          await saveConfiguration();
        }
      }
    }
  });
}

function getActiveStream() {
  const activeGroup = document.querySelector('.stream-group.active');
  const firstEmptyStream = activeGroup.querySelector('.stream:has(.folder-list:empty)');
  if (firstEmptyStream) {
    return firstEmptyStream.dataset.streamId;
  }
  return activeGroup.querySelector('.stream').dataset.streamId;
}

function initializeDragAndDrop() {
  document.querySelectorAll('.stream').forEach(stream => {
    const dropZone = stream.querySelector('.drop-zone');
    const streamContent = stream.querySelector('.stream-content');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      streamContent.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
      streamContent.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
      }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      streamContent.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-over');
      }, false);
    });
    
    streamContent.addEventListener('drop', async (e) => {
      const files = Array.from(e.dataTransfer.files);
      const streamId = stream.dataset.streamId;
      
      let hasNewItems = false;
      for (const file of files) {
        if (file.path && file.type === '') {
          const result = addFolderToStream(streamId, file.path);
          if (result.success) {
            hasNewItems = true;
          }
        }
      }
      if (hasNewItems) {
        await saveConfiguration();
      }
    }, false);
  });
}

function addFolderToStream(streamId, folderPath) {
  if (!streamData[streamId]) {
    streamData[streamId] = [];
  }
  
  if (!streamData[streamId].includes(folderPath)) {
    streamData[streamId].push(folderPath);
    renderStream(streamId);
    return { success: true, message: 'Added successfully' };
  } else {
    return { success: false, message: 'Item already exists in this stream' };
  }
}

function addItemToStream(streamId, itemPath, itemName) {
  if (!streamData[streamId]) {
    streamData[streamId] = [];
  }
  
  if (!streamData[streamId].includes(itemPath)) {
    streamData[streamId].push(itemPath);
    renderStream(streamId);
    return { success: true, message: 'Added successfully' };
  } else {
    return { success: false, message: 'Item already exists in this stream' };
  }
}

function showNotification(message, type = 'info') {
  console.log(`${type.toUpperCase()}: ${message}`);
  
  // Create a simple notification element
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    z-index: 10000;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

function renderStream(streamId) {
  const stream = document.querySelector(`[data-stream-id="${streamId}"]`);
  const folderList = stream.querySelector('.folder-list');
  
  folderList.innerHTML = '';
  
  if (!streamData[streamId] || streamData[streamId].length === 0) {
    return;
  }
  
  streamData[streamId].forEach(folderPath => {
    const folderName = folderPath.split('/').pop() || folderPath;
    const li = document.createElement('li');
    li.className = 'folder-item';
    li.dataset.path = folderPath;
    li.innerHTML = `
      <span class="folder-icon"></span>
      <span class="folder-name">${folderName}</span>
    `;
    
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      selectFolder(li, folderPath);
    });
    
    li.addEventListener('dblclick', async (e) => {
      e.stopPropagation();
      await window.electronAPI.openFolder(folderPath);
    });
    
    li.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, streamId, folderPath);
    });
    
    folderList.appendChild(li);
    
    loadSubfolders(li, folderPath);
  });
}

async function loadSubfolders(parentElement, folderPath) {
  const subfolders = await window.electronAPI.getFolderContents(folderPath);
  
  if (subfolders.length > 0) {
    parentElement.classList.add('expandable');
    
    const subList = document.createElement('ul');
    subList.className = 'subfolder-list';
    
    subfolders.slice(0, 10).forEach(subfolder => {
      const li = document.createElement('li');
      li.className = 'folder-item';
      li.dataset.path = subfolder.path;
      li.innerHTML = `
        <span class="folder-icon"></span>
        <span class="folder-name">${subfolder.name}</span>
      `;
      
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        selectFolder(li, subfolder.path);
      });
      
      li.addEventListener('dblclick', async (e) => {
        e.stopPropagation();
        await window.electronAPI.openFolder(subfolder.path);
      });
      
      subList.appendChild(li);
    });
    
    parentElement.appendChild(subList);
    
    parentElement.addEventListener('click', (e) => {
      if (e.target === parentElement || e.target.parentElement === parentElement) {
        parentElement.classList.toggle('expanded');
        subList.classList.toggle('expanded');
      }
    });
  }
}

function selectFolder(element, folderPath) {
  console.log('Silo J: Selecting folder:', folderPath); // Debug log
  
  document.querySelectorAll('.folder-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  element.classList.add('selected');
  selectedFolder = folderPath;
  
  // Clear selections from other areas
  finderSelectedFiles.clear(); // Clear main viewer selection
  document.querySelectorAll('.silo-l-stream-item').forEach(item => {
    item.classList.remove('selected'); // Clear silo L selection
  });
  
  // Update active drum indicator
  updateActiveDrumIndicator(1); // Drum 1 - silo j
}

function initializeContextMenu() {
  const contextMenu = document.getElementById('folder-context-menu');
  
  document.addEventListener('click', () => {
    contextMenu.classList.remove('visible');
  });
  
  contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      
      if (action === 'open' && selectedFolder) {
        await window.electronAPI.openFolder(selectedFolder);
      } else if (action === 'reveal' && selectedFolder) {
        await window.electronAPI.openInFinder(selectedFolder);
      } else if (action === 'remove' && currentStream && selectedFolder) {
        removeFolderFromStream(currentStream, selectedFolder);
        await saveConfiguration();
      }
      
      contextMenu.classList.remove('visible');
    });
  });
}

function initializeFinderContextMenu() {
  const contextMenu = document.getElementById('finder-context-menu');

  document.addEventListener('click', () => {
    contextMenu.classList.remove('visible');
  });

  contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      if (!finderContextMenuPath) return;

      if (action === 'elevate') {
        const folderName = finderContextMenuPath.split('/').pop();
        const result = await window.electronAPI.dbAddElevated(finderContextMenuPath, folderName);
        if (result.success) {
          showNotification(`"${folderName}" added to Elevated`, 'success');
          await loadElevatedFolders();
        } else {
          showNotification('Could not elevate folder', 'error');
        }
      } else if (action === 'basin') {
        const folderName = finderContextMenuPath.split('/').pop();
        const result = await window.electronAPI.dbAddBasin(finderContextMenuPath, folderName);
        if (result.success) {
          showNotification(`"${folderName}" added to Designated Basins`, 'success');
          await loadBasinFolders();
        } else {
          showNotification('Could not designate basin folder', 'error');
        }
      } else if (action === 'finder-open') {
        await window.electronAPI.openFolder(finderContextMenuPath);
      } else if (action === 'finder-reveal') {
        await window.electronAPI.openInFinder(finderContextMenuPath);
      } else if (action === 'finder-delete') {
        const confirmed = await window.electronAPI.confirmDelete(1);
        if (confirmed) {
          const result = await window.electronAPI.deleteFile(finderContextMenuPath);
          if (result.success) {
            const name = finderContextMenuPath.split('/').pop();
            showNotification(`"${name}" deleted`, 'success');
            refreshFinderView();
          } else {
            showNotification('Could not delete: ' + result.error, 'error');
          }
        }
      }

      contextMenu.classList.remove('visible');
    });
  });
}

async function loadElevatedFolders() {
  const container = document.getElementById('sidebar-elevated');
  if (!container) return;

  const result = await window.electronAPI.dbGetElevated();
  container.innerHTML = '';

  if (!result.data || result.data.length === 0) return;

  result.data.forEach(row => {
    const item = document.createElement('div');
    item.className = 'sidebar-item';
    item.textContent = '★ ' + row.folder_name;
    item.title = row.folder_path;

    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      selectedFolder = row.folder_path;
      updateActiveDrumIndicator(1);
      finderSelectedFiles.clear();
      document.querySelectorAll('.silo-l-stream-item').forEach(i => i.classList.remove('selected'));
      navigateToFolder(row.folder_path);
    });

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showSiloJElevatedContextMenu(e.clientX, e.clientY, row.folder_path);
    });

    container.appendChild(item);
  });
}

async function loadBasinFolders() {
  const container = document.getElementById('sidebar-basin');
  if (!container) return;

  const [basinResult, defaultResult] = await Promise.all([
    window.electronAPI.dbGetBasin(),
    window.electronAPI.dbGetDefaultBasin()
  ]);

  container.innerHTML = '';
  if (!basinResult.data || basinResult.data.length === 0) return;

  const defaultPath = defaultResult.data?.folder_path || null;

  basinResult.data.forEach(row => {
    const isDefault = row.folder_path === defaultPath;
    const item = document.createElement('div');
    item.className = 'sidebar-item';
    item.title = row.folder_path;

    const icon = document.createElement('span');
    icon.textContent = '⬡ ' + row.folder_name;

    item.appendChild(icon);

    if (isDefault) {
      const badge = document.createElement('span');
      badge.className = 'basin-default-badge';
      badge.textContent = 'default';
      item.appendChild(badge);
    }

    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      selectedFolder = row.folder_path;
      updateActiveDrumIndicator(1);
      finderSelectedFiles.clear();
      document.querySelectorAll('.silo-l-stream-item').forEach(i => i.classList.remove('selected'));
      navigateToFolder(row.folder_path);
    });

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showSiloJBasinContextMenu(e.clientX, e.clientY, row.folder_path);
    });

    container.appendChild(item);
  });
}

function initializeSiloJContextMenus() {
  const elevatedMenu = document.getElementById('silo-j-elevated-context-menu');
  const basinMenu = document.getElementById('silo-j-basin-context-menu');

  document.addEventListener('click', () => {
    elevatedMenu.classList.remove('visible');
    basinMenu.classList.remove('visible');
  });

  elevatedMenu.querySelector('[data-action="remove-elevated"]').addEventListener('click', async () => {
    if (!elevatedContextMenuPath) return;
    const folderName = elevatedContextMenuPath.split('/').pop();
    await window.electronAPI.dbRemoveElevated(elevatedContextMenuPath);
    showNotification(`"${folderName}" removed from Elevated`, 'success');
    await loadElevatedFolders();
    elevatedMenu.classList.remove('visible');
  });

  basinMenu.querySelector('[data-action="set-default-basin"]').addEventListener('click', async () => {
    if (!basinContextMenuPath) return;
    const folderName = basinContextMenuPath.split('/').pop();
    await window.electronAPI.dbSetDefaultBasin(basinContextMenuPath);
    showNotification(`"${folderName}" set as default basin`, 'success');
    await loadBasinFolders();
    const overlay = document.getElementById('pistol-popup-overlay');
    if (overlay && overlay.style.display === 'flex') {
      await loadPistolBasinOptions();
    }
    basinMenu.classList.remove('visible');
  });

  basinMenu.querySelector('[data-action="remove-basin"]').addEventListener('click', async () => {
    if (!basinContextMenuPath) return;
    const folderName = basinContextMenuPath.split('/').pop();
    await window.electronAPI.dbRemoveBasin(basinContextMenuPath);
    showNotification(`"${folderName}" removed from Designated Basins`, 'success');
    await loadBasinFolders();
    basinMenu.classList.remove('visible');
  });
}

function showSiloJElevatedContextMenu(x, y, folderPath) {
  const menu = document.getElementById('silo-j-elevated-context-menu');
  document.getElementById('silo-j-basin-context-menu').classList.remove('visible');
  elevatedContextMenuPath = folderPath;
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.classList.add('visible');
}

function showSiloJBasinContextMenu(x, y, folderPath) {
  const menu = document.getElementById('silo-j-basin-context-menu');
  document.getElementById('silo-j-elevated-context-menu').classList.remove('visible');
  basinContextMenuPath = folderPath;
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.classList.add('visible');
}

function showFinderContextMenu(x, y, itemPath, isDirectory) {
  const contextMenu = document.getElementById('finder-context-menu');
  finderContextMenuPath = itemPath;
  finderContextMenuIsDirectory = isDirectory;

  document.getElementById('finder-menu-elevate').classList.toggle('disabled', !isDirectory);
  document.getElementById('finder-menu-basin').classList.toggle('disabled', !isDirectory);

  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.add('visible');
}

function showContextMenu(x, y, streamId, folderPath) {
  const contextMenu = document.getElementById('folder-context-menu');
  currentStream = streamId;
  selectedFolder = folderPath;
  
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.add('visible');
}

function removeFolderFromStream(streamId, folderPath) {
  if (streamData[streamId]) {
    const index = streamData[streamId].indexOf(folderPath);
    if (index > -1) {
      streamData[streamId].splice(index, 1);
      renderStream(streamId);
    }
  }
}

async function saveConfiguration() {
  const config = {
    streamData,
    finderCurrentPath,
    selectedSiloLStream: document.getElementById('silo-l-stream-select')?.value || '',
    finderHistory: finderHistory.slice(-10), // Keep last 10 history items
    finderHistoryIndex,
    finderViewMode,
    finderSortBy,
    siloLWidth: document.getElementById('silo-l')?.style.width || '200px',
    finderPreviewWidth: document.getElementById('finder-preview')?.style.width || '300px'
  };
  await window.electronAPI.saveConfig(config);
}

async function loadConfiguration() {
  const config = await window.electronAPI.loadConfig();
  if (config) {
    // Handle legacy config format (just streamData)
    if (config.streamData) {
      streamData = config.streamData;
      finderCurrentPath = config.finderCurrentPath || '';
      finderHistory = config.finderHistory || [];
      finderHistoryIndex = config.finderHistoryIndex || -1;
      finderViewMode = config.finderViewMode || 'column';
      finderSortBy = config.finderSortBy || 'name';
      
      // Restore UI state
      const siloLSelect = document.getElementById('silo-l-stream-select');
      if (siloLSelect && config.selectedSiloLStream) {
        siloLSelect.value = config.selectedSiloLStream;
        handleSiloLStreamChange(config.selectedSiloLStream);
      }
      
      // Restore panel widths
      if (config.siloLWidth) {
        const siloL = document.getElementById('silo-l');
        if (siloL) siloL.style.width = config.siloLWidth;
      }
      
      if (config.finderPreviewWidth) {
        const finderPreview = document.getElementById('finder-preview');
        if (finderPreview) finderPreview.style.width = config.finderPreviewWidth;
      }
      
      // Restore finder current path if it exists
      if (finderCurrentPath) {
        setTimeout(() => navigateToFolder(finderCurrentPath), 100);
      }
    } else {
      // Legacy format
      streamData = config;
    }
    
    Object.keys(streamData).forEach(streamId => {
      renderStream(streamId);
    });
  }
}

function initializeFinderView() {
  const backBtn = document.getElementById('finder-back');
  const forwardBtn = document.getElementById('finder-forward');
  
  backBtn.addEventListener('click', () => {
    if (finderHistoryIndex > 0) {
      finderHistoryIndex--;
      navigateToFolder(finderHistory[finderHistoryIndex], false);
    }
  });
  
  forwardBtn.addEventListener('click', () => {
    if (finderHistoryIndex < finderHistory.length - 1) {
      finderHistoryIndex++;
      navigateToFolder(finderHistory[finderHistoryIndex], false);
    }
  });
  
  // Quick access buttons
  document.querySelectorAll('.finder-quick-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pathType = btn.dataset.path;
      const path = await window.electronAPI.getSpecialPath(pathType);
      navigateToFolder(path);
    });
  });
  
  // Sidebar items (Favorites section)
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', async () => {
      const pathType = item.dataset.path;
      const path = await window.electronAPI.getSpecialPath(pathType);
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      // Set selectedFolder and update indicator for silo J
      selectedFolder = path;
      updateActiveDrumIndicator(1); // Drum 1 - silo j
      
      // Clear selections from other areas
      finderSelectedFiles.clear();
      document.querySelectorAll('.silo-l-stream-item').forEach(i => i.classList.remove('selected'));
      
      navigateToFolder(path);
    });
  });
  
  // Search functionality
  const searchInput = document.getElementById('finder-search');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      finderSearchTerm = e.target.value;
      if (finderCurrentPath) {
        renderFinderColumns();
      }
    }, 300);
  });
  
  // Sort functionality
  const sortSelect = document.getElementById('finder-sort');
  sortSelect.addEventListener('change', (e) => {
    finderSortBy = e.target.value;
    if (finderColumns.length > 0) {
      sortFinderContents();
      renderFinderColumns();
    }
  });
  
  // View mode buttons
  const viewButtons = document.querySelectorAll('.finder-view-btn');
  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      viewButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      finderViewMode = btn.dataset.view;
      renderFinderColumns();
    });
  });
  
  // New folder button
  document.getElementById('finder-new-folder').addEventListener('click', async () => {
    if (finderCurrentPath) {
      const folderName = prompt('Enter folder name:');
      if (folderName) {
        await window.electronAPI.createFolder(finderCurrentPath, folderName);
        navigateToFolder(finderCurrentPath);
      }
    }
  });
  
  // Delete button
  document.getElementById('finder-delete').addEventListener('click', async () => {
    if (finderSelectedFiles.size > 0) {
      const confirm = await window.electronAPI.confirmDelete(finderSelectedFiles.size);
      if (confirm) {
        for (const file of finderSelectedFiles) {
          await window.electronAPI.deleteFile(file);
        }
        finderSelectedFiles.clear();
        navigateToFolder(finderCurrentPath);
      }
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (document.getElementById('group-finder').classList.contains('active')) {
      // Check if user is typing in an input field, textarea, or contenteditable element
      const activeElement = document.activeElement;
      const isTypingInField = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.contentEditable === 'true'
      );
      
      // If user is typing in a field, let the browser handle keyboard shortcuts normally
      if (isTypingInField) {
        return;
      }
      
      if (e.metaKey && e.key === 'a') {
        e.preventDefault();
        selectAllFiles();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (finderSelectedFiles.size > 0 && e.metaKey) {
          document.getElementById('finder-delete').click();
        }
      }
    }
  });
}

async function navigateToFolder(folderPath, addToHistory = true) {
  if (addToHistory) {
    if (finderHistoryIndex < finderHistory.length - 1) {
      finderHistory = finderHistory.slice(0, finderHistoryIndex + 1);
    }
    finderHistory.push(folderPath);
    finderHistoryIndex++;
    
    // Add to recent paths
    if (!recentPaths.includes(folderPath)) {
      recentPaths.unshift(folderPath);
      recentPaths = recentPaths.slice(0, 12);
      updateRecentPaths();
    }
  }
  
  finderCurrentPath = folderPath;
  finderSelectedFiles.clear();
  updateNavigationButtons();
  updateBreadcrumb(folderPath);
  
  const pathParts = folderPath.split('/').filter(p => p);
  const columnsToKeep = [];
  let currentPath = '';
  
  for (let i = 0; i < pathParts.length; i++) {
    currentPath += '/' + pathParts[i];
    if (i < finderColumns.length && finderColumns[i].path === currentPath) {
      columnsToKeep.push(finderColumns[i]);
    } else {
      break;
    }
  }
  
  finderColumns = columnsToKeep;
  
  await addFinderColumn(folderPath);
  
  renderFinderColumns();
}

async function addFinderColumn(folderPath) {
  let contents = await window.electronAPI.getDirectoryContents(folderPath);
  
  // Apply search filter
  if (finderSearchTerm) {
    contents = contents.filter(item => 
      item.name.toLowerCase().includes(finderSearchTerm.toLowerCase())
    );
  }
  
  // Sort contents
  contents = sortContents(contents, finderSortBy);
  
  const pathDepth = folderPath.split('/').filter(p => p).length;
  finderColumns = finderColumns.slice(0, pathDepth);
  
  finderColumns.push({
    path: folderPath,
    contents: contents,
    selectedItem: null
  });
}

function sortContents(contents, sortBy) {
  return contents.sort((a, b) => {
    // Folders always come first
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    
    switch(sortBy) {
      case 'date':
        return new Date(b.modified) - new Date(a.modified);
      case 'size':
        return b.size - a.size;
      case 'kind':
        const aExt = a.name.split('.').pop().toLowerCase();
        const bExt = b.name.split('.').pop().toLowerCase();
        return aExt.localeCompare(bExt);
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });
}

function sortFinderContents() {
  finderColumns.forEach(column => {
    column.contents = sortContents(column.contents, finderSortBy);
  });
}

function updateBreadcrumb(path) {
  const breadcrumb = document.getElementById('finder-breadcrumb');
  const parts = path.split('/').filter(p => p);
  
  breadcrumb.innerHTML = '';
  
  // Add home
  const homeItem = document.createElement('span');
  homeItem.className = 'breadcrumb-item';
  homeItem.textContent = '🏠';
  homeItem.onclick = async () => {
    const homePath = await window.electronAPI.getSpecialPath('home');
    navigateToFolder(homePath);
  };
  breadcrumb.appendChild(homeItem);
  
  let currentPath = '';
  parts.forEach((part, index) => {
    currentPath += '/' + part;
    
    const separator = document.createElement('span');
    separator.className = 'breadcrumb-separator';
    separator.textContent = ' › ';
    breadcrumb.appendChild(separator);
    
    const item = document.createElement('span');
    item.className = 'breadcrumb-item';
    item.textContent = part;
    const pathCopy = currentPath;
    item.onclick = () => navigateToFolder(pathCopy);
    breadcrumb.appendChild(item);
  });
}

function updateRecentPaths() {
  const recentsContainer = document.getElementById('sidebar-recents');
  recentsContainer.innerHTML = '';
  
  recentPaths.forEach(path => {
    const item = document.createElement('div');
    item.className = 'sidebar-item';
    const name = path.split('/').pop() || 'Root';
    item.textContent = '🕒 ' + name;
    item.onclick = () => {
      // Set selectedFolder and update indicator for silo J
      selectedFolder = path;
      updateActiveDrumIndicator(1); // Drum 1 - silo j
      
      // Clear selections from other areas
      finderSelectedFiles.clear();
      document.querySelectorAll('.silo-l-stream-item').forEach(i => i.classList.remove('selected'));
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      navigateToFolder(path);
    };
    recentsContainer.appendChild(item);
  });
}

function selectAllFiles() {
  const lastColumn = finderColumns[finderColumns.length - 1];
  if (lastColumn) {
    finderSelectedFiles.clear();
    lastColumn.contents.forEach(item => {
      finderSelectedFiles.add(lastColumn.path + '/' + item.name);
    });
    renderFinderColumns();
    updateDeleteButton();
  }
}

function updateDeleteButton() {
  const deleteBtn = document.getElementById('finder-delete');
  deleteBtn.disabled = finderSelectedFiles.size === 0;
}

async function refreshFinderView() {
  if (!finderColumns.length) return;
  const btn = document.getElementById('silo-m-refresh-btn');
  if (btn) { btn.classList.add('spinning'); }

  const container = document.getElementById('finder-columns');
  const savedScroll = container ? container.scrollLeft : 0;

  for (let i = 0; i < finderColumns.length; i++) {
    const col = finderColumns[i];
    let contents = await window.electronAPI.getDirectoryContents(col.path);
    if (finderSearchTerm) {
      contents = contents.filter(item => item.name.toLowerCase().includes(finderSearchTerm.toLowerCase()));
    }
    contents = sortContents(contents, finderSortBy);
    finderColumns[i] = { ...col, contents };
  }
  renderFinderColumns();

  // Restore scroll after renderFinderColumns' own setTimeout fires
  setTimeout(() => {
    if (container) container.scrollLeft = savedScroll;
    if (btn) btn.classList.remove('spinning');
  }, 20);
}

function renderFinderColumns() {
  const columnsContainer = document.getElementById('finder-columns');
  columnsContainer.innerHTML = '';
  
  finderColumns.forEach((column, columnIndex) => {
    const columnDiv = document.createElement('div');
    columnDiv.className = 'finder-column';
    
    // Apply default width of 300px (or get current setting)
    const activeWidthButton = document.querySelector('.width-button.active[data-width]');
    if (activeWidthButton) {
      const width = activeWidthButton.dataset.width;
      if (width === 'auto') {
        columnDiv.style.width = 'auto';
        columnDiv.style.minWidth = '200px';
        columnDiv.style.maxWidth = 'none';
      } else {
        const pixelWidth = parseInt(width);
        columnDiv.style.width = pixelWidth + 'px';
        columnDiv.style.minWidth = pixelWidth + 'px';
        columnDiv.style.maxWidth = pixelWidth + 'px';
      }
    } else {
      // Default to 300px
      columnDiv.style.width = '300px';
      columnDiv.style.minWidth = '300px';
      columnDiv.style.maxWidth = '300px';
    }
    
    column.contents.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = `finder-item ${item.isDirectory ? 'folder' : 'file'}`;
      if (column.selectedItem === item.name) {
        itemDiv.classList.add('selected');
      }
      
      itemDiv.innerHTML = `
        <span class="finder-item-icon"></span>
        <span class="finder-item-name">${item.name}</span>
      `;
      
      itemDiv.addEventListener('click', async (e) => {
        const itemPath = column.path + '/' + item.name;
        
        if (e.metaKey || e.ctrlKey) {
          // Multi-select
          if (finderSelectedFiles.has(itemPath)) {
            finderSelectedFiles.delete(itemPath);
            itemDiv.classList.remove('selected');
          } else {
            finderSelectedFiles.add(itemPath);
            itemDiv.classList.add('selected');
          }
          
          // Update active drum indicator if we have selections
          if (finderSelectedFiles.size > 0) {
            updateActiveDrumIndicator(3); // Drum 3 - main viewer pane
          } else {
            updateActiveDrumIndicator(0); // None selected
          }
        } else {
          // Single select
          finderSelectedFiles.clear();
          columnDiv.querySelectorAll('.finder-item').forEach(el => {
            el.classList.remove('selected');
          });
          
          // Clear selections from other areas
          selectedFolder = null; // Clear silo J selection
          document.querySelectorAll('.folder-item.selected').forEach(item => {
            item.classList.remove('selected'); // Clear silo J visual selection
          });
          document.querySelectorAll('.silo-l-stream-item').forEach(item => {
            item.classList.remove('selected'); // Clear silo L selection
          });
          
          column.selectedItem = item.name;
          itemDiv.classList.add('selected');
          finderSelectedFiles.add(itemPath);
          
          // Update active drum indicator
          updateActiveDrumIndicator(3); // Drum 3 - main viewer pane
          
          finderColumns = finderColumns.slice(0, columnIndex + 1);
          
          if (item.isDirectory) {
            const newPath = column.path + '/' + item.name;
            await addFinderColumn(newPath);
            renderFinderColumns();
            
            if (finderHistoryIndex < finderHistory.length - 1) {
              finderHistory = finderHistory.slice(0, finderHistoryIndex + 1);
            }
            finderHistory.push(newPath);
            finderHistoryIndex++;
            updateNavigationButtons();
            updateBreadcrumb(newPath);
            finderCurrentPath = newPath;
          } else {
            showPreview(item, column.path);
          }
        }
        updateDeleteButton();
        updateStreamManagementButton();
      });
      
      itemDiv.addEventListener('dblclick', async () => {
        if (!item.isDirectory) {
          await window.electronAPI.openFile(column.path + '/' + item.name);
        }
      });

      itemDiv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showFinderContextMenu(e.clientX, e.clientY, column.path + '/' + item.name, item.isDirectory);
      });

      columnDiv.appendChild(itemDiv);
    });
    
    columnsContainer.appendChild(columnDiv);
  });
  
  setTimeout(() => {
    columnsContainer.scrollLeft = columnsContainer.scrollWidth;
  }, 10);
}

function updateNavigationButtons() {
  const backBtn = document.getElementById('finder-back');
  const forwardBtn = document.getElementById('finder-forward');
  
  backBtn.disabled = finderHistoryIndex <= 0;
  forwardBtn.disabled = finderHistoryIndex >= finderHistory.length - 1;
}

async function showPreview(item, parentPath) {
  const preview = document.getElementById('finder-preview');
  const fullPath = parentPath + '/' + item.name;
  const fileInfo = await window.electronAPI.getFileInfo(fullPath);
  
  preview.innerHTML = `
    <div class="preview-content">
      <div class="preview-icon ${item.isDirectory ? '' : 'file'}"></div>
      <div class="preview-name">${item.name}</div>
      <div class="preview-details">
        <div><strong>Kind:</strong> ${item.isDirectory ? 'Folder' : getFileType(item.name)}</div>
        <div><strong>Size:</strong> ${formatFileSize(fileInfo.size)}</div>
        <div><strong>Modified:</strong> ${new Date(fileInfo.modified).toLocaleDateString()}</div>
        <div><strong>Created:</strong> ${new Date(fileInfo.created).toLocaleDateString()}</div>
        <div><strong>Path:</strong> ${fullPath}</div>
      </div>
    </div>
  `;
  
  preview.classList.add('show');
}

function getFileType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const types = {
    'js': 'JavaScript File',
    'json': 'JSON File',
    'html': 'HTML File',
    'css': 'CSS File',
    'png': 'PNG Image',
    'jpg': 'JPEG Image',
    'jpeg': 'JPEG Image',
    'pdf': 'PDF Document',
    'txt': 'Text File',
    'md': 'Markdown File'
  };
  return types[ext] || ext.toUpperCase() + ' File';
}

function formatFileSize(bytes) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function initializeCloudStorage() {
  try {
    const cloudServices = await window.electronAPI.getAvailableCloudStorage();
    const cloudStorageContainer = document.getElementById('sidebar-cloud-storage');
    const cloudStorageSection = document.getElementById('cloud-storage-section');
    
    if (cloudServices.length === 0) {
      cloudStorageSection.style.display = 'none';
      return;
    }
    
    cloudStorageContainer.innerHTML = '';
    
    cloudServices.forEach(service => {
      const item = document.createElement('div');
      item.className = 'sidebar-item';
      item.textContent = service.name;
      item.dataset.path = service.id;
      
      item.addEventListener('click', async () => {
        document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        try {
          const path = await window.electronAPI.getSpecialPath(service.id);
          
          // Set selectedFolder and update indicator for silo J
          selectedFolder = path;
          updateActiveDrumIndicator(1); // Drum 1 - silo j
          
          // Clear selections from other areas
          finderSelectedFiles.clear();
          document.querySelectorAll('.silo-l-stream-item').forEach(i => i.classList.remove('selected'));
          
          navigateToFolder(path);
        } catch (error) {
          console.error('Error accessing cloud storage:', error);
          alert(`Could not access ${service.name}. It may not be available or configured.`);
        }
      });
      
      cloudStorageContainer.appendChild(item);
    });
    
    cloudStorageSection.style.display = 'block';
  } catch (error) {
    console.error('Error initializing cloud storage:', error);
    document.getElementById('cloud-storage-section').style.display = 'none';
  }
}

function initializeStreamManagement() {
  const streamSelect = document.getElementById('stream-select');
  const addToStreamBtn = document.getElementById('add-to-stream-btn');
  
  // Enable/disable button based on selection
  streamSelect.addEventListener('change', () => {
    updateStreamManagementButton();
  });
  
  // Handle add to stream button click
  addToStreamBtn.addEventListener('click', async () => {
    const selectedStreamId = streamSelect.value;
    
    if (!selectedStreamId || finderSelectedFiles.size === 0) return;
    
    // Get the first selected item and check if it's a directory
    const firstSelectedPath = Array.from(finderSelectedFiles)[0];
    
    // Check if the selected item is a directory
    const isDirectory = await window.electronAPI.checkPathExists(firstSelectedPath);
    if (!isDirectory) return;
    
    // Add the folder to the chosen stream
    const result = addFolderToStream(selectedStreamId, firstSelectedPath);
    
    if (result.success) {
      await saveConfiguration();
      
      // Show success feedback
      const originalText = addToStreamBtn.textContent;
      addToStreamBtn.textContent = 'Added!';
      addToStreamBtn.style.background = '#28a745';
      
      setTimeout(() => {
        addToStreamBtn.textContent = originalText;
        addToStreamBtn.style.background = '#007AFF';
      }, 1500);
    } else {
      // Show duplicate warning
      const originalText = addToStreamBtn.textContent;
      addToStreamBtn.textContent = 'Already exists';
      addToStreamBtn.style.background = '#ff6b6b';
      
      setTimeout(() => {
        addToStreamBtn.textContent = originalText;
        addToStreamBtn.style.background = '#007AFF';
      }, 2000);
    }
    
    // Reset selection
    streamSelect.value = '';
    updateStreamManagementButton();
  });
}

function updateStreamManagementButton() {
  const streamSelect = document.getElementById('stream-select');
  const addToStreamBtn = document.getElementById('add-to-stream-btn');
  
  // Check if we have a stream selected and at least one item selected
  const hasSelectedStream = streamSelect.value !== '';
  const hasSelectedItems = finderSelectedFiles.size > 0;
  
  const shouldEnable = hasSelectedStream && hasSelectedItems;
  addToStreamBtn.disabled = !shouldEnable;
  
  // Update button text based on selection count
  if (hasSelectedItems) {
    const itemCount = finderSelectedFiles.size;
    addToStreamBtn.textContent = `Add Selected ${itemCount > 1 ? 'Items' : 'Item'} To Stream`;
  } else {
    addToStreamBtn.textContent = 'Add Selected Folder To Stream';
  }
}

function initializeFinderResize() {
  const resizeHandle = document.getElementById('finder-resize-handle');
  const finderPreview = document.getElementById('finder-preview');
  const finderColumns = document.getElementById('finder-columns');
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = finderPreview.offsetWidth;
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const deltaX = startX - e.clientX; // Reverse direction since we're resizing from the right
    const newWidth = Math.max(200, Math.min(500, startWidth + deltaX));
    
    finderPreview.style.width = newWidth + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
  
  // Handle double-click to auto-resize
  resizeHandle.addEventListener('dblclick', () => {
    finderPreview.style.width = '300px'; // Reset to default width
  });
}

function initializeSiloLResize() {
  const resizeHandle = document.getElementById('silo-l-resize-handle');
  const siloL = document.getElementById('silo-l');
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = siloL.offsetWidth;
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(100, Math.min(400, startWidth + deltaX));
    
    siloL.style.width = newWidth + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
  
  // Handle double-click to reset to default width
  resizeHandle.addEventListener('dblclick', () => {
    siloL.style.width = '200px';
  });
}

function initializeSiloLStreamSelect() {
  const streamSelect = document.getElementById('silo-l-stream-select');
  const siloLContent = document.getElementById('silo-l-content');
  const addBtn = document.getElementById('silo-l-add-btn');
  const pathInput = document.getElementById('silo-l-path-input');
  
  streamSelect.addEventListener('change', (e) => {
    const selectedStreamId = e.target.value;
    handleSiloLStreamChange(selectedStreamId);
    saveConfiguration(); // Save state when stream selection changes
  });
  
  // Handle add to stream button click
  addBtn.addEventListener('click', async () => {
    const selectedStreamId = streamSelect.value;
    const folderPath = pathInput.value.trim();
    
    if (!selectedStreamId || !folderPath) return;
    
    // Validate that the path exists
    try {
      const pathExists = await window.electronAPI.checkPathExists(folderPath);
      if (!pathExists) {
        alert('The specified path does not exist. Please check the path and try again.');
        return;
      }
      
      // Add to stream
      const result = addFolderToStream(selectedStreamId, folderPath);
      
      if (result.success) {
        await saveConfiguration();
        
        // Refresh the stream items display
        await renderSiloLStreamItems(selectedStreamId);
        
        // Clear the input and show success feedback
        pathInput.value = '';
        const originalText = addBtn.textContent;
        addBtn.textContent = 'Added!';
        addBtn.style.background = '#28a745';
        
        setTimeout(() => {
          addBtn.textContent = originalText;
          addBtn.style.background = '#007AFF';
        }, 1500);
      } else {
        // Show duplicate warning
        alert(`Cannot add item: ${result.message}`);
        const originalText = addBtn.textContent;
        addBtn.textContent = 'Already exists';
        addBtn.style.background = '#ff6b6b';
        
        setTimeout(() => {
          addBtn.textContent = originalText;
          addBtn.style.background = '#007AFF';
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error adding path to stream:', error);
      alert('Error adding path to stream. Please try again.');
    }
  });
}

async function renderSiloLStreamItems(streamId) {
  const siloLContent = document.getElementById('silo-l-content');
  siloLContent.innerHTML = '';
  
  if (!streamData[streamId] || streamData[streamId].length === 0) {
    siloLContent.innerHTML = '<div style="padding: 8px; font-size: 16px; color: #666;">No items in this stream</div>';
    return;
  }
  
  for (const itemPath of streamData[streamId]) {
    const itemName = itemPath.split('/').pop() || itemPath;
    
    // Check if item is a directory
    let isDirectory = false;
    try {
      const fileInfo = await window.electronAPI.getFileInfo(itemPath);
      isDirectory = fileInfo?.isDirectory || false;
    } catch (error) {
      // Default to folder if we can't determine type
      isDirectory = true;
    }
    
    const itemDiv = document.createElement('div');
    itemDiv.className = `silo-l-stream-item ${isDirectory ? 'folder' : 'file'}`;
    itemDiv.title = itemPath; // Show full path on hover
    itemDiv.dataset.path = itemPath; // Store the path for easy access
    
    // Create icon
    const iconSpan = document.createElement('span');
    iconSpan.className = 'silo-l-item-icon';
    
    // Create name span
    const nameSpan = document.createElement('span');
    nameSpan.className = 'silo-l-item-name';
    nameSpan.textContent = itemName;
    
    itemDiv.appendChild(iconSpan);
    itemDiv.appendChild(nameSpan);
    
    itemDiv.addEventListener('click', (e) => {
      // Handle selection
      const allItems = siloLContent.querySelectorAll('.silo-l-stream-item');
      allItems.forEach(item => item.classList.remove('selected'));
      itemDiv.classList.add('selected');
      
      // Clear selections from other areas
      selectedFolder = null; // Clear silo J selection
      finderSelectedFiles.clear(); // Clear main viewer selection
      
      // Update active drum indicator
      updateActiveDrumIndicator(2); // Drum 2 - silo l
      
      // Navigate to the item in the finder view
      navigateToFolder(itemPath);
    });
    
    siloLContent.appendChild(itemDiv);
  }
}

function initializePasteButtons() {
  // Add event listeners for the paste buttons
  const pasteM1Btn = document.getElementById('paste-m1-btn');
  const pasteM2Btn = document.getElementById('paste-m2-btn');
  const copyM1Btn = document.getElementById('copy-m1-btn');
  const openInFinderBtn = document.getElementById('open-in-finder-btn');
  
  if (openInFinderBtn) {
    openInFinderBtn.addEventListener('click', async () => {
      await openSelectedInFinder();
    });
  }
  
  if (pasteM1Btn) {
    pasteM1Btn.addEventListener('click', async () => {
      await handleSimplePaste();
    });
  }
  
  if (pasteM2Btn) {
    pasteM2Btn.addEventListener('click', async () => {
      await handleFilenamePaste();
    });
    
    // Add tooltip functionality
    pasteM2Btn.setAttribute('title', 'Filename Search Paste: Reads the filename from clipboard and searches Downloads, Desktop, Documents, and Home folders to find and copy the matching file. Useful when regular paste fails.');
  }
  
  if (copyM1Btn) {
    copyM1Btn.addEventListener('click', async () => {
      await copySelectedFiles();
    });
  }
}

// Open selected files/folders in Finder
async function openSelectedInFinder() {
  let selectedPath = null;
  
  console.log('Debug - Opening in Finder...'); // Debug log
  console.log('- finderSelectedFiles size:', finderSelectedFiles.size);
  console.log('- selectedFolder value:', selectedFolder);
  console.log('- folder-item.selected exists:', !!document.querySelector('.folder-item.selected'));
  console.log('- silo-l-stream-item.selected exists:', !!document.querySelector('.silo-l-stream-item.selected'));
  
  // 1. Check main viewer pane (finder view) - priority 1
  if (finderSelectedFiles.size > 0) {
    selectedPath = Array.from(finderSelectedFiles)[0];
    console.log('Using main viewer selection:', selectedPath);
  }
  
  // 2. Check silo J (folder items in streams) - priority 2
  // First try the global selectedFolder variable (which is set when clicking items)
  if (!selectedPath && selectedFolder) {
    selectedPath = selectedFolder;
    console.log('Using silo J selectedFolder:', selectedPath);
  }
  
  // Also check for the selected class as a fallback
  if (!selectedPath) {
    const selectedFolderItem = document.querySelector('.folder-item.selected');
    if (selectedFolderItem && selectedFolderItem.dataset.path) {
      selectedPath = selectedFolderItem.dataset.path;
      console.log('Using silo J DOM selection:', selectedPath);
    }
  }
  
  // 3. Check silo L (designated items) - priority 3
  if (!selectedPath) {
    const selectedSiloLItem = document.querySelector('.silo-l-stream-item.selected');
    if (selectedSiloLItem && selectedSiloLItem.dataset.path) {
      selectedPath = selectedSiloLItem.dataset.path;
      console.log('Using silo L selection:', selectedPath);
    }
  }
  
  // If no selection found anywhere
  if (!selectedPath) {
    showNotification('No item selected in any area', 'error');
    return;
  }
  
  try {
    // Open the containing folder in Finder (reveals the item)
    await window.electronAPI.openInFinder(selectedPath);
    
    showNotification('Opened in Finder', 'success');
  } catch (error) {
    console.error('Error opening in Finder:', error);
    showNotification('Failed to open in Finder', 'error');
  }
}

// Simple paste function (method 1)
async function handleSimplePaste() {
  const targetFolder = getTargetPasteFolder();
  
  if (!targetFolder) {
    showNotification('No folder open for paste operation', 'error');
    return;
  }
  
  try {
    const result = await window.electronAPI.pasteFiles(targetFolder);
    
    if (result.success) {
      showNotification(`Files pasted to ${targetFolder.split('/').pop() || 'current folder'}`, 'success');
      await navigateToFolder(targetFolder);
    } else {
      showNotification('Paste failed - try paste (m2) if you copied a filename', 'error');
    }
  } catch (error) {
    console.error('Error in simple paste:', error);
    showNotification('Paste operation failed', 'error');
  }
}

// Filename search paste function (method 2)
async function handleFilenamePaste() {
  const targetFolder = getTargetPasteFolder();
  
  if (!targetFolder) {
    showNotification('No folder open for paste operation', 'error');
    return;
  }
  
  try {
    const result = await window.electronAPI.pasteFilesM2(targetFolder);
    
    if (result.success) {
      showNotification(`File found and pasted to ${targetFolder.split('/').pop() || 'current folder'}`, 'success');
      await navigateToFolder(targetFolder);
    } else {
      const errorMsg = result.error || 'File not found in common locations';
      showNotification(`Search paste failed: ${errorMsg}`, 'error');
      console.error('Filename paste operation failed:', result);
    }
  } catch (error) {
    console.error('Error in filename paste:', error);
    showNotification('Filename paste operation failed', 'error');
  }
}

function initializeClipboardOperations() {
  document.addEventListener('keydown', async (event) => {
    // Only handle shortcuts when in finder view
    const finderGroup = document.getElementById('group-finder');
    if (!finderGroup.classList.contains('active')) {
      return;
    }
    
    // Check if user is typing in an input field, textarea, or contenteditable element
    const activeElement = document.activeElement;
    const isTypingInField = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      activeElement.contentEditable === 'true'
    );
    
    // If user is typing in a field, let the browser handle keyboard shortcuts normally
    if (isTypingInField) {
      return;
    }
    
    // Cmd+C (Copy)
    if (event.metaKey && event.key === 'c' && finderSelectedFiles.size > 0) {
      event.preventDefault();
      await copySelectedFiles();
    }
    
    // Cmd+V (Paste)
    if (event.metaKey && event.key === 'v') {
      event.preventDefault();
      await handleSimplePaste();
    }
    
    // Cmd+X (Cut)
    if (event.metaKey && event.key === 'x' && finderSelectedFiles.size > 0) {
      event.preventDefault();
      await cutSelectedFiles();
    }
  });
}

async function copySelectedFiles() {
  if (finderSelectedFiles.size === 0) return;
  
  const filePaths = Array.from(finderSelectedFiles);
  clipboardFiles = filePaths;
  clipboardOperation = 'copy';
  
  try {
    const result = await window.electronAPI.copyFiles(filePaths);
    if (result.success) {
      console.log(`Copied ${filePaths.length} files to clipboard`);
      // Visual feedback could be added here
    }
  } catch (error) {
    console.error('Error copying files:', error);
  }
}

async function cutSelectedFiles() {
  if (finderSelectedFiles.size === 0) return;
  
  const filePaths = Array.from(finderSelectedFiles);
  clipboardFiles = filePaths;
  clipboardOperation = 'cut';
  
  try {
    const result = await window.electronAPI.copyFiles(filePaths);
    if (result.success) {
      console.log(`Cut ${filePaths.length} files to clipboard`);
      // Visual feedback - maybe dim the cut files
      filePaths.forEach(path => {
        const fileElement = document.querySelector(`[data-path="${path}"]`);
        if (fileElement) {
          fileElement.style.opacity = '0.5';
        }
      });
    }
  } catch (error) {
    console.error('Error cutting files:', error);
  }
}

async function pasteFiles() {
  if (clipboardFiles.length === 0 || !finderCurrentPath) return;
  
  try {
    let result;
    if (clipboardOperation === 'cut') {
      result = await window.electronAPI.moveFiles(clipboardFiles, finderCurrentPath);
      if (result.success) {
        // Clear cut files from display
        clipboardFiles.forEach(path => {
          const fileElement = document.querySelector(`[data-path="${path}"]`);
          if (fileElement) {
            fileElement.remove();
          }
        });
        clipboardFiles = [];
        clipboardOperation = null;
      }
    } else {
      result = await window.electronAPI.pasteFiles(finderCurrentPath);
    }
    
    if (result.success) {
      console.log(`Pasted files to ${finderCurrentPath}`);
      // Refresh the current directory view
      await navigateToFolder(finderCurrentPath);
    }
  } catch (error) {
    console.error('Error pasting files:', error);
  }
}

async function handleSiloLStreamChange(selectedStreamId) {
  const siloLContent = document.getElementById('silo-l-content');
  const addBtn = document.getElementById('silo-l-add-btn');
  
  if (selectedStreamId) {
    // Enable button when any stream is selected (even empty ones)
    addBtn.disabled = false;
    
    // Render items if stream has data, otherwise show empty state
    if (streamData[selectedStreamId] && streamData[selectedStreamId].length > 0) {
      await renderSiloLStreamItems(selectedStreamId);
    } else {
      siloLContent.innerHTML = '<div style="padding: 8px; font-size: 16px; color: #666;">No items in this stream</div>';
    }
  } else {
    // Disable button only when no stream is selected
    siloLContent.innerHTML = '';
    addBtn.disabled = true;
  }
}

function initializeRefreshHandler() {
  const refreshBtn = document.getElementById('silo-m-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => refreshFinderView());
  }

  document.addEventListener('keydown', async (event) => {
    // Cmd+R refresh
    if (event.metaKey && event.key === 'r') {
      event.preventDefault();
      
      // Save current state before refresh
      await saveConfiguration();
      
      // Reload the page
      window.location.reload();
    }
    
    // Cmd+Shift+R - Manual trigger for testing (kept for debugging)
    if (event.metaKey && event.shiftKey && event.key === 'R') {
      event.preventDefault();
      console.log('Manual Gazebo stream check triggered');
      showNotification('Manual Gazebo check triggered', 'info');
    }
  });
}

function initializeJupiterFileHandler() {
  // Listen for file selections from Gazebo helper
  if (window.electronAPI?.onJupiterFileSelected) {
    window.electronAPI.onJupiterFileSelected((filePath) => {
      console.log('Jupiter file selected:', filePath);
      
      // Switch to Jupiter tab
      const jupiterTab = document.querySelector('[data-group="jupiter"]');
      if (jupiterTab) {
        jupiterTab.click();
      }
      
      // Update the file display
      updateJupiterFileDisplay(filePath);
    });
  } else {
    console.log('Jupiter file handler: electronAPI not available');
  }
}

function initializeGazeboStreamHandler() {
  // Listen for stream data from Gazebo
  if (window.electronAPI?.onGazeboAddToStream) {
    window.electronAPI.onGazeboAddToStream((streamData) => {
      console.log('Received stream data from Gazebo:', streamData);
      processGazeboStreamData(streamData);
    });
  } else {
    console.log('Gazebo stream handler: electronAPI not available');
  }
}

function processGazeboStreamData(streamData) {
  const { streamNumber, action, items } = streamData;
  
  if (action === 'addToStream' && items && items.length > 0) {
    console.log(`Adding ${items.length} items to stream ${streamNumber}`);
    
    items.forEach(item => {
      addItemToStream(streamNumber, item.path, item.name);
    });
    
    showNotification(`Added ${items.length} item(s) to Stream ${streamNumber}`, 'success');
    
    if (currentStream === streamNumber) {
      renderSiloLStreamItems(streamNumber);
    }
  }
}

async function checkForGazeboFileSelection() {
  try {
    const tempFilePath = await window.electronAPI.checkGazeboTempFile();
    if (tempFilePath) {
      console.log('Found Gazebo file selection:', tempFilePath);
      
      // Switch to Jupiter tab
      const jupiterTab = document.querySelector('[data-group="jupiter"]');
      if (jupiterTab) {
        jupiterTab.click();
      }
      
      // Update the file display
      updateJupiterFileDisplay(tempFilePath);
    }
  } catch (error) {
    console.log('No Gazebo file selection found');
  }
}


async function updateJupiterFileDisplay(filePath) {
  // Store the current file path for actions
  currentSelectedFilePath = filePath;
  
  const fileNameElement = document.getElementById('jupiter-file-name');
  const filePathElement = document.getElementById('jupiter-file-path');
  const fileIconElement = document.querySelector('.selected-file-display .file-icon');
  
  if (fileNameElement && filePathElement && fileIconElement) {
    const fileName = filePath.split('/').pop();
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    // Update display elements
    fileNameElement.textContent = fileName;
    filePathElement.textContent = filePath;
    
    // Set appropriate icon based on file type
    let icon = '📄'; // Default document icon
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
      icon = '🖼️';
    } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(fileExtension)) {
      icon = '🎬';
    } else if (['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(fileExtension)) {
      icon = '🎵';
    } else if (['pdf'].includes(fileExtension)) {
      icon = '📕';
    } else if (['doc', 'docx', 'txt', 'rtf'].includes(fileExtension)) {
      icon = '📝';
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExtension)) {
      icon = '📦';
    }
    
    fileIconElement.textContent = icon;
    
    // Update selected file display styling
    const selectedFileDisplay = document.querySelector('.selected-file-display');
    if (selectedFileDisplay) {
      selectedFileDisplay.style.borderColor = '#007AFF';
      selectedFileDisplay.style.backgroundColor = '#f0f8ff';
    }
    
    // Check file status
    await updateFileStatus(filePath);
  }
}

async function updateFileStatus(filePath) {
  const statusIndicator = document.getElementById('file-status-indicator');
  const statusIcon = document.getElementById('status-icon');
  const statusText = document.getElementById('status-text');
  
  if (!statusIndicator || !statusIcon || !statusText) return;
  
  // Show indicator and set checking state
  statusIndicator.style.display = 'flex';
  statusIcon.className = 'status-icon checking';
  statusText.textContent = 'Checking file status...';
  
  try {
    const status = await window.electronAPI.checkFileStatus(filePath);
    
    if (status.isOpen === true) {
      statusIcon.className = 'status-icon open';
      statusText.textContent = status.details;
    } else if (status.isOpen === false) {
      statusIcon.className = 'status-icon closed';
      statusText.textContent = status.details;
    } else {
      statusIcon.className = 'status-icon checking';
      statusText.textContent = status.details;
    }
  } catch (error) {
    console.error('Error checking file status:', error);
    statusIcon.className = 'status-icon checking';
    statusText.textContent = 'Could not check file status';
  }
}

let currentSelectedFilePath = null;
let currentMeridianFilePath = null;
let finderContextMenuPath = null;
let finderContextMenuIsDirectory = false;
let elevatedContextMenuPath = null;
let basinContextMenuPath = null;

function initializeMeridianBoard() {
  // Listen for file drops on dock icon
  if (window.electronAPI?.onMeridianFileDropped) {
    window.electronAPI.onMeridianFileDropped((filePath) => {
      console.log('Meridian file dropped:', filePath);
      
      // Switch to Meridian Board tab
      const meridianTab = document.querySelector('[data-group="meridian"]');
      if (meridianTab) {
        meridianTab.click();
      }
      
      // Update the file display
      updateMeridianFileDisplay(filePath);
    });
  }
  
  // Initialize Meridian action buttons
  initializeMeridianActions();
}

async function updateMeridianFileDisplay(filePath) {
  // Store the current file path for actions
  currentMeridianFilePath = filePath;
  
  const fileNameElement = document.getElementById('meridian-file-name');
  const filePathElement = document.getElementById('meridian-file-path');
  const fileIconElement = document.querySelector('#group-meridian .selected-file-display .file-icon');
  
  if (fileNameElement && filePathElement && fileIconElement) {
    const fileName = filePath.split('/').pop();
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    // Update display elements
    fileNameElement.textContent = fileName;
    filePathElement.textContent = filePath;
    
    // Set appropriate icon based on file type
    let icon = '📄'; // Default document icon
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
      icon = '🖼️';
    } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(fileExtension)) {
      icon = '🎬';
    } else if (['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(fileExtension)) {
      icon = '🎵';
    } else if (['pdf'].includes(fileExtension)) {
      icon = '📕';
    } else if (['doc', 'docx', 'txt', 'rtf'].includes(fileExtension)) {
      icon = '📝';
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExtension)) {
      icon = '📦';
    }
    
    fileIconElement.textContent = icon;
    
    // Update selected file display styling
    const selectedFileDisplay = document.querySelector('#group-meridian .selected-file-display');
    if (selectedFileDisplay) {
      selectedFileDisplay.style.borderColor = '#007AFF';
      selectedFileDisplay.style.backgroundColor = '#f0f8ff';
    }
    
    // Check file status
    await updateMeridianFileStatus(filePath);
  }
}

async function updateMeridianFileStatus(filePath) {
  const statusIndicator = document.getElementById('meridian-file-status-indicator');
  const statusIcon = document.getElementById('meridian-status-icon');
  const statusText = document.getElementById('meridian-status-text');
  
  if (!statusIndicator || !statusIcon || !statusText) return;
  
  // Show indicator and set checking state
  statusIndicator.style.display = 'flex';
  statusIcon.className = 'status-icon checking';
  statusText.textContent = 'Checking file status...';
  
  try {
    const status = await window.electronAPI.checkFileStatus(filePath);
    
    if (status.isOpen === true) {
      statusIcon.className = 'status-icon open';
      statusText.textContent = status.details;
    } else if (status.isOpen === false) {
      statusIcon.className = 'status-icon closed';
      statusText.textContent = status.details;
    } else {
      statusIcon.className = 'status-icon checking';
      statusText.textContent = status.details;
    }
  } catch (error) {
    console.error('Error checking file status:', error);
    statusIcon.className = 'status-icon checking';
    statusText.textContent = 'Could not check file status';
  }
}

function initializeMeridianActions() {
  const openBtn = document.getElementById('meridian-open-btn');
  const showInFinderBtn = document.getElementById('meridian-show-in-finder-btn');
  const addToStreamBtn = document.getElementById('meridian-add-to-stream-btn');
  const streamDropdown = document.getElementById('meridian-stream-dropdown');
  
  if (openBtn) {
    openBtn.addEventListener('click', async () => {
      if (currentMeridianFilePath) {
        try {
          await window.electronAPI.openFile(currentMeridianFilePath);
          console.log('Opened file:', currentMeridianFilePath);
        } catch (error) {
          console.error('Error opening file:', error);
        }
      }
    });
  }
  
  if (showInFinderBtn) {
    showInFinderBtn.addEventListener('click', async () => {
      if (currentMeridianFilePath) {
        try {
          await window.electronAPI.openInFinder(currentMeridianFilePath);
          console.log('Showed file in Finder:', currentMeridianFilePath);
        } catch (error) {
          console.error('Error showing file in Finder:', error);
        }
      }
    });
  }
  
  // Add to Stream dropdown functionality
  if (addToStreamBtn && streamDropdown) {
    addToStreamBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      if (!currentMeridianFilePath) {
        showNotification('No file selected', 'error');
        return;
      }
      
      // Toggle dropdown visibility
      const isVisible = streamDropdown.style.display !== 'none';
      streamDropdown.style.display = isVisible ? 'none' : 'block';
    });
    
    // Handle stream option clicks
    const streamOptions = streamDropdown.querySelectorAll('.meridian-stream-option');
    streamOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const streamNumber = parseInt(option.dataset.stream);
        
        if (currentMeridianFilePath) {
          // Add file to the selected stream
          const fileName = currentMeridianFilePath.split('/').pop();
          addItemToStream(streamNumber, currentMeridianFilePath, fileName);
          
          // Show success notification
          showNotification(`Added "${fileName}" to Stream ${streamNumber}`, 'success');
          
          // Hide dropdown
          streamDropdown.style.display = 'none';
          
          // Save configuration
          saveConfiguration();
        }
      });
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!addToStreamBtn.contains(e.target) && !streamDropdown.contains(e.target)) {
        streamDropdown.style.display = 'none';
      }
    });
  }
}

function initializePistolPopup() {
  const btn = document.getElementById('pistol-popup-btn');
  const overlay = document.getElementById('pistol-popup-overlay');
  const closeBtn = document.getElementById('pistol-popup-close');

  btn.addEventListener('click', () => {
    overlay.style.display = 'flex';
    updatePistolMeadPath();
    loadPistolBasinOptions();
  });

  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display === 'flex') {
      overlay.style.display = 'none';
    }
  });

  initializeMeadToggleGroups();
  initializeMeadActionButtons();
  initializePistolSourceSection();
}

function updatePistolMeadPath() {
  const silomDisplay = document.getElementById('pistol-silom-display');
  if (silomDisplay) {
    silomDisplay.value = finderCurrentPath || '';
  }
  updatePistolActualTarget();
}

function initializePistolSourceSection() {
  const basinRadio = document.getElementById('pistol-radio-basin');
  const silomRadio = document.getElementById('pistol-radio-silom');
  const basinSelect = document.getElementById('pistol-basin-select');

  if (basinRadio) basinRadio.addEventListener('change', updatePistolActualTarget);
  if (silomRadio) silomRadio.addEventListener('change', updatePistolActualTarget);
  if (basinSelect) basinSelect.addEventListener('change', updatePistolActualTarget);
}

async function loadPistolBasinOptions() {
  const select = document.getElementById('pistol-basin-select');
  if (!select) return;

  const [basinResult, defaultResult] = await Promise.all([
    window.electronAPI.dbGetBasin(),
    window.electronAPI.dbGetDefaultBasin()
  ]);

  const defaultPath = defaultResult.data?.folder_path || null;

  select.innerHTML = '<option value="">— select a basin —</option>';
  if (basinResult.data && basinResult.data.length > 0) {
    basinResult.data.forEach(row => {
      const opt = document.createElement('option');
      opt.value = row.folder_path;
      const isDefault = row.folder_path === defaultPath;
      opt.textContent = `${row.folder_name}${isDefault ? ' (default)' : ''}  (${row.folder_path})`;
      select.appendChild(opt);
    });
    if (defaultPath) {
      select.value = defaultPath;
    }
  }
  updatePistolActualTarget();
}

function updatePistolActualTarget() {
  const basinRadio = document.getElementById('pistol-radio-basin');
  const basinSelect = document.getElementById('pistol-basin-select');
  const silomDisplay = document.getElementById('pistol-silom-display');
  const actualTargetEl = document.getElementById('pistol-mead-path');

  if (silomDisplay) {
    silomDisplay.value = finderCurrentPath || '';
  }

  if (!actualTargetEl) return;

  const useBasin = basinRadio && basinRadio.checked;
  if (useBasin) {
    actualTargetEl.textContent = basinSelect && basinSelect.value
      ? basinSelect.value
      : '— select a basin above —';
  } else {
    actualTargetEl.textContent = finderCurrentPath || '— no active folder in silo m —';
  }

  calculateCraterNumber();
}

function getPistolTargetPath() {
  const basinRadio = document.getElementById('pistol-radio-basin');
  const basinSelect = document.getElementById('pistol-basin-select');
  if (basinRadio && basinRadio.checked) {
    return basinSelect?.value || null;
  }
  return finderCurrentPath || null;
}

function getPistolIncrement() {
  const activeBtn = document.querySelector('#pistol-increment-group .mead-toggle-btn.mead-active');
  if (!activeBtn) return 2;
  if (activeBtn.dataset.value === 'custom') {
    const val = parseInt(document.getElementById('pistol-custom-increment')?.value || '0', 10);
    return isNaN(val) ? 0 : val;
  }
  return parseInt(activeBtn.dataset.value, 10) || 2;
}

async function calculateCraterNumber() {
  const craterEl = document.getElementById('pistol-crater-number');
  if (!craterEl) return;

  const targetPath = getPistolTargetPath();
  if (!targetPath) {
    craterEl.textContent = '—';
    return;
  }

  try {
    const contents = await window.electronAPI.getDirectoryContents(targetPath);
    let highest = 0;
    contents
      .filter(item => item.isDirectory)
      .forEach(dir => {
        const match = dir.name.match(/^(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > highest) highest = num;
        }
      });

    craterEl.textContent = highest + getPistolIncrement();
  } catch (err) {
    console.error('calculateCraterNumber error:', err);
    craterEl.textContent = '—';
  }
}

function initializeMeadToggleGroups() {
  // Increment group
  const incrementGroup = document.getElementById('pistol-increment-group');
  const customInput = document.getElementById('pistol-custom-increment');
  if (incrementGroup) {
    incrementGroup.querySelectorAll('.mead-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        incrementGroup.querySelectorAll('.mead-toggle-btn').forEach(b => b.classList.remove('mead-active'));
        btn.classList.add('mead-active');
        if (btn.dataset.value === 'custom') {
          customInput.style.display = 'inline-block';
          customInput.focus();
        } else {
          customInput.style.display = 'none';
          calculateCraterNumber();
        }
      });
    });
    if (customInput) {
      customInput.addEventListener('input', calculateCraterNumber);
    }
  }

  // File type group
  const filetypeGroup = document.getElementById('pistol-filetype-group');
  if (filetypeGroup) {
    filetypeGroup.querySelectorAll('.mead-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filetypeGroup.querySelectorAll('.mead-toggle-btn').forEach(b => b.classList.remove('mead-active'));
        btn.classList.add('mead-active');
      });
    });
  }
}

function initializeMeadActionButtons() {
  ['pistol-create-folder-btn', 'pistol-folder-file-btn', 'pistol-open-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        // UI only — functionality to be wired up later
      });
    }
  });
}

function initializeJupiterActions() {
  const openBtn = document.getElementById('jupiter-open-btn');
  const showInFinderBtn = document.getElementById('jupiter-show-in-finder-btn');
  const addToStreamBtn = document.getElementById('jupiter-add-to-stream-btn');
  const streamDropdown = document.getElementById('jupiter-stream-dropdown');
  
  if (openBtn) {
    openBtn.addEventListener('click', async () => {
      if (currentSelectedFilePath) {
        try {
          await window.electronAPI.openFile(currentSelectedFilePath);
          console.log('Opened file:', currentSelectedFilePath);
        } catch (error) {
          console.error('Error opening file:', error);
        }
      }
    });
  }
  
  if (showInFinderBtn) {
    showInFinderBtn.addEventListener('click', async () => {
      if (currentSelectedFilePath) {
        try {
          await window.electronAPI.openInFinder(currentSelectedFilePath);
          console.log('Showed file in Finder:', currentSelectedFilePath);
        } catch (error) {
          console.error('Error showing file in Finder:', error);
        }
      }
    });
  }
  
  // Add to Stream dropdown functionality
  if (addToStreamBtn && streamDropdown) {
    addToStreamBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      if (!currentSelectedFilePath) {
        showNotification('No file selected', 'error');
        return;
      }
      
      // Toggle dropdown visibility
      const isVisible = streamDropdown.style.display !== 'none';
      streamDropdown.style.display = isVisible ? 'none' : 'block';
    });
    
    // Handle stream option clicks
    const streamOptions = streamDropdown.querySelectorAll('.jupiter-stream-option');
    streamOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const streamNumber = parseInt(option.dataset.stream);
        
        if (currentSelectedFilePath) {
          // Add file to the selected stream
          const fileName = currentSelectedFilePath.split('/').pop();
          addItemToStream(streamNumber, currentSelectedFilePath, fileName);
          
          // Show success notification
          showNotification(`Added "${fileName}" to Stream ${streamNumber}`, 'success');
          
          // Hide dropdown
          streamDropdown.style.display = 'none';
          
          // Update stream display if currently viewing that stream
          if (currentStream === streamNumber) {
            renderSiloLStreamItems(streamNumber);
          }
        }
      });
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!addToStreamBtn.contains(e.target) && !streamDropdown.contains(e.target)) {
        streamDropdown.style.display = 'none';
      }
    });
  }
}