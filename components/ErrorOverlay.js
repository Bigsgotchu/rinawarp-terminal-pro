import React, { useState, useEffect } from 'react';
import { ErrorLogger } from '../utils/errorHandler';

const ErrorOverlay = () => {
  const [errors, setErrors] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const errorLogger = ErrorLogger.getInstance();
    
    // Subscribe to new errors
    const unsubscribe = errorLogger.subscribe((error) => {
      setErrors(prevErrors => [...prevErrors, error]);
      setIsVisible(true);
    });

    // Load recent errors on mount
    setErrors(errorLogger.getRecentErrors());

    return () => unsubscribe();
  }, []);

  if (!isVisible || errors.length === 0) return null;

  return (
    <div className="error-overlay">
      <div className="error-overlay-header">
        <h3>Error Log</h3>
        <button onClick={() => setIsVisible(false)}>Close</button>
      </div>
      <div className="error-list">
        {errors.map((error, index) => (
          <div key={index} className="error-item">
            <div className="error-title">
              <span className="error-type">{error.type}</span>
              <span className="error-timestamp">{new Date(error.timestamp).toLocaleString()}</span>
            </div>
            <div className="error-message">{error.message}</div>
            {error.details && Object.keys(error.details).length > 0 && (
              <div className="error-details">
                <pre>{JSON.stringify(error.details, null, 2)}</pre>
              </div>
            )}
            {process.env.NODE_ENV === 'development' && (
              <div className="error-stack">
                <pre>{error.stack}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
      <style jsx>{`
        .error-overlay {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          max-width: 600px;
          max-height: 400px;
          background: white;
          border: 1px solid #ff0000;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          z-index: 9999;
        }

        .error-overlay-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 1rem;
          background: #ff0000;
          color: white;
        }

        .error-overlay-header h3 {
          margin: 0;
          font-size: 1rem;
        }

        .error-overlay-header button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
        }

        .error-list {
          overflow-y: auto;
          max-height: 350px;
          padding: 1rem;
        }

        .error-item {
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eee;
        }

        .error-item:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }

        .error-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .error-type {
          font-weight: bold;
          color: #ff0000;
        }

        .error-timestamp {
          font-size: 0.8rem;
          color: #666;
        }

        .error-message {
          margin-bottom: 0.5rem;
        }

        .error-details {
          background: #f5f5f5;
          padding: 0.5rem;
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }

        .error-stack {
          font-size: 0.8rem;
          color: #666;
          white-space: pre-wrap;
          overflow-x: auto;
        }

        pre {
          margin: 0;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
};

export default ErrorOverlay;
