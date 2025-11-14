//
// Lightweight context for the booking flow to persist selections across steps.
// Updated to expose feature flag (supabaseEnabled) and maintain existing state shape.
//
import { createContext, useContext, useMemo, useState } from "react";
import { isSupabaseEnabled } from "../../utils/featureFlags";

/**
// PUBLIC_INTERFACE
 * useBooking - hook to access the booking state and actions.
 */
export function useBooking() {
  return useContext(BookingContext);
}

// PUBLIC_INTERFACE
export function BookingProvider({ children }) {
  /**
   * Provides in-memory state for the booking flow.
   * Persisting to localStorage is not required yet; in-memory retains across steps.
   */
  const [vehicle, setVehicle] = useState({ make: "", model: "", vin: "" }); // 'year' not used
  const [serviceType, setServiceType] = useState(null);
  const [center, setCenter] = useState(null);
  const [dateTime, setDateTime] = useState({ date: "", slot: "" });
  const [details, setDetails] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
    pickup: false,
    loaner: false,
  });

  // Feature flags snapshot for this provider lifetime
  const flags = useMemo(
    () => ({
      supabaseEnabled: isSupabaseEnabled(),
    }),
    []
  );

  const value = useMemo(
    () => ({
      vehicle,
      setVehicle,
      serviceType,
      setServiceType,
      center,
      setCenter,
      dateTime,
      setDateTime,
      details,
      setDetails,
      flags,
    }),
    [vehicle, serviceType, center, dateTime, details, flags]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

const BookingContext = createContext({
  vehicle: { make: "", model: "", vin: "" },
  setVehicle: () => {},
  serviceType: null,
  setServiceType: () => {},
  center: null,
  setCenter: () => {},
  dateTime: { date: "", slot: "" },
  setDateTime: () => {},
  details: { name: "", phone: "", email: "", notes: "", pickup: false, loaner: false },
  setDetails: () => {},
  flags: { supabaseEnabled: false },
});

// PUBLIC_INTERFACE
export const BOOKING_STEPS = [
  "Select Vehicle",
  "Select Service Type",
  "Choose Service Center",
  "Pick Date & Time",
  "Enter Details & Preferences",
  "Review & Confirm",
];

/**
 * Mock/static data source for service types, centers, and time slots.
 * Note: Kept for backwards compatibility with any parts of UI using MockData.
 * For new mock data use the dedicated mocks.js in this folder.
 */
export const MockData = {
  serviceTypes: [
    { id: "oil", name: "Oil Change", duration_min: 30, price: 69 },
    { id: "brakes", name: "Brake Inspection", duration_min: 45, price: 99 },
    { id: "ac", name: "AC Service", duration_min: 60, price: 129 },
    { id: "diagnostics", name: "Diagnostics", duration_min: 60, price: 149 },
    { id: "wash", name: "Car Washing", duration_min: 45, price: 40, note: "From $40 (45-60 min)" },
    { id: "paint", name: "Car Painting", duration_min: 240, price: 300, note: "From $300 (4-8 hrs+)" },
  ],
  centers: [
    {
      id: "cntr-om-001",
      name: "Ocean Motors Service - Downtown",
      address: "15 Bull Temple Road, Basavanagudi, Bengaluru",
      distance_km: 4.2,
      rating: 4.6,
    },
    {
      id: "cntr-om-002",
      name: "Ocean Motors Service - Kanakapura Rd",
      address: "Opp. Metro Cash & Carry, Kanakapura Main Rd, Bengaluru",
      distance_km: 7.8,
      rating: 4.5,
    },
    {
      id: "cntr-om-003",
      name: "Ocean Motors Service - Bannerghatta",
      address: "Bannerghatta Rd, Mico Layout, Bengaluru",
      distance_km: 9.3,
      rating: 4.4,
    },
  ],
  getSlotsForDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return [];
    const day = d.getDay(); // 0 Sun, 6 Sat
    if (day === 0) {
      return ["10:00", "11:00", "12:00"];
    }
    if (day === 6) {
      return ["09:30", "11:00", "14:00"];
    }
    return ["09:00", "10:00", "11:00", "13:00", "14:00", "15:30"];
  },
};

// TODO(API): Replace MockData with backend calls once FastAPI endpoints are available.
// Suggested endpoints:
// - GET /api/service-types
// - GET /api/service-centers?lat=..&lng=..
// - GET /api/slots?centerId=..&serviceId=..&date=..
// - POST /api/bookings (payload includes all selections)

export default BookingContext;
