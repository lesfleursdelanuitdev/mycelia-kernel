# React Template Design for Mycelia Kernel CLI

## Overview

A React template for Mycelia Kernel CLI would generate a **production-ready React application** that demonstrates how to integrate React with Mycelia Kernel's message-driven architecture. The template provides React hooks, components, and patterns for building React apps that communicate with Mycelia subsystems.

**Command:**
```bash
mycelia-kernel create react-app <project-name>
# or
mycelia-kernel init --template react
```

---

## What the Template Produces

### 1. Project Structure

```
<project-name>/
├── public/
│   ├── vite.svg
│   └── favicon.ico
├── src/
│   ├── main.jsx                    # React entry point with Mycelia setup
│   ├── App.jsx                     # Main App component
│   ├── index.css                   # Global styles (Tailwind)
│   ├── App.css                     # App-specific styles
│   │
│   ├── mycelia/                    # Mycelia Kernel integration
│   │   ├── bootstrap.js            # Mycelia Kernel bootstrap
│   │   ├── context.jsx             # React Context for MessageSystem
│   │   └── hooks/                  # React hooks for Mycelia
│   │       ├── useMessageSystem.js # Access MessageSystem from context
│   │       ├── useSubsystem.js     # Access specific subsystem
│   │       ├── useMessage.js       # Send messages
│   │       ├── useCommand.js       # Send commands
│   │       ├── useQuery.js         # Send queries
│   │       ├── useListener.js     # Listen to events
│   │       └── useRoute.js         # Use route UI helpers
│   │
│   ├── components/                 # Example React components
│   │   ├── MessageSender.jsx       # Example: Send messages
│   │   ├── CommandExecutor.jsx     # Example: Execute commands
│   │   ├── QueryRunner.jsx         # Example: Run queries
│   │   ├── EventListener.jsx      # Example: Listen to events
│   │   └── SubsystemStatus.jsx     # Example: Display subsystem status
│   │
│   ├── subsystems/                 # Custom subsystems (if any)
│   │   └── (empty, ready for custom subsystems)
│   │
│   └── pages/                      # Example pages/routes
│       ├── Home.jsx                # Landing page
│       ├── Messages.jsx           # Message examples
│       ├── Commands.jsx            # Command examples
│       └── Queries.jsx             # Query examples
│
├── mycelia-kernel-v2/              # Mycelia Kernel v2 source (from init)
├── bootstrap.mycelia.js            # Node.js bootstrap (for server-side)
├── vite.config.js                  # Vite configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── postcss.config.js               # PostCSS configuration
├── package.json                    # Dependencies and scripts
├── .gitignore                      # Git ignore patterns
└── README.md                       # Project documentation
```

---

## 2. Key Files Generated

### 2.1 `src/mycelia/bootstrap.js`

**Purpose:** Initialize Mycelia Kernel in the browser

**What it does:**
- Creates MessageSystem instance
- Bootstraps kernel
- Registers default subsystems (if any)
- Returns MessageSystem instance

**Generated Code:**
```javascript
/**
 * Mycelia Kernel Bootstrap for React
 * Initializes MessageSystem for browser use
 */

import { MessageSystem } from '../../mycelia-kernel-v2/models/message-system/message-system.v2.mycelia.js';

let messageSystem = null;

/**
 * Bootstrap Mycelia Kernel
 * @returns {Promise<MessageSystem>}
 */
export async function bootstrapMycelia() {
  if (messageSystem) {
    return messageSystem;
  }

  // Create MessageSystem
  messageSystem = new MessageSystem('react-app', {
    debug: process.env.NODE_ENV === 'development'
  });

  // Bootstrap kernel
  await messageSystem.bootstrap();

  // TODO: Register custom subsystems here
  // const mySubsystem = new MySubsystem('my-subsystem', { ms: messageSystem });
  // await messageSystem.registerSubsystem(mySubsystem);

  return messageSystem;
}

/**
 * Get current MessageSystem instance
 * @returns {MessageSystem|null}
 */
export function getMessageSystem() {
  return messageSystem;
}

/**
 * Dispose MessageSystem
 */
export async function disposeMycelia() {
  if (messageSystem) {
    await messageSystem.dispose();
    messageSystem = null;
  }
}
```

---

### 2.2 `src/mycelia/context.jsx`

**Purpose:** React Context provider for MessageSystem

**What it does:**
- Provides MessageSystem to all React components
- Handles initialization and cleanup
- Manages loading state

