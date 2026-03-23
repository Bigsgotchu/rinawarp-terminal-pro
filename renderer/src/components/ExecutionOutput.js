import React from 'react';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Terminal } from 'lucide-react';

export function ExecutionOutput({ progress, output, isRunning, progressRef }) {
  return (
    <Card className="glass" style={{ padding: '1.5rem', height: '500px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <Terminal size={20} style={{ marginRight: '0.5rem', color: '#4dd4d4' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Execution Output</h3>
        {isRunning && (
          <div className="animate-pulse" style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: '#4dd4d4' }} />
        )}
      </div>

      <ScrollArea
        ref={progressRef}
        style={{
          flex: 1,
          background: '#0d0d0d',
          borderRadius: '8px',
          padding: '1rem',
          fontFamily: 'Fira Sans, monospace',
          fontSize: '0.9rem',
        }}
      >
        <div data-testid="execution-output">
          {progress.map((line, index) => (
            <div key={index} style={{ marginBottom: '0.5rem', color: '#aaa' }}>
              <span style={{ color: '#4dd4d4', marginRight: '0.5rem' }}>›</span>
              {line}
            </div>
          ))}
          {output && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #222' }}>
              <div style={{ color: '#4dd4d4', marginBottom: '0.5rem', fontWeight: 500 }}>Final Output:</div>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#e5e5e5', lineHeight: 1.6 }}>{output}</pre>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
