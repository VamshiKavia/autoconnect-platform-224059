import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../App.css';
import '../theme.css';
import { getFeatureFlags, isSupabaseEnabled } from '../utils/featureFlags';
import { getEnableSupabaseFlag } from '../config';
import MapPlaceholder from '../components/MapPlaceholder.jsx';

/**
 * PUBLIC_INTERFACE
 * NearbyCenters
 * This page lists nearby service centers with search, filters, sorting, and a map/list toggle.
 * - Uses mock data when REACT_APP_ENABLE_SUPABASE is false (current behavior).
 * - Includes 'Use my location' geolocation prompt.
 * - Displays distance, open/closed state, and a CTA 'Book this center' to navigate to booking.
 * - Accessibility: proper labels, roles, keyboard navigability.
 * 
 * TODO (when Supabase enabled):
 * - Replace mock fetch with Supabase query to service_centers table with geo filters (lat/lng + radius).
 * - Support pagination and live "open now" calculations based on working hours from DB.
 */

// Simple mock dataset for centers (when Supabase flag is disabled)
const MOCK_CENTERS = [
  {
    id: 'c1',
    name: 'Downtown AutoCare',
    address: '123 Main St, Metropolis',
    lat: 37.7749,
    lng: -122.4194,
    rating: 4.6,
    openNow: true,
  },
  {
    id: 'c2',
    name: 'Bayview Service Center',
    address: '456 Harbor Rd, Metropolis',
    lat: 37.7849,
    lng: -122.4094,
    rating: 4.2,
    openNow: false,
  },
  {
    id: 'c3',
    name: 'Hillside Motors',
    address: '789 Summit Ave, Metropolis',
    lat: 37.7649,
    lng: -122.4294,
    rating: 4.8,
    openNow: true,
  },
  {
    id: 'c4',
    name: 'Sunset Garage',
    address: '101 Sunset Blvd, Metropolis',
    lat: 37.7549,
    lng: -122.4394,
    rating: 4.1,
    openNow: true,
  },
];

// Haversine distance in km
const haversineKm = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDlat = Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2);

  const h =
    sinDlat * sinDlat +
    Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

