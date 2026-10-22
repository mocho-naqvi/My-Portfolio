import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Admin from './Admin.jsx';
import CV from './CV.jsx';
import './index.css';

const GA = import.meta.env.VITE_GA_ID; // optional Google Analytics ID, e.g. G-XXXXXXX
if (GA && !location.pathname.startsWith('/admin')) {
  const sc = document.createElement('script');
  sc.async = true; sc.src = `https://www.googletagmanager.com/gtag/js?id=${GA}`;
  document.head.appendChild(sc);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date()); window.gtag('config', GA);
}

const path = location.pathname.replace(/\/$/, '');
createRoot(document.getElementById('root')).render(path === '/admin' ? <Admin /> : path === '/cv' ? <CV /> : <App />);
