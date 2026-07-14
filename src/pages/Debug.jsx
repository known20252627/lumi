import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Code, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateAIResponse } from '../services/ai';
import { saveChatSession } from '../services/memory';
import './Debug.css';

const SYSTEM_PROMPT = "You are an elite Staff Software Engineer. Your only goal is to find bugs and output raw, fixed code without conversational fluff. Do not say hello or provide long explanations unless asked. Just output the corrected code.";

const Debug = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Paste your broken code or error stack trace below. I will return the raw fix.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState("");
  const [selectedProvider, setSelectedProvider] = useState('cascade');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setLoadStatus("Analyzing Stack Trace...");

    try {
      const responseText = await generateAIResponse(
        newMessages, 
        (status) => setLoadStatus(status),
        selectedProvider,
        SYSTEM_PROMPT
      );
      
      const finalMessages = [...newMessages, { role: 'assistant', content: responseText }];
      setMessages(finalMessages);
      
      saveChatSession("Debug: " + finalMessages[1]?.content?.substring(0, 20) + '...', finalMessages);
      
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: `❌ Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
      setLoadStatus("");
    }
  };

  return (
    <div className="page-container debug-container">
      <div className="debug-header">
        <div className="header-title">
          <AlertTriangle color="#ef4444" size={28} />
          <div>
            <h1>Debug Assistant</h1>
            <p>Elite Coding Specialist - Zero Fluff</p>
          </div>
        </div>
        <div className="model-selector">
          <select 
            value={selectedProvider} 
            onChange={(e) => setSelectedProvider(e.target.value)}
          >
            <option value="cascade">Auto-Cascade</option>
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="cerebras">Cerebras</option>
            <option value="gemini">Gemini</option>
            <option value="groq">Groq (Llama-3)</option>
            <option value="sarvam">Sarvam</option>
            <option value="local">Local WebLLM</option>
          </select>
        </div>
      </div>

      <div className="debug-workspace glass-panel">
        <div className="debug-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`debug-message ${msg.role}`}>
              <div className="avatar">
                {msg.role === 'assistant' ? <Code size={20} /> : <User size={20} />}
              </div>
              <div className="message-content markdown-body">
                {msg.role === 'assistant' ? (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : (
                  <div>{msg.content}</div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="debug-message assistant">
              <div className="avatar"><Code size={20} /></div>
              <div className="message-content loading">
                <span>{loadStatus}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="debug-input-area">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your error trace or broken code here..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button className="btn-primary" onClick={handleSend} disabled={isLoading}>
            {isLoading ? "Debugging..." : "Fix Code (Shift+Enter)"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Debug;
