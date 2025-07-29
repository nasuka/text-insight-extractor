
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import StaticApp from './StaticApp';
import { loadExportState } from './utils/staticExportUtils';
import './index.css';

// Check if we're in static mode or have exported state
const isStaticMode = (window as any).__STATIC_MODE__ || false;
const initialState = (window as any).__INITIAL_STATE__ || loadExportState();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const AppComponent = isStaticMode && initialState ? (
  <StaticApp initialState={initialState} />
) : (
  <App />
);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {AppComponent}
  </React.StrictMode>
);