**Generated Code:**
```javascript
/**
 * Mycelia Kernel React Context
 * Provides MessageSystem to all components
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { bootstrapMycelia, disposeMycelia, getMessageSystem } from './bootstrap.js';

const MyceliaContext = createContext(null);

/**
 * MyceliaProvider - Provides MessageSystem to React tree
 */
export function MyceliaProvider({ children }) {
  const [messageSystem, setMessageSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const ms = await bootstrapMycelia();
        if (mounted) {
          setMessageSystem(ms);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
      // Cleanup on unmount
      disposeMycelia();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Mycelia Kernel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="text-xl font-bold mb-2">Failed to initialize Mycelia Kernel</p>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <MyceliaContext.Provider value={messageSystem}>
      {children}
    </MyceliaContext.Provider>
  );
}

/**
 * useMycelia - Hook to access MessageSystem from context
 * @returns {MessageSystem}
 */
export function useMycelia() {
  const context = useContext(MyceliaContext);
  if (!context) {
    throw new Error('useMycelia must be used within MyceliaProvider');
  }
  return context;
}
```

---

### 2.3 `src/mycelia/hooks/useMessageSystem.js`

**Purpose:** React hook to access MessageSystem

**Generated Code:**
```javascript
/**
 * useMessageSystem - Access MessageSystem from context
 */

import { useMycelia } from '../context.jsx';

/**
 * Hook to access MessageSystem
 * @returns {MessageSystem}
 */
export function useMessageSystem() {
  return useMycelia();
}
```

---

### 2.4 `src/mycelia/hooks/useSubsystem.js`

**Purpose:** React hook to access a specific subsystem

**Generated Code:**
```javascript
/**
 * useSubsystem - Access a specific subsystem
 */

import { useMycelia } from '../context.jsx';
import { useEffect, useState } from 'react';

/**
 * Hook to access a specific subsystem
 * @param {string} subsystemName - Name of the subsystem
 * @returns {BaseSubsystem|null}
 */
export function useSubsystem(subsystemName) {
  const messageSystem = useMycelia();
  const [subsystem, setSubsystem] = useState(null);

  useEffect(() => {
    if (!messageSystem) return;

    // Get subsystem from registry
    const registry = messageSystem.find('messageSystemRegistry');
    if (registry) {
      const sub = registry.get(subsystemName);
      setSubsystem(sub?._subsystem || null);
    }
  }, [messageSystem, subsystemName]);

  return subsystem;
}
```

---

### 2.5 `src/mycelia/hooks/useMessage.js`

**Purpose:** React hook to send messages

**Generated Code:**
```javascript
/**
 * useMessage - Send messages to subsystems
 */

import { useMycelia } from '../context.jsx';
import { useState, useCallback } from 'react';
import { Message } from '../../../mycelia-kernel-v2/models/message/message.mycelia.js';

/**
 * Hook to send messages
 * @returns {Object} { send, loading, error }
 */
export function useMessage() {
  const messageSystem = useMycelia();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const send = useCallback(async (path, payload = {}, options = {}) => {
    if (!messageSystem) {
      setError(new Error('MessageSystem not initialized'));
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const message = new Message(path, payload, options);
      const result = await messageSystem.send(message);
      return result;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [messageSystem]);

  return { send, loading, error };
}
```

---

### 2.6 `src/mycelia/hooks/useCommand.js`

**Purpose:** React hook to send commands

**Generated Code:**
```javascript
/**
 * useCommand - Send commands to subsystems
 */

import { useSubsystem } from './useSubsystem.js';
import { useState, useCallback } from 'react';

/**
 * Hook to send commands to a subsystem
 * @param {string} subsystemName - Name of the subsystem
 * @returns {Object} { sendCommand, loading, error }
 */
export function useCommand(subsystemName) {
  const subsystem = useSubsystem(subsystemName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendCommand = useCallback(async (commandName, payload = {}) => {
    if (!subsystem) {
      setError(new Error(`Subsystem "${subsystemName}" not found`));
      return null;
    }

    if (!subsystem.commands) {
      setError(new Error(`Subsystem "${subsystemName}" does not support commands`));
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await subsystem.commands.send(commandName, payload);
      return result;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [subsystem, subsystemName]);

  return { sendCommand, loading, error };
}
```

---

### 2.7 `src/mycelia/hooks/useQuery.js`

**Purpose:** React hook to send queries

