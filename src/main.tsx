import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {LegalPage} from './components/LegalPage.tsx';
import {LEGAL_BY_PATH} from './legal/content.ts';
import './index.css';

// Policy pages live at real addresses (/privacy, /terms, ...) so they can be linked and checked directly.
const legal = LEGAL_BY_PATH[window.location.pathname.replace(/\/+$/, '')];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {legal ? <LegalPage doc={legal} /> : <App />}
  </StrictMode>,
);
