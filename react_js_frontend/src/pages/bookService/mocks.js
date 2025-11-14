//
// Mock data used when Supabase is disabled via feature flags.
// Keep these simple and deterministic to preserve UX in offline/demo mode.
//

export const MOCK_VEHICLES = [
  { id: 'veh-1', name: 'Sedan LX 1.6', plate: 'ABC-1234', vin: 'VINMOCK001' },
  { id: 'veh-2', name: 'SUV Pro 2.0', plate: 'XYZ-5678', vin: 'VINMOCK002' },
];

export const MOCK_SERVICE_TYPES = [
  { id: 'svc-1', name: 'Oil Change', duration_minutes: 45, price: 59.99 },
  { id: 'svc-2', name: 'Full Service', duration_minutes: 120, price: 199.0 },
  { id: 'svc-3', name: 'Brake Inspection', duration_minutes: 60, price: 89.0 },
];

export const MOCK_CENTERS = [
  { id: 'ctr-1', name: 'Ocean Service Center - Downtown', address: '100 Harbor Ave', city: 'Marina Bay' },
  { id: 'ctr-2', name: 'Ocean Service Center - Northside', address: '55 Lighthouse Rd', city: 'Northport' },
];

export const MOCK_TIMESLOTS = [
  // Simplified time slots; in real app, derive from date and center capacity
  { id: 'ts-1', label: '09:00 AM' },
  { id: 'ts-2', label: '10:30 AM' },
  { id: 'ts-3', label: '01:00 PM' },
  { id: 'ts-4', label: '03:30 PM' },
];

export function generateMockBookingReference() {
  // Simple deterministic mock reference
  const rnd = Math.random().toString(36).substring(2, 7).toUpperCase();
  const ts = new Date().getTime().toString().slice(-4);
  return `BK-${rnd}-${ts}`;
}
