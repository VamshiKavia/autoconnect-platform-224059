# React Frontend - Ocean Professional

Minimalist SPA for the car company app with navigation, auth (stub), cars, services, parts, service centers, and profile management (mock).

## Environment

The frontend uses the following env vars (do not hardcode secrets):

- REACT_APP_API_BASE or REACT_APP_BACKEND_URL: Base URL of backend (default http://localhost:3001)
- REACT_APP_FRONTEND_URL
- REACT_APP_WS_URL
- REACT_APP_NODE_ENV
- REACT_APP_NEXT_TELEMETRY_DISABLED
- REACT_APP_ENABLE_SOURCE_MAPS
- REACT_APP_PORT
- REACT_APP_TRUST_PROXY
- REACT_APP_LOG_LEVEL
- REACT_APP_HEALTHCHECK_PATH
- REACT_APP_FEATURE_FLAGS
- REACT_APP_EXPERIMENTS_ENABLED

Create a .env file locally as needed. See .env.example for typical values.

### Feature flags
Set REACT_APP_FEATURE_FLAGS to enable optional behaviors:
- MOCK_BACKEND:true -> Use graceful in-app mock responses when API calls fail (for local dev without backend)

Example:
REACT_APP_FEATURE_FLAGS=MOCK_BACKEND:true

## Run

npm install
npm start

Open http://localhost:3000

Ensure backend is running on port 3001, or enable MOCK_BACKEND flag for local mocks.

## API Paths and Health

- The API client automatically prefixes requests with `/api`. For example:
  - `apiGet("/cars")` -> `GET {REACT_APP_API_BASE}/api/cars`
  - `apiPost("/auth/login")` -> `POST {REACT_APP_API_BASE}/api/auth/login`
- If your backend does not use `/api` prefix, either:
  - Set your routes to use `/api/*`, or
  - Pass fully-qualified API paths beginning with `/api/...` (the client will not double-prefix), or
  - Adjust the client accordingly.
- A healthcheck is performed from the Home page against `{REACT_APP_API_BASE}{REACT_APP_HEALTHCHECK_PATH}` (defaults to `/`), showing connectivity status.

## CORS

Backend must allow the frontend origin:
- Local dev: http://localhost:3000
- Deployed preview: your preview URL

The backend FastAPI app should configure CORS to include these origins.

## Notes

- Theme: Ocean Professional (see src/theme.css)
- Routing: react-router-dom
- API client: src/api/client.js using env base URL with `/api` prefix handling and improved error messages
- Config helpers: src/config.js (feature flags, validation)
- Tests: basic tests in src/api/client.test.js and src/config.test.js