**Generated Code:**
```javascript
/**
 * useQuery - Send queries to subsystems
 */

import { useSubsystem } from './useSubsystem.js';
import { useState, useCallback } from 'react';

/**
 * Hook to send queries to a subsystem
 * @param {string} subsystemName - Name of the subsystem
 * @returns {Object} { sendQuery, loading, error }
 */
export function useQuery(subsystemName) {
  const subsystem = useSubsystem(subsystemName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendQuery = useCallback(async (queryName, payload = {}) => {
    if (!subsystem) {
      setError(new Error(`Subsystem "${subsystemName}" not found`));
      return null;
    }

    if (!subsystem.queries) {
      setError(new Error(`Subsystem "${subsystemName}" does not support queries`));
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await subsystem.queries.ask(queryName, payload);
      return result;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [subsystem, subsystemName]);

  return { sendQuery, loading, error };
}
```

---

### 2.8 `src/mycelia/hooks/useListener.js`

**Purpose:** React hook to listen to events

**Generated Code:**
```javascript
/**
 * useListener - Listen to subsystem events
 */

import { useSubsystem } from './useSubsystem.js';
import { useEffect, useState } from 'react';

/**
 * Hook to listen to events from a subsystem
 * @param {string} subsystemName - Name of the subsystem
 * @param {string} eventPath - Event path to listen to
 * @param {Function} callback - Callback function
 */
export function useListener(subsystemName, eventPath, callback) {
  const subsystem = useSubsystem(subsystemName);

  useEffect(() => {
    if (!subsystem) return;
    if (!subsystem.listeners) return;

    // Register listener
    const listenerId = subsystem.listeners.on(eventPath, callback);

    // Cleanup on unmount
    return () => {
      if (subsystem.listeners) {
        subsystem.listeners.off(eventPath, listenerId);
      }
    };
  }, [subsystem, eventPath, callback]);
}

/**
 * Hook to listen to events and return latest event data
 * @param {string} subsystemName - Name of the subsystem
 * @param {string} eventPath - Event path to listen to
 * @returns {any} Latest event data
 */
export function useEventData(subsystemName, eventPath) {
  const [data, setData] = useState(null);

  useListener(subsystemName, eventPath, (message) => {
    setData(message.body);
  });

  return data;
}
```

---

### 2.9 `src/main.jsx`

**Purpose:** React entry point with Mycelia setup

**Generated Code:**
```javascript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MyceliaProvider } from './mycelia/context.jsx';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MyceliaProvider>
      <App />
    </MyceliaProvider>
  </StrictMode>
);
```

---

### 2.10 `src/App.jsx`

**Purpose:** Main App component with routing

**Generated Code:**
```javascript
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useMycelia } from './mycelia/context.jsx';
import Home from './pages/Home.jsx';
import Messages from './pages/Messages.jsx';
import Commands from './pages/Commands.jsx';
import Queries from './pages/Queries.jsx';
import './App.css';

function App() {
  const messageSystem = useMycelia();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">Mycelia React App</h1>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    to="/"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Home
                  </Link>
                  <Link
                    to="/messages"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Messages
                  </Link>
                  <Link
                    to="/commands"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Commands
                  </Link>
                  <Link
                    to="/queries"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Queries
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/commands" element={<Commands />} />
            <Route path="/queries" element={<Queries />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
```

---

### 2.11 `src/pages/Home.jsx`

**Purpose:** Landing page with Mycelia status

**Generated Code:**
```javascript
import { useMycelia } from '../mycelia/context.jsx';
import { useSubsystem } from '../mycelia/hooks/useSubsystem.js';

function Home() {
  const messageSystem = useMycelia();
  const kernel = useSubsystem('kernel');

  return (
    <div className="px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Welcome to Mycelia React App
        </h1>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Mycelia Kernel Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">MessageSystem:</span>
              <span className={messageSystem ? 'text-green-600' : 'text-red-600'}>
                {messageSystem ? 'Initialized' : 'Not Initialized'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Kernel Subsystem:</span>
              <span className={kernel ? 'text-green-600' : 'text-red-600'}>
                {kernel ? 'Available' : 'Not Available'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Getting Started</h2>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Explore the Messages page to send messages</li>
            <li>Try the Commands page to execute commands</li>
            <li>Use the Queries page to query subsystems</li>
            <li>Check the components directory for examples</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Home;
```

---

### 2.12 `src/pages/Messages.jsx`

**Purpose:** Example page showing message sending

