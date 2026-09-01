# Exam Archive Frontend

React and TypeScript CMS for browsing, uploading, and moderating university exam papers.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Development uses the bundled mock data by default, so no backend is required. The sign-in page lists demo Admin, Moderator, and User accounts; each account uses the password `demo123`. Uploads, approvals, rejections, and sign-in state are kept in memory and reset when the page is refreshed.

Set `VITE_USE_MOCK_DATA=false` to use the real API. The backend URL defaults to `https://localhost:7294`. Authentication uses its HttpOnly session cookie, so the API must allow the Vite origin and be served over HTTPS.

To explicitly enable mock mode in another build, set:

```bash
VITE_USE_MOCK_DATA=true
```

## Commands

- `npm run dev` starts the local Vite server.
- `npm run build` type-checks and creates a production build.
- `npm run lint` checks the source with Oxlint.
