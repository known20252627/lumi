import React, { useState, useEffect } from 'react';
import { useUI } from '../context/UIContext';

const OnboardingModal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem('lumi_onboarded');
    if (!hasSeen) {
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const steps = [
    {
      title: "Welcome to Lumi 🌟",
      content: "Lumi is your advanced AI Coding Assistant. Powered by a 5-layer AI cascade (OpenAI, Gemini, Groq, Cerebras, Sarvam) + Local WebLLM."
    },
    {
      title: "Auto-Cascade Router 🚀",
      content: "Lumi automatically routes your queries. If OpenAI fails, it falls back to Gemini, then Groq, then Cerebras, all the way down to Local WebLLM for 100% offline access."
    },
    {
      title: "Feature Planner & Memory 🧠",
      content: "Use the Planner to track goals. Lumi maintains a long-term Memory Vault of your preferences and automatically syncs keys via Supabase."
    },
    {
      title: "Command Palette & Voice 🎙️",
      content: "Press Cmd+K to quickly navigate. Use the Mentor's voice mode for hands-free pair programming. Enjoy!"
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setIsVisible(false);
      localStorage.setItem('lumi_onboarded', 'true');
    }
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2rem', textAlign: 'center', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
          {steps.map((_, i) => (
            <div key={i} style={{ 
              height: '4px', width: '2rem', borderRadius: '2px',
              background: i <= step ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'
            }} />
          ))}
        </div>
        
        <h2 style={{ marginBottom: '1rem', background: 'none', WebkitTextFillColor: 'var(--text-primary)' }}>
          {steps[step].title}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
          {steps[step].content}
        </p>

        <button className="btn-primary" onClick={handleNext} style={{ width: '100%' }}>
          {step < steps.length - 1 ? 'Next' : 'Get Started'}
        </button>
      </div>
    </div>
  );
};

export default OnboardingModal;