**Generated Code:**
```javascript
import { useState } from 'react';
import { useMessage } from '../mycelia/hooks/useMessage.js';

function Messages() {
  const { send, loading, error } = useMessage();
  const [path, setPath] = useState('kernel://status');
  const [payload, setPayload] = useState('{}');
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    try {
      const payloadObj = JSON.parse(payload);
      const response = await send(path, payloadObj);
      setResult(response);
    } catch (err) {
      setResult({ error: err.message });
    }
  };

  return (
    <div className="px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Send Messages</h1>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Path
            </label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="kernel://status"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payload (JSON)
            </label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder='{"key": "value"}'
            />
          </div>

          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800 text-sm">{error.message}</p>
            </div>
          )}

          {result && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Response:</h3>
              <pre className="text-xs text-gray-600 overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Messages;
```

---

### 2.13 `src/components/MessageSender.jsx`

**Purpose:** Reusable component for sending messages

**Generated Code:**
```javascript
import { useState } from 'react';
import { useMessage } from '../mycelia/hooks/useMessage.js';

/**
 * MessageSender - Component for sending messages
 * @param {string} defaultPath - Default message path
 * @param {Object} defaultPayload - Default payload
 */
export function MessageSender({ defaultPath = '', defaultPayload = {} }) {
  const { send, loading, error } = useMessage();
  const [path, setPath] = useState(defaultPath);
  const [payload, setPayload] = useState(JSON.stringify(defaultPayload, null, 2));
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    try {
      const payloadObj = JSON.parse(payload);
      const response = await send(path, payloadObj);
      setResult(response);
    } catch (err) {
      setResult({ error: err.message });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message Path
        </label>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="subsystem://operation/action"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payload (JSON)
        </label>
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
      </div>

      <button
        onClick={handleSend}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Send Message'}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">{error.message}</p>
        </div>
      )}

      {result && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <pre className="text-xs text-gray-600 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

---

### 2.14 `package.json`

**Purpose:** Dependencies and scripts

**Generated Code:**
```json
{
  "name": "mycelia-react-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest watch"
  },
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-router-dom": "^7.9.5"
  },
  "devDependencies": {
    "@types/react": "^19.1.16",
    "@types/react-dom": "^19.1.9",
    "@vitejs/plugin-react": "^5.0.4",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.36.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.22",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.18",
    "vite": "^7.1.7",
    "vitest": "^2.1.5"
  }
}
```

---

### 2.15 `vite.config.js`

**Purpose:** Vite configuration

**Generated Code:**
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
```

---

### 2.16 `tailwind.config.js`

**Purpose:** Tailwind CSS configuration

**Generated Code:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

---

### 2.17 `README.md`

**Purpose:** Project documentation

**Generated Code:**
```markdown
# Mycelia React App

A React application integrated with Mycelia Kernel message-driven architecture.

## Features

- ✅ React 19 with Vite
- ✅ Mycelia Kernel integration
- ✅ React hooks for Mycelia (useMessage, useCommand, useQuery, useListener)
- ✅ Example components and pages
- ✅ Tailwind CSS for styling
- ✅ React Router for navigation

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
\`\`\`

## Mycelia Integration

### React Hooks

- \`useMessageSystem()\` - Access MessageSystem
- \`useSubsystem(name)\` - Access a subsystem
- \`useMessage()\` - Send messages
- \`useCommand(subsystem)\` - Send commands
- \`useQuery(subsystem)\` - Send queries
- \`useListener(subsystem, path, callback)\` - Listen to events

### Example Usage

\`\`\`jsx
import { useMessage } from './mycelia/hooks/useMessage.js';

function MyComponent() {
  const { send, loading, error } = useMessage();

  const handleClick = async () => {
    const result = await send('kernel://status', {});
    console.log(result);
  };

  return <button onClick={handleClick}>Send Message</button>;
}
\`\`\`

## Project Structure

- \`src/mycelia/\` - Mycelia Kernel integration
- \`src/components/\` - Reusable React components
- \`src/pages/\` - Page components
- \`mycelia-kernel-v2/\` - Mycelia Kernel v2 source
```

---

## 3. Integration Patterns

### 3.1 Message-Driven UI Updates

**Pattern:** Components listen to events and update UI reactively

```javascript
import { useEventData } from '../mycelia/hooks/useListener.js';

function StatusDisplay() {
  const status = useEventData('kernel', 'kernel://event/status-changed');
  
  return <div>Status: {status?.status || 'Unknown'}</div>;
}
```

### 3.2 Command Execution

**Pattern:** Components execute commands and show loading/error states

