import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import AppShell from './AppShell';
import 'reactflow/dist/style.css';
import './index.css';

// biome-ignore lint/style/noNonNullAssertion: It's defined in index.html
ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
