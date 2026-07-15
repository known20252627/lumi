import React, { useState, useEffect } from 'react';
import { Target, Plus, CheckCircle, Circle, Trash2 } from 'lucide-react';
import './Planner.css';

const Planner = () => {
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('lumi_planner_goals');
    if (raw) setGoals(JSON.parse(raw));
  }, []);

  const saveGoals = (newGoals) => {
    setGoals(newGoals);
    localStorage.setItem('lumi_planner_goals', JSON.stringify(newGoals));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newGoal.trim()) return;
    saveGoals([...goals, { id: Date.now().toString(), text: newGoal, completed: false }]);
    setNewGoal('');
  };

  const toggleComplete = (id) => {
    saveGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const deleteGoal = (id) => {
    saveGoals(goals.filter(g => g.id !== id));
  };

  return (
    <div className="page-container planner-container">
      <div className="planner-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1><Target size={28} color="#ec4899" /> Feature Planner</h1>
          <p>Track your app ideas, goals, and bugs to fix</p>
        </div>
        {goals.length > 0 && (
          <button 
            onClick={() => {
              if (window.confirm("Are you sure you want to delete all tasks?")) {
                saveGoals([]);
              }
            }}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Trash2 size={16} /> Clear All
          </button>
        )}
      </div>

      <div className="planner-content glass-panel">
        <form onSubmit={handleAdd} className="add-goal-form">
          <input 
            type="text" 
            placeholder="What feature do you want to build next?" 
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            <Plus size={20} /> Add
          </button>
        </form>

        <div className="goals-list">
          {goals.length === 0 ? (
            <p className="empty-state">No features planned yet. Add one above!</p>
          ) : (
            goals.map(goal => (
              <div key={goal.id} className={`goal-item ${goal.completed ? 'completed' : ''}`}>
                <button className="icon-btn check-btn" onClick={() => toggleComplete(goal.id)}>
                  {goal.completed ? <CheckCircle color="#10b981" /> : <Circle color="#64748b" />}
                </button>
                <span className="goal-text">{goal.text}</span>
                <button className="icon-btn danger" onClick={() => deleteGoal(goal.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Planner;
