import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { TestPage } from './tests/components/TestPage.jsx';
import { V2TestPage } from './messages/v2/tests/V2TestPage.jsx';
import './App.css';

function Home() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
          Mycelia Kernel
        </h1>
        <p style={{ color: '#4b5563', marginBottom: '32px' }}>Message-Driven Architecture Testing</p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link
            to="/tests"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            v1 Tests
          </Link>
          <Link
            to="/tests/v2"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
          >
            v2 Tests
          </Link>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tests" element={<TestPage />} />
        <Route path="/tests/v2" element={<V2TestPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
