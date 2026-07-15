import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, MessageSquare, Bug, Clock, Target, Settings, Code, FileDown } from 'lucide-react';
import { useUI } from '../context/UIContext';
import './CommandPalette.css';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { showToast } = useUI();

  const commands = [
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: <LayoutDashboard size={16} />, action: () => navigate('/') },
    { id: 'nav-mentor', label: 'Go to Lumi Mentor', icon: <MessageSquare size={16} />, action: () => navigate('/mentor') },
    { id: 'nav-debug', label: 'Go to Debug Assistant', icon: <Bug size={16} />, action: () => navigate('/debug') },
    { id: 'nav-history', label: 'Go to History', icon: <Clock size={16} />, action: () => navigate('/history') },
    { id: 'nav-planner', label: 'Go to Planner', icon: <Target size={16} />, action: () => navigate('/planner') },
    { id: 'nav-settings', label: 'Go to Settings', icon: <Settings size={16} />, action: () => navigate('/settings') },
    { id: 'action-export', label: 'Export Source Code', icon: <FileDown size={16} />, action: () => {
        showToast('Source code export started...');
        showToast('Please run node export_code.js manually in the terminal.');
    } },
    { id: 'action-theme', label: 'Toggle Light/Dark Theme', icon: <Code size={16} />, action: () => {
        document.body.classList.toggle('light-theme');
        showToast('Theme toggled');
    } }
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleExecute = (index) => {
    const cmd = filteredCommands[index];
    if (cmd) {
      cmd.action();
      setIsOpen(false);
    }
  };

  const handleKeyNavigation = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleExecute(selectedIndex);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="palette-modal glass-panel" onClick={e => e.stopPropagation()}>
        <div className="palette-header">
          <Search size={20} className="palette-icon" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search commands..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyNavigation}
            className="palette-input"
          />
          <span className="palette-shortcut">ESC</span>
        </div>
        <div className="palette-list">
          {filteredCommands.length === 0 ? (
            <div className="palette-empty">No commands found</div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div 
                key={cmd.id} 
                className={`palette-item ${idx === selectedIndex ? 'selected' : ''}`}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => handleExecute(idx)}
              >
                {cmd.icon}
                <span>{cmd.label}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
