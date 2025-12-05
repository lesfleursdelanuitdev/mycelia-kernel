import { useState } from 'react';
import { MessageTest } from './MessageTest.jsx';
import { RoutingTest } from './RoutingTest.jsx';
import { MessageMetadataTest } from './MessageMetadataTest.jsx';

export function TestPage() {
  const [activeTest, setActiveTest] = useState('message');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>Message System Tests</h1>
          <p style={{ color: '#4b5563', marginTop: '4px' }}>Test Message creation, Route Trees, and Routing</p>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <div style={{ borderBottom: '1px solid #e5e7eb' }}>
            <nav style={{ display: 'flex', gap: '32px', padding: '0 24px' }}>
              <button
                onClick={() => setActiveTest('message')}
                style={{
                  padding: '16px 4px',
                  borderBottom: `2px solid ${activeTest === 'message' ? '#3b82f6' : 'transparent'}`,
                  fontWeight: '500',
                  fontSize: '14px',
                  backgroundColor: 'transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  color: activeTest === 'message' ? '#2563eb' : '#6b7280'
                }}
                onMouseOver={(e) => {
                  if (activeTest !== 'message') {
                    e.target.style.color = '#374151';
                    e.target.style.borderBottomColor = '#d1d5db';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeTest !== 'message') {
                    e.target.style.color = '#6b7280';
                    e.target.style.borderBottomColor = 'transparent';
                  }
                }}
              >
                Message Tests
              </button>
              <button
                onClick={() => setActiveTest('routing')}
                style={{
                  padding: '16px 4px',
                  borderBottom: `2px solid ${activeTest === 'routing' ? '#3b82f6' : 'transparent'}`,
                  fontWeight: '500',
                  fontSize: '14px',
                  backgroundColor: 'transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  color: activeTest === 'routing' ? '#2563eb' : '#6b7280'
                }}
                onMouseOver={(e) => {
                  if (activeTest !== 'routing') {
                    e.target.style.color = '#374151';
                    e.target.style.borderBottomColor = '#d1d5db';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeTest !== 'routing') {
                    e.target.style.color = '#6b7280';
                    e.target.style.borderBottomColor = 'transparent';
                  }
                }}
              >
                Routing Tests
              </button>
              <button
                onClick={() => setActiveTest('metadata')}
                style={{
                  padding: '16px 4px',
                  borderBottom: `2px solid ${activeTest === 'metadata' ? '#3b82f6' : 'transparent'}`,
                  fontWeight: '500',
                  fontSize: '14px',
                  backgroundColor: 'transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  color: activeTest === 'metadata' ? '#2563eb' : '#6b7280'
                }}
                onMouseOver={(e) => {
                  if (activeTest !== 'metadata') {
                    e.target.style.color = '#374151';
                    e.target.style.borderBottomColor = '#d1d5db';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeTest !== 'metadata') {
                    e.target.style.color = '#6b7280';
                    e.target.style.borderBottomColor = 'transparent';
                  }
                }}
              >
                MessageMetadata Tests
              </button>
            </nav>
          </div>

          <div style={{ padding: '24px' }}>
            {activeTest === 'message' && <MessageTest />}
            {activeTest === 'routing' && <RoutingTest />}
            {activeTest === 'metadata' && <MessageMetadataTest />}
          </div>
        </div>
      </div>
    </div>
  );
}
