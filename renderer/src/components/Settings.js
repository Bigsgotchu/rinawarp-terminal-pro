import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Download, RefreshCw, CheckCircle, Activity, Database } from 'lucide-react';
import { toast } from 'sonner';

export function Settings() {
  const [agentStatus, setAgentStatus] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadStatus();
    loadDiagnostic();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await window.electronAPI.agent.status();
      if (response.success) {
        setAgentStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const loadDiagnostic = async () => {
    try {
      const response = await window.electronAPI.agent.diagnostic();
      if (response.success) {
        setDiagnostic(response.data);
      }
    } catch (error) {
      console.error('Failed to load diagnostic:', error);
    }
  };

  const handleCheckUpdates = async () => {
    setChecking(true);
    try {
      const response = await window.electronAPI.updates.check();
      if (response.success && response.data) {
        setUpdateInfo(response.data);
        toast.success('Update available!', {
          description: `Version ${response.data.version}`,
        });
      } else {
        toast.info('You are up to date');
      }
    } catch (error) {
      toast.info('You are up to date');
    } finally {
      setChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      await window.electronAPI.updates.download();
      toast.success('Update downloaded', {
        description: 'Restart to install',
      });
    } catch (error) {
      toast.error('Failed to download update');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 600 }}>
          Settings & Diagnostics
        </h1>
        <p style={{ color: '#888', fontSize: '0.95rem' }}>
          System information and updates
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Agent Status */}
        <Card className="glass" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <Activity size={20} style={{ marginRight: '0.5rem', color: '#4dd4d4' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Agent Status</h3>
          </div>

          {agentStatus ? (
            <div style={{ fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #222' }}>
                <span style={{ color: '#aaa' }}>Status</span>
                <Badge
                  style={{
                    background: agentStatus.available ? '#4dd4d4' : '#666',
                    color: '#000',
                  }}
                >
                  {agentStatus.available ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #222' }}>
                <span style={{ color: '#aaa' }}>Mode</span>
                <span style={{ color: '#e5e5e5' }}>{agentStatus.mode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #222' }}>
                <span style={{ color: '#aaa' }}>Version</span>
                <span style={{ color: '#e5e5e5' }}>{agentStatus.version}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#aaa' }}>Active Runs</span>
                <span style={{ color: '#e5e5e5' }}>{agentStatus.activeRuns}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: '#666' }}>Loading...</p>
          )}
        </Card>

        {/* Updates */}
        <Card className="glass" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <Download size={20} style={{ marginRight: '0.5rem', color: '#4dd4d4' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Updates</h3>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '1rem' }}>
              Check for the latest version of RinaWarp Terminal Pro
            </p>
            
            {updateInfo && (
              <div style={{ padding: '0.75rem', background: 'rgba(77, 212, 212, 0.1)', borderRadius: '6px', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#4dd4d4' }}>
                  Version {updateInfo.version} available
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              onClick={handleCheckUpdates}
              disabled={checking}
              variant="outline"
              style={{
                borderColor: '#4dd4d4',
                color: '#4dd4d4',
              }}
            >
              <RefreshCw size={16} style={{ marginRight: '0.5rem' }} className={checking ? 'animate-pulse' : ''} />
              Check for Updates
            </Button>
            
            {updateInfo && (
              <Button
                onClick={handleDownloadUpdate}
                style={{
                  background: 'linear-gradient(135deg, #4dd4d4 0%, #3ac4c4 100%)',
                  color: '#000',
                }}
              >
                <Download size={16} style={{ marginRight: '0.5rem' }} />
                Download
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Diagnostics */}
      <Card className="glass" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <Database size={20} style={{ marginRight: '0.5rem', color: '#4dd4d4' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>System Diagnostics</h3>
          <Button
            onClick={loadDiagnostic}
            variant="ghost"
            size="sm"
            style={{ marginLeft: 'auto' }}
          >
            <RefreshCw size={14} />
          </Button>
        </div>

        {diagnostic ? (
          <div style={{ fontSize: '0.85rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ color: '#4dd4d4', fontWeight: 500, marginBottom: '0.5rem' }}>Orchestrator</div>
              <div style={{ paddingLeft: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#aaa' }}>Active Runs:</span>
                  <span style={{ color: '#e5e5e5' }}>{diagnostic.orchestrator.activeRuns}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#aaa' }}>Pending Tasks:</span>
                  <span style={{ color: '#e5e5e5' }}>{diagnostic.orchestrator.pendingTasks.length}</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ color: '#4dd4d4', fontWeight: 500, marginBottom: '0.5rem' }}>Executor</div>
              <div style={{ paddingLeft: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#aaa' }}>Available:</span>
                  <span style={{ color: '#e5e5e5' }}>{diagnostic.executor.available ? 'Yes' : 'No'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#aaa' }}>Active Processes:</span>
                  <span style={{ color: '#e5e5e5' }}>{diagnostic.executor.activeProcesses}</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ color: '#4dd4d4', fontWeight: 500, marginBottom: '0.5rem' }}>Data Store</div>
              <div style={{ paddingLeft: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#aaa' }}>Connected:</span>
                  <span style={{ color: '#e5e5e5' }}>{diagnostic.dataStore.connected ? 'Yes' : 'No'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#aaa' }}>Database:</span>
                  <span style={{ color: '#e5e5e5' }}>{diagnostic.dataStore.database}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#aaa' }}>Runs:</span>
                  <span style={{ color: '#e5e5e5' }}>{diagnostic.dataStore.collections.runs}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#aaa' }}>Receipts:</span>
                  <span style={{ color: '#e5e5e5' }}>{diagnostic.dataStore.collections.receipts}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: '#666' }}>Loading...</p>
        )}
      </Card>
    </div>
  );
}
