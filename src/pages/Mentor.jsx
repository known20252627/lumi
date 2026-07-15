import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Bot, User, Volume2, VolumeX, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateAIResponse, extractPersonalMemory } from '../services/ai';
import { saveChatSession } from '../services/memory';
import './Mentor.css';

const Mentor = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am Lumi, your personal AI mentor. How can I help you code today?' }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState("");
  const [selectedProvider, setSelectedProvider] = useState('cascade');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [memoryNotification, setMemoryNotification] = useState("");
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef('');
  const [recognition, setRecognition] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isVoiceMode]);
  
  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = true;
      rec.interimResults = true;
      
      let silenceTimer = null;

      rec.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInput(currentTranscript);
        
        clearTimeout(silenceTimer);
        
        silenceTimer = setTimeout(() => {
          if (inputRef.current.trim().length > 0) {
             rec.stop();
          }
        }, 2000);
      };

      rec.onerror = (e) => {
        console.error("Mic error:", e.error);
        setIsListening(false);
      };
      
      rec.onend = () => {
        setIsListening(false);
        clearTimeout(silenceTimer);
        if (inputRef.current.trim().length > 0) {
           document.getElementById('hidden-send-btn')?.click();
        }
      };
      
      setRecognition(rec);
    }
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      setInput(''); 
      recognition?.start();
      setIsListening(true);
    }
  };
  
  const getPremiumVoice = () => {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    // Try to find the highest quality, most natural voices available in the browser
    return voices.find(v => v.name.includes('Google UK English Female')) ||
           voices.find(v => v.name.includes('Google US English')) ||
           voices.find(v => v.name.includes('Samantha')) || // Premium macOS voice
           voices.find(v => v.name.includes('Microsoft Zira')) || // Default Windows female
           voices.find(v => v.name.includes('Female')) ||
           voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB') ||
           voices[0];
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    
    let cleanText = text
      .replace(/\[ADD_TASK:.*?\]/gi, '') 
      .replace(/\*\*(.*?)\*\*/g, '$1') 
      .replace(/\*(.*?)\*/g, '$1') 
      .replace(/`(.*?)`/g, '$1') 
      .replace(/```[\s\S]*?```/g, 'I have provided the code block in the chat.') 
      .replace(/#/g, '') 
      .replace(/\n/g, ' ') 
      .replace(/\(✅ Task successfully added to your Planner\)/gi, 'Task added to your planner.');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05; // Slightly faster for conversational realism
    utterance.pitch = 1.0;
    
    const premiumVoice = getPremiumVoice();
    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setLoadStatus("Thinking...");

    try {
      const rawMem = localStorage.getItem('lumi_personal_memory');
      const memoryVault = rawMem ? JSON.parse(rawMem) : [];

      const rawGoals = localStorage.getItem('lumi_planner_goals');
      const currentTasks = rawGoals ? JSON.parse(rawGoals) : [];
      const taskList = currentTasks.length > 0 
        ? currentTasks.map(t => `- ${t.text} (Completed: ${t.completed})`).join('\n')
        : "No tasks currently in the planner.";

      const taskInstruction = `You are Lumi, a highly expert AI mentor. 
      
*** LONG-TERM MEMORY VAULT ***
Here are facts you must permanently remember about the user:
${memoryVault.length > 0 ? memoryVault.join('\n') : 'No personal facts known yet.'}
******************************

*** CURRENT PLANNER TASKS ***
Here are the user's current tasks in their planner:
${taskList}
******************************

STRICT RULE FOR ACTIONS & TASKS:
You have the physical ability to launch native apps on the user's device!
1. APP LAUNCHER: If the user asks you to play a song, play a trailer, search for a video, or open an app, you MUST output the EXACT string [OPEN_APP: <URI>] anywhere in your response.
   - For PC/Mobile Native Apps (e.g. Spotify): Output a deep link like [OPEN_APP: spotify:search:<query>]
   - For Websites (e.g. YouTube, Google): Output a standard web link like [OPEN_APP: https://www.youtube.com/results?search_query=<query>]
2. If the user EXPLICITLY asks you to "create a task", "add a todo", or "remind me to...", you must output the exact string [ADD_TASK: <Task Description>].
3. If the user EXPLICITLY asks you to "clear all tasks", "delete my tasks", or "wipe my planner", you must output the exact string [CLEAR_TASKS].

CRITICAL: If the user asks you to play a video or a song, DO NOT just say "I can't do that" or "Sure, here is a link." You MUST output the [OPEN_APP: <URI>] command so the system can launch it for them automatically!`;

      let responseText = await generateAIResponse(
        newMessages, 
        (status) => setLoadStatus(status),
        selectedProvider,
        taskInstruction
      );
      
      const taskRegex = /\[ADD_TASK:\s*(.+?)\]/gi;
      let match;
      let taskAdded = false;
      let tasksCleared = false;
      let appOpened = false;
      
      // Handle Open App Command
      const appRegex = /\[OPEN_APP:\s*(.+?)\]/i;
      const appMatch = responseText.match(appRegex);
      if (appMatch && appMatch[1]) {
        const urlToOpen = appMatch[1].trim();
        
        if (urlToOpen.startsWith('http')) {
          // Standard website: Open in a new tab
          window.open(urlToOpen, '_blank');
        } else {
          // Native Deep Link: Use an invisible iframe to force the OS to open it without leaving the page
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = urlToOpen;
          document.body.appendChild(iframe);
          setTimeout(() => document.body.removeChild(iframe), 3000);
        }
        
        responseText = responseText.replace(appRegex, '').trim();
        appOpened = true;
      }
      
      // Handle Clear Tasks Command
      if (responseText.includes('[CLEAR_TASKS]')) {
        localStorage.setItem('lumi_planner_goals', JSON.stringify([]));
        responseText = responseText.replace(/\[CLEAR_TASKS\]/gi, '').trim();
        tasksCleared = true;
      }

      // Handle Add Task Command
      while ((match = taskRegex.exec(responseText)) !== null) {
        const taskDesc = match[1].trim();
        if (taskDesc) {
          const raw = localStorage.getItem('lumi_planner_goals');
          const goals = raw ? JSON.parse(raw) : [];
          goals.push({ id: Date.now().toString() + Math.random(), text: taskDesc, completed: false });
          localStorage.setItem('lumi_planner_goals', JSON.stringify(goals));
          taskAdded = true;
        }
      }
      
      responseText = responseText.replace(taskRegex, '').trim();
      
      if (taskAdded) {
        responseText += '\n\n*(✅ Task successfully added to your Planner)*';
      }
      if (tasksCleared) {
        responseText += '\n\n*(🗑️ All tasks successfully cleared from your Planner)*';
      }
      if (appOpened) {
        responseText += '\n\n*(🚀 Launching App...)*';
      }

      const finalMessages = [...newMessages, { role: 'assistant', content: responseText }];
      setMessages(finalMessages);
      
      saveChatSession(finalMessages[1]?.content?.substring(0, 30) + '...', finalMessages);
      
      if (isVoiceMode) {
        speakText(responseText);
      }
      
      // Run background memory extractor
      setTimeout(async () => {
        try {
          const newFact = await extractPersonalMemory(userMessage);
          if (newFact) {
            const memRaw = localStorage.getItem('lumi_personal_memory');
            const memories = memRaw ? JSON.parse(memRaw) : [];
            memories.push(newFact);
            localStorage.setItem('lumi_personal_memory', JSON.stringify(memories));
            console.log("Memory Vault Updated:", newFact);
            
            // Automatically push new memory to Supabase Cloud
            const { syncKeysToCloud } = await import('../services/supabase.js');
            const keys = {
              openai: localStorage.getItem('lumi_openai_key'),
              gemini: localStorage.getItem('lumi_api_key'),
              groq: localStorage.getItem('lumi_groq_key'),
              cerebras: localStorage.getItem('lumi_cerebras_key'),
              sarvam: localStorage.getItem('lumi_sarvam_key')
            };
            await syncKeysToCloud(keys);
            
            setMemoryNotification("🧠 Lumi learned a new fact about you!");
            setTimeout(() => setMemoryNotification(""), 4000);
          } else {
            console.log("Memory Extractor: No new facts found.");
          }
        } catch (e) {
          console.error("Background memory extraction failed", e);
        }
      }, 100);
      
    } catch (error) {
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: `❌ Error: ${error.message}` 
      }]);
    } finally {
      setIsLoading(false);
      setLoadStatus("");
    }
  };

  return (
    <div className="page-container chat-container">
      <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Lumi Mentor</h1>
          <p>Your expert pair programmer (Powered by 6-Layer AI)</p>
        </div>
        <div className="model-selector">
          <select 
            value={selectedProvider} 
            onChange={(e) => setSelectedProvider(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
              cursor: 'pointer'
            }}
          >
            <option value="cascade" style={{ background: '#1e1e24' }}>Auto-Cascade (Recommended)</option>
            <option value="openai" style={{ background: '#1e1e24' }}>OpenAI (GPT-4o)</option>
            <option value="cerebras" style={{ background: '#1e1e24' }}>Cerebras (Llama-3.1)</option>
            <option value="gemini" style={{ background: '#1e1e24' }}>Gemini (Fast & Free)</option>
            <option value="groq" style={{ background: '#1e1e24' }}>Groq (Llama-3)</option>
            <option value="sarvam" style={{ background: '#1e1e24' }}>Sarvam</option>
            <option value="local" style={{ background: '#1e1e24' }}>Local WebLLM (100% Offline)</option>
          </select>
        </div>
      </div>

      {isVoiceMode && (
        <div className="voice-visualizer-container">
          <div className={`voice-orb ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
            <div className="orb-core"></div>
            <div className="orb-ring ring-1"></div>
            <div className="orb-ring ring-2"></div>
            <div className="orb-ring ring-3"></div>
          </div>
          <div className="voice-status">
            {isSpeaking ? "Lumi is speaking..." : isListening ? "Listening to you..." : "Voice Mode Active"}
          </div>
        </div>
      )}

      <div className="messages-area glass-panel" style={{ display: isVoiceMode ? 'none' : 'flex' }}>
        {messages.map((msg, index) => (
          <div key={index} className={`message-wrapper ${msg.role}`}>
            <div className="avatar">
              {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
            </div>
            <div className="message-bubble markdown-body" style={{ position: 'relative' }}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
              {msg.role === 'assistant' && (
                <button 
                  className="copy-btn" 
                  onClick={() => handleCopy(msg.content, index)}
                  title="Copy message"
                >
                  {copiedIndex === index ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message-wrapper assistant">
            <div className="avatar"><Bot size={20} /></div>
            <div className="message-bubble loading-bubble">
              <span className="typing-dots"><span>.</span><span>.</span><span>.</span></span>
              {loadStatus && <span className="load-status">{loadStatus}</span>}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area glass-panel" style={{ position: 'relative' }}>
        {memoryNotification && (
          <div style={{
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-glass)',
            border: '1px solid var(--primary)',
            color: 'var(--primary)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.85rem',
            animation: 'fadeIn 0.3s ease-in-out',
            boxShadow: 'var(--shadow-glow)',
            whiteSpace: 'nowrap'
          }}>
            {memoryNotification}
          </div>
        )}
        <button 
          className={`btn-icon voice-btn ${isListening ? 'listening' : ''}`}
          onClick={toggleListen}
          title={!recognition ? "Voice recognition not supported in this browser" : "Speak to Type"}
          disabled={!recognition}
        >
          {isListening ? <MicOff size={20} color="#ec4899" /> : <Mic size={20} />}
        </button>

        <button 
          className="btn-icon" 
          onClick={() => {
            if (isVoiceMode) {
              window.speechSynthesis.cancel();
              setIsSpeaking(false);
            } else {
              // Unlock browser TTS immediately
              const unlockSpeech = new SpeechSynthesisUtterance("Voice mode activated.");
              unlockSpeech.rate = 1.0;
              window.speechSynthesis.speak(unlockSpeech);
            }
            setIsVoiceMode(!isVoiceMode);
          }}
          title={isVoiceMode ? "Auto-Speak ON" : "Auto-Speak OFF"}
          style={{ color: isVoiceMode ? '#10b981' : 'var(--text-muted)' }}
        >
          {isVoiceMode ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
        
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask me anything or tap the mic..."
        />
        
        <button id="hidden-send-btn" className="btn-icon send-btn" onClick={handleSend}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default Mentor;
