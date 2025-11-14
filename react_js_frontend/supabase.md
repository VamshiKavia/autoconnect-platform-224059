# Supabase Integration - Frontend

This app uses Supabase Auth (email/password) and Supabase Database (read-only example table "Car parts").

Follow these steps to configure and verify:

## 1) Environment variables

Create `react_js_frontend/.env` from `.env.example` and set:

- REACT_APP_SUPABASE_URL = https://YOUR-PROJECT-id.supabase.co
- REACT_APP_SUPABASE_KEY = anon public key
- REACT_APP_FRONTEND_URL = absolute URL where the app runs (local: http://localhost:3000)

Note: CRA reads env vars at build time. Restart dev server after changes.

## 2) Supabase Auth configuration

In Supabase dashboard:

- Authentication > Providers > Email
  - Enable "Email" provider.
  - Check "Enable email signups".
  - Configure password policy (min length ≥ 6 to match UI minimum; adjust if needed).

- Authentication > URL Configuration
  - Add your frontend URL to "Redirect URLs":
    - http://localhost:3000
    - If using previews or custom domains, add those too.
  - Save.

- If "Confirm email" is enabled:
  - Users may need to confirm before signing in.
  - Our signUp uses `emailRedirectTo: {FRONTEND_URL}/login`.

## 3) Redirect URL verification

This app constructs `emailRedirectTo` as:
- `${REACT_APP_FRONTEND_URL}/login` (normalized to avoid trailing slash issues)
Ensure this exact URL (e.g. http://localhost:3000/login) is permitted by Supabase.

## 4) Common "invalid credentials" causes and fixes

- Wrong/missing Supabase env vars:
  - Ensure URL and anon key are correct. A wrong key or project URL can cause generic auth errors.
- Password policy not met:
  - Use a stronger password that meets the configured policy.
- Redirect URL not allowed:
  - Add http://localhost:3000 and http://localhost:3000/login to allowed redirect URLs.
- Email confirmation required:
  - If enabled, check your email and complete confirmation before signing in.

## 5) Frontend behavior

- `src/lib/supabaseClient.js` reads env vars and creates a singleton client.
- `src/context/AuthContext.js`
  - `signUp(email, password, metadata?)` uses `emailRedirectTo` derived from `REACT_APP_FRONTEND_URL` or `window.location.origin`.
  - Improved error mapping returns user-friendly messages for common errors.
- `src/pages/Login.js` surfaces friendly errors and requires password min length 6.

## 6) Table "Car parts" (optional data)

- Name: Car parts (with a space)
- Columns: id, title, Description, Category, Features, image_url, created_at, updated_at
- RLS: Configure read access as needed.

## 7) Local verification checklist

- Start backend (optional, only for demo REST calls): http://localhost:3001
- Start frontend: `npm start` at port 3000
- Go to http://localhost:3000/login
- Try Sign Up with:
  - Email: you@example.com
  - Password: StrongPassword123!
  - Display name: Your Name
- If signup requires email confirmation, check inbox and complete; then Sign In.

If still seeing "invalid credentials":
- Check browser console warnings for guidance.
- Re-validate env vars and Supabase dashboard settings above.
- Regenerate anon key if compromised or mis-copied.

Security note: Do not commit real keys. Always use environment variables.
