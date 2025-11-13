# Setup Guide

## Backend
- See ../autoconnect-platform-224060/README.md
- Copy ../autoconnect-platform-224060/.env.example to .env and adjust as needed.
- Run with uvicorn (port 3001).

## Frontend
- Copy ./react_js_frontend/.env.example to .env and adjust URLs.
- npm install
- npm start (port 3000)

CORS is enabled on backend to allow http://localhost:3000 by default.
