# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
I don't want you to automatically edit my code, 
rather, I want you to give me instructions based on the question I give and this very project (Mind Echo)

## Project Overview

Mind Echo Backend is a Node.js mental health application backend built with Express.js. The project is transitioning from MongoDB to PostgreSQL as the primary database.

## Environment Setup

- Node.js version: 20.18.1 (use `nvm use` to switch to correct version)
- Uses ES modules (`"type": "module"` in package.json)
- Environment variables defined in `.env` file

## Development Commands

```bash
# Start development server with PM2
npm run dev

# Start production server with PM2
npm run prod

# Stop all PM2 processes
npm run stop

# Check PM2 status
npm run status

# Format code with Prettier
npm run format

# Start server directly (without PM2)
npm start
```

## Architecture

### Database Configuration
- **Primary Database**: PostgreSQL (in transition)
- **Legacy Database**: MongoDB (being deprecated)
- Database connections initialized in `src/config/database.js`
- Development uses PostgreSQL Client, Production uses Connection Pool

### Application Structure
- Entry point: `src/server.js`
- Express app configuration: `src/app.js`
- PM2 configuration: `src/ecosystem.config.cjs`

### API Routes
- `/api/auth` - Authentication (register, login)
- `/api/users` - User management
- `/api/main` - Metrics and psychological tests
- `/api/chat` - Chatbot interactions with different therapy types (default, CBT, MBT)
- `/api/diary` - Diary entries and mood tracking
- `/api/alive` - Health check endpoint

### Models
Located in `src/models/`:
- `User.js` - User authentication and profile data
- `ChatSession.js`, `Message.js` - Chat functionality
- `Diary.js`, `DiaryEntry.js` - Diary system
- `Metrics.js` - Mental health metrics tracking

### Key Features
- Mental health metrics tracking (physical, mood, sleep, energy, appetite)
- Multi-type chatbot therapy support (CBT, MBT)
- Diary analysis and mood tracking
- Psychological test assessments (PHQ-9, GAD-7, BSRS-5, RFQ-8)
- JWT-based authentication

## Code Style

- Uses Prettier with 4-space indentation
- Single quotes, semicolons, ES5 trailing commas
- Extensive inline documentation explaining middleware and security configurations

## Environment Modes

- **Development**: Single PM2 instance, file watching enabled, PostgreSQL Client
- **Production**: 2 PM2 cluster instances, PostgreSQL Connection Pool

## Database Migration Notes

The project is actively migrating from MongoDB to PostgreSQL. Both database connections are maintained during the transition period. When working with data models, prefer PostgreSQL implementations over MongoDB where available.
