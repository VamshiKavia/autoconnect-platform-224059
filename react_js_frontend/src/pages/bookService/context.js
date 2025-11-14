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
  const [vehicle, setVehicle] = useState({ make: "", model: "", vin: "" }); // 'year' optional if present
  const [serviceType, setServiceType] = useState(null);
  const [center, setCenter] = useState(null);
  const [dateTime, setDateTime] = useState({ date: "", slot: "", slotId: null, datetimeISO: null });
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
  vehicle: { make: "", model: "", vin: "" },
  setVehicle: () => {},
  serviceType: null,
  setServiceType: () => {},
  center: null,
  setCenter: () => {},
  dateTime: { date: "", slot: "", slotId: null, datetimeISO: null },
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

// Mock data removed in favor of Supabase-powered steps.

export default BookingContext;
