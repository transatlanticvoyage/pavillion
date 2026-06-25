import React from 'react';
import ReactDOM from 'react-dom/client';
import FilegunPageComplete2 from './components/filegun/FilegunPageComplete2';
import './styles/tailwind.css';
import './styles/filegun.css';

// Global function to mount React components in Electron
window.mountReactComponent = (componentName, elementId, props = {}) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  const root = ReactDOM.createRoot(element);
  
  switch (componentName) {
    case 'FilegunPage':
      root.render(<FilegunPageComplete2 {...props} />);
      break;
    default:
      console.error(`Component "${componentName}" not found`);
  }
};

// Export for use in renderer
export { FilegunPageComplete2 as FilegunPage };