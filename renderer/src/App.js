import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { Workbench } from './components/Workbench';
import { RunsList } from './components/RunsList';
import { Settings } from './components/Settings';
import { Sidebar } from './components/Sidebar';
import { Toaster } from './components/ui/sonner';

function App() {
  const [agentStatus, setAgentStatus] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check agent status
    if (window.electronAPI) {
      window.electronAPI.agent.status().then(response => {
        if (response.success) {
          setAgentStatus(response.data);
        }
      });

      // Listen for update notifications
      window.electronAPI.on('update:available', () => {
        setUpdateAvailable(true);
      });
    }
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Sidebar agentStatus={agentStatus} updateAvailable={updateAvailable} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Workbench />} />
            <Route path="/runs" element={<RunsList />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <Toaster position="top-right" theme="dark" />
      </div>
    </Router>
  );
}

export default App;
