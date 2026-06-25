# Pavillion Project Context - Complete Implementation Guide

## Project Overview
I am working on a project called **Pavillion** - an Electron desktop application that needs to replicate specific pages and functionality from my main Next.js web application. The goal is to create a desktop version that maintains 100% UI/UX parity with the web app while leveraging Electron's native capabilities for file system operations.

## Directory Structure
- **Main Web App**: `/Users/kc/Documents/repos/localrepo-snefuru4/` (Next.js app)
  - Key pages to copy: `/app/(protected)/admin/filegun/`, `/app/(protected)/admin/filejar/`, `/app/(protected)/admin/folderjar/`
- **Pavillion Desktop App**: `/Users/kc/Documents/repos/localrepo-snefuru4/other-apps/Pavillion/` (Electron app)

## Implementation Philosophy

### 1. Exact UI Replication
- The desktop app must look **exactly** like the web app pages
- Copy all visual elements including chambers, toolbars, split-pane layouts
- Maintain the same component names and structure (e.g., toolbar24, toolbar25, sentinel-lake, mead-lake, hemlock_viewer_pane)
- Preserve the complex multi-chamber UI system from the web app

### 2. Technology Stack Decisions
We've made these key decisions:
- **Hybrid Approach**: Use React components within Electron (not vanilla JS)
- **Database**: SQLite with better-sqlite3 (local) instead of Supabase (cloud)
- **Styling**: Tailwind CSS to match the web app exactly
- **Bundling**: Webpack for React component bundling
- **File Operations**: Direct file system access via Electron IPC

### 3. Database Structure
- **Critical Requirement**: Database tables must have the **exact same names and column names** as the Supabase tables
- Tables needed:
  - `filegun_folders` (folder_id, folder_path, folder_name, date_created, last_modified, etc.)
  - `filegun_files` (file_id, file_path, file_name, file_size, etc.)
  - `filejar_items` (for filejar page)
  - `folderjar_folders` (for folderjar page)
  - `fobjectjar_objects` (for fobjectjar page)

## Current Implementation Status

### Completed:
1. **React Integration Setup**
   - Installed React, React-DOM, webpack, babel
   - Created webpack.config.js for bundling
   - Set up `/src/react/` directory structure
   - Created electronAdapter.js to handle Next.js → Electron compatibility

2. **Database Setup**
   - Integrated better-sqlite3 in main.js
   - Created IPC handlers for database operations
   - Initialized all required tables with exact Supabase schema

3. **Component Migration**
   - Created simplified FilegunPageSimple.jsx as starting point
   - Set up component mounting system via window.mountReactComponent
   - Integrated Tailwind CSS with PostCSS

### File Structure Created:
```
other-apps/Pavillion/
├── src/
│   └── react/
│       ├── index.jsx (React entry point with mounting logic)
│       ├── components/
│       │   ├── filegun/
│       │   │   ├── FilegunPageSimple.jsx (simplified version)
│       │   │   └── FilegunPageElectron.jsx (full version - needs work)
│       │   ├── shared/
│       │   │   └── FilegunFoldersTable.jsx
│       │   └── MenjariButtonBarFileGunLinks.jsx
│       ├── adapters/
│       │   └── electronAdapter.js (Next.js to Electron compatibility)
│       └── styles/
│           └── tailwind.css
├── dist/
│   └── react-bundle.js (webpack output)
├── webpack.config.js
├── tailwind.config.js
├── postcss.config.js
└── index.html (modified to mount React components)
```

## Key Implementation Details

### IPC Handlers (main.js)
```javascript
// Database operations
ipcMain.handle('db-get-folders', async (event, params) => {...})
ipcMain.handle('db-scan-directory', async (event, directoryPath) => {...})

// File operations
ipcMain.handle('get-directory-contents', async (event, dirPath) => {...})
ipcMain.handle('create-folder', async (event, parentPath, folderName) => {...})
ipcMain.handle('delete-file', async (event, filePath) => {...})
```

### React Component Mounting (renderer.js/filegun-functions.js)
```javascript
function initializeFilegun() {
  if (window.mountReactComponent) {
    window.mountReactComponent('FilegunPage', 'filegun-react-root');
  }
}
```

