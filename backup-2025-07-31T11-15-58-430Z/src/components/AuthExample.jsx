/**
 * Example React Component Using Enhanced Auth Service
 * Shows how to integrate authentication into your React app
 */

import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';

export function AuthExample() {
  // Use the custom auth hook
  const {
    user,
    loading: authLoading,
    error: authError,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    updateProfile,
    upgradeLicense,
  } = useAuth();

  // Local state for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle sign up
  const handleSignUp = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signUp(email, password, displayName);
      // Clear form on successful signup
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle sign in
  const handleSignIn = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(email, password);
      // Clear form on successful signin
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    setLoading(true);
    setError(null);

    try {
      await signOut();
      // Clear form fields
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle profile update
  const handleUpdateProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const updates = {
        displayName: displayName || user.displayName,
        // Add other fields as needed
      };

      await updateProfile(updates);
      setDisplayName(''); // Clear the input after successful update
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle license tier upgrade
  const handleUpgradeTier = async tier => {
    setLoading(true);
    setError(null);

    try {
      await upgradeLicense(tier);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="auth-container">
        <h2>Loading...</h2>
      </div>
    );
  }

  // Combine local error and auth error
  const displayError = error || authError;

  // Render authentication UI
  if (user) {
    // User is signed in
    return (
      <div className="auth-container">
        <h2>Welcome, {user.displayName || user.email}!</h2>

        <div className="user-info">
          <p>Email: {user.email}</p>
          <p>User ID: {user.uid}</p>
          <p>License Tier: {user.licenseTier || 'trial'}</p>
        </div>

        <div className="profile-update">
          <h3>Update Profile</h3>
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
          <button onClick={handleUpdateProfile} disabled={loading}>
            Update Profile
          </button>
        </div>

        <div className="license-tiers">
          <h3>Upgrade License</h3>
          <button onClick={() => handleUpgradeTier('basic')} disabled={loading}>
            Basic ($9.99/mo)
          </button>
          <button onClick={() => handleUpgradeTier('pro')} disabled={loading}>
            Pro ($19.99/mo)
          </button>
          <button onClick={() => handleUpgradeTier('enterprise')} disabled={loading}>
            Enterprise ($49.99/mo)
          </button>
        </div>

        <button onClick={handleSignOut} disabled={loading} className="sign-out-btn">
          Sign Out
        </button>

        {displayError && <p className="error">{displayError.message || displayError}</p>}
      </div>
    );
  }

  // User is not signed in
  return (
    <div className="auth-container">
      <h2>Sign In or Sign Up</h2>

      <form onSubmit={handleSignIn}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <div className="auth-buttons">
          <button type="submit" disabled={loading}>
            Sign In
          </button>
          <button type="button" onClick={handleSignUp} disabled={loading}>
            Sign Up
          </button>
        </div>

        {/* Add display name field for sign up */}
        <input
          type="text"
          placeholder="Display Name (optional for sign up)"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
        />
      </form>

      <div className="oauth-section">
        <p>Or sign in with:</p>
        <button onClick={handleGoogleSignIn} disabled={loading} className="google-btn">
          Sign in with Google
        </button>
      </div>

      {displayError && <p className="error">{displayError.message || displayError}</p>}
    </div>
  );
}

// Example CSS styles (add to your CSS file)
const exampleStyles = `
.auth-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.auth-container h2 {
  text-align: center;
  margin-bottom: 20px;
}

.auth-container input {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.auth-container button {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.auth-container button:hover {
  background-color: #0056b3;
}

.auth-container button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-buttons {
  display: flex;
  gap: 10px;
}

.auth-buttons button {
  flex: 1;
}

.google-btn {
  background-color: #4285f4;
}

.google-btn:hover {
  background-color: #357ae8;
}

.sign-out-btn {
  background-color: #dc3545;
}

.sign-out-btn:hover {
  background-color: #c82333;
}

.error {
  color: #dc3545;
  text-align: center;
  margin-top: 10px;
}

.user-info {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.user-info p {
  margin: 5px 0;
}

.profile-update,
.license-tiers {
  margin-bottom: 20px;
}

.license-tiers button {
  margin-bottom: 5px;
}
`;
