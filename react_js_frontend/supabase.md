# Supabase Integration - Frontend

This app uses Supabase Auth (email/password) and Supabase Database (read-only example table "Car parts").
The booking flow also reads from: service_types, service_centers, center_slots (and writes to bookings on confirmation).

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
- Booking flow requires authentication to confirm:
  - `src/pages/bookService/BookService.jsx` prevents navigation to "Review & Confirm" when logged out and shows an inline sign-in banner.
  - `src/pages/bookService/ReviewStep.jsx` disables the Confirm button and shows a focused sign-in banner if unauthenticated.
  - Upon successful sign-in, the Confirm action is re-enabled without losing previously entered booking state held in context.

## 6) Tables and expected columns

- "Car parts" (with a space)
  - Columns: id, title, Description, Category, Features, image_url, created_at, updated_at
- service_types
  - Columns: id, name, description, category, features, image_url
  - Notes: features can be text[], JSON, or stringified JSON; UI normalizes for display.
- service_centers
  - Columns: id, name, address, city, state, zipcode, phone, email, latitude, longitude, image_url
- center_slots
  - Columns: id, center_id, date, start_time, end_time, capacity, available
- vehicles
  - Columns: id, make, model, year, image_url, user_id, updated_at
- bookings (inserted on confirmation)
  - Columns: user_id, vehicle_id, service_type_id, center_id, slot_id, scheduled_date, scheduled_time, status, notes, price

Ensure RLS policies allow appropriate read (and insert for bookings) access for authenticated users.

## 7) Troubleshooting service types loading

If the "Select Service Type" step shows "Failed to load service types":

- Open the browser console:
  - You should see a diagnostic log:
    `[ServiceTypeStep] Env check { hasUrl: true|false, hasKey: true|false, NODE_ENV: ... }`
    - If hasUrl or hasKey is false, set REACT_APP_SUPABASE_URL/KEY and restart the dev server.
- Error banner now surfaces code and message if available (e.g., permission denied, relation does not exist).
- If your table or columns differ:
  - Confirm table name is exactly `services_catalog`.
  - Expected columns used by UI: `id, name, description` and optionally `image_url`.
- For RLS errors:
  - Create a read policy on `services_catalog` for anon or authenticated role as needed (e.g., `true` condition for public read, or restricted as appropriate).

### Seeding sample service types from the UI

The Service Type step includes a "Seed sample services" button when the list is empty or on error. Clicking it will insert these rows into `public.services_catalog`:

- Oil Change — "Engine oil and filter replacement with multi-point inspection."
- Brake Check — "Brake pads, rotors, and fluid inspection for safety and performance."
- Car Washing — "Exterior wash and interior vacuum with optional detailing."
- Car Painting — "Premium body repainting and scratch repair with color matching."

Notes:
- The insert uses the existing Supabase JS client (anon key). Ensure your RLS allows insert for the current role (typically authenticated). If inserts fail due to `image_url` column missing, the app retries without `image_url`.
- After a successful insert, the list automatically refreshes to show the new items.

## 8) Local verification checklist

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
4. Book Service:
   - Navigate to /book-service, go to "Select Service Type".
   - Expected: Service types render if RLS and columns are configured.
5. Profile:
   - Navigate to /profile, change display name, save, and see "Saved".

Security note: Do not commit real keys. Always use environment variables.
