import React from 'react';
import { AuthUI } from './AuthUI.jsx';

export function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  if (!isOpen) return null;

  const handleAuthSuccess = user => {
    if (onAuthSuccess) {
      onAuthSuccess(user);
    }
    // Auto-close modal after successful authentication
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <AuthUI onAuthSuccess={handleAuthSuccess} />
      </div>
    </div>
  );
}
