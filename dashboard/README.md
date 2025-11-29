# Pearson Washroom Cleaning Optimization Dashboard

React + TypeScript dashboard for optimizing washroom cleaning operations at Toronto Pearson Airport.

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Data files in the expected directory structure (see `context.MD` Section 8)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will start on `http://localhost:3000`

### Build

```bash
npm run build
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## Project Structure

```
dashboard/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Tab/page components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API/data service layer
│   ├── store/           # Redux state management
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── constants/       # Constants and config
├── public/              # Static assets
└── package.json
```

## Development Plan

See `dev-plan.md` for the complete phased development plan.

## Environment Variables

Create a `.env` file in the dashboard directory:

```
VITE_DATA_ROOT=../GTAA flights arrival departure data 2024
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Material-UI** - Component library
- **Redux Toolkit** - State management
- **React Router** - Routing
- **Recharts** - Data visualization
- **date-fns** - Date handling
- **axios** - HTTP client
- **papaparse** - CSV parsing
- **xlsx** - Excel file parsing

