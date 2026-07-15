import React, { useState, useEffect } from 'react';
import { Key, Cloud, Server, Shield } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { getCustomPersonas, saveCustomPersonas } from '../data/personas';
import { encryptText, decryptText } from '../services/crypto';
import './Settings.css';

const Settings = () => {
  const { showToast } = useUI();
  const [keys, setKeys] = useState({
    openai: '',
    gemini: '',
    groq: '',
    cerebras: '',
    sarvam: ''
  });
  const [supabaseAuth, setSupabaseAuth] = useState({
    url: '',
    key: ''
  });
  const [saved, setSaved] = useState(false);
  
  const [customPersonas, setCustomPersonas] = useState([]);
  const [newPersona, setNewPersona] = useState({ name: '', prompt: '' });
  
  const [memories, setMemories] = useState([]);
  const [newMemory, setNewMemory] = useState('');

  useEffect(() => {
    const loadKeys = async () => {
      setKeys({
        openai: await decryptText(localStorage.getItem('lumi_openai_key')) || '',
        gemini: await decryptText(localStorage.getItem('lumi_api_key')) || '',
        groq: await decryptText(localStorage.getItem('lumi_groq_key')) || '',
        cerebras: await decryptText(localStorage.getItem('lumi_cerebras_key')) || '',
        sarvam: await decryptText(localStorage.getItem('lumi_sarvam_key')) || ''
      });
    };
    loadKeys();
    
    setSupabaseAuth({
      url: localStorage.getItem('lumi_supabase_url') || '',
      key: localStorage.getItem('lumi_supabase_key') || ''
    });

    setCustomPersonas(getCustomPersonas());
    const rawMem = localStorage.getItem('lumi_personal_memory');
    setMemories(rawMem ? JSON.parse(rawMem) : []);
  }, []);

  const handleKeyChange = (e) => {
    const { name, value } = e.target;
    setKeys(prev => ({ ...prev, [name]: value }));
  };

  const handleSupabaseChange = (e) => {
    const { name, value } = e.target;
    setSupabaseAuth(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    localStorage.setItem('lumi_supabase_url', supabaseAuth.url.trim());
    localStorage.setItem('lumi_supabase_key', supabaseAuth.key.trim());
    
    // Encrypt and save keys locally
    if (keys.openai) localStorage.setItem('lumi_openai_key', await encryptText(keys.openai));
    if (keys.gemini) localStorage.setItem('lumi_api_key', await encryptText(keys.gemini));
    if (keys.groq) localStorage.setItem('lumi_groq_key', await encryptText(keys.groq));
    if (keys.cerebras) localStorage.setItem('lumi_cerebras_key', await encryptText(keys.cerebras));
    if (keys.sarvam) localStorage.setItem('lumi_sarvam_key', await encryptText(keys.sarvam));
    
    // Sync to cloud (cloud handles its own DB encryption/security via RLS)
    const { syncKeysToCloud } = await import('../services/supabase.js');
    await syncKeysToCloud(keys);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddPersona = () => {
    if (!newPersona.name.trim() || !newPersona.prompt.trim()) return;
    const updated = [...customPersonas, { id: 'custom_' + Date.now(), name: newPersona.name.trim(), prompt: newPersona.prompt.trim() }];
    setCustomPersonas(updated);
    saveCustomPersonas(updated);
    setNewPersona({ name: '', prompt: '' });
    showToast('Persona added');
  };

  const handleDeletePersona = (id) => {
    const updated = customPersonas.filter(p => p.id !== id);
    setCustomPersonas(updated);
    saveCustomPersonas(updated);
    showToast('Persona deleted');
  };

  const handleAddMemory = () => {
    if (!newMemory.trim()) return;
    const updated = [...memories, newMemory.trim()];
    setMemories(updated);
    localStorage.setItem('lumi_personal_memory', JSON.stringify(updated));
    setNewMemory('');
    showToast('Memory added');
  };

  const handleDeleteMemory = (index) => {
    const updated = memories.filter((_, i) => i !== index);
    setMemories(updated);
    localStorage.setItem('lumi_personal_memory', JSON.stringify(updated));
    showToast('Memory deleted');
  };

  return (
    <div className="page-container settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Configure Lumi's 6-Layer AI Brain & Cloud Sync</p>
      </div>

      <div className="settings-card glass-panel" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <Cloud size={24} color="#10b981" />
          <h2>Supabase Cloud Sync (Optional)</h2>
        </div>
        <div className="card-body">
          <p className="setting-description">
            To sync your API keys to your phone instantly, enter your free Supabase credentials below.
          </p>
          
          {import.meta.env.VITE_SUPABASE_URL ? (
            <div className="status-badge connected" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <Cloud size={16} /> Supabase Cloud Sync is permanently active via Vercel Environment Variables.
            </div>
          ) : (
            <>
              <div className="input-group">
                <label>Supabase Project URL</label>
                <input 
                  type="text" name="url" value={supabaseAuth.url} onChange={handleSupabaseChange}
                  placeholder="https://xyz.supabase.co"
                />
              </div>
              <div className="input-group">
                <label>Supabase Anon Key</label>
                <input 
                  type="password" name="key" value={supabaseAuth.key} onChange={handleSupabaseChange}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                />
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn-secondary" onClick={async () => {
              // Temporarily save to local storage so the pull function can use them
              localStorage.setItem('lumi_supabase_url', supabaseAuth.url.trim());
              localStorage.setItem('lumi_supabase_key', supabaseAuth.key.trim());
              const { pullKeysFromCloud } = await import('../services/supabase.js');
              const data = await pullKeysFromCloud();
              if (data) {
                setKeys({
                  openai: data.openai || '',
                  gemini: data.gemini || '',
                  groq: data.groq || '',
                  cerebras: data.cerebras || '',
                  sarvam: data.sarvam || ''
                });
                showToast('Keys successfully pulled from cloud!');
              } else {
                showToast('Failed to pull keys. Check credentials.');
              }
            }}>
              Pull Keys from Cloud
            </button>
          </div>
        </div>
      </div>

      <div className="settings-card glass-panel">
        <div className="card-header">
          <Key size={24} color="#6366f1" />
          <h2>API Keys (Cascade Priority)</h2>
        </div>
        <div className="card-body">
          <p className="setting-description">
            Lumi will try these keys in order. If one fails, it instantly falls back to the next.
          </p>
          
          <div className="input-group">
            <label>1. OpenAI API Key (GPT-4o)</label>
            <input 
              type="password" name="openai" value={keys.openai} onChange={handleKeyChange}
              placeholder="sk-proj-..."
            />
          </div>

          <div className="input-group">
            <label>2. Cerebras API Key (Blazing Fast Llama-3.1)</label>
            <input 
              type="password" name="cerebras" value={keys.cerebras} onChange={handleKeyChange}
              placeholder="Enter Cerebras key..."
            />
          </div>

          <div className="input-group">
            <label>3. Gemini API Key (Fast & Free)</label>
            <input 
              type="password" name="gemini" value={keys.gemini} onChange={handleKeyChange}
              placeholder="AIzaSy..."
            />
          </div>

          <div className="input-group">
            <label>4. Groq API Key (14,000 req/day)</label>
            <input 
              type="password" name="groq" value={keys.groq} onChange={handleKeyChange}
              placeholder="gsk_..."
            />
          </div>

          <div className="input-group">
            <label>5. Sarvam API Key (Specialized)</label>
            <input 
              type="password" name="sarvam" value={keys.sarvam} onChange={handleKeyChange}
              placeholder="Enter Sarvam key..."
            />
          </div>
          
          <button className="btn-primary save-btn" onClick={handleSave}>
            {saved ? "Saved & Synced!" : "Save Settings"}
          </button>
        </div>
      </div>

      <div className="settings-card glass-panel">
        <div className="card-header">
          <Server size={24} color="#10b981" />
          <h2>Local Sync Server & WebLLM</h2>
        </div>
        <div className="card-body">
          <p className="setting-description">
            Layer 5 (WebLLM) requires no keys. It runs totally offline on your laptop's GPU.
          </p>
          <div className="status-badge connected">
            <Shield size={14} /> WebLLM Ready
          </div>
        </div>
      </div>

      <div className="settings-card glass-panel" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <Shield size={24} color="#f59e0b" />
          <h2>Custom Personas</h2>
        </div>
        <div className="card-body">
          <p className="setting-description">Define custom system prompts for specialized tasks.</p>
          {customPersonas.map(p => (
            <div key={p.id} style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{p.name}</h4>
                <button className="btn-secondary" onClick={() => handleDeletePersona(p.id)} style={{ padding: '0.2rem 0.5rem', background: '#ef4444', color: 'white', border: 'none' }}>Delete</button>
              </div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{p.prompt}</p>
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            <input 
              type="text" 
              placeholder="Persona Name (e.g., Markdown Expert)" 
              value={newPersona.name} 
              onChange={e => setNewPersona({...newPersona, name: e.target.value})}
              style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
            />
            <textarea 
              placeholder="System Prompt (e.g., You are an expert in markdown formatting...)" 
              value={newPersona.prompt} 
              onChange={e => setNewPersona({...newPersona, prompt: e.target.value})}
              style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: 'var(--bg-base)', color: 'var(--text-primary)', resize: 'vertical' }}
            />
            <button className="btn-secondary" onClick={handleAddPersona}>Add Persona</button>
          </div>
        </div>
      </div>

      <div className="settings-card glass-panel" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <Server size={24} color="#ec4899" />
          <h2>Memory Vault</h2>
        </div>
        <div className="card-body">
          <p className="setting-description">Manage permanent facts Lumi has learned about you.</p>
          {memories.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-base)', padding: '0.8rem', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem', border: '1px solid var(--border-light)' }}>
              <span style={{ color: 'var(--text-primary)' }}>{m}</span>
              <button className="btn-secondary" onClick={() => handleDeleteMemory(i)} style={{ padding: '0.2rem 0.5rem', background: '#ef4444', color: 'white', border: 'none' }}>Delete</button>
            </div>
          ))}
          {memories.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No memories saved yet.</p>}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <input 
              type="text" 
              placeholder="Add a new fact (e.g., I prefer using spaces over tabs)" 
              value={newMemory} 
              onChange={e => setNewMemory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddMemory()}
              style={{ flex: 1, padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
            />
            <button className="btn-secondary" onClick={handleAddMemory}>Add Fact</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
