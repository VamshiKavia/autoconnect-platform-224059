//
// PUBLIC_INTERFACE
// Lightweight mock booking store for demo/offline mode when Supabase is disabled.
// Persists to localStorage so bookings survive page refreshes.
//
// TODO: Remove this mock store when Supabase is re-enabled.

const STORAGE_KEY = 'mock_bookings_v1';

/**
 * Safely parse JSON from localStorage.
 */
function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Load all mock bookings from storage.
 * Shape: [{ id, user_id, vehicle, serviceType, center, slot, contact, status, created_at }]
 */
function loadAll() {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const data = safeParse(raw, []);
  return Array.isArray(data) ? data : [];
}

/**
 * Save all mock bookings back to storage.
 */
function saveAll(items) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items || []));
  } catch {
    // ignore quota errors
  }
}

/**
 * Generate a simple mock ID.
 */
function genId() {
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `MBK_${ts}_${rnd}`;
}

// PUBLIC_INTERFACE
export function addMockBooking(booking) {
  /**
   * Add a booking object to mock storage.
   * Expects booking to have minimally: { user_id, status, created_at }
   * Returns the inserted booking with id.
   */
  const all = loadAll();
  const record = {
    ...booking,
    id: booking.id || genId(),
  };
  all.unshift(record); // newest first
  saveAll(all);
  return record;
}

// PUBLIC_INTERFACE
export function listMockBookingsByUser(userIdOrPlaceholder) {
  /**
   * Return a list of bookings for the given user id or placeholder.
   */
  const all = loadAll();
  return all.filter(b => String(b.user_id || '') === String(userIdOrPlaceholder || ''));
}

// PUBLIC_INTERFACE
export function clearMockBookings() {
  /**
   * Clear all mock bookings (handy for tests and resets).
   */
  saveAll([]);
}

export default {
  addMockBooking,
  listMockBookingsByUser,
  clearMockBookings,
};
