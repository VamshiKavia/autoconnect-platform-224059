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

Create a .env file locally as needed.

## Run

npm install
npm start

Open http://localhost:3000

Ensure backend is running on port 3001.

## Notes

- Theme: Ocean Professional (see src/theme.css)
- Routing: react-router-dom
- API client: src/api/client.js using env base URL
