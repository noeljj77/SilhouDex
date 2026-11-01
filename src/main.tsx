import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Sora, served from this site (no outside font requests).
import '@fontsource-variable/sora/wght.css';
import './index.css';
import { App } from './app/App.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
