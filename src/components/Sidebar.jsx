import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Bug, GitPullRequest, Settings, Clock, Target, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const [width, setWidth] = useState(260); // default width
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isResizing = useRef(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Lumi Mentor', path: '/mentor', icon: <MessageSquare size={20} /> },
    { name: 'Debug Assistant', path: '/debug', icon: <Bug size={20} /> },
    { name: 'History (RAG)', path: '/history', icon: <Clock size={20} /> },
    { name: 'Feature Planner', path: '/plan', icon: <Target size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
    { name: 'About', path: '/about', icon: <Info size={20} /> },
  ];

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current || isCollapsed) return;
      let newWidth = e.clientX;
      if (newWidth < 200) newWidth = 200; // min width
      if (newWidth > 450) newWidth = 450; // max width
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isCollapsed]);

  const handleMouseDown = (e) => {
    if (isCollapsed) return;
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const LogoIcon = () => (
    <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lumi-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="45" stroke="url(#lumi-grad)" strokeWidth="8" />
      <path d="M50 20 L60 40 L80 50 L60 60 L50 80 L40 60 L20 50 L40 40 Z" fill="url(#lumi-grad)" />
      <circle cx="50" cy="50" r="10" fill="#ffffff" />
    </svg>
  );

  return (
    <aside 
      className={`sidebar glass-panel ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      style={{ width: isCollapsed ? '80px' : `${width}px` }}
    >
      <div className="sidebar-header">
        <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LogoIcon />
          {!isCollapsed && <h1 className="logo-text" style={{ margin: 0 }}>Lumi</h1>}
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
            title={isCollapsed ? item.name : ""}
          >
            <span className="nav-icon">{item.icon}</span>
            {!isCollapsed && <span className="nav-text">{item.name}</span>}
          </NavLink>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        {!isCollapsed && (
          <div className="status-indicator">
            <div className="status-dot green"></div>
            <span className="status-text">Local Sync</span>
          </div>
        )}
        <button 
          className="collapse-btn" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {!isCollapsed && <div className="sidebar-resizer" onMouseDown={handleMouseDown}></div>}
    </aside>
  );
};

export default Sidebar;
