import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import LandingPage from './pages/LandingPage';
import DownloadPage from './pages/DownloadPage';
import AccountPage from './pages/AccountPage';
import PricingPage from './pages/PricingPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Routes>
        <Toaster position="top-right" theme="dark" />
      </div>
    </Router>
  );
}

export default App;
