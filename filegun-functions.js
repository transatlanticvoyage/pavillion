// ===== Filegun, FolderJar, FobjectJar Functions =====

// FolderJar Implementation
function initializeFolderJar() {
  const state = {
    data: [],
    filteredData: [],
    currentPage: 1,
    itemsPerPage: 100,
    sortField: 'file_system_created',
    sortOrder: 'DESC',
    searchTerm: '',
    selectedRows: new Set()
  };

  // Load initial data
  loadFolderData();

  // Setup event listeners
  document.getElementById('folderjar-search').addEventListener('input', (e) => {
    state.searchTerm = e.target.value;
    filterAndRenderData();
  });

  document.getElementById('folderjar-items-per-page').addEventListener('change', (e) => {
    state.itemsPerPage = parseInt(e.target.value);
    state.currentPage = 1;
    renderTable();
  });

  document.getElementById('folderjar-prev').addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderTable();
    }
  });

  document.getElementById('folderjar-next').addEventListener('click', () => {
    const totalPages = Math.ceil(state.filteredData.length / state.itemsPerPage);
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderTable();
    }
  });

  document.getElementById('folderjar-refresh').addEventListener('click', loadFolderData);

  document.getElementById('folderjar-create').addEventListener('click', async () => {
    // Scan current directory and add to database
    const currentPath = await window.electronAPI.getDownloadsPath();
    const result = await window.electronAPI.dbScanDirectory(currentPath);
    if (result.success) {
      console.log(`Scanned ${result.scanned} items`);
      loadFolderData();
    }
  });

  document.getElementById('folderjar-select-all').addEventListener('change', (e) => {
    if (e.target.checked) {
      state.filteredData.forEach(item => state.selectedRows.add(item.folder_id));
    } else {
      state.selectedRows.clear();
    }
    renderTable();
  });

  async function loadFolderData() {
    const options = {
      search: state.searchTerm,
      sortField: state.sortField,
      sortOrder: state.sortOrder
    };
    
    const result = await window.electronAPI.dbGetFolders(options);
    state.data = result.data || [];
    filterAndRenderData();
  }

  function filterAndRenderData() {
    if (state.searchTerm) {
      state.filteredData = state.data.filter(item => 
        item.folder_name?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        item.folder_path?.toLowerCase().includes(state.searchTerm.toLowerCase())
      );
    } else {
      state.filteredData = [...state.data];
    }
    state.currentPage = 1;
    renderTable();
  }

  function renderTable() {
    const tbody = document.getElementById('folderjar-tbody');
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const pageData = state.filteredData.slice(startIndex, endIndex);
    
    tbody.innerHTML = '';
    
    pageData.forEach(item => {
      const tr = document.createElement('tr');
      if (state.selectedRows.has(item.folder_id)) {
        tr.classList.add('selected');
      }
      
      tr.innerHTML = `
        <td class="td-checkbox">
          <input type="checkbox" ${state.selectedRows.has(item.folder_id) ? 'checked' : ''} 
                 data-id="${item.folder_id}">
        </td>
        <td>${item.folder_id || ''}</td>
        <td>${item.folder_name || ''}</td>
        <td>${item.folder_path || ''}</td>
        <td>${item.folder_parent_path || ''}</td>
        <td>${item.depth || ''}</td>
        <td>${formatDate(item.file_system_created)}</td>
        <td>${formatDate(item.file_system_modified)}</td>
        <td>${formatDate(item.last_accessed_at)}</td>
        <td>${renderBoolean(item.is_protected)}</td>
        <td>${item.permissions || ''}</td>
        <td>${renderBoolean(item.is_pinned)}</td>
        <td>${item.sync_status || ''}</td>
        <td>
          <button class="action-btn" style="padding: 4px 8px; font-size: 12px;">Edit</button>
        </td>
      `;
      
      // Add checkbox listener
      const checkbox = tr.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.checked) {
          state.selectedRows.add(id);
          tr.classList.add('selected');
        } else {
          state.selectedRows.delete(id);
          tr.classList.remove('selected');
        }
      });
      
      tbody.appendChild(tr);
    });
    
    // Update pagination info
    const totalPages = Math.ceil(state.filteredData.length / state.itemsPerPage);
    document.getElementById('folderjar-page-info').textContent = `Page ${state.currentPage} of ${totalPages}`;
    document.getElementById('folderjar-showing').textContent = 
      `Showing ${startIndex + 1}-${Math.min(endIndex, state.filteredData.length)} of ${state.filteredData.length}`;
    
    // Update button states
    document.getElementById('folderjar-prev').disabled = state.currentPage === 1;
    document.getElementById('folderjar-next').disabled = state.currentPage === totalPages;
  }
}

// FobjectJar Implementation
function initializeFobjectJar() {
  const state = {
    data: [],
    filteredData: [],
    currentPage: 1,
    itemsPerPage: 100,
    sortField: 'file_system_modified',
    sortOrder: 'DESC',
    searchTerm: '',
    typeFilter: 'all',
    selectedRows: new Set()
  };

  // Load initial data
  loadUnifiedData();

  // Setup event listeners
  document.getElementById('fobjectjar-search').addEventListener('input', (e) => {
    state.searchTerm = e.target.value;
    filterAndRenderData();
  });

  document.getElementById('fobjectjar-type-filter').addEventListener('change', (e) => {
    state.typeFilter = e.target.value;
    loadUnifiedData();
  });

  document.getElementById('fobjectjar-items-per-page').addEventListener('change', (e) => {
    state.itemsPerPage = parseInt(e.target.value);
    state.currentPage = 1;
    renderTable();
  });

  document.getElementById('fobjectjar-prev').addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderTable();
    }
  });

  document.getElementById('fobjectjar-next').addEventListener('click', () => {
    const totalPages = Math.ceil(state.filteredData.length / state.itemsPerPage);
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderTable();
    }
  });

  document.getElementById('fobjectjar-refresh').addEventListener('click', loadUnifiedData);

  document.getElementById('fobjectjar-create-folder').addEventListener('click', async () => {
    const currentPath = await window.electronAPI.getDownloadsPath();
    const result = await window.electronAPI.dbScanDirectory(currentPath);
    if (result.success) {
      console.log(`Scanned ${result.scanned} items`);
      loadUnifiedData();
    }
  });

  document.getElementById('fobjectjar-select-all').addEventListener('change', (e) => {
    if (e.target.checked) {
      state.filteredData.forEach(item => state.selectedRows.add(`${item.type}-${item.id}`));
    } else {
      state.selectedRows.clear();
    }
    renderTable();
  });

  async function loadUnifiedData() {
    const options = {
      search: state.searchTerm,
      typeFilter: state.typeFilter,
      sortField: state.sortField,
      sortOrder: state.sortOrder
    };
    
    const result = await window.electronAPI.dbGetUnified(options);
    state.data = result.data || [];
    filterAndRenderData();
  }

  function filterAndRenderData() {
    if (state.searchTerm) {
      state.filteredData = state.data.filter(item => 
        item.name?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        item.path?.toLowerCase().includes(state.searchTerm.toLowerCase())
      );
    } else {
      state.filteredData = [...state.data];
    }
    state.currentPage = 1;
    renderTable();
  }

  function renderTable() {
    const tbody = document.getElementById('fobjectjar-tbody');
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const pageData = state.filteredData.slice(startIndex, endIndex);
    
    tbody.innerHTML = '';
    
    pageData.forEach(item => {
      const tr = document.createElement('tr');
      const itemId = `${item.type}-${item.id}`;
      if (state.selectedRows.has(itemId)) {
        tr.classList.add('selected');
      }
      
      tr.innerHTML = `
        <td class="td-checkbox">
          <input type="checkbox" ${state.selectedRows.has(itemId) ? 'checked' : ''} 
                 data-id="${itemId}">
        </td>
        <td><span class="type-badge ${item.type}">${item.type}</span></td>
        <td>${item.id || ''}</td>
        <td>${item.name || ''}</td>
        <td>${item.path || ''}</td>
        <td>${item.parent_path || ''}</td>
        <td>${formatFileSize(item.size)}</td>
        <td>${item.extension || ''}</td>
        <td>${item.depth || ''}</td>
        <td>${formatDate(item.file_system_created)}</td>
        <td>${formatDate(item.file_system_modified)}</td>
        <td>${renderBoolean(item.is_protected)}</td>
        <td>${renderBoolean(item.is_pinned)}</td>
        <td>${item.sync_status || ''}</td>
        <td>
          <button class="action-btn" style="padding: 4px 8px; font-size: 12px;">View</button>
        </td>
      `;
      
      // Add checkbox listener
      const checkbox = tr.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) {
          state.selectedRows.add(id);
          tr.classList.add('selected');
        } else {
          state.selectedRows.delete(id);
          tr.classList.remove('selected');
        }
      });
      
      tbody.appendChild(tr);
    });
    
    // Update pagination info
    const totalPages = Math.ceil(state.filteredData.length / state.itemsPerPage);
    document.getElementById('fobjectjar-page-info').textContent = `Page ${state.currentPage} of ${totalPages}`;
    document.getElementById('fobjectjar-showing').textContent = 
      `Showing ${startIndex + 1}-${Math.min(endIndex, state.filteredData.length)} of ${state.filteredData.length}`;
    
    // Update button states
    document.getElementById('fobjectjar-prev').disabled = state.currentPage === 1;
    document.getElementById('fobjectjar-next').disabled = state.currentPage === totalPages;
  }
}

// Filegun Implementation
function initializeFilegun() {
  // Load the React bundle if not already loaded
  if (!window.mountReactComponent) {
    const reactBundle = document.createElement('script');
    reactBundle.src = './dist/react-bundle.js';
    reactBundle.onload = () => {
      console.log('React bundle loaded, mounting Filegun component');
      if (window.mountReactComponent) {
        window.mountReactComponent('FilegunPage', 'filegun-react-root');
      }
    };
    document.head.appendChild(reactBundle);
  } else {
    // React bundle already loaded, just mount the component
    window.mountReactComponent('FilegunPage', 'filegun-react-root');
    console.log('Filegun React component mounted');
  }
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function renderBoolean(value) {
  if (value === true) return '<span class="bool-true"></span>';
  if (value === false) return '<span class="bool-false"></span>';
  return '<span class="bool-null"></span>';
}