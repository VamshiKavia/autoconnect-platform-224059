# Supabase Integration - Frontend

This app uses Supabase Auth (email/password) and Supabase Database (read-only examples: "Car parts", user-specific "user_vehicles", public "service_types", and public "service_centers").

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

- Table: service_centers
  - Columns (used by UI): id, name, address_line1, address_line2, city, state, postal_code, country, latitude, longitude, phone, email, opening_hours (json), active
  - The UI reads only rows where `active = true`.
  - RLS: If this is public information, you may allow anon read for active centers:
    policy "Public read of active service centers" on service_centers
    for select
    using (active = true);

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

- `src/pages/bookService/ServiceTypeStep.jsx`
  - Reads from Supabase:
    - `.from("service_types").select("id, name, description, base_price, duration_minutes, active").eq("active", true)`
  - Implements loading, empty, and error states.
  - Maps to booking context:
    - price <- base_price
    - duration_min <- duration_minutes

- `src/pages/bookService/CenterStep.jsx`
  - Reads from Supabase:
    - `.from("service_centers").select("id, name, address_line1, address_line2, city, state, postal_code, country, latitude, longitude, phone, email, opening_hours, active").eq("active", true)`
  - Implements loading, empty, and error states.
  - Maps fields and persists selection in context. Review step shows `center.name` and `center.address`.
  - Optional geolocation:
    - If the browser provides location, we compute a simple Haversine distance in km; if denied/unavailable, show a placeholder.

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

  -- service_centers (public or restricted read)
  insert into service_centers (name, address_line1, city, state, postal_code, country, latitude, longitude, phone, email, opening_hours, active)
  values
    ('Ocean Motors Service - Downtown', '15 Bull Temple Road', 'Bengaluru', 'KA', '560004', 'IN', 12.9036, 77.5143, '+91 98765 43210', 'downtown@oceanmotors.example', '{"mon_fri":"9:00-18:00","sat":"10:00-16:00","sun":"closed"}', true);

- Navigate to /book-service:
  - Step 1 (Select Vehicle) lists user vehicles (if any).
  - Step 2 (Select Service Type) lists active service types from Supabase with loading/empty/error states.
  - Step 3 (Choose Service Center) lists active service centers from Supabase with loading/empty/error states and optional distance.
  - Review step shows selected center name and address.

If you see "Failed to load service centers.":
- Ensure `service_centers` table exists with the columns above.
- Confirm RLS policies allow select for your intended audience (anon or authenticated).
- Verify env vars (REACT_APP_SUPABASE_URL/KEY) and restart dev server.

Security note: Do not commit real keys. Always use environment variables.

