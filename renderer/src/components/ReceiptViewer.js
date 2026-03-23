import React from 'react';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Shield, Check, X, Hash } from 'lucide-react';
import { Badge } from './ui/badge';

export function ReceiptViewer({ receipts }) {
  return (
    <Card className="glass" style={{ padding: '1.5rem', height: '500px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <Shield size={20} style={{ marginRight: '0.5rem', color: '#4dd4d4' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Receipts</h3>
        <Badge
          variant="outline"
          style={{
            marginLeft: 'auto',
            borderColor: '#4dd4d4',
            color: '#4dd4d4',
          }}
        >
          {receipts.length} verified
        </Badge>
      </div>

      <ScrollArea style={{ flex: 1 }}>
        <div data-testid="receipts-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {receipts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              <Shield size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
              <p>No receipts yet</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Receipts will appear as the agent executes</p>
            </div>
          ) : (
            receipts.map((receipt, index) => (
              <div
                key={receipt.id}
                data-testid={`receipt-${index}`}
                className="animate-slide-in"
                style={{
                  background: receipt.status === 'success' ? 'rgba(77, 212, 212, 0.05)' : 'rgba(255, 90, 120, 0.05)',
                  border: `1px solid ${receipt.status === 'success' ? 'rgba(77, 212, 212, 0.2)' : 'rgba(255, 90, 120, 0.2)'}`,
                  borderRadius: '8px',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  {receipt.status === 'success' ? (
                    <Check size={16} style={{ color: '#4dd4d4', marginRight: '0.5rem' }} />
                  ) : (
                    <X size={16} style={{ color: '#ff5a78', marginRight: '0.5rem' }} />
                  )}
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#e5e5e5' }}>
                    {receipt.action}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#666' }}>
                    {new Date(receipt.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {receipt.output && (
                  <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem' }}>
                    {receipt.output}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: '#666' }}>
                  <Hash size={12} style={{ marginRight: '0.25rem' }} />
                  <code style={{ fontFamily: 'Fira Sans, monospace' }}>
                    {receipt.proof.hash.slice(0, 16)}...
                  </code>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
