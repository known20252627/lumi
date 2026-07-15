import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { UIProvider } from './context/UIContext.jsx';
import { ShortcutProvider } from './context/ShortcutProvider.jsx';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <UIProvider>
        <ShortcutProvider>
          <App />
        </ShortcutProvider>
      </UIProvider>
    </BrowserRouter>
  </StrictMode>,
)
