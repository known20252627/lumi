import React, { useState, useEffect } from 'react';
import { getChatHistory, clearChatHistory } from '../services/memory';
import { Clock, MessageSquare, Trash2, Search, Download, Printer } from 'lucide-react';
import { useUI } from '../context/UIContext';
import './History.css';

const History = () => {
  const { confirm, showToast } = useUI();
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    setHistory(getChatHistory());
  }, []);

  const handleClear = async () => {
    const isConfirmed = await confirm("Are you sure you want to delete all chat history? This will wipe Lumi's memory.");
    if (isConfirmed) {
      clearChatHistory();
      setHistory([]);
      setSelectedSession(null);
      showToast("Memory logs cleared.");
    }
  };

  const exportCSV = () => {
    if (!selectedSession) return;
    let csv = 'Role,Message\n';
    selectedSession.messages.forEach(msg => {
      const cleanContent = msg.content.replace(/"/g, '""');
      csv += `"${msg.role}","${cleanContent}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lumi_Session_${new Date(selectedSession.date).getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    window.print();
  };

  return (
    <div className="page-container history-container">
      <div className="history-sidebar">
        <div className="history-sidebar-header">
          <h2><Clock size={20} /> Memory Logs</h2>
          <button className="icon-btn danger" onClick={handleClear} title="Clear Memory">
            <Trash2 size={18} />
          </button>
        </div>
        <div style={{ padding: '0 1rem 1rem 1rem', position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '1.75rem', top: '0.65rem' }} />
          <input 
            type="text" 
            placeholder="Search conversations..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.5rem 1rem 0.5rem 2.5rem', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid var(--border-color)', 
              background: 'rgba(0,0,0,0.2)', 
              color: 'var(--text-primary)' 
            }}
          />
        </div>
        <div className="history-list">
          {history.length === 0 ? (
            <p className="empty-state">No memory logs yet.</p>
          ) : (
            history
              .filter(session => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return session.title.toLowerCase().includes(q) || 
                       session.messages.some(m => m.content.toLowerCase().includes(q));
              })
              .map((session) => (
              <div 
                key={session.id} 
                className={`history-item ${selectedSession?.id === session.id ? 'active' : ''}`}
                onClick={() => setSelectedSession(session)}
              >
                <div className="history-item-title">{session.title}</div>
                <div className="history-item-date">{new Date(session.date).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="history-content glass-panel">
        {selectedSession ? (
          <div className="history-messages">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3>{selectedSession.title}</h3>
                <p className="session-date">{new Date(selectedSession.date).toLocaleString()}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" onClick={exportCSV} title="Export as CSV"><Download size={16} /> CSV</button>
                <button className="btn-secondary" onClick={printPDF} title="Print / Save as PDF"><Printer size={16} /> PDF</button>
              </div>
            </div>
            <hr />
            <div className="messages-list">
              {selectedSession.messages.map((msg, idx) => (
                <div key={idx} className={`history-msg ${msg.role}`}>
                  <strong>{msg.role === 'assistant' ? 'Lumi' : 'You'}:</strong>
                  <pre>{msg.content}</pre>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="history-placeholder">
            <MessageSquare size={48} />
            <p>Select a past conversation to view memory logs.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
