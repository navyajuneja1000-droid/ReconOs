import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {LegalPage} from './components/LegalPage.tsx';
import {LEGAL_BY_PATH} from './legal/content.ts';
import './index.css';
import {CookieBanner} from './components/CookieBanner.tsx';
import {initAnalytics} from './analytics.ts';
import {setCanonical} from './seo.ts';

initAnalytics();

// Policy pages live at real addresses (/privacy, /terms, ...) so they can be linked and checked directly.
const path = window.location.pathname.replace(/\/+$/, '');
const legal = LEGAL_BY_PATH[path];
setCanonical(path, !!legal);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {legal ? <LegalPage doc={legal} /> : <App />}
    <CookieBanner />
  </StrictMode>,
);
