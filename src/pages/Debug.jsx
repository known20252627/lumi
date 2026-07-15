import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Code, AlertTriangle, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLocation } from 'react-router-dom';
import { generateAIResponse } from '../services/ai';
import { saveChatSession } from '../services/memory';
import { getProjects, getProjectScan, getProjectFiles } from '../services/ProjectService';
import { getProjectGitDiff } from '../services/GitService';
import { getAllPersonas } from '../data/personas';
import './Debug.css';

const DEFAULT_SYSTEM_PROMPT = "You are an elite Staff Software Engineer. Your only goal is to find bugs and output raw, fixed code without conversational fluff. Do not say hello or provide long explanations unless asked. Just output the corrected code. When making small changes to existing code, format your response as a ```diff block showing additions with + and deletions with -.";

const Debug = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Paste your broken code or error stack trace below. I will return the raw fix.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState("");
  const [selectedProvider, setSelectedProvider] = useState('cascade');
  const [projects, setProjects] = useState([]);
  const [linkedProject, setLinkedProject] = useState("");
  const [projectScan, setProjectScan] = useState(null);
  
  const [allPersonas, setAllPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('reviewer');

  const location = useLocation();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setAllPersonas(getAllPersonas());
    getProjects().then(data => {
      setProjects(data || []);
      if (location.state?.projectId) {
        setLinkedProject(location.state.projectId);
      }
    });
  }, [location.state]);

  useEffect(() => {
    if (linkedProject) {
      getProjectScan(linkedProject).then(data => setProjectScan(data));
    } else {
      setProjectScan(null);
    }
  }, [linkedProject]);

  const handleEdit = (text) => {
    setInput(text);
  };

  const handleRegenerate = async (index) => {
    if (isLoading) return;
    const previousMessages = messages.slice(0, index);
    const lastUserMessage = previousMessages[previousMessages.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== 'user') return;
    setMessages(previousMessages);
    await executeSend(previousMessages);
  };

  const executeSend = async (history) => {
    setIsLoading(true);
    setLoadStatus("Analyzing Stack Trace...");

    try {
      const initialMessages = [...history, { role: 'assistant', content: '' }];
      setMessages(initialMessages);
      const userMessage = history[history.length - 1].content;

      let projectContextStr = '';
      if (linkedProject) {
        const p = projects.find(proj => proj.id === linkedProject) || {};
        projectContextStr = `*** LINKED PROJECT CONTEXT ***\nProject Name: ${p.name}\nLanguage: ${p.language}\nFramework: ${p.framework}\n`;
        
        if (projectScan?.files) {
          projectContextStr += `\nTotal Files: ${projectScan.totalFiles}\nProject contains these files (subset): ${projectScan.files.slice(0, 50).join(', ')}${projectScan.totalFiles > 50 ? '...' : ''}\n`;
          
          const mentionedFiles = projectScan.files.filter(f => {
            const basename = f.replace(/\\/g, '/').split('/').pop();
            return userMessage.includes(f) || userMessage.includes(basename);
          });
          if (mentionedFiles.length > 0) {
            setLoadStatus(`Reading ${mentionedFiles.length} file(s)...`);
            const fileContents = await getProjectFiles(linkedProject, mentionedFiles);
            projectContextStr += `\n--- READ FILES CONTENTS ---\n`;
            for (const [file, content] of Object.entries(fileContents)) {
              if (content) {
                projectContextStr += `\nFile: ${file}\n\`\`\`\n${content}\n\`\`\`\n`;
              }
            }
          }
        }

        if (userMessage.toLowerCase().includes('git') || userMessage.toLowerCase().includes('change') || userMessage.toLowerCase().includes('diff')) {
          setLoadStatus(`Fetching Git diff...`);
          const gitRes = await getProjectGitDiff(linkedProject);
          if (gitRes.diff) {
             projectContextStr += `\n--- GIT UNCOMMITTED CHANGES ---\n\`\`\`diff\n${gitRes.diff}\n\`\`\`\n`;
          }
        }
        
        projectContextStr += `******************************\n`;
      }
      
      const currentPersonaObj = allPersonas.find(p => p.id === selectedPersona);
      const personaPrompt = currentPersonaObj ? currentPersonaObj.prompt : DEFAULT_SYSTEM_PROMPT;

      const enhancedPrompt = personaPrompt + (linkedProject ? `\n\n${projectContextStr}` : '');

      let responseText = await generateAIResponse(
        history, 
        (status) => setLoadStatus(status),
        selectedProvider,
        enhancedPrompt,
        (chunk) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: chunk };
            return updated;
          });
        }
      );
      
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: responseText };
        return updated;
      });
      
      saveChatSession("Debug: " + history[1]?.content?.substring(0, 20) + '...', [...history, { role: 'assistant', content: responseText }]);
      
    } catch (error) {
      setMessages([...history, { role: 'assistant', content: `❌ Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
      setLoadStatus("");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    
    await executeSend(newMessages);
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
        <div className="model-selector" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
          <select 
            value={linkedProject}
            onChange={(e) => setLinkedProject(e.target.value)}
            style={{
              marginLeft: '0.5rem',
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0,0,0,0.3)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer'
            }}
          >
            <option value="">-- No Project Linked --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select 
            value={selectedPersona}
            onChange={(e) => setSelectedPersona(e.target.value)}
            style={{
              marginLeft: '0.5rem',
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0,0,0,0.3)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer'
            }}
          >
            <option value="reviewer">Strict Code Reviewer (Default)</option>
            {allPersonas.filter(p => p.id !== 'reviewer').map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
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
                  <div>
                    <ReactMarkdown
                    components={{
                      code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '')
                        const isDiff = match && match[1] === 'diff'
                        if (!inline && isDiff) {
                          const lines = String(children).replace(/\n$/, '').split('\n');
                          return (
                            <pre className="diff-viewer" style={{ background: '#0d1117', padding: '1rem', borderRadius: '8px', overflowX: 'auto', border: '1px solid #30363d' }}>
                              <code style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.9rem' }}>
                                {lines.map((line, i) => {
                                  let color = '#c9d1d9';
                                  let bg = 'transparent';
                                  if (line.startsWith('+')) { color = '#3fb950'; bg = 'rgba(46,160,67,0.15)'; }
                                  else if (line.startsWith('-')) { color = '#f85149'; bg = 'rgba(248,81,73,0.15)'; }
                                  return (
                                    <div key={i} style={{ color, backgroundColor: bg, padding: '0 4px', whiteSpace: 'pre' }}>
                                      {line}
                                    </div>
                                  );
                                })}
                              </code>
                            </pre>
                          )
                        }
                        return <code className={className} {...props}>{children}</code>
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                    {index > 0 && (
                      <button 
                        className="copy-btn" 
                        onClick={() => handleRegenerate(index)}
                        title="Regenerate response"
                        style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Regenerate
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    {msg.content}
                    <button 
                      className="copy-btn" 
                      onClick={() => handleEdit(msg.content)}
                      title="Edit message"
                      style={{ marginTop: '0.5rem', display: 'block', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="debug-message assistant">
              <div className="avatar"><Code size={20} /></div>
              <div className="message-content loading">
                <span>{loadStatus}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="debug-input-area" style={{ position: 'relative' }}>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your error trace or broken code here..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div style={{ position: 'absolute', bottom: '1.5rem', left: '2.5rem', display: 'flex', gap: '0.5rem' }}>
            <label className="icon-btn" style={{ cursor: 'pointer', padding: '0.2rem', background: 'transparent' }} title="Attach File">
              <Paperclip size={18} />
              <input 
                type="file" 
                style={{ display: 'none' }} 
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setInput(prev => prev + (prev ? '\n\n' : '') + `// File: ${file.name}\n${ev.target.result}`);
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }} 
              />
            </label>
          </div>
          <button className="btn-primary" onClick={handleSend} disabled={isLoading}>
            {isLoading ? "Debugging..." : "Fix Code (Enter)"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Debug;
