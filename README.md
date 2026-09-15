# Exam Archive Frontend

React and TypeScript CMS for browsing, uploading, and moderating university exam papers.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

The app talks to the real backend. The API URL defaults to `https://localhost:7294`. Authentication uses its HttpOnly session cookie, so the API must allow the Vite origin and be served over HTTPS.

Local development accounts come from the backend seed data. In Development they use the password printed in the backend terminal on startup.

## Commands

- `npm run dev` starts the local Vite server.
- `npm run build` type-checks and creates a production build.
- `npm run lint` checks the source with Oxlint.
