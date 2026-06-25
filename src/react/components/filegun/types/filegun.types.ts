export interface FilegunItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size: number;
  modified: Date;
  extension?: string;
  permissions: string;
  isHidden: boolean;
  isProtected: boolean;
}

export interface FilegunOperation {
  action: 'create' | 'rename' | 'delete' | 'move' | 'copy' | 'zip';
  source: string;
  target?: string;
  timestamp: Date;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

export interface FilegunBookmark {
  fgb_id: number;
  fgb_name: string;
  fgb_path: string;
  fgb_type: 'folder' | 'file';
  fgb_color: string;
  fgb_icon: string;
  fgb_order: number;
}

export interface FilegunSelection {
  items: FilegunItem[];
  lastSelected: string | null;
  mode: 'single' | 'multiple';
}

export interface FilegunViewState {
  currentPath: string;
  selectedItems: string[];
  viewMode: 'grid' | 'list' | 'tree';
  sortBy: 'name' | 'size' | 'modified' | 'type';
  sortOrder: 'asc' | 'desc';
  showHidden: boolean;
}

export interface FilegunApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}