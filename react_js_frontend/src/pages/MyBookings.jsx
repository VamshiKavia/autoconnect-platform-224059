import React, { useEffect, useMemo, useState } from 'react';
import getSupabaseClient from '../lib/supabaseClient';
import useUser from '../hooks/useUser';
import { isSupabaseEnabled } from '../utils/featureFlags';
import { listMockBookingsByUser } from './bookService/mockStore';

/**
 * PUBLIC_INTERFACE
 * MyBookings - Lists authenticated user's service bookings with Ocean Professional UI.
 * - Uses Supabase when enabled; otherwise reads from client-side mock store.
 * - TODO: Remove mock store usage when Supabase is re-enabled.
 */
export default function MyBookings() {
  const { user, loading: userLoading } = useUser();
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // selected booking for details

  const hasData = useMemo(() => Array.isArray(bookings) && bookings.length > 0, [bookings]);

  const supabase = useMemo(() => getSupabaseClient(), []);
  const supabaseEnabled = useMemo(() => isSupabaseEnabled(), []);

  useEffect(() => {
    let isMounted = true;

    async function loadSupabase() {
      if (!user) return;
      setStatus('loading');
      setError(null);

      try {
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
          .eq('user_id', user.id)
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

    function loadMock() {
      if (!user) return;
      setStatus('loading');
      try {
        const data = listMockBookingsByUser(user?.id || 'mock-user');
        if (!isMounted) return;
        setBookings(data || []);
        setStatus('success');
      } catch (e) {
        console.error('Failed to load mock bookings', e);
        if (!isMounted) return;
        setError(e?.message || 'Failed to load bookings');
        setStatus('error');
      }
    }

    if (!userLoading && user) {
      if (supabaseEnabled) loadSupabase();
      else loadMock();
    } else if (!userLoading && !user) {
      setBookings([]);
      setStatus('success');
    }

    return () => { isMounted = false; };
  }, [user, userLoading, supabase, supabaseEnabled]);

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
    const text = String(s || '').toLowerCase();
    const style = {
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      border: '1px solid',
      display: 'inline-flex',
      alignItems: 'center'
    };
    const map = {
      pending: { background: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A' },
      confirmed: { background: '#D1FAE5', color: '#065F46', borderColor: '#A7F3D0' },
      completed: { background: '#DBEAFE', color: '#1E3A8A', borderColor: '#BFDBFE' },
      cancelled: { background: '#F3F4F6', color: '#374151', borderColor: '#E5E7EB' },
    };
    const st = map[text] || { background: '#F3F4F6', color: '#374151', borderColor: '#E5E7EB' };
    return <span style={{ ...style, background: st.background, color: st.color, borderColor: st.borderColor }}>{s || 'unknown'}</span>;
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
        className="fixed inset-0 z-40"
        onClick={() => setSelected(null)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}
      >
        <div
          className="card"
          style={{ width: '100%', maxWidth: 560, background: '#fff' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 id="booking-details-title" className="section-title">Booking Details</h2>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="btn secondary"
              aria-label="Close details"
            >
              ✕
            </button>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(12, 1fr)', gap: 12, marginTop: 12 }}>
            <Detail label="Status" colSpan={6}>{statusBadge(booking.status)}</Detail>
            <Detail label="Scheduled" colSpan={6}>
              {formatDateTime(slot?.start_at)} - {formatDateTime(slot?.end_at)}
            </Detail>
            <Detail label="Service Type" colSpan={6}>{serviceType?.name || '—'}</Detail>
            <Detail label="Vehicle" colSpan={6}>
              {vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || '—' : '—'}
            </Detail>
            <Detail label="Service Center" colSpan={6}>{center?.name || '—'}</Detail>
            <Detail label="Address" colSpan={6}>{center?.address || '—'}</Detail>
            <Detail label="Created" colSpan={6}>{formatDateTime(booking.created_at)}</Detail>
            <Detail label="Updated" colSpan={6}>{formatDateTime(booking.updated_at)}</Detail>
          </div>

          {booking.notes && (
            <div style={{ marginTop: 12 }}>
              <div className="label" style={{ marginBottom: 4 }}>Customer Notes</div>
              <p style={{ color: 'var(--text)' }}>{booking.notes}</p>
            </div>
          )}

          <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="btn secondary"
            >
              Close
            </button>
            <button
              type="button"
              disabled={String(booking.status).toLowerCase() === 'cancelled'}
              onClick={() => {
                // TODO: Implement cancel mutation with confirmation dialog and RLS check
                alert('Cancel booking: TODO');
              }}
              className="btn"
              aria-disabled={String(booking.status).toLowerCase() === 'cancelled'}
              style={{
                background: String(booking.status).toLowerCase() === 'cancelled' ? '#EF9A9A' : 'var(--error)',
                borderColor: String(booking.status).toLowerCase() === 'cancelled' ? '#EF9A9A' : 'var(--error)'
              }}
            >
              Cancel booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  function Detail({ label, colSpan = 6, children }) {
    return (
      <div className="card" style={{ gridColumn: `span ${colSpan}`, background: 'var(--background)' }}>
        <div className="label">{label}</div>
        <div style={{ marginTop: 4 }}>{children}</div>
      </div>
    );
  }

  const Content = () => {
    if (userLoading || status === 'loading') {
      return (
        <div role="status" aria-live="polite" className="row" style={{ color: 'var(--muted)' }}>
          <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 999 }} />
          <span>Loading your bookings...</span>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="card">
          <div className="banner banner--warn" role="alert" aria-live="polite">
            <div>⚠️</div>
            <div>
              <strong>Sign in required</strong>
              <p className="muted" style={{ margin: 0 }}>Please sign in to view your bookings.</p>
            </div>
          </div>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div role="alert" className="card" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)" }}>
          We couldn’t load your bookings right now. Please try again later.
          <div className="subtitle" style={{ marginTop: 6 }}>{error}</div>
        </div>
      );
    }

    if (!hasData) {
      return (
        <div className="card">
          <div className="card--section">
            <strong>No bookings yet</strong>
            <p className="muted" style={{ margin: 0 }}>When you book a service, it will appear here.</p>
            {/* TODO: Consider adding a primary CTA to navigate to booking flow */}
          </div>
        </div>
      );
    }

    // Responsive cards on mobile, table on large screens
    return (
      <div className="stack">
        {/* Cards (mobile-first) */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
          {bookings.map((b) => {
            const vehicle = b.vehicles;
            const serviceType = b.service_types;
            const center = b.service_centers;
            const slot = b.service_slots;
            return (
              <article key={b.id} className="card" style={{ gridColumn: "span 12" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
                    <div style={{ fontWeight: 700 }}>
                      {serviceType?.name || 'Service'} • {vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() : 'Vehicle'}
                    </div>
                    <div className="subtitle">{formatDateTime(slot?.start_at)}</div>
                  </div>
                  {statusBadge(b.status)}
                </div>
                <div className="row" style={{ gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                  <div className="subtitle"><strong>Center:</strong> {center?.name || '—'}</div>
                  <div className="subtitle"><strong>Address:</strong> {center?.address || '—'}</div>
                </div>
                <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSelected(b)}
                    className="btn secondary"
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
                    className="btn"
                    aria-disabled={String(b.status).toLowerCase() === 'cancelled'}
                    style={{
                      background: String(b.status).toLowerCase() === 'cancelled' ? '#EF9A9A' : 'var(--error)',
                      borderColor: String(b.status).toLowerCase() === 'cancelled' ? '#EF9A9A' : 'var(--error)'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {selected && <BookingDetails booking={selected} />}
      </div>
    );
  };

  return (
    <main style={{ background: '#F3F4F6', minHeight: '60vh' }}>
      <section className="container">
        <header style={{ marginBottom: 12 }}>
          <h1 className="section-title" style={{ fontSize: 22 }}>My Bookings</h1>
          <p className="subtitle" style={{ margin: 0 }}>
            View your upcoming and past service bookings.
          </p>
        </header>

        {/* Placeholder for future filters */}
        <div className="row" style={{ marginBottom: 12 }}>
          {/* TODO: Add status/date filters */}
        </div>

        <Content />
      </section>
    </main>
  );
}
