const { app, BrowserWindow, ipcMain, dialog, Menu, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Runtime app name. Must match `productName` in package.json, because this is
// what determines app.getPath('userData') → ~/Library/Application Support/Pavillion.
// (Changing it moves the userData dir, which is where pavilion.db and
// pavilion-config.json live — see the dev doc before touching it.)
app.setName('Pavillion');

let mainWindow;
let userDataPath;
let db;
let isQuitting = false;   // true only once a real quit is underway

// ── Single-instance lock ─────────────────────────────────────────────────────
// Pavillion is resident (it stays alive with the window hidden), so a second
// launch must never spawn a second process — that is what puts a duplicate icon
// in the Dock. Hand focus to the instance that already owns the lock and exit.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    showMainWindow();
    // A second launch may carry a pavilion:// URL (Gazebo's Finder extension
    // fires these); forward it to the live instance.
    const url = argv.find((a) => a.startsWith('pavilion://'));
    if (url) handleProtocolUrl(url);
  });
}

// Bring the window back whether it is hidden, minimized, or closed.
function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f5f5f5',
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile('index.html');

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Closing the window HIDES it rather than tearing the app down. Pavillion is
  // resident so the F9 global hotkey keeps working from other apps — quitting on
  // window close would silently kill the hotkey until the next manual launch.
  // A real quit (Cmd-Q / app.quit()) sets isQuitting and falls through.
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize database
function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'pavilion.db');
  db = new Database(dbPath);
  
  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS filegun_folders (
      folder_id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_path TEXT,
      folder_name TEXT,
      folder_parent_path TEXT,
      depth INTEGER,
      file_system_created TEXT,
      file_system_modified TEXT,
      last_accessed_at TEXT,
      last_sync_at TEXT,
      is_protected BOOLEAN,
      permissions TEXT,
      checksum TEXT,
      sync_status TEXT,
      is_pinned BOOLEAN
    );
    
    CREATE TABLE IF NOT EXISTS elevated_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_path TEXT UNIQUE,
      folder_name TEXT,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS basin_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_path TEXT UNIQUE,
      folder_name TEXT,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS filegun_files (
      file_id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT,
      file_name TEXT,
      file_parent_path TEXT,
      extension TEXT,
      mime_type TEXT,
      file_size INTEGER,
      encoding TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      modified_at TEXT,
      last_accessed_at TEXT,
      file_system_created TEXT,
      file_system_modified TEXT,
      is_protected BOOLEAN,
      permissions TEXT,
      owner_user TEXT,
      owner_group TEXT,
      is_hidden BOOLEAN,
      is_executable BOOLEAN,
      line_count INTEGER,
      character_count INTEGER,
      word_count INTEGER,
      checksum TEXT,
      content_preview TEXT,
      is_code_file BOOLEAN,
      programming_language TEXT,
      git_status TEXT,
      last_git_commit TEXT,
      tags TEXT,
      custom_metadata TEXT,
      user_notes TEXT,
      color_label TEXT,
      importance_level INTEGER,
      sync_status TEXT,
      last_sync_at TEXT,
      is_zepulus_docs BOOLEAN
    );
  `);
  
  // Add is_default column to basin_folders if it doesn't exist yet
  try { db.exec('ALTER TABLE basin_folders ADD COLUMN is_default INTEGER DEFAULT 0'); } catch (e) {}

  console.log('Database initialized at:', dbPath);
}

app.whenReady().then(() => {
  userDataPath = path.join(app.getPath('userData'), 'pavilion-config.json');
  initializeDatabase();
  
  // Register custom protocol for the Gazebo helper.
  // NOTE: the scheme stays spelled 'pavilion' (one L) on purpose, even though the
  // app is now named Pavillion. Gazebo's Finder Sync extension hardcodes it at
  // Gazebo/GazeboFinderExtension/FinderSync.swift:145 —
  //   "pavilion://add-to-stream?stream=...&items=..."
  // Renaming the scheme silently breaks Finder right-click integration and would
  // require rebuilding and re-signing Gazebo's extension. Leave it alone.
  app.setAsDefaultProtocolClient('pavilion');

  // Start at login, so the F9 hotkey is available without launching anything.
  if (process.platform === 'darwin') {
    try {
      app.setLoginItemSettings({ openAtLogin: true, openAsHidden: false });
    } catch (error) {
      console.log('Could not set login item:', error.message);
    }
  }
  
  // Set dock icon for development
  if (process.platform === 'darwin') {
    const iconPath = path.join(__dirname, 'assets/icon.png');
    try {
      app.dock.setIcon(iconPath);
    } catch (error) {
      console.log('Could not set dock icon:', error.message);
    }
  }
  
  createWindow();
  
  // Handle dock icon drag and drop
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    console.log('File dropped on dock icon:', filePath);
    
    // Create window if it doesn't exist
    if (!mainWindow) {
      createWindow();
    }
    
    // Wait for window to be ready, then send file info
    if (mainWindow) {
      if (mainWindow.webContents.isLoading()) {
        mainWindow.webContents.once('did-finish-load', () => {
          mainWindow.webContents.send('meridian-file-dropped', filePath);
        });
      } else {
        mainWindow.webContents.send('meridian-file-dropped', filePath);
      }
      
      mainWindow.show();
      mainWindow.focus();
    }
  });
  
  // Register F9 global hotkey for Jupiter file selection
  setTimeout(() => {
    const success = globalShortcut.register('F9', () => {
      handleJupiterHotkey();
    });
    
    if (success) {
      console.log('Global shortcut F9 registered successfully for Jupiter');
    } else {
      console.log('Failed to register global shortcut F9');
    }
  }, 1000);

  app.on('activate', () => {
    showMainWindow();
  });
});

app.on('window-all-closed', () => {
  // Deliberately does NOT quit on macOS. Pavillion stays resident so the global
  // hotkey keeps working; the Dock icon reopens the window via 'activate'.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Real teardown happens here — on an actual quit, not on a window close.
app.on('before-quit', () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
  if (db) {
    try { db.close(); } catch (error) { /* already closed */ }
    db = null;
  }
});

function handleJupiterHotkey() {
  console.log('Jupiter hotkey triggered!');
  
  // Get selected file from Finder using AppleScript
  const { exec } = require('child_process');
  const script = `
    tell application "Finder"
      try
        set selectedItems to selection
        if (count of selectedItems) > 0 then
          set firstItem to item 1 of selectedItems
          return POSIX path of (firstItem as alias)
        else
          return ""
        end if
      on error
        return ""
      end try
    end tell
  `;
  
  exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
    if (error) {
      console.error('Error getting Finder selection:', error);
      return;
    }
    
    const filePath = stdout.trim();
    if (filePath && mainWindow) {
      console.log('Selected file:', filePath);
      // Switch to Jupiter tab and set the file
      mainWindow.webContents.send('jupiter-file-selected', filePath);
      
      // Bring Pavillion to front
      mainWindow.show();
      mainWindow.focus();
      app.focus();
    } else {
      console.log('No file selected in Finder');
    }
  });
}

// Handle custom protocol (from Gazebo helper).
// Extracted into a named function so the single-instance 'second-instance'
// handler can replay a URL that arrived on a second launch.
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

function handleProtocolUrl(url) {
  console.log('Received URL:', url);

  // Pavillion may be sitting hidden (resident mode) — surface it before we
  // push anything at the renderer.
  showMainWindow();

  if (url.startsWith('pavilion://jupiter-file')) {
    const urlParams = new URL(url);
    const filePath = urlParams.searchParams.get('path');
    
    if (filePath && mainWindow) {
      // Switch to Jupiter tab and set the file
      mainWindow.webContents.send('jupiter-file-selected', filePath);
    }
  } else if (url.startsWith('pavilion://add-to-stream')) {
    const urlObj = new URL(url);
    const streamNumber = parseInt(urlObj.searchParams.get('stream'));
    const itemsParam = urlObj.searchParams.get('items');
    
    console.log('Gazebo stream request - Stream:', streamNumber, 'Items param:', itemsParam);
    
    if (streamNumber && itemsParam) {
      const items = decodeURIComponent(itemsParam).split('|').map(path => ({
        name: path.split('/').pop(),
        path: path
      }));
      
      console.log('Processed items:', items);
      
      // Send to renderer
      if (mainWindow) {
        mainWindow.webContents.send('gazebo-add-to-stream', {
          streamNumber,
          action: 'addToStream',
          items
        });
      }
    }
  }
}

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'multiSelections']
  });
  
  if (!result.canceled) {
    return result.filePaths;
  }
  return null;
});

ipcMain.handle('get-folder-contents', async (event, folderPath) => {
  try {
    const items = await fs.promises.readdir(folderPath, { withFileTypes: true });
    return items
      .filter(item => item.isDirectory())
      .map(item => ({
        name: item.name,
        path: path.join(folderPath, item.name)
      }));
  } catch (error) {
    console.error('Error reading folder:', error);
    return [];
  }
});

ipcMain.handle('open-in-finder', async (event, folderPath) => {
  shell.showItemInFolder(folderPath);
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  shell.openPath(folderPath);
});

ipcMain.handle('save-config', async (event, config) => {
  try {
    await fs.promises.writeFile(userDataPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
});

ipcMain.handle('load-config', async () => {
  try {
    if (fs.existsSync(userDataPath)) {
      const data = await fs.promises.readFile(userDataPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return null;
});

ipcMain.handle('remove-folder', async (event, { sidebarId, folderPath }) => {
  return true;
});

ipcMain.handle('get-folder-info', async (event, folderPath) => {
  try {
    const stats = await fs.promises.stat(folderPath);
    const items = await fs.promises.readdir(folderPath);
    return {
      itemCount: items.length,
      modified: stats.mtime
    };
  } catch (error) {
    console.error('Error getting folder info:', error);
    return null;
  }
});

ipcMain.handle('get-downloads-path', async () => {
  return app.getPath('downloads');
});

ipcMain.handle('get-directory-contents', async (event, dirPath) => {
  try {
    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const contents = await Promise.all(
      items.map(async (item) => {
        const itemPath = path.join(dirPath, item.name);
        try {
          const stats = await fs.promises.stat(itemPath);
          return {
            name: item.name,
            path: itemPath,
            isDirectory: item.isDirectory(),
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime
          };
        } catch (error) {
          return {
            name: item.name,
            path: itemPath,
            isDirectory: item.isDirectory(),
            size: 0,
            modified: new Date(),
            created: new Date()
          };
        }
      })
    );
    
    // Filter out temporary Office files (~$), .DS_Store files, and other system files
    const filteredContents = contents.filter(item => {
      // Filter out .DS_Store files (macOS metadata files)
      if (item.name === '.DS_Store') {
        return false;
      }
      
      // Filter out ALL temporary Office files starting with ~$
      // These are lock/temp files that can't be opened normally anyway
      if (item.name.startsWith('~$')) {
        return false;
      }
      
      // Filter out other common temporary/system files
      if (item.name.startsWith('._')) {  // macOS resource fork files
        return false;
      }
      
      if (item.name === 'Thumbs.db') {  // Windows thumbnail cache
        return false;
      }
      
      // Keep all other files
      return true;
    });
    
    filteredContents.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) {
        return a.name.localeCompare(b.name);
      }
      return a.isDirectory ? -1 : 1;
    });
    
    return filteredContents;
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
});

ipcMain.handle('get-file-info', async (event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    return {
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime,
      isDirectory: stats.isDirectory()
    };
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
});

ipcMain.handle('open-file', async (event, filePath) => {
  shell.openPath(filePath);
});

ipcMain.handle('get-special-path', async (event, pathType) => {
  const homePath = app.getPath('home');
  
  switch(pathType) {
    case 'home':
      return homePath;
    case 'desktop':
      return app.getPath('desktop');
    case 'documents':
      return app.getPath('documents');
    case 'downloads':
      return app.getPath('downloads');
    case 'applications':
      return '/Applications';
    case 'dropbox':
      return path.join(homePath, 'Dropbox');
    case 'google-drive':
      return path.join(homePath, 'Google Drive');
    case 'onedrive':
      return path.join(homePath, 'OneDrive');
    case 'icloud':
      return path.join(homePath, 'Library/Mobile Documents/com~apple~CloudDocs');
    default:
      return homePath;
  }
});

ipcMain.handle('create-folder', async (event, parentPath, folderName) => {
  try {
    const newPath = path.join(parentPath, folderName);
    await fs.promises.mkdir(newPath);
    return { success: true, path: newPath };
  } catch (error) {
    console.error('Error creating folder:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    if (stats.isDirectory()) {
      await fs.promises.rmdir(filePath, { recursive: true });
    } else {
      await fs.promises.unlink(filePath);
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('confirm-delete', async (event, count) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Delete', 'Cancel'],
    defaultId: 1,
    message: `Are you sure you want to delete ${count} item${count > 1 ? 's' : ''}?`,
    detail: 'This action cannot be undone.'
  });
  return result.response === 0;
});

ipcMain.handle('check-path-exists', async (event, pathToCheck) => {
  try {
    await fs.promises.access(pathToCheck);
    return true;
  } catch (error) {
    return false;
  }
});

// Database IPC Handlers
ipcMain.handle('db-get-folders', async (event, options = {}) => {
  if (!db) {
    console.error('Database not initialized');
    return { data: [], total: 0, error: 'Database not initialized' };
  }
  try {
    let query = 'SELECT * FROM filegun_folders';
    const params = [];
    
    if (options.search) {
      query += ' WHERE folder_name LIKE ? OR folder_path LIKE ?';
      params.push(`%${options.search}%`, `%${options.search}%`);
    }
    
    query += ' ORDER BY ' + (options.sortField || 'file_system_created') + ' ' + (options.sortOrder || 'DESC');
    
    if (options.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(options.limit, options.offset || 0);
    }
    
    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM filegun_folders';
    if (options.search) {
      countQuery += ' WHERE folder_name LIKE ? OR folder_path LIKE ?';
    }
    const countStmt = db.prepare(countQuery);
    const count = options.search ? 
      countStmt.get(`%${options.search}%`, `%${options.search}%`) : 
      countStmt.get();
    
    return { data: rows, total: count.total };
  } catch (error) {
    console.error('Database error:', error);
    return { data: [], total: 0, error: error.message };
  }
});

ipcMain.handle('db-get-files', async (event, options = {}) => {
  if (!db) {
    console.error('Database not initialized');
    return { data: [], total: 0, error: 'Database not initialized' };
  }
  try {
    let query = 'SELECT * FROM filegun_files';
    const params = [];
    
    if (options.search) {
      query += ' WHERE file_name LIKE ? OR file_path LIKE ?';
      params.push(`%${options.search}%`, `%${options.search}%`);
    }
    
    query += ' ORDER BY ' + (options.sortField || 'created_at') + ' ' + (options.sortOrder || 'DESC');
    
    if (options.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(options.limit, options.offset || 0);
    }
    
    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM filegun_files';
    if (options.search) {
      countQuery += ' WHERE file_name LIKE ? OR file_path LIKE ?';
    }
    const countStmt = db.prepare(countQuery);
    const count = options.search ? 
      countStmt.get(`%${options.search}%`, `%${options.search}%`) : 
      countStmt.get();
    
    return { data: rows, total: count.total };
  } catch (error) {
    console.error('Database error:', error);
    return { data: [], total: 0, error: error.message };
  }
});

ipcMain.handle('db-get-unified', async (event, options = {}) => {
  if (!db) {
    console.error('Database not initialized');
    return { data: [], total: 0, error: 'Database not initialized' };
  }
  try {
    // Combine files and folders for unified view
    let filesQuery = `SELECT 'file' as type, file_id as id, file_name as name, file_path as path, 
                      file_parent_path as parent_path, file_size as size, extension, 
                      NULL as depth, file_system_created, file_system_modified, 
                      is_protected, permissions, NULL as is_pinned, sync_status
                      FROM filegun_files`;
    
    let foldersQuery = `SELECT 'folder' as type, folder_id as id, folder_name as name, 
                        folder_path as path, folder_parent_path as parent_path, 
                        NULL as size, NULL as extension, depth, 
                        file_system_created, file_system_modified, 
                        is_protected, permissions, is_pinned, sync_status
                        FROM filegun_folders`;
    
    const params = [];
    let whereClause = '';
    
    if (options.search) {
      whereClause = ' WHERE name LIKE ? OR path LIKE ?';
      params.push(`%${options.search}%`, `%${options.search}%`);
    }
    
    if (options.typeFilter && options.typeFilter !== 'all') {
      if (options.typeFilter === 'file') {
        foldersQuery = 'SELECT * FROM (SELECT NULL LIMIT 0) WHERE 1=0'; // Empty folders
      } else if (options.typeFilter === 'folder') {
        filesQuery = 'SELECT * FROM (SELECT NULL LIMIT 0) WHERE 1=0'; // Empty files
      }
    }
    
    let query = `SELECT * FROM ((${filesQuery}${whereClause}) UNION ALL (${foldersQuery}${whereClause})) 
                 ORDER BY ${options.sortField || 'file_system_modified'} ${options.sortOrder || 'DESC'}`;
    
    if (options.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(options.limit, options.offset || 0);
    }
    
    const stmt = db.prepare(query);
    const rows = stmt.all(...params.concat(params)); // Duplicate params for both subqueries
    
    // Get total count
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM ((${filesQuery}${whereClause}) UNION ALL (${foldersQuery}${whereClause}))`);
    const count = options.search ? 
      countStmt.get(...params.concat(params)) : 
      countStmt.get();
    
    return { data: rows, total: count.total };
  } catch (error) {
    console.error('Database error:', error);
    return { data: [], total: 0, error: error.message };
  }
});

