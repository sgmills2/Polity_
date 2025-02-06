# Polity

A political aggregator that analyzes Congress.gov API data to rate politicians' stances on various issues.

## Features

- Track and analyze voting records from Congress.gov
- Score politicians on various political issues
- Visualize voting patterns and political leanings
- Compare politicians across different topics
- Modern, responsive UI built with MUI Joy

## Tech Stack

- **Frontend**: React, TypeScript, MUI Joy, Recharts
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase
- **Package Management**: Yarn Workspaces
- **API Integration**: Congress.gov API

## Getting Started

### Prerequisites

- Node.js 18+ 
- Yarn
- Supabase Account

### Environment Setup

1. Create a `.env` file in the `packages/backend` directory:
```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
CONGRESS_API_KEY=your_congress_api_key
```

2. Create a `.env` file in the `packages/frontend` directory:
```env
VITE_API_URL=http://localhost:3001
```

### Installation

```bash
# Install dependencies
yarn install

# Start development servers
yarn dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3001`.

## Project Structure

```
polity/
├── packages/
│   ├── frontend/        # React + MUI Joy frontend
│   ├── backend/         # Express/Node.js API server
│   └── shared/          # Shared types and utilities
```

## Development

- `yarn dev`: Start all packages in development mode
- `yarn build`: Build all packages
- `yarn lint`: Lint all packages
- `yarn test`: Run tests across all packages

## Database Schema

The Supabase database includes tables for:
- Politicians
- Voting Records
- Topics
- Bills

See the shared types in `packages/shared/src/types.ts` for detailed schema information. 