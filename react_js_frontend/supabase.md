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

If you see "Invalid email or password" even with correct credentials, check the following in order:

1) Email confirmation
- If "Confirm email" is enabled in Supabase Auth, you cannot sign in until the email is confirmed.
- Message to look for: "Email not confirmed." — confirm the email via the link sent during sign up.

2) Redirect URL configuration
- Ensure BOTH of these are added under Authentication > URL Configuration > Redirect URLs:
  - http://localhost:3000
  - http://localhost:3000/login
- Our app passes emailRedirectTo: `${REACT_APP_FRONTEND_URL}/login`. If this URL isn't on the allowlist, auth can fail with vague errors.

3) Environment variables
- REACT_APP_SUPABASE_URL must be your project URL (https://XYZ.supabase.co)
- REACT_APP_SUPABASE_KEY must be the anon public key
- Restart dev server after editing .env so CRA picks up new values.

4) Password policy
- Check Authentication > Providers > Email -> Password settings. Our UI requires min length 6 by default.
- If your policy is stronger (e.g., symbols/numbers), use a stronger password.

5) Rate limits
- Supabase may rate limit repeated attempts. Wait and try later if you see rate-limit messages.

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

Create and verify a test account:
1. Sign Up:
   - Email: you@example.com
   - Password: StrongPassword123!
   - Display name: Your Name
   - Expected: If "Confirm email" is enabled, you’ll see a success notice and receive an email.
2. Confirm email:
   - Click the email link; it should redirect you to http://localhost:3000/login
   - Expected: Back on the login page without error.
3. Sign In:
   - Use the same email/password.
   - Expected: Redirects to "/" and header shows your display name.
4. Refresh:
   - Reload the page; you should remain signed in (session persistence).
5. Profile:
   - Navigate to /profile, change display name, save, and see "Saved".

If still seeing "invalid credentials":
- Check browser console warnings for guidance (we surface redirect URL hints).
- Re-validate env vars and Supabase dashboard settings above.
- Regenerate anon key if compromised or mis-copied.

Security note: Do not commit real keys. Always use environment variables.
