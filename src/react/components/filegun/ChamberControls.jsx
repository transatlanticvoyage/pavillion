import React from 'react';

export default function ChamberControls({ chambersVisible, onToggleChamber }) {
  const chambers = [
    { id: 'toolbar24', label: 'toolbar24', color: 'blue' },
    { id: 'toolbar25', label: 'toolbar25', color: 'green' },
    { id: 'sentinelLake', label: 'sentinel-lake', color: 'purple' },
    { id: 'meadLake', label: 'mead-lake', color: 'yellow' },
    { id: 'hemlockViewerPane', label: 'hemlock_viewer_pane', color: 'red' },
    { id: 'ravineEditor', label: 'ravine_editor (popup)', color: 'gray' }
  ];

  const getButtonStyle = (chamberId, color) => {
    const isVisible = chambersVisible[chamberId];
    const baseClasses = 'px-3 py-1 text-xs font-medium rounded transition-all duration-200 border';
    
    if (isVisible) {
      switch(color) {
        case 'blue':
          return `${baseClasses} bg-blue-500 text-white border-blue-600 hover:bg-blue-600`;
        case 'green':
          return `${baseClasses} bg-green-500 text-white border-green-600 hover:bg-green-600`;
        case 'purple':
          return `${baseClasses} bg-purple-500 text-white border-purple-600 hover:bg-purple-600`;
        case 'yellow':
          return `${baseClasses} bg-yellow-400 text-gray-900 border-yellow-500 hover:bg-yellow-500`;
        case 'red':
          return `${baseClasses} bg-red-500 text-white border-red-600 hover:bg-red-600`;
        case 'gray':
          return `${baseClasses} bg-gray-500 text-white border-gray-600 hover:bg-gray-600`;
        default:
          return `${baseClasses} bg-gray-500 text-white border-gray-600 hover:bg-gray-600`;
      }
    } else {
      return `${baseClasses} bg-gray-200 text-gray-500 border-gray-300 hover:bg-gray-300 hover:text-gray-600`;
    }
  };

  return (
    <div className="chamber-controls bg-white border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold mr-3">🔫 Filegun</span>
          <span className="text-xs text-gray-600 mr-4">chamber control</span>
          
          <div className="flex items-center space-x-2">
            {chambers.map(chamber => (
              <button
                key={chamber.id}
                onClick={() => onToggleChamber(chamber.id)}
                className={getButtonStyle(chamber.id, chamber.color)}
                title={`Click to ${chambersVisible[chamber.id] ? 'hide' : 'show'} ${chamber.label}`}
              >
                <span className="flex items-center space-x-1">
                  {chambersVisible[chamber.id] && (
                    <span className="inline-block w-1.5 h-1.5 bg-white rounded-full opacity-80"></span>
                  )}
                  <span>{chamber.label}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              // Show all chambers
              Object.keys(chambersVisible).forEach(key => {
                if (!chambersVisible[key]) onToggleChamber(key);
              });
            }}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
          >
            Show All
          </button>
          <button
            onClick={() => {
              // Hide all chambers except hemlock_viewer_pane
              Object.keys(chambersVisible).forEach(key => {
                if (key !== 'hemlockViewerPane' && chambersVisible[key]) {
                  onToggleChamber(key);
                }
              });
            }}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
          >
            Minimal
          </button>
        </div>
      </div>
    </div>
  );
}