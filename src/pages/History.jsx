import React, { useState, useEffect } from 'react';
import { getChatHistory, clearChatHistory } from '../services/memory';
import { Clock, MessageSquare, Trash2 } from 'lucide-react';
import { useUI } from '../context/UIContext';
import './History.css';

const History = () => {
  const { confirm, showToast } = useUI();
  const [history, setHistory] = useState([]);
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

  return (
    <div className="page-container history-container">
      <div className="history-sidebar">
        <div className="history-sidebar-header">
          <h2><Clock size={20} /> Memory Logs</h2>
          <button className="icon-btn danger" onClick={handleClear} title="Clear Memory">
            <Trash2 size={18} />
          </button>
        </div>
        <div className="history-list">
          {history.length === 0 ? (
            <p className="empty-state">No memory logs yet.</p>
          ) : (
            history.map((session) => (
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
            <h3>{selectedSession.title}</h3>
            <p className="session-date">{new Date(selectedSession.date).toLocaleString()}</p>
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