```javascript
import { useCommand } from '../mycelia/hooks/useCommand.js';

function DataProcessor() {
  const { sendCommand, loading, error } = useCommand('processor');
  
  const handleProcess = async () => {
    const result = await sendCommand('processData', { data: [1,2,3] });
    // Handle result
  };
  
  return (
    <button onClick={handleProcess} disabled={loading}>
      {loading ? 'Processing...' : 'Process Data'}
    </button>
  );
}
```

### 3.3 Query-Based Data Fetching

**Pattern:** Components query subsystems for data

```javascript
import { useQuery } from '../mycelia/hooks/useQuery.js';
import { useEffect, useState } from 'react';

function UserList() {
  const { sendQuery } = useQuery('userService');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function fetchUsers() {
      const result = await sendQuery('getAllUsers', {});
      if (result) setUsers(result.data);
    }
    fetchUsers();
  }, []);

  return (
    <ul>
      {users.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```

---

## 4. Template Features

### 4.1 What's Included

✅ **Full React Setup**
- Vite + React 19
- React Router 7
- Tailwind CSS 3
- ESLint configuration

✅ **Mycelia Integration**
- MessageSystem bootstrap
- React Context provider
- React hooks for all Mycelia operations
- Example components and pages

✅ **Development Tools**
- Hot module replacement
- ESLint integration
- Tailwind CSS IntelliSense

✅ **Example Code**
- Message sending examples
- Command execution examples
- Query examples
- Event listening examples

### 4.2 What's NOT Included

❌ **Custom Subsystems** - Empty directory, ready for custom subsystems
❌ **Authentication** - Can be added via AuthSubsystem
❌ **Database** - Can be added via DBSubsystem
❌ **Server-Side Rendering** - Client-side only (can be extended)

---

## 5. Usage Flow

### 5.1 User Creates Project

```bash
mycelia-kernel create react-app my-app
cd my-app
npm install
npm run dev
```

### 5.2 User Sees

1. **Home Page** - Shows Mycelia Kernel status
2. **Messages Page** - Interactive message sending
3. **Commands Page** - Command execution examples
4. **Queries Page** - Query examples

### 5.3 User Extends

1. Creates custom subsystems using CLI
2. Uses React hooks to interact with subsystems
3. Builds UI components using Mycelia hooks
4. Listens to events for reactive updates

---

## 6. Design Decisions

### 6.1 Why React Context?

**Decision:** Use React Context for MessageSystem access

**Rationale:**
- Standard React pattern
- Avoids prop drilling
- Single source of truth
- Easy to access from any component

**Alternative Considered:**
- Global variable (not React-friendly)
- Prop drilling (verbose)
- State management library (overkill)

### 6.2 Why Custom Hooks?

**Decision:** Create custom hooks for Mycelia operations

**Rationale:**
- Follows React best practices
- Encapsulates Mycelia complexity
- Reusable across components
- Type-safe (if using TypeScript)

**Alternative Considered:**
- Direct MessageSystem access (verbose)
- Higher-order components (less flexible)
- Render props (verbose)

### 6.3 Why Example Pages?

**Decision:** Include example pages showing all patterns

**Rationale:**
- Demonstrates all integration patterns
- Provides copy-paste examples
- Shows best practices
- Helps users understand Mycelia + React

**Alternative Considered:**
- Minimal template (less helpful)
- Only components (less complete)
- Only hooks (no usage examples)

---

## 7. Future Enhancements

### 7.1 Potential Additions

- **TypeScript Support** - TypeScript version of template
- **Server-Side Rendering** - Next.js template variant
- **State Management** - Integration with Redux/Zustand
- **Testing Setup** - React Testing Library examples
- **Storybook** - Component documentation
- **Authentication Example** - AuthSubsystem integration
- **Database Example** - DBSubsystem integration

### 7.2 Template Variants

- **Minimal** - Bare minimum setup
- **Full** - All examples and features
- **TypeScript** - TypeScript version
- **Next.js** - Server-side rendering variant

---

## 8. Summary

A React template for Mycelia Kernel CLI would produce:

1. **Complete React Setup** - Vite, React Router, Tailwind CSS
2. **Mycelia Integration** - Bootstrap, Context, Hooks
3. **Example Components** - MessageSender, CommandExecutor, etc.
4. **Example Pages** - Home, Messages, Commands, Queries
5. **Documentation** - README with usage examples

**Key Value:**
- Shows developers how to integrate React with Mycelia
- Provides reusable patterns and hooks
- Demonstrates best practices
- Ready to extend with custom subsystems

**Command:**
```bash
mycelia-kernel create react-app <project-name>
```

---

**Document Created:** January 2025

