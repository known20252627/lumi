// Memory Service for RAG and Chat History

export const saveChatSession = (title, messages) => {
  try {
    const raw = localStorage.getItem('lumi_chat_history');
    const history = raw ? JSON.parse(raw) : [];
    
    const newSession = {
      id: Date.now().toString(),
      title: title || 'Untitled Chat',
      date: new Date().toISOString(),
      messages: messages
    };
    
    history.unshift(newSession); // Add to beginning
    localStorage.setItem('lumi_chat_history', JSON.stringify(history));
    return newSession;
  } catch (e) {
    console.error("Failed to save chat history", e);
  }
};

export const getChatHistory = () => {
  try {
    const raw = localStorage.getItem('lumi_chat_history');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load chat history", e);
    return [];
  }
};

export const clearChatHistory = () => {
  localStorage.removeItem('lumi_chat_history');
};