// PUBLIC_INTERFACE
export default function NearbyCenters() {
  /** This is the 'Nearby Centers' page component. */
  const navigate = useNavigate();

  // Feature flag to toggle Supabase integration (currently disabled)
  const supabaseEnabled =
    getEnableSupabaseFlag() || isSupabaseEnabled() || getFeatureFlags().ENABLE_SUPABASE || false;

  // UI state
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('nc:viewMode') || 'list'); // 'list' | 'map'
  const [query, setQuery] = useState(() => localStorage.getItem('nc:query') || '');
  const [coords, setCoords] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [radiusKm, setRadiusKm] = useState(() => {
    const v = Number(localStorage.getItem('nc:radiusKm'));
    return Number.isFinite(v) && v > 0 ? v : 25;
  });
  const [openNowOnly, setOpenNowOnly] = useState(() => localStorage.getItem('nc:openNowOnly') === 'true');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('nc:sortBy') || 'distance'); // 'distance' | 'rating'

  // Centers state (mock for now)
  const [centers, setCenters] = useState([]);

  // Fetch centers (mock or supabase)
  useEffect(() => {
    let abort = false;

    async function load() {
      if (!supabaseEnabled) {
        if (!abort) setCenters(MOCK_CENTERS);
        return;
      }

      // TODO: Supabase integration
      // Example pseudocode:
      // import { supabase } from '../lib/supabaseClient';
      // const { data, error } = await supabase
      //    .from('service_centers')
      //    .select('*')
      //    .limit(100);
      // if (!abort) setCenters(data || []);
      if (!abort) setCenters(MOCK_CENTERS); // fallback until enabled
    }

    load();
    return () => {
      abort = true;
    };
  }, [supabaseEnabled]);

  useEffect(() => { localStorage.setItem('nc:viewMode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('nc:query', query); }, [query]);
  useEffect(() => { localStorage.setItem('nc:radiusKm', String(radiusKm)); }, [radiusKm]);
  useEffect(() => { localStorage.setItem('nc:openNowOnly', String(openNowOnly)); }, [openNowOnly]);
  useEffect(() => { localStorage.setItem('nc:sortBy', sortBy); }, [sortBy]);

  // Handle 'Use my location'
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        const reason =
          err.code === 1
            ? 'Permission denied. Please allow location access.'
            : err.code === 2
            ? 'Position unavailable.'
            : 'Request timed out. Please try again.';
        setGeoError(reason);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Center distance calculation relative to coords (if present)
  const centersWithDistance = useMemo(() => {
    return centers.map((c) => ({
      ...c,
      distanceKm: coords ? haversineKm(coords, { lat: c.lat, lng: c.lng }) : null,
    }));
  }, [centers, coords]);

  // Filter and sort results
  const filteredSorted = useMemo(() => {
    let data = centersWithDistance;

    // Filter by query (simple substring on name/address)
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      data = data.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q)
      );
    }

    // Filter by open now
    if (openNowOnly) {
      data = data.filter((c) => c.openNow);
    }

    // Filter by radius if we have coords and distance computed
    if (coords) {
      data = data.filter(
        (c) => c.distanceKm === null || c.distanceKm <= radiusKm
      );
    }

    // Sort
    const copy = [...data];
    copy.sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      // default distance sort; if no coords, fallback to name
      if (a.distanceKm == null && b.distanceKm == null) {
        return a.name.localeCompare(b.name);
      }
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
    return copy;
  }, [centersWithDistance, query, openNowOnly, radiusKm, coords, sortBy]);

  // Navigate to booking flow with selected center preselected
  const handleBook = (center) => {
    // The booking flow appears under pages/bookService/*. We pass the center id via query params or state.
    navigate(`/book-service?centerId=${encodeURIComponent(center.id)}`, {
      state: { preselectedCenter: center },
    });
  };

  // Minimalist ocean professional styles (utility classes from theme.css + semantic markup)
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
        aria-labelledby="nearby-centers-heading"
      >
        <div className="mb-6">
          <h1
            id="nearby-centers-heading"
            className="text-2xl sm:text-3xl font-semibold text-gray-800"
          >
            Nearby Service Centers
          </h1>
          <p className="text-gray-500 mt-1">
            Find a service center near you. Toggle map or list view, filter by distance, and quickly book.
          </p>
        </div>

        {/* Controls */}
        <div
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6"
          role="region"
          aria-label="Search and filters"
        >
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">
                Search by location or center name
              </label>
              <input
                id="search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by city, address, or center name"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                aria-describedby="search-help"
              />
              <div id="search-help" className="text-xs text-gray-500 mt-1">
                Tip: Try a neighborhood or street name.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-gray-300 text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
                aria-label="Use my current location"
              >
                Use my location
              </button>

              <div className="inline-flex rounded-md shadow-sm" role="group" aria-label="View toggle">
                <button
                  type="button"
                  className={`px-3 py-2 border border-gray-300 ${viewMode === 'list' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-l-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400`}
                  aria-pressed={viewMode === 'list'}
                  onClick={() => setViewMode('list')}
                >
                  List
                </button>
                <button
                  type="button"
                  className={`px-3 py-2 border border-gray-300 ${viewMode === 'map' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-r-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400`}
                  aria-pressed={viewMode === 'map'}
                  onClick={() => setViewMode('map')}
                >
                  Map
                </button>
              </div>
            </div>
          </div>

          {geoError ? (
            <div
              className="mt-3 text-sm text-red-600"
              role="alert"
              aria-live="polite"
            >
              {geoError}
            </div>
          ) : null}

          <div className="mt-2 text-xs text-gray-500">
            {supabaseEnabled
              ? 'Supabase geo queries will be used when available.'
              : 'Supabase disabled. Using mock centers; geo queries are TODO.'}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="radius" className="block text-sm font-medium text-gray-700">
                Distance radius (km)
              </label>
              <select
                id="radius"
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
              >
                {[5, 10, 25, 50, 100].map((r) => (
                  <option key={r} value={r}>{r} km</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={openNowOnly}
                  onChange={(e) => setOpenNowOnly(e.target.checked)}
                  aria-label="Open now only"
                />
                <span className="text-sm text-gray-800">Open now</span>
              </label>
            </div>

            <div>
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700">
                Sort by
              </label>
              <select
                id="sort"
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="distance">Distance</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results area */}
        {viewMode === 'map' ? (
          <div>
            <MapPlaceholder
              height="360px"
              centers={filteredSorted}
              userCoords={coords}
              onPinClick={(c) => handleBook(c)}
            />
            <p className="text-xs text-gray-500 mt-2">
              This is a static preview. TODO: Integrate Mapbox or Google Maps for interactive navigation.
            </p>
          </div>
        ) : (
          <ul
            role="list"
            aria-label="Service centers list"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredSorted.map((c) => (
              <li
                key={c.id}
                className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm focus-within:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      <span className="sr-only">Service Center: </span>
                      {c.name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">{c.address}</p>
                    {c.openingHours ? (
                      <div className="text-xs text-gray-500 mt-2" aria-label="Opening hours">
                        Hours: {c.openingHours}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${c.openNow ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                        aria-label={c.openNow ? 'Open now' : 'Closed'}
                      >
                        {c.openNow ? 'Open now' : 'Closed'}
                      </span>
                      <span aria-label="Rating">⭐ {c.rating?.toFixed(1) ?? '—'}</span>
                      <span aria-label="Distance">
                        {c.distanceKm != null
                          ? `${c.distanceKm.toFixed(1)} km`
                          : 'Distance unavailable'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Link
                    to={`/book-service?centerId=${encodeURIComponent(c.id)}`}
                    state={{ preselectedCenter: c }}
                    className="text-sm text-gray-700 underline underline-offset-2 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
                  >
                    View details
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleBook(c)}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    aria-label={`Book ${c.name}`}
                  >
                    Book this center
                  </button>
                </div>
              </li>
            ))}
            {filteredSorted.length === 0 && (
              <li className="col-span-full text-gray-500 text-sm">
                No centers found. Try widening your radius or clearing filters.
              </li>
            )}
          </ul>
        )}
      </section>
    </main>
  );
}
