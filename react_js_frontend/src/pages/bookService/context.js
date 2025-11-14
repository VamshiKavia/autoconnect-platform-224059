//
// Lightweight context for the booking flow to persist selections across steps.
// No backend calls yet; all data is local until TODOs are implemented.
//
import { createContext, useContext, useMemo, useState } from "react";

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
  const [vehicle, setVehicle] = useState({ make: "", model: "", vin: "" }); // removed 'year'
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
    }),
    [vehicle, serviceType, center, dateTime, details]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

const BookingContext = createContext({
  vehicle: { make: "", model: "", vin: "" }, // removed 'year'
  setVehicle: () => {},
  serviceType: null,
  setServiceType: () => {},
  center: null,
  setCenter: () => {},
  dateTime: { date: "", slot: "" },
  setDateTime: () => {},
  details: { name: "", phone: "", email: "", notes: "", pickup: false, loaner: false },
  setDetails: () => {},
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
 * Replace these via API integration later.
 */
export const MockData = {
  // Basic sample service types
  serviceTypes: [
    { id: "oil", name: "Oil Change", duration_min: 30, price: 69 },
    { id: "brakes", name: "Brake Inspection", duration_min: 45, price: 99 },
    { id: "ac", name: "AC Service", duration_min: 60, price: 129 },
    { id: "diagnostics", name: "Diagnostics", duration_min: 60, price: 149 },

    // NOTE: For ranges, we surface representative "from" values in UI while noting
    // approximate durations. Replace with backend-provided exact pricing per vehicle/scope.
    // TODO(API): Replace placeholders with values from backend service-types endpoint.

    // Car Washing: basePrice 40-60, durationMinutes 45-60
    // Using price: 40 as "from" and duration_min: 45 (shortest typical time)
    { id: "wash", name: "Car Washing", duration_min: 45, price: 40, note: "From $40 (45-60 min)" },

    // Car Painting: basePrice 300-800+, durationMinutes 240-480 depending on scope
    // Using price: 300 as "from" and duration_min: 240 (4 hours) as baseline estimate
    { id: "paint", name: "Car Painting", duration_min: 240, price: 300, note: "From $300 (4-8 hrs+)" },
  ],
  // Centers with simple metadata
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
  // Slot availability map keyed by date string -> array of time strings
  getSlotsForDate(dateStr) {
    // Simple mock: weekdays have more slots, weekends fewer
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