ipcMain.handle('db-scan-directory', async (event, dirPath) => {
  if (!db) {
    console.error('Database not initialized');
    return { success: false, error: 'Database not initialized' };
  }
  try {
    const stats = await fs.promises.stat(dirPath);
    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    const results = [];
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      try {
        const itemStats = await fs.promises.stat(itemPath);
        
        if (item.isDirectory()) {
          // Insert folder
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO filegun_folders 
            (folder_path, folder_name, folder_parent_path, depth, file_system_created, 
             file_system_modified, is_protected, sync_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          stmt.run(
            itemPath,
            item.name,
            dirPath,
            itemPath.split(path.sep).length,
            itemStats.birthtime.toISOString(),
            itemStats.mtime.toISOString(),
            false,
            'synced'
          );
        } else {
          // Insert file
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO filegun_files 
            (file_path, file_name, file_parent_path, extension, file_size, 
             file_system_created, file_system_modified, is_protected, sync_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          stmt.run(
            itemPath,
            item.name,
            dirPath,
            path.extname(item.name),
            itemStats.size,
            itemStats.birthtime.toISOString(),
            itemStats.mtime.toISOString(),
            false,
            'synced'
          );
        }
        
        results.push({ path: itemPath, success: true });
      } catch (error) {
        results.push({ path: itemPath, success: false, error: error.message });
      }
    }
    
    return { success: true, scanned: results.length, results };
  } catch (error) {
    console.error('Scan error:', error);
    return { success: false, error: error.message };
  }
});

// Add missing database handlers for Filegun
ipcMain.handle('db-update-folder', async (event, folderPath, updates) => {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }
  
  try {
    const updateFields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      updateFields.push(`${key} = ?`);
      values.push(value);
    }
    
    values.push(folderPath);
    
    const stmt = db.prepare(`
      UPDATE filegun_folders 
      SET ${updateFields.join(', ')} 
      WHERE folder_path = ?
    `);
    
    const result = stmt.run(...values);
    
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error('Update folder error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-add-elevated', async (event, folderPath, folderName) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO elevated_folders (folder_path, folder_name) VALUES (?, ?)');
    const result = stmt.run(folderPath, folderName);
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error('db-add-elevated error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-get-elevated', async () => {
  if (!db) return { data: [], error: 'Database not initialized' };
  try {
    const rows = db.prepare('SELECT * FROM elevated_folders ORDER BY added_at DESC').all();
    return { data: rows };
  } catch (error) {
    console.error('db-get-elevated error:', error);
    return { data: [], error: error.message };
  }
});

ipcMain.handle('db-remove-elevated', async (event, folderPath) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  try {
    const result = db.prepare('DELETE FROM elevated_folders WHERE folder_path = ?').run(folderPath);
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error('db-remove-elevated error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-add-basin', async (event, folderPath, folderName) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO basin_folders (folder_path, folder_name) VALUES (?, ?)');
    const result = stmt.run(folderPath, folderName);
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error('db-add-basin error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-get-basin', async () => {
  if (!db) return { data: [], error: 'Database not initialized' };
  try {
    const rows = db.prepare('SELECT * FROM basin_folders ORDER BY added_at DESC').all();
    return { data: rows };
  } catch (error) {
    console.error('db-get-basin error:', error);
    return { data: [], error: error.message };
  }
});

ipcMain.handle('db-set-default-basin', async (event, folderPath) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  try {
    db.exec('UPDATE basin_folders SET is_default = 0');
    db.prepare('UPDATE basin_folders SET is_default = 1 WHERE folder_path = ?').run(folderPath);
    return { success: true };
  } catch (error) {
    console.error('db-set-default-basin error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-get-default-basin', async () => {
  if (!db) return { data: null };
  try {
    const row = db.prepare('SELECT * FROM basin_folders WHERE is_default = 1 LIMIT 1').get();
    return { data: row || null };
  } catch (error) {
    console.error('db-get-default-basin error:', error);
    return { data: null, error: error.message };
  }
});

ipcMain.handle('db-remove-basin', async (event, folderPath) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  try {
    const result = db.prepare('DELETE FROM basin_folders WHERE folder_path = ?').run(folderPath);
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error('db-remove-basin error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-file', async (event, filePath, content = '') => {
  try {
    await fs.promises.writeFile(filePath, content);
    return { success: true };
  } catch (error) {
    console.error('Create file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rename-file', async (event, oldPath, newName) => {
  try {
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);
    await fs.promises.rename(oldPath, newPath);
    return { success: true, newPath };
  } catch (error) {
    console.error('Rename file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-available-cloud-storage', async () => {
  const homePath = app.getPath('home');
  const cloudServices = [
    { id: 'dropbox', name: '📦 Dropbox', path: path.join(homePath, 'Dropbox') },
    { id: 'google-drive', name: '🔵 Google Drive', path: path.join(homePath, 'Google Drive') },
    { id: 'onedrive', name: '☁️ OneDrive', path: path.join(homePath, 'OneDrive') },
    { id: 'icloud', name: '☁️ iCloud Drive', path: path.join(homePath, 'Library/Mobile Documents/com~apple~CloudDocs') }
  ];
  
  const availableServices = [];
  
  for (const service of cloudServices) {
    try {
      await fs.promises.access(service.path);
      availableServices.push(service);
    } catch (error) {
      // Service not available, skip it
    }
  }
  
  return availableServices;
});

ipcMain.handle('copy-files', async (event, filePaths) => {
  try {
    const { spawn } = require('child_process');
    const script = `
      set filePaths to {${filePaths.map(p => `"${p}"`).join(', ')}}
      set fileList to {}
      repeat with filePath in filePaths
        set fileList to fileList & (POSIX file filePath)
      end repeat
      set the clipboard to fileList
    `;
    
    return new Promise((resolve) => {
      const osascript = spawn('osascript', ['-e', script]);
      osascript.on('close', (code) => {
        resolve({ success: code === 0 });
      });
    });
  } catch (error) {
    console.error('Error copying files:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('paste-files', async (event, destinationPath) => {
  try {
    const { spawn } = require('child_process');
    const script = `
      set destinationPath to "${destinationPath}"
      tell application "Finder"
        try
          duplicate (the clipboard) to folder (POSIX file destinationPath as alias)
          return "success"
        on error errMsg
          return "error: " & errMsg
        end try
      end tell
    `;
    
    return new Promise((resolve) => {
      const osascript = spawn('osascript', ['-e', script]);
      osascript.on('close', (code) => {
        resolve({ success: code === 0 });
      });
    });
  } catch (error) {
    console.error('Error pasting files:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('paste-files-m2', async (event, destinationPath) => {
  try {
    const { exec, spawn } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    // Method 2: Search for files by filename in common locations
    try {
      const { stdout: clipboardText } = await execAsync('pbpaste');
      const filename = clipboardText.trim();
      
      console.log('M2 Clipboard filename:', filename);
      
      if (filename && filename.length > 0 && !filename.includes('\n')) {
        // Search for this file in common locations
        const searchPaths = [
          app.getPath('downloads'),
          app.getPath('desktop'), 
          app.getPath('documents'),
          app.getPath('home')
        ];
        
        console.log('M2 Searching for file:', filename);
        
        for (const searchPath of searchPaths) {
          try {
            const { stdout: findResult } = await execAsync(`find "${searchPath}" -name "${filename}" -type f 2>/dev/null | head -1`);
            const foundPath = findResult.trim();
            
            if (foundPath) {
              console.log('M2 Found file at:', foundPath);
              
              // Copy the found file to destination
              const copyScript = `
                set sourcePath to "${foundPath}"
                set destinationPath to "${destinationPath}"
                tell application "Finder"
                  try
                    set sourceFile to POSIX file sourcePath as alias
                    set targetFolder to folder (POSIX file destinationPath as alias)
                    duplicate sourceFile to targetFolder
                    return "success"
                  on error errMsg
                    return "error: " & errMsg
                  end try
                end tell
              `;
              
              return new Promise((resolve) => {
                const copyProcess = spawn('osascript', ['-e', copyScript]);
                let copyOutput = '';
                
                copyProcess.stdout.on('data', (data) => {
                  copyOutput += data.toString();
                });
                
                copyProcess.on('close', (code) => {
                  console.log('M2 Copy result:', copyOutput.trim());
                  
                  if (copyOutput.includes('success')) {
                    resolve({ success: true });
                  } else {
                    resolve({ success: false, error: `Failed to copy file: ${copyOutput.trim()}` });
                  }
                });
              });
            }
          } catch (error) {
            // Continue searching in other locations
            continue;
          }
        }
        
        return { success: false, error: `File "${filename}" not found in common locations` };
      }
      
      return { success: false, error: 'No valid filename found in clipboard' };
      
    } catch (error) {
      console.error('Error reading clipboard:', error);
      return { success: false, error: 'Failed to read clipboard' };
    }
  } catch (error) {
    console.error('Error pasting files:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('move-files', async (event, filePaths, destinationPath) => {
  try {
    const { spawn } = require('child_process');
    const script = `
      set filePaths to {${filePaths.map(p => `"${p}"`).join(', ')}}
      set destinationPath to "${destinationPath}"
      tell application "Finder"
        repeat with filePath in filePaths
          move (POSIX file filePath) to POSIX file destinationPath
        end repeat
      end tell
    `;
    
    return new Promise((resolve) => {
      const osascript = spawn('osascript', ['-e', script]);
      osascript.on('close', (code) => {
        resolve({ success: code === 0 });
      });
    });
  } catch (error) {
    console.error('Error moving files:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-gazebo-temp-file', async () => {
  const os = require('os');
  const tempFilePath = path.join(os.tmpdir(), 'gazebo-selected-file.txt');
  
  try {
    if (fs.existsSync(tempFilePath)) {
      const filePath = fs.readFileSync(tempFilePath, 'utf8').trim();
      // Delete the temp file after reading
      fs.unlinkSync(tempFilePath);
      return filePath;
    }
    return null;
  } catch (error) {
    console.error('Error reading Gazebo temp file:', error);
    return null;
  }
});

ipcMain.handle('check-file-status', async (event, filePath) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    // Use lsof to check if file is open
    const { stdout } = await execAsync(`lsof "${filePath}" 2>/dev/null || echo "NOT_OPEN"`);
    
    if (stdout.trim() === 'NOT_OPEN') {
      return {
        isOpen: false,
        status: 'Available',
        details: 'File is not currently open by any application'
      };
    } else {
      // Parse lsof output to get application names
      const lines = stdout.trim().split('\n');
      const apps = new Set();
      
      for (let i = 1; i < lines.length; i++) { // Skip header line
        const parts = lines[i].split(/\s+/);
        if (parts[0] && parts[0] !== 'COMMAND') {
          apps.add(parts[0]);
        }
      }
      
      return {
        isOpen: true,
        status: 'In Use',
        details: `File is open in: ${Array.from(apps).join(', ')}`
      };
    }
  } catch (error) {
    console.error('Error checking file status:', error);
    return {
      isOpen: null,
      status: 'Unknown',
      details: 'Could not determine file status'
    };
  }
});

