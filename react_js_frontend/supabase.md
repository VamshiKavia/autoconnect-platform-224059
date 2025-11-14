# Supabase Integration - Frontend

This app uses Supabase Auth and Supabase Database for the booking flow, vehicle management, catalog (service types, centers), and time slots.

Follow these steps to configure and verify.

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
  - Enable "Email signups".
  - Configure password policy (min length ≥ 6 to match UI).

- Authentication > URL Configuration
  - Add your frontend URL to "Redirect URLs":
    - http://localhost:3000
  - If "Confirm email" is enabled, signups will redirect to:
    - `${REACT_APP_FRONTEND_URL}/login` (e.g. http://localhost:3000/login)

## 3) Database tables (expected by UI)

- Table: user_vehicles
  - Columns: id, user_id, make, model, vin, nickname
  - RLS example:
    policy "Users can read their vehicles" on user_vehicles
    for select
    using (auth.uid() = user_id);

- Table: service_types
  - Columns: id, name, description, base_price, duration_minutes, active
  - UI reads rows with `active = true`.
  - Example (public read of active only):
    policy "Public read of active service types" on service_types
    for select
    using (active = true);

- Table: service_centers
  - Columns: id, name, address_line1, address_line2, city, state, postal_code, country, latitude, longitude, phone, email, opening_hours (json), active
  - UI reads rows with `active = true`.
  - Example (public read of active only):
    policy "Public read of active service centers" on service_centers
    for select
    using (active = true);

- Table: service_center_slots
  - Columns: id (uuid), service_center_id (uuid), service_type_id (uuid|null), start_at (timestamptz), end_at (timestamptz), capacity (int), booked_count (int), status (text: 'available'|'held'|'booked'|'blocked'), active (boolean)
  - UI reads rows where:
    - active = true
    - status = 'available'
    - service_center_id = selected center
    - start_at within selected calendar day (computed from local date to ISO; DB stores UTC)
    - If service type selected and slot has service_type_id, filter by `service_type_id`
  - Example (public read of available slots):
    policy "Public read of available active slots" on service_center_slots
    for select
    using (active = true AND status = 'available');

- Table: service_bookings (NEW write in Review step)
  - Expected columns:
    - id (primary key)
    - user_id (uuid, references auth.users)
    - vehicle_id (uuid, nullable; references user_vehicles.id)
    - service_type_id (uuid)
    - service_center_id (uuid)
    - slot_id (uuid, references service_center_slots.id)
    - contact_name (text)
    - contact_phone (text)
    - contact_email (text)
    - pickup_drop (boolean)
    - notes (text)
    - estimated_price (numeric, nullable)
    - estimated_duration_minutes (integer, nullable)
    - status (text) default 'pending'
    - created_at (timestamptz) default now()
  - RLS requirement for client insert:
    policy "Users can create their own bookings" on service_bookings
    for insert
    with check (user_id = auth.uid());

  - Optional additional RLS:
    - Allow selecting own bookings:
      policy "Users can read their bookings" on service_bookings
      for select
      using (user_id = auth.uid());

## 4) Frontend behavior by step

- src/lib/supabaseClient.js
  - Provides `getSupabaseClient()` singleton configured from env vars.
  - Persists session, auto refresh token.

- Step 1: src/pages/bookService/VehicleStep.jsx
  - Loads current user's vehicles via `supabase.auth.getUser()` -> user_id, then:
    `.from("user_vehicles").select("id, make, model, vin, nickname").eq("user_id", userId)`
  - Displays loading/empty/error states.
  - Selecting a saved vehicle maps to context; VIN optional.

- Step 2: src/pages/bookService/ServiceTypeStep.jsx
  - Reads:
    `.from("service_types").select("id, name, description, base_price, duration_minutes, active").eq("active", true)`
  - Maps to context:
    - price <- base_price
    - duration_min <- duration_minutes

- Step 3: src/pages/bookService/CenterStep.jsx
  - Reads:
    `.from("service_centers").select("id, name, address_line1, address_line2, city, state, postal_code, country, latitude, longitude, phone, email, opening_hours, active").eq("active", true)`

- Step 4: src/pages/bookService/DateTimeStep.jsx
  - Reads slots from service_center_slots using selected center id and selected date's start/end ISO range.
  - Filters to active & available; hides past times for "today".
  - Persists `dateTime.slotMeta = { id, start_at, end_at }` and friendly `dateTime.slot`.

- Step 5: src/pages/bookService/DetailsStep.jsx
  - Validates: name, phone (basic), email (basic).
  - Stores `details = { name, phone, email, notes, pickup, loaner }`.

- Step 6: src/pages/bookService/ReviewStep.jsx (UPDATED)
  - Validates that all required selections exist before enabling Confirm:
    - vehicle present (make/model), service_type_id, service_center_id, slot_id, details fields
  - On Confirm:
    - Fetches user via `supabase.auth.getUser()`
    - Inserts into `service_bookings` with RLS-compatible `user_id = auth.uid()`:
      {
        user_id,
        vehicle_id, // optional if selected saved vehicle has id
        service_type_id,
        service_center_id,
        slot_id,
        contact_name,
        contact_phone,
        contact_email,
        pickup_drop,
        notes,
        estimated_price,               // from selected service type (if present)
        estimated_duration_minutes,    // from selected service type
        status: "pending",
      }
    - Uses `.insert(payload).select("id").single()` and shows:
      - Loading state while submitting ("Confirming...")
      - Success view with booking reference id
      - Error banner on failure
  - TODO (Server-side):
    - Validation & conflict checks (slot capacity, double-booking) should be enforced on server/DB.
    - Consider unique/partial indexes and transactional checks to guarantee integrity.

## 5) Timezone notes

- The client constructs a date range from the user's local YYYY-MM-DD (00:00..23:59:59.999) and compares to timestamptz in UTC.
- Consider moving this logic server-side or adding center-level timezone metadata to avoid ambiguity.

## 6) Local verification checklist

1) Start frontend: `npm start` at port 3000
2) Create/sign in to an account.
3) Seed minimal data:
   - service_types with `active = true`
   - service_centers with `active = true`
   - service_center_slots with `active = true`, `status = 'available'`, and times in the future for your selected date
   - Optionally user_vehicles for your user id
4) Navigate to /book-service and complete steps:
   - Vehicle (manual or saved)
   - Service Type (from Supabase)
   - Service Center (from Supabase)
   - Pick Date & Time (slots from Supabase)
   - Details
   - Review & Confirm -> should create a `service_bookings` row and show booking id on success.

If you see errors:
- Verify env vars (`REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_KEY`)
- Check RLS policies described above—especially insert on `service_bookings` with `user_id = auth.uid()`
- Confirm data exists for service_types, service_centers, and slots for the selected date

Security note: Never commit real keys. Always use environment variables.
