import React, { useState } from 'react';
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

  return (
    <div className="app-container">
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
