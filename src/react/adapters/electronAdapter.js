// Adapter to make Next.js components work in Electron

// Mock Next.js router
export const useRouter = () => ({
  push: (path) => console.log('Navigate to:', path),
  query: {},
  pathname: '/admin/filegun'
});

// Mock Next.js dynamic import
export const dynamic = (importFunc, options) => {
  // Return a simple component that loads synchronously for now
  return importFunc().then(mod => mod.default || mod);
};

// Mock auth context
export const useAuth = () => ({
  user: { email: 'user@pavilion.app' },
  loading: false
});

// Adapt Supabase calls to use Electron IPC
export const createClientComponentClient = () => ({
  from: (table) => ({
    select: async (columns) => {
      // Route to Electron IPC
      if (table === 'filegun_folders') {
        const result = await window.electronAPI.dbGetFolders({});
        return { data: result.data, error: null };
      }
      return { data: [], error: null };
    },
    insert: async (data) => {
      console.log('Insert to', table, data);
      return { data: null, error: null };
    },
    update: async (data) => {
      console.log('Update', table, data);
      return { data: null, error: null };
    },
    delete: async () => {
      console.log('Delete from', table);
      return { data: null, error: null };
    }
  })
});

// File operations adapter
export const fileOperations = {
  listDirectory: async (path) => {
    return window.electronAPI.getDirectoryContents(path);
  },
  createFolder: async (parentPath, folderName) => {
    return window.electronAPI.createFolder(parentPath, folderName);
  },
  deleteItem: async (path) => {
    return window.electronAPI.deleteFile(path);
  },
  openFile: async (path) => {
    return window.electronAPI.openFile(path);
  }
};