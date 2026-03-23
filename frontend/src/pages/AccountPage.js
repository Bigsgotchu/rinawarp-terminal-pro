import React, { useState, useEffect } from 'react';
import { User, Key, Download, CreditCard, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Check if user is logged in
    const sessionToken = localStorage.getItem('session_token');
    if (sessionToken) {
      fetchUserData(sessionToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (token) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(`${apiUrl}/account/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      localStorage.removeItem('session_token');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreLicense = async () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      await axios.post(`${apiUrl}/account/restore`, { email });
      toast.success('Restoration email sent!', {
        description: 'Check your inbox for your license key',
      });
      setEmail('');
    } catch (error) {
      toast.error('Failed to restore license', {
        description: error.response?.data?.error || 'Please try again',
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    setUser(null);
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-[#4dd4d4] mb-4">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen py-20 px-6">
        <div className="container mx-auto max-w-md">
          <div className="glass p-8 rounded-2xl">
            <div className="text-center mb-8">
              <Key size={48} className="mx-auto mb-4 text-[#4dd4d4]" />
              <h1 className="text-3xl font-bold mb-2">Restore License</h1>
              <p className="text-muted-foreground">
                Enter your email to receive your license key
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  data-testid="restore-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:border-[#4dd4d4] transition"
                />
              </div>

              <button
                data-testid="restore-license-button"
                onClick={handleRestoreLicense}
                className="w-full py-3 bg-gradient-to-r from-[#ff5a78] to-[#ff3d5e] text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-[#ff5a78]/30 transition"
              >
                Send License Key
              </button>
            </div>

            <p className="text-sm text-muted-foreground text-center mt-6">
              Don't have a license?{' '}
              <a href="/pricing" className="text-[#4dd4d4] hover:underline">
                View pricing
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-6">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Account</h1>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 glass rounded-lg hover:border-[#ff5a78]/30 transition"
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>

        <div className="grid gap-6">
          {/* Profile */}
          <div className="glass p-6 rounded-2xl">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4dd4d4] to-[#3ac4c4] flex items-center justify-center">
                <User size={24} className="text-black" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user.name || 'User'}</h2>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>

          {/* License */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Key size={20} className="text-[#4dd4d4]" />
              <span>License</span>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-semibold">{user.plan || 'Free'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="text-[#4dd4d4] font-semibold">Active</span>
              </div>
              {user.license_key && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">License Key</span>
                  <code className="text-sm bg-black/40 px-3 py-1 rounded font-mono">
                    {user.license_key}
                  </code>
                </div>
              )}
            </div>
          </div>

          {/* Billing */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <CreditCard size={20} className="text-[#4dd4d4]" />
              <span>Billing</span>
            </h3>
            <button className="w-full py-3 glass rounded-lg hover:border-[#4dd4d4]/30 transition">
              Manage Billing
            </button>
          </div>

          {/* Downloads */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Download size={20} className="text-[#4dd4d4]" />
              <span>Downloads</span>
            </h3>
            <a
              href="/download"
              className="block w-full py-3 text-center glass rounded-lg hover:border-[#4dd4d4]/30 transition"
            >
              Download Latest Version
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
