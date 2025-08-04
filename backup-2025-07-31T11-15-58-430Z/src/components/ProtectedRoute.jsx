import React from 'react';
import { useAuthContext } from './AuthProvider';

/**
 * ProtectedRoute component that requires authentication
 * Redirects to login if user is not authenticated
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Components to render if authenticated
 * @param {React.ReactNode} props.fallback - Component to show if not authenticated (default: login prompt)
 * @param {string} props.requiredTier - Optional license tier requirement
 * @param {Function} props.onAuthRequired - Optional callback when auth is required
 */
export function ProtectedRoute({ children, fallback, requiredTier, onAuthRequired }) {
  const { user, loading } = useAuthContext();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    if (onAuthRequired) {
      onAuthRequired();
    }

    return (
      fallback || (
        <div className="auth-required">
          <h2>Authentication Required</h2>
          <p>Please sign in to access this feature.</p>
          <button onClick={() => (window.location.href = '/login')}>Sign In</button>
        </div>
      )
    );
  }

  // Check license tier if required
  if (requiredTier && user.licenseTier !== requiredTier) {
    const tierHierarchy = ['trial', 'basic', 'pro', 'enterprise'];
    const userTierIndex = tierHierarchy.indexOf(user.licenseTier || 'trial');
    const requiredTierIndex = tierHierarchy.indexOf(requiredTier);

    if (userTierIndex < requiredTierIndex) {
      return (
        <div className="tier-upgrade-required">
          <h2>Upgrade Required</h2>
          <p>This feature requires a {requiredTier} license.</p>
          <p>Your current tier: {user.licenseTier || 'trial'}</p>
          <button onClick={() => (window.location.href = '/pricing')}>Upgrade Now</button>
        </div>
      );
    }
  }

  // User is authenticated and has required tier
  return <>{children}</>;
}

// CSS for the component (add to your styles)
const styles = `
.auth-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.auth-required,
.tier-upgrade-required {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  padding: 20px;
}

.auth-required button,
.tier-upgrade-required button {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.auth-required button:hover,
.tier-upgrade-required button:hover {
  background-color: #0056b3;
}
`;

export default ProtectedRoute;
