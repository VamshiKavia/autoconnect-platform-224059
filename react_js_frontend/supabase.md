# Supabase Integration - Frontend

This app uses Supabase Auth and Supabase Database for the booking flow, vehicle management, catalog (service types, centers), and time slots.

Temporary feature flag
- REACT_APP_ENABLE_SUPABASE=false (default): Booking flow uses mock/in-memory data and skips Supabase calls.
- Set REACT_APP_ENABLE_SUPABASE=true to re-enable Supabase-backed reads/writes.

Optional JSON override
- REACT_APP_FEATURE_FLAGS='{"ENABLE_SUPABASE": true}' can also turn on Supabase features.

Guarded areas (re-enable by toggling the flag):
- VehicleStep: loads user vehicles from Supabase when enabled, otherwise uses mock list.
- ServiceTypeStep: loads service_types when enabled, otherwise uses mock list.
- CenterStep: loads service_centers when enabled, otherwise uses mock list.
- DateTimeStep: loads service_center_slots when enabled, otherwise uses static mock times.
- ReviewStep: inserts service_bookings when enabled; in mock mode simulates confirmation with a fake reference.

Notes:
- We do NOT delete Supabase code; it is guarded behind the feature flag.
- When Supabase is disabled, a small note appears indicating the confirmation is not persisted.
- See .env.example for required environment variables.
