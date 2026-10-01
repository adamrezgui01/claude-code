import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/jetons.css';
import './styles/base.css';
import './styles/composants.css';
import './styles/horaire.css';
import './styles/repertoire.css';
import App from './App';

createRoot(document.getElementById('racine')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
