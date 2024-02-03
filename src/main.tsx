import React from 'react';
import ReactDOM from 'react-dom/client';
import AppShell from './AppShell';
import './index.css';
import 'reactflow/dist/style.css';

// biome-ignore lint/style/noNonNullAssertion: It's defined in index.html
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>
);
