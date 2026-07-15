import React, { useState, useEffect } from 'react';
import { Target, Plus, CheckCircle, Circle, Trash2 } from 'lucide-react';
import { useUI } from '../context/UIContext';
import './Planner.css';

const Planner = () => {
  const { confirm, showToast } = useUI();
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dateAdded');

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
    saveGoals([...goals, { 
      id: Date.now().toString(), 
      text: newGoal, 
      completed: false,
      priority: newPriority,
      dueDate: newDueDate || null,
      createdAt: Date.now()
    }]);
    setNewGoal('');
    setNewPriority('medium');
    setNewDueDate('');
  };

  const toggleComplete = (id) => {
    saveGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const deleteGoal = (id) => {
    saveGoals(goals.filter(g => g.id !== id));
  };

  const getPriorityWeight = (p) => {
    if (p === 'high') return 3;
    if (p === 'medium') return 2;
    if (p === 'low') return 1;
    return 0;
  };

  const filteredAndSortedGoals = goals
    .filter(g => {
      if (filter === 'active') return !g.completed;
      if (filter === 'completed') return g.completed;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      // default: dateAdded
      return (b.createdAt || parseInt(b.id)) - (a.createdAt || parseInt(a.id));
    });

  return (
    <div className="page-container planner-container">
      <div className="planner-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1><Target size={28} color="#ec4899" /> Feature Planner</h1>
          <p>Track your app ideas, goals, and bugs to fix</p>
        </div>
        {goals.length > 0 && (
          <button 
            onClick={async () => {
              if (await confirm("Are you sure you want to delete all tasks?")) {
                saveGoals([]);
                showToast("All tasks cleared.");
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
        <form onSubmit={handleAdd} className="add-goal-form" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="What feature do you want to build next?" 
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <select 
            value={newPriority} 
            onChange={e => setNewPriority(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          <input 
            type="date" 
            value={newDueDate} 
            onChange={e => setNewDueDate(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          />
          <button type="submit" className="btn-primary">
            <Plus size={20} /> Add
          </button>
        </form>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Filter:</span>
            <select 
              value={filter} 
              onChange={e => setFilter(e.target.value)}
              style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)' }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sort by:</span>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)' }}
            >
              <option value="dateAdded">Date Added</option>
              <option value="priority">Priority</option>
              <option value="dueDate">Due Date</option>
            </select>
          </div>
        </div>

        <div className="goals-list">
          {filteredAndSortedGoals.length === 0 ? (
            <p className="empty-state">No features match your criteria.</p>
          ) : (
            filteredAndSortedGoals.map(goal => (
              <div key={goal.id} className={`goal-item ${goal.completed ? 'completed' : ''}`}>
                <button className="icon-btn check-btn" onClick={() => toggleComplete(goal.id)}>
                  {goal.completed ? <CheckCircle color="#10b981" /> : <Circle color="#64748b" />}
                </button>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span className="goal-text">{goal.text}</span>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    {goal.priority && (
                      <span style={{ 
                        color: goal.priority === 'high' ? '#ef4444' : goal.priority === 'medium' ? '#f59e0b' : '#3b82f6',
                        textTransform: 'capitalize'
                      }}>
                        {goal.priority} Priority
                      </span>
                    )}
                    {goal.dueDate && (
                      <span style={{ color: 'var(--text-muted)' }}>Due: {new Date(goal.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
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
