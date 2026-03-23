import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { ExecutionOutput } from './ExecutionOutput';
import { ReceiptViewer } from './ReceiptViewer';

export function Workbench() {
  const [prompt, setPrompt] = useState('');
  const [currentRun, setCurrentRun] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const progressRef = useRef(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Listen for run progress
    const handleProgress = (data) => {
      if (currentRun && data.runId === currentRun.id) {
        setProgress(prev => [...prev, data.progress]);
      }
    };

    const handleReceipt = (data) => {
      if (currentRun && data.runId === currentRun.id) {
        setReceipts(prev => [...prev, data.receipt]);
      }
    };

    const handleCompleted = (run) => {
      if (currentRun && run.id === currentRun.id) {
        setIsRunning(false);
        setCurrentRun(run);
        toast.success('Run completed successfully', {
          description: 'All receipts generated and verified',
        });
      }
    };

    const handleFailed = (run) => {
      if (currentRun && run.id === currentRun.id) {
        setIsRunning(false);
        setCurrentRun(run);
        toast.error('Run failed', {
          description: run.error || 'Unknown error',
        });
      }
    };

    window.electronAPI.on('run:progress', handleProgress);
    window.electronAPI.on('run:receipt', handleReceipt);
    window.electronAPI.on('run:completed', handleCompleted);
    window.electronAPI.on('run:failed', handleFailed);

    return () => {
      window.electronAPI.off('run:progress', handleProgress);
      window.electronAPI.off('run:receipt', handleReceipt);
      window.electronAPI.off('run:completed', handleCompleted);
      window.electronAPI.off('run:failed', handleFailed);
    };
  }, [currentRun]);

  useEffect(() => {
    // Auto-scroll progress
    if (progressRef.current) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight;
    }
  }, [progress]);

  const handleStart = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsRunning(true);
    setProgress([]);
    setReceipts([]);

    try {
      const response = await window.electronAPI.runs.create(prompt, 'local');
      if (response.success) {
        setCurrentRun(response.data);
        toast.success('Run started', {
          description: `Run ID: ${response.data.id.slice(0, 8)}`,
        });
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      setIsRunning(false);
      toast.error('Failed to start run', {
        description: error.message,
      });
    }
  };

  const handleCancel = async () => {
    if (!currentRun) return;

    try {
      const response = await window.electronAPI.runs.cancel(currentRun.id);
      if (response.success) {
        setIsRunning(false);
        toast.info('Run cancelled');
      }
    } catch (error) {
      toast.error('Failed to cancel run');
    }
  };

  const handleRecover = async () => {
    if (!currentRun) return;

    try {
      const response = await window.electronAPI.runs.recover(currentRun.id);
      if (response.success) {
        setCurrentRun(response.data);
        setIsRunning(true);
        setProgress([]);
        setReceipts([]);
        toast.success('Recovery started', {
          description: 'Resuming from last successful checkpoint',
        });
      }
    } catch (error) {
      toast.error('Failed to recover run');
    }
  };

  return (
    <div className="workbench-container" style={{ padding: '2rem' }}>
      <div className="workbench-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 600 }}>
          Agent Workbench
        </h1>
        <p style={{ color: '#888', fontSize: '0.95rem' }}>
          Proof-first execution with verified receipts and recovery
        </p>
      </div>

      {/* Input Section */}
      <Card className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
            Task Prompt
          </label>
          <Textarea
            data-testid="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the task you want the agent to perform...\n\nExamples:\n- Build a React component for user authentication\n- Test the API endpoints in the backend\n- Deploy the application to production"
            rows={6}
            disabled={isRunning}
            style={{
              background: '#141414',
              border: '1px solid #222',
              color: '#e5e5e5',
              fontSize: '0.95rem',
              fontFamily: 'Fira Sans, monospace',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {!isRunning ? (
            <Button
              data-testid="start-run-button"
              onClick={handleStart}
              style={{
                background: 'linear-gradient(135deg, #ff5a78 0%, #ff3d5e 100%)',
                color: '#fff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                fontWeight: 500,
              }}
            >
              <Play size={18} style={{ marginRight: '0.5rem' }} />
              Start Run
            </Button>
          ) : (
            <Button
              data-testid="cancel-run-button"
              onClick={handleCancel}
              variant="outline"
              style={{
                borderColor: '#ff5a78',
                color: '#ff5a78',
              }}
            >
              <Square size={18} style={{ marginRight: '0.5rem' }} />
              Cancel
            </Button>
          )}

          {currentRun && currentRun.status === 'failed' && (
            <Button
              data-testid="recover-run-button"
              onClick={handleRecover}
              variant="outline"
              style={{
                borderColor: '#4dd4d4',
                color: '#4dd4d4',
              }}
            >
              <RotateCcw size={18} style={{ marginRight: '0.5rem' }} />
              Recover
            </Button>
          )}

          {currentRun && (
            <Badge
              data-testid="run-status-badge"
              variant={currentRun.status === 'completed' ? 'default' : 'secondary'}
              style={{
                marginLeft: 'auto',
                background: currentRun.status === 'completed' ? '#4dd4d4' : 
                           currentRun.status === 'failed' ? '#ff5a78' : '#666',
                color: '#000',
                padding: '0.5rem 1rem',
              }}
            >
              {currentRun.status}
            </Badge>
          )}
        </div>
      </Card>

      {/* Output Section */}
      {currentRun && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <ExecutionOutput
            progress={progress}
            output={currentRun.output}
            isRunning={isRunning}
            progressRef={progressRef}
          />
          <ReceiptViewer receipts={receipts} />
        </div>
      )}
    </div>
  );
}
