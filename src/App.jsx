import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Mentor from './pages/Mentor';
import Debug from './pages/Debug';
import History from './pages/History';
import Planner from './pages/Planner';
import Settings from './pages/Settings';
import About from './pages/About';
import CommandPalette from './components/CommandPalette';
import OnboardingModal from './components/OnboardingModal';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    setShowInstallPrompt(false);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="app-container">
      {showInstallPrompt && (
        <div className="pwa-banner" style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Install Lumi for a better offline experience!</span>
          <div>
            <button className="btn-primary" onClick={handleInstallClick} style={{ background: 'white', color: 'var(--accent-primary)', marginRight: '0.5rem' }}>Install</button>
            <button className="btn-secondary" onClick={() => setShowInstallPrompt(false)} style={{ border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white' }}>Dismiss</button>
          </div>
        </div>
      )}
      <OnboardingModal />
      <CommandPalette />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="main-content">
        <header className="mobile-header">
          <button className="icon-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h2>Lumi</h2>
        </header>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/mentor" element={<Mentor />} />
          <Route path="/debug" element={<Debug />} />
          <Route path="/history" element={<History />} />
          <Route path="/plan" element={<Planner />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
