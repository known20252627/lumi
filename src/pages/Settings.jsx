import React, { useState, useEffect } from 'react';
import { Key, Cloud, Server, Shield } from 'lucide-react';
import { syncKeysToCloud, pullKeysFromCloud } from '../services/supabase';
import { useUI } from '../context/UIContext';
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

  useEffect(() => {
    setKeys({
      openai: localStorage.getItem('lumi_openai_key') || '',
      gemini: localStorage.getItem('lumi_api_key') || '',
      groq: localStorage.getItem('lumi_groq_key') || '',
      cerebras: localStorage.getItem('lumi_cerebras_key') || '',
      sarvam: localStorage.getItem('lumi_sarvam_key') || ''
    });
    setSupabaseAuth({
      url: localStorage.getItem('lumi_supabase_url') || '',
      key: localStorage.getItem('lumi_supabase_key') || ''
    });
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
    
    await syncKeysToCloud(keys);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
    </div>
  );
};

export default Settings;
