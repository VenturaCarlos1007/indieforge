import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './index.css';

// Global ripple effect for primary buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-primary, .btn-primary-pulse');
  if (!btn) return;

  // Isolated overflow container so the glow pseudo-element of btn-primary-pulse isn't clipped
  let container = btn.querySelector('.ripple-container');
  if (!container) {
    container = document.createElement('span');
    container.className = 'ripple-container';
    Object.assign(container.style, {
      position: 'absolute', inset: '0',
      overflow: 'hidden', borderRadius: 'inherit',
      pointerEvents: 'none', zIndex: '1',
    });
    btn.appendChild(container);
  }

  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2.5;
  const wave = document.createElement('span');
  wave.className = 'btn-ripple-wave';
  Object.assign(wave.style, {
    width: `${size}px`, height: `${size}px`,
    left: `${e.clientX - rect.left - size / 2}px`,
    top:  `${e.clientY - rect.top  - size / 2}px`,
  });
  container.appendChild(wave);
  wave.addEventListener('animationend', () => wave.remove(), { once: true });
}, { passive: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
