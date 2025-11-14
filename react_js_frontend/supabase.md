# Supabase Integration - Frontend

This app uses Supabase Auth (email/password) and Supabase Database (read-only examples: "Car parts", user-specific "user_vehicles", and public "service_types").

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
    - Example:
      policy "Users can read their vehicles" on user_vehicles
      for select
      using (auth.uid() = user_id);

- Table: service_types
  - Columns (used by UI): id, name, description, base_price, duration_minutes, active
  - The UI reads only rows where `active = true`.
  - RLS: If this is public catalog data, you can allow anon read; otherwise restrict as needed.
  - Example (public read):
    policy "Public read of active service types" on service_types
    for select
    using (active = true);

  - TODO(ADMIN-WRITES): Admin interfaces to create/update/deactivate service types will require insert/update policies. Not implemented in this app.

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

- `src/pages/bookService/ServiceTypeStep.jsx`
  - Replaces mock data with Supabase query:
    - `.from("service_types").select("id, name, description, base_price, duration_minutes, active").eq("active", true)`
  - Implements loading, empty, and error states.
  - Maps fields to existing booking context usage:
    - price <- base_price
    - duration_min <- duration_minutes
  - Selection flows to booking context and is shown in the Review step.

- `src/components/PartsList.js` continues to read "Car parts" (read-only).

## 6) Local verification checklist

- Start frontend: `npm start` at port 3000
- Go to http://localhost:3000/login, create/sign in to an account (for user_vehicles).
- Seed tables as needed:

  -- user_vehicles (per-user)
  insert into user_vehicles (user_id, make, model, vin, nickname)
  values ('<YOUR_USER_ID>', 'Hyundai', 'i20', 'MAHXXXXXXXXXXXXXX', 'Hatchback');

  -- service_types (public or restricted read)
  insert into service_types (name, description, base_price, duration_minutes, active)
  values
    ('Oil Change', 'Engine oil and filter replacement', 69, 30, true),
    ('Brake Inspection', 'Brake pads, rotors, and fluid check', 99, 45, true),
    ('AC Service', 'AC gas refill and leak detection', 129, 60, true);

- Navigate to /book-service:
  - Step 1 (Select Vehicle) should show your saved vehicles when authenticated.
  - Step 2 (Select Service Type) should list active service types from Supabase with loading/empty/error states.
  - Selecting a service type should reflect in the Review step with price and duration.

If you see "Failed to load service types.":
- Ensure `service_types` table exists with the columns above.
- Confirm RLS policies allow select for your intended audience (anon or authenticated).
- Verify env vars (REACT_APP_SUPABASE_URL/KEY) and restart dev server.

Security note: Do not commit real keys. Always use environment variables.

