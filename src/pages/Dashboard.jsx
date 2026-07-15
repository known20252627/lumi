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
  const [activeTab, setActiveTab] = useState('overview');
  
  const TOKEN_LIMIT = 100000; // 100k free token limit for the demo

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

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-light)', marginBottom: '2rem' }}>
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'overview' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'overview' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
          style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'analytics' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
        >
          Analytics & Usage
        </button>
      </div>

      {totalTokens >= TOKEN_LIMIT && (
        <div className="alert-banner" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={20} />
          <span><strong>Usage Limit Reached:</strong> You have exceeded the free tier limit of {TOKEN_LIMIT.toLocaleString()} tokens. Please upgrade or add your own API keys in Settings.</span>
        </div>
      )}

      {activeTab === 'overview' && (
        <>
          <div className="dashboard-top-row" style={{ display: 'flex', gap: '2rem' }}>
        
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
    </>
  )}

      {activeTab === 'analytics' && (
        <>
          <h2 className="section-title">5-Layer AI Usage Analytics</h2>
          
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>Total Consumption</h3>
              <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalTokens.toLocaleString()}</p>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>of {TOKEN_LIMIT.toLocaleString()} limit ({(totalTokens/TOKEN_LIMIT*100).toFixed(1)}%)</p>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-base)', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (totalTokens/TOKEN_LIMIT)*100)}%`, height: '100%', background: totalTokens > TOKEN_LIMIT ? '#ef4444' : '#10b981' }}></div>
              </div>
            </div>
            
            {totalTokens > 0 && (
              <div style={{ flex: 2 }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>Usage by Provider</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '150px', gap: '1rem' }}>
                  {['openai', 'gemini', 'cerebras', 'groq', 'sarvam', 'local'].map(provider => {
                    const val = stats[provider] || 0;
                    const maxVal = Math.max(...Object.values(stats)) || 1;
                    const heightPct = Math.max((val / maxVal) * 100, 2); 
                    const colors = {
                      openai: '#3b82f6', gemini: '#eab308', cerebras: '#f97316', 
                      groq: '#ef4444', sarvam: '#a855f7', local: '#10b981'
                    };
                    
                    return (
                      <div key={provider} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {val > 0 ? (val > 1000 ? (val/1000).toFixed(1) + 'k' : val) : '0'}
                        </span>
                        <div style={{ 
                          width: '100%', 
                          maxWidth: '40px', 
                          height: `${heightPct}%`, 
                          background: `linear-gradient(to top, ${colors[provider]}88, ${colors[provider]})`,
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.5s ease'
                        }}></div>
                        <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                          {provider}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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
        </>
      )}
    </div>
  );
};

export default Dashboard;
