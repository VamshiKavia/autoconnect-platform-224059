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

## Run

npm install
npm start

Open http://localhost:3000

## Image performance

- ResponsiveImage component wraps images with:
  - AVIF/WebP next-gen sources with graceful fallback
  - srcset/sizes for responsive delivery
  - lazy loading (default) and eager for above-the-fold hero
  - optional blur placeholder to improve perceived loading
  - layout-shift prevention via width/height
  - optional CDN prefix via REACT_APP_CDN_URL

To enable CDN for images, set REACT_APP_CDN_URL in .env (e.g., https://cdn.example.com).
Place assets under public/assets and optionally provide .webp/.avif variants.

Ensure backend is running on port 3001.

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
