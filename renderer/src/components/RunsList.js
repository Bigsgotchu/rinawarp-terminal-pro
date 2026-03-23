import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Clock, CheckCircle, XCircle, Loader, Eye } from 'lucide-react';
import { toast } from 'sonner';

export function RunsList() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState(null);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      const response = await window.electronAPI.runs.list();
      if (response.success) {
        setRuns(response.data);
      }
    } catch (error) {
      toast.error('Failed to load runs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} style={{ color: '#4dd4d4' }} />;
      case 'failed':
        return <XCircle size={16} style={{ color: '#ff5a78' }} />;
      case 'running':
        return <Loader size={16} className="animate-pulse" style={{ color: '#ff5a78' }} />;
      default:
        return <Clock size={16} style={{ color: '#666' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4dd4d4';
      case 'failed':
        return '#ff5a78';
      case 'running':
        return '#ff5a78';
      default:
        return '#666';
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 600 }}>
          Run History
        </h1>
        <p style={{ color: '#888', fontSize: '0.95rem' }}>
          View and manage all agent execution runs
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
          <Loader size={32} className="animate-pulse" style={{ margin: '0 auto 0.5rem' }} />
          <p>Loading runs...</p>
        </div>
      ) : runs.length === 0 ? (
        <Card className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
          <Clock size={48} style={{ margin: '0 auto 1rem', opacity: 0.3, color: '#666' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No runs yet</h3>
          <p style={{ color: '#888' }}>Start a new run from the Workbench</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedRun ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
          <div>
            <ScrollArea style={{ height: 'calc(100vh - 180px)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {runs.map((run) => (
                  <Card
                    key={run.id}
                    data-testid={`run-item-${run.id}`}
                    className="glass"
                    style={{
                      padding: '1.25rem',
                      cursor: 'pointer',
                      border: selectedRun?.id === run.id ? '1px solid #4dd4d4' : '1px solid rgba(255,255,255,0.05)',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setSelectedRun(run)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          {getStatusIcon(run.status)}
                          <Badge
                            style={{
                              background: getStatusColor(run.status),
                              color: '#000',
                              fontSize: '0.75rem',
                            }}
                          >
                            {run.status}
                          </Badge>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#e5e5e5', lineHeight: 1.5 }}>
                          {run.prompt.slice(0, 100)}{run.prompt.length > 100 ? '...' : ''}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#666' }}>
                      <span>{new Date(run.createdAt).toLocaleString()}</span>
                      <span>{run.receipts.length} receipts</span>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {selectedRun && (
            <Card className="glass" style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Run Details</h3>
                  <Badge
                    style={{
                      background: getStatusColor(selectedRun.status),
                      color: '#000',
                    }}
                  >
                    {selectedRun.status}
                  </Badge>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#e5e5e5' }}>ID:</strong> {selectedRun.id}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#e5e5e5' }}>Created:</strong> {new Date(selectedRun.createdAt).toLocaleString()}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#e5e5e5' }}>Mode:</strong> {selectedRun.mode}
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#e5e5e5', display: 'block', marginBottom: '0.5rem' }}>Prompt:</strong>
                  <p style={{ fontSize: '0.9rem', color: '#aaa', lineHeight: 1.6 }}>
                    {selectedRun.prompt}
                  </p>
                </div>

                {selectedRun.output && (
                  <div style={{ marginBottom: '1rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#e5e5e5', display: 'block', marginBottom: '0.5rem' }}>Output:</strong>
                    <pre style={{ fontSize: '0.85rem', color: '#aaa', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {selectedRun.output}
                    </pre>
                  </div>
                )}

                {selectedRun.error && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255, 90, 120, 0.1)', borderRadius: '6px' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#ff5a78', display: 'block', marginBottom: '0.5rem' }}>Error:</strong>
                    <p style={{ fontSize: '0.85rem', color: '#ff5a78' }}>
                      {selectedRun.error}
                    </p>
                  </div>
                )}

                <div>
                  <strong style={{ fontSize: '0.9rem', color: '#4dd4d4', display: 'block', marginBottom: '0.75rem' }}>
                    Receipts ({selectedRun.receipts.length})
                  </strong>
                  <ScrollArea style={{ maxHeight: '300px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedRun.receipts.map((receipt, index) => (
                        <div
                          key={receipt.id}
                          style={{
                            padding: '0.75rem',
                            background: '#0d0d0d',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                            {receipt.status === 'success' ? (
                              <CheckCircle size={14} style={{ color: '#4dd4d4', marginRight: '0.5rem' }} />
                            ) : (
                              <XCircle size={14} style={{ color: '#ff5a78', marginRight: '0.5rem' }} />
                            )}
                            <span style={{ color: '#e5e5e5' }}>{receipt.action}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'Fira Sans, monospace' }}>
                            {receipt.proof.hash.slice(0, 32)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
