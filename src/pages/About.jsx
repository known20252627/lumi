import React from 'react';
import './About.css';

const About = () => {
  return (
    <div className="page-container about-container">
      <div className="about-content glass-panel">
        <div className="about-logo">
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lumi-grad-large" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <circle cx="50" cy="50" r="45" stroke="url(#lumi-grad-large)" strokeWidth="8" filter="url(#glow)" />
            <path d="M50 20 L60 40 L80 50 L60 60 L50 80 L40 60 L20 50 L40 40 Z" fill="url(#lumi-grad-large)" filter="url(#glow)" />
            <circle cx="50" cy="50" r="10" fill="#ffffff" />
          </svg>
        </div>
        
        <h1 className="about-title">Lumi</h1>
        <p className="about-subtitle">Advanced Agentic AI Assistant</p>
        
        <div className="about-card glass-panel highlight">
          <h2>The Makers</h2>
          <p>
            Built by <span className="highlight-text">Abhishek</span> and <span className="highlight-text">AI (Lumi)</span>.
          </p>
          <p className="about-description">
            Lumi represents the cutting-edge of hybrid-local AI orchestration. 
            Designed with ultra-premium aesthetics and a privacy-first architecture.
          </p>
        </div>
        
        <div className="version-info">
          <span>Version 1.0.0 (Premium UI)</span>
        </div>
      </div>
    </div>
  );
};

export default About;
