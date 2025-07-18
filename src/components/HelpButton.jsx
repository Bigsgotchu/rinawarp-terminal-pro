import React from 'react';
import './HelpButton.css';

const HelpButton = ({ onClick, isActive = false, showBadge = false }) => {
  return (
    <button 
      onClick={onClick} 
      className={`help-button ${isActive ? 'active' : ''}`}
      title="Get help and AI assistance"
      aria-label="Open help system"
    >
      <span className="help-icon">❓</span>
      <span className="help-text">Help</span>
      {showBadge && <span className="help-badge">!</span>}
    </button>
  );
};

export default HelpButton;
