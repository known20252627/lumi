import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from './UIContext';

export const ShortcutProvider = ({ children }) => {
  const navigate = useNavigate();
  const { toggleCommandPalette } = useUI();
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey) {
        switch (e.key.toLowerCase()) {
          case 'm': // Mentor
            e.preventDefault();
            navigate('/mentor');
            break;
          case 'd': // Debug
            e.preventDefault();
            navigate('/debug');
            break;
          case 'p': // Planner
            e.preventDefault();
            navigate('/planner');
            break;
          case 'k': // Command Palette
            e.preventDefault();
            toggleCommandPalette();
            break;
          case '/': // Cheat Sheet
            e.preventDefault();
            setShowCheatSheet(prev => !prev);
            break;
          default:
            break;
        }
      }
      
      if (e.key === 'Escape') {
        setShowCheatSheet(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, toggleCommandPalette]);

  return (
    <>
      {children}
      {showCheatSheet && (
        <div className="modal-overlay" onClick={() => setShowCheatSheet(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Keyboard Shortcuts</h2>
              <button className="icon-btn" onClick={() => setShowCheatSheet(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Open Command Palette</span> <kbd>Cmd/Ctrl + K</kbd></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Go to Mentor</span> <kbd>Cmd/Ctrl + M</kbd></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Go to Debug</span> <kbd>Cmd/Ctrl + D</kbd></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Go to Planner</span> <kbd>Cmd/Ctrl + P</kbd></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Toggle this Cheat Sheet</span> <kbd>Cmd/Ctrl + /</kbd></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
