# Supabase Integration - Frontend

This app uses Supabase Auth (email/password) and Supabase Database (read-only examples: "Car parts" and user-specific "user_vehicles").

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

## 4) Database tables

- Table: "Car parts" (with a space)
  - Columns: id, title, Description, Category, Features, image_url, created_at, updated_at
  - RLS: Configure read access as needed (public read or user-specific policies).

- Table: user_vehicles
  - Columns (expected by UI): id, user_id, make, model, vin, nickname
  - RLS: At minimum, enable policies that allow authenticated users to read their own rows:
    - Example: (using Supabase SQL editor)
      policy "Users can read their vehicles" on user_vehicles
      for select
      using (auth.uid() = user_id);

    - Insert/update/delete policies are not required for current step (read-only), but will be needed later.

## 5) Frontend behavior

- `src/lib/supabaseClient.js` reads env vars and creates a singleton client.
- `src/context/AuthContext.js`
  - Initializes session, exposes `user`, and syncs access token to localStorage.
  - `signUp(email, password, metadata?)` uses `emailRedirectTo` derived from `REACT_APP_FRONTEND_URL` or `window.location.origin`.
- `src/pages/bookService/VehicleStep.jsx`
  - Queries Supabase on mount to load `user_vehicles` for the current user:
    - Uses `supabase.auth.getUser()` (or session from context) to get user id.
    - Filters `.from("user_vehicles").select("id, make, model, vin, nickname").eq("user_id", userId)`.
  - Implements loading, empty, and error states.
  - Selecting a saved vehicle populates the form (make, model, vin, nickname); VIN remains optional.
  - Manual entry is still supported and drives validation:
    - Make, model required; VIN optional.
  - TODOs for future enhancements:
    - Add/edit/delete vehicle mutations (INSERT/UPDATE/DELETE).
- `src/pages/parts/PartsList.js` continues to read "Car parts" (read-only).

## 6) Local verification checklist

- Start frontend: `npm start` at port 3000
- Go to http://localhost:3000/login, create/sign in to an account.
- In Supabase SQL Editor, insert a few rows in `user_vehicles` for your `user_id`:
  insert into user_vehicles (user_id, make, model, vin, nickname)
  values ('<YOUR_USER_ID>', 'Hyundai', 'i20', 'MAHXXXXXXXXXXXXXX', 'Hatchback');

- Navigate to /book-service:
  - Step 1 (Select Vehicle) should show your saved vehicles.
  - Selecting one should populate the form fields.
  - Form validation still requires make & model; VIN is optional.

If you see "Failed to load your vehicles.":
- Ensure `user_vehicles` table exists with the columns above.
- Confirm RLS policies allow the authenticated user to select their own rows.
- Verify env vars (REACT_APP_SUPABASE_URL/KEY) and restart dev server.

Security note: Do not commit real keys. Always use environment variables.
