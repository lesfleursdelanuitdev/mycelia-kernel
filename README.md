# Mycelia Kernel

A message-driven architecture kernel system for inter-subsystem communication.

## Project Setup

This project was created with Vite + React + Tailwind CSS.

## Messages Module

The core message system code has been copied from `canvas-notification-system-test/src/messages` to this project.

### Structure

- `src/messages/` - Core message system implementation
  - `MessageSystem.js` - Central coordination system
  - `BaseSubsystem.js` - Base class for all subsystems
  - `MessageRouter.js` - Message routing system
  - `models/` - Core data models (Message, Cache, etc.)
  - `schedulers/` - Global and subsystem schedulers
  - `utils/` - Utility functions
  - `docs/` - Documentation

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Features

- Message-driven architecture
- Subsystem registration and management
- Global and subsystem-level scheduling
- Kernel-level cache management
- Secret identity management
- Protected message sending with caller authentication
- Dead letter queue management
- Error handling and classification
