import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Zap, Server, Code, Bot, Folder, Plus, Play, ChevronRight } from 'lucide-react';
import { getProjects, importProject } from '../services/ProjectService';
import { useUI } from '../context/UIContext';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useUI();
  const [stats, setStats] = useState({ openai: 0, gemini: 0, groq: 0, sarvam: 0, local: 0 });
  const [projects, setProjects] = useState([]);
  const [importPath, setImportPath] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [dailyTasks, setDailyTasks] = useState([]);

  const loadStats = () => {
    const raw = localStorage.getItem('lumi_usage_stats');
    if (raw) setStats(JSON.parse(raw));
  };

  const loadTasks = () => {
    const raw = localStorage.getItem('lumi_planner_goals');
    if (raw) setDailyTasks(JSON.parse(raw));
  };

  const loadProjects = async () => {
    const data = await getProjects();
    setProjects(data);
  };

  useEffect(() => {
    loadStats();
    loadProjects();
    loadTasks();
    window.addEventListener('lumi_usage_updated', loadStats);
    
    // Poll for task updates
    const interval = setInterval(loadTasks, 2000);
    
    return () => {
      window.removeEventListener('lumi_usage_updated', loadStats);
      clearInterval(interval);
    };
  }, []);

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importPath.trim()) return;
    setIsImporting(true);
    try {
      await importProject(importPath.trim());
      setImportPath('');
      await loadProjects();
      showToast('Project imported successfully!');
    } catch (err) {
      showToast(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const totalTokens = Object.values(stats).reduce((a, b) => a + (b || 0), 0);
  
  const activeTasks = dailyTasks.filter(t => !t.completed);

  return (
    <div className="page-container dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Your daily brief, active projects, and usage stats</p>
      </div>

      <div className="dashboard-top-row" style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        
        <div className="stats-grid" style={{ flex: 1, minWidth: '250px' }}>
          <div className="stat-card glass-panel highlight">
            <div className="stat-icon"><Activity size={24} /></div>
            <div className="stat-info">
              <h3>Total Tokens Processed</h3>
              <p className="stat-value">{totalTokens.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div 
          className="daily-tasks-widget glass-panel" 
          onClick={() => navigate('/plan')}
          style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="#ec4899" /> AI Tasks
            </h3>
            <ChevronRight size={20} color="var(--text-muted)" />
          </div>
          
          <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
            {activeTasks.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>No pending tasks</p>
            ) : (
              <div>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-secondary)', lineHeight: '1' }}>{activeTasks.length}</p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Active tasks pending</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: '3rem' }}>Local Project Memory</h2>
      <div className="projects-section glass-panel">
        <form onSubmit={handleImport} className="import-form">
          <Folder size={20} color="#a855f7" />
          <input 
            type="text" 
            placeholder="Enter absolute path to your codebase (e.g. C:\Users\Projects\MyApp)" 
            value={importPath}
            onChange={(e) => setImportPath(e.target.value)}
            disabled={isImporting}
          />
          <button type="submit" className="btn-primary" disabled={isImporting}>
            <Plus size={18} /> {isImporting ? 'Scanning...' : 'Import Project'}
          </button>
        </form>

        <div className="projects-list">
          {projects.length === 0 ? (
            <p className="empty-state">No local projects imported yet. The Node.js engine is waiting!</p>
          ) : (
            projects.map(p => (
              <div key={p.id} className="project-card">
                <div className="project-info">
                  <h3>{p.name}</h3>
                  <p className="project-path">{p.path}</p>
                  <div className="project-tags">
                    <span className="tag">{p.language}</span>
                    <span className="tag">{p.framework}</span>
                  </div>
                </div>
                <button className="btn-secondary resume-btn" onClick={() => navigate('/mentor', { state: { projectId: p.id } })}>
                  <Play size={16} /> Resume Project
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>5-Layer AI Usage</h2>
      <div className="usage-grid">
        
        <div className="usage-card glass-panel">
          <div className="usage-header">
            <Bot size={20} color="#3b82f6" />
            <h3>OpenAI (GPT-4o)</h3>
          </div>
          <div className="usage-body">
            <span className="token-count">{stats.openai?.toLocaleString() || '0'}</span> tokens
          </div>
        </div>

        <div className="usage-card glass-panel">
          <div className="usage-header">
            <Zap size={20} color="#eab308" />
            <h3>Gemini (Free & Fast)</h3>
          </div>
          <div className="usage-body">
            <span className="token-count">{stats.gemini?.toLocaleString() || '0'}</span> tokens
          </div>
        </div>

        <div className="usage-card glass-panel">
          <div className="usage-header">
            <Zap size={20} color="#f97316" />
            <h3>Cerebras (Llama-3.1)</h3>
          </div>
          <div className="usage-body">
            <span className="token-count">{stats.cerebras?.toLocaleString() || '0'}</span> tokens
          </div>
        </div>

        <div className="usage-card glass-panel">
          <div className="usage-header">
            <Zap size={20} color="#ef4444" />
            <h3>Groq (Llama-3)</h3>
          </div>
          <div className="usage-body">
            <span className="token-count">{stats.groq?.toLocaleString() || '0'}</span> tokens
          </div>
        </div>

        <div className="usage-card glass-panel">
          <div className="usage-header">
            <Code size={20} color="#a855f7" />
            <h3>Sarvam</h3>
          </div>
          <div className="usage-body">
            <span className="token-count">{stats.sarvam?.toLocaleString() || '0'}</span> tokens
          </div>
        </div>

        <div className="usage-card glass-panel">
          <div className="usage-header">
            <Server size={20} color="#10b981" />
            <h3>WebLLM (Local Offline)</h3>
          </div>
          <div className="usage-body">
            <span className="token-count">{stats.local?.toLocaleString() || '0'}</span> tokens
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
