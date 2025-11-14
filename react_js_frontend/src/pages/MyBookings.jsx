import React, { useEffect, useMemo, useState } from 'react';
import getSupabaseClient from '../lib/supabaseClient';
import useUser from '../hooks/useUser';

/**
 * PUBLIC_INTERFACE
 * MyBookings
 * A minimalist "My Bookings" page that lists the authenticated user's service bookings.
 * - Fetches from Supabase 'service_bookings' filtered by auth user id with related info:
 *   vehicle (make/model), service type (name), service center (name/address), and slot start/end via slot_id
 * - Shows loading, empty, and error states
 * - Displays status and scheduled time
 * - Provides actions: View details (inline drawer/modal) and Cancel (TODO placeholder)
 *
 * Accessibility: Uses semantic regions, headings, buttons with aria attributes.
 * Styling: Ocean Professional minimalist theme via utility CSS classes.
 *
 * Environment:
 * - Uses existing Supabase client configured with REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY
 *
 * TODO:
 * - Pagination/infinite scroll for large result sets
 * - Cancel mutation (requires backend policy/row-level security and confirmation)
 * - Filters for status/date range
 */
export default function MyBookings() {
  const { user, loading: userLoading } = useUser();
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // selected booking for details

  const hasData = useMemo(() => Array.isArray(bookings) && bookings.length > 0, [bookings]);

  const supabase = useMemo(() => getSupabaseClient(), []);
  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!user) return;
      setStatus('loading');
      setError(null);

      try {
        // Query bookings for current user with related lookups via foreign keys
        // This assumes foreign key relationships are defined in Supabase:
        // - service_bookings.vehicle_id -> vehicles.id
        // - service_bookings.service_type_id -> service_types.id
        // - service_bookings.service_center_id -> service_centers.id
        // - service_bookings.slot_id -> service_slots.id
        const { data, error: qErr } = await supabase
          .from('service_bookings')
          .select(`
            id,
            status,
            notes,
            created_at,
            updated_at,
            slot_id,
            vehicles:vehicle_id (
              id,
              make,
              model
            ),
            service_types:service_type_id (
              id,
              name
            ),
            service_centers:service_center_id (
              id,
              name,
              address
            ),
            service_slots:slot_id (
              id,
              start_at,
              end_at
            )
          `)
          .eq('user_id', user.id) // filter by current authenticated user
          .order('created_at', { ascending: false });

        if (qErr) {
          throw qErr;
        }
        if (!isMounted) return;
        setBookings(data || []);
        setStatus('success');
      } catch (e) {
        console.error('Failed to load bookings', e);
        if (!isMounted) return;
        setError(e?.message || 'Failed to load bookings');
        setStatus('error');
      }
    }

    if (!userLoading && user) {
      load();
    } else if (!userLoading && !user) {
      // no user logged in -> empty state prompt
      setBookings([]);
      setStatus('success');
    }

    return () => {
      isMounted = false;
    };
  }, [user, userLoading]);

  function formatDateTime(dt) {
    try {
      const d = new Date(dt);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  }

  function statusBadge(s) {
    const map = {
      pending: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
      confirmed: 'bg-green-50 text-green-700 ring-1 ring-green-200',
      completed: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
      cancelled: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
    };
    const cls = map[String(s || '').toLowerCase()] || 'bg-gray-100 text-gray-700 ring-1 ring-gray-200';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{s || 'unknown'}</span>;
  }

  function BookingDetails({ booking }) {
    if (!booking) return null;
    const vehicle = booking.vehicles;
    const serviceType = booking.service_types;
    const center = booking.service_centers;
    const slot = booking.service_slots;

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-details-title"
        className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/30"
        onClick={() => setSelected(null)}
      >
        <div
          className="w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 sm:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id="booking-details-title" className="text-lg font-semibold text-gray-900">
              Booking Details
            </h2>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
              aria-label="Close details"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Detail label="Status">{statusBadge(booking.status)}</Detail>
            <Detail label="Scheduled">
              {formatDateTime(slot?.start_at)} - {formatDateTime(slot?.end_at)}
            </Detail>
            <Detail label="Service Type">{serviceType?.name || '—'}</Detail>
            <Detail label="Vehicle">
              {vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || '—' : '—'}
            </Detail>
            <Detail label="Service Center">{center?.name || '—'}</Detail>
            <Detail label="Address">{center?.address || '—'}</Detail>
            <Detail label="Created">{formatDateTime(booking.created_at)}</Detail>
            <Detail label="Updated">{formatDateTime(booking.updated_at)}</Detail>
          </div>

          {booking.notes && (
            <div className="mt-6">
              <div className="text-sm font-medium text-gray-700 mb-1">Customer Notes</div>
              <p className="text-sm text-gray-600 whitespace-pre-line">{booking.notes}</p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="px-4 py-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Close
            </button>
            <button
              type="button"
              disabled={String(booking.status).toLowerCase() === 'cancelled'}
              onClick={() => {
                // TODO: Implement cancel mutation with confirmation dialog
                // - Ensure RLS policy allows user to cancel only their booking
                // - Optimistically update UI, re-fetch on success
                // - Handle and surface errors to user
                alert('Cancel booking: TODO');
              }}
              className={`px-4 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-300 ${
                String(booking.status).toLowerCase() === 'cancelled'
                  ? 'bg-red-300 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              Cancel booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  function Detail({ label, children }) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
        <div className="mt-1 text-sm text-gray-900">{children}</div>
      </div>
    );
  }

  const Content = () => {
    if (userLoading || status === 'loading') {
      return (
        <div role="status" aria-live="polite" className="flex items-center gap-3 text-gray-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          <span>Loading your bookings...</span>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="text-gray-700">
          <p className="mb-2">You are not signed in.</p>
          <a
            href="/login"
            className="inline-block text-sm text-white bg-gray-800 hover:bg-gray-900 px-4 py-2 rounded-md"
          >
            Sign in to view bookings
          </a>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          We couldn’t load your bookings right now. Please try again later.
          <div className="mt-1 text-sm text-red-600/80">{error}</div>
        </div>
      );
    }

    if (!hasData) {
      return (
        <div className="rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-900 font-medium">No bookings yet</div>
          <p className="text-gray-600 mt-1">When you book a service, it will appear here.</p>
          <a
            href="/book-service"
            className="inline-block mt-4 text-sm text-white bg-gray-800 hover:bg-gray-900 px-4 py-2 rounded-md"
          >
            Book a service
          </a>
        </div>
      );
    }

    // Responsive cards on mobile, table on large screens
    return (
      <div className="space-y-4">
        {/* Cards (mobile-first) */}
        <div className="grid grid-cols-1 gap-4 lg:hidden">
          {bookings.map((b) => {
            const vehicle = b.vehicles;
            const serviceType = b.service_types;
            const center = b.service_centers;
            const slot = b.service_slots;
            return (
              <article key={b.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-gray-900">
                    {serviceType?.name || 'Service'} • {vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() : 'Vehicle'}
                  </div>
                  {statusBadge(b.status)}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs text-gray-500">Scheduled</dt>
                    <dd className="text-sm text-gray-900">
                      {formatDateTime(slot?.start_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Center</dt>
                    <dd className="text-sm text-gray-900">{center?.name || '—'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-gray-500">Address</dt>
                    <dd className="text-sm text-gray-700">{center?.address || '—'}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(b)}
                    className="px-3 py-1.5 rounded-md text-gray-800 bg-gray-100 hover:bg-gray-200 text-sm"
                    aria-haspopup="dialog"
                    aria-expanded={selected?.id === b.id}
                    aria-controls="booking-details"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    disabled={String(b.status).toLowerCase() === 'cancelled'}
                    onClick={() => alert('Cancel booking: TODO')}
                    className={`px-3 py-1.5 rounded-md text-white text-sm ${
                      String(b.status).toLowerCase() === 'cancelled'
                        ? 'bg-red-300 cursor-not-allowed'
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Table (large screens) */}
        <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th scope="col" className="px-6 py-3">Service</th>
                <th scope="col" className="px-6 py-3">Vehicle</th>
                <th scope="col" className="px-6 py-3">Center</th>
                <th scope="col" className="px-6 py-3">Scheduled</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3 sr-only">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => {
                const vehicle = b.vehicles;
                const serviceType = b.service_types;
                const center = b.service_centers;
                const slot = b.service_slots;
                return (
                  <tr key={b.id} className="text-sm text-gray-900">
                    <td className="px-6 py-4">{serviceType?.name || '—'}</td>
                    <td className="px-6 py-4">{vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || '—' : '—'}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{center?.name || '—'}</div>
                      <div className="text-gray-500 text-xs">{center?.address || ''}</div>
                    </td>
                    <td className="px-6 py-4">{formatDateTime(slot?.start_at)} - {formatDateTime(slot?.end_at)}</td>
                    <td className="px-6 py-4">{statusBadge(b.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelected(b)}
                          className="px-3 py-1.5 rounded-md text-gray-800 bg-gray-100 hover:bg-gray-200 text-sm"
                          aria-haspopup="dialog"
                          aria-expanded={selected?.id === b.id}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          disabled={String(b.status).toLowerCase() === 'cancelled'}
                          onClick={() => alert('Cancel booking: TODO')}
                          className={`px-3 py-1.5 rounded-md text-white text-sm ${
                            String(b.status).toLowerCase() === 'cancelled'
                              ? 'bg-red-300 cursor-not-allowed'
                              : 'bg-red-500 hover:bg-red-600'
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selected && <BookingDetails booking={selected} />}
      </div>
    );
  };

  return (
    <main className="min-h-[60vh] bg-gray-50">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">My Bookings</h1>
          <p className="mt-1 text-gray-600 text-sm">
            View your upcoming and past service bookings.
          </p>
        </header>

        {/* Placeholder for future filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* TODO: Add status/date filters */}
        </div>

        <Content />
      </section>
    </main>
  );
}