### Electron Adapter Pattern
The electronAdapter.js file provides mock implementations of Next.js features:
- useRouter, useAuth, dynamic imports
- Supabase client that routes to Electron IPC
- File operations that use window.electronAPI

## Pages to Implement

### 1. Filegun Page (`/admin/filegun`)
**Description**: Mac Finder-style column browser with multi-chamber layout
**Key Features**:
- Column-based file navigation
- Multiple viewing chambers (toolbar24, toolbar25, sentinel-lake, mead-lake)
- Split-pane layout with maple_viewer and trench_viewer
- File/folder operations (create, delete, rename)
- Database tracking of all file operations

### 2. FileJar Page (`/admin/filejar`)
**Description**: File management and organization system
**Key Features**:
- Table view of tracked files
- Search and filtering capabilities
- Batch operations
- File metadata management

### 3. FolderJar Page (`/admin/folderjar`)
**Description**: Folder organization and management
**Key Features**:
- Hierarchical folder view
- Folder statistics and analytics
- Batch folder operations
- Custom folder properties

## Technical Challenges & Solutions

### Challenge 1: Next.js Dependencies
**Problem**: Components use Next.js specific imports (useRouter, Link, dynamic)
**Solution**: Created electronAdapter.js with mock implementations

### Challenge 2: TypeScript in JSX Files
**Problem**: Babel can't parse TypeScript syntax in .jsx files
**Solution**: Remove all type annotations when copying components

### Challenge 3: Supabase to SQLite Migration
**Problem**: Components expect Supabase client
**Solution**: Mock Supabase client methods that route to Electron IPC handlers

### Challenge 4: Complex Component Dependencies
**Problem**: FilegunPage has many sub-component dependencies
**Solution**: Start with simplified version (FilegunPageSimple.jsx), gradually add complexity

## Next Steps Priority

1. **Complete FilegunPageElectron.jsx**
   - Remove all TypeScript annotations
   - Update all imports to use relative paths
   - Replace Supabase calls with electronAPI calls
   - Create stub components for missing dependencies

2. **Implement Missing Components**
   - FilegunExplorer
   - FilegunColumnView
   - FilegunToolbar
   - FilegunStatusBar
   - SentinelControl, SentinelStatus, MeadControl

3. **Add FileJar and FolderJar Pages**
   - Copy components from web app
   - Adapt for Electron environment
   - Ensure database compatibility

4. **Testing & Refinement**
   - Verify all file operations work correctly
   - Ensure UI matches web app exactly
   - Test database synchronization

## Important Notes

### Database Compatibility
- **MUST** maintain exact table and column names as Supabase
- Use snake_case for all database fields (e.g., folder_id, file_path)
- Preserve all relationships and constraints from original schema

### UI/UX Requirements
- The desktop app should be indistinguishable from the web app visually
- Maintain all hover states, transitions, and animations
- Keep the same color scheme and spacing
- Preserve the "menjari" button bar with links to all pages

### File System Operations
- Use Electron's native file system APIs for better performance
- Implement proper error handling for file operations
- Add file watching capabilities for real-time updates
- Support drag-and-drop from native OS

### Security Considerations
- Implement proper input sanitization for file paths
- Use contextBridge for secure IPC communication
- Validate all database inputs
- Restrict file system access to user-permitted directories

## Testing Instructions
1. Run `npm start` to launch Pavillion
2. Click on "Filegun" tab to load React component
3. Verify file browsing works
4. Test create folder and delete operations
5. Check that database is being populated correctly

## Build Commands
```bash
# Install dependencies
npm install

# Build React components
npx webpack --mode development

# Start Electron app
npm start

# Rebuild native modules if needed
npx electron-rebuild
```

## Key Files to Reference
- **Web App Filegun**: `/app/(protected)/admin/filegun/page.tsx` - The source we're copying
- **Electron Main**: `/other-apps/Pavillion/main.js` - IPC handlers and database
- **React Entry**: `/other-apps/Pavillion/src/react/index.jsx` - Component mounting
- **Electron Adapter**: `/other-apps/Pavillion/src/react/adapters/electronAdapter.js` - Compatibility layer

This project aims to create a feature-complete desktop version of the web app's file management pages while maintaining the exact same user experience and visual design.