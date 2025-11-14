import React, { useEffect, useMemo, useState } from 'react';
import getSupabaseClient from '../lib/supabaseClient';
import useUser from '../hooks/useUser';
import { isSupabaseEnabled } from '../utils/featureFlags';
import { listMockBookingsByUser, subscribeMockBookingsChanged } from './bookService/mockStore';

/**
 * PUBLIC_INTERFACE
 * MyBookings - Lists authenticated user's service bookings with Ocean Professional UI.
 * - Uses Supabase when enabled; otherwise reads from client-side mock store.
 * - TODO: Remove mock store usage when Supabase is re-enabled.
 */
export default function MyBookings() {
  const { user, loading: userLoading } = useUser();
  const [allBookings, setAllBookings] = useState([]); // raw list from source
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // selected booking for details

  // UI state - filters, sorting, pagination (component state for now; TODO: sync to URL)
  const [statusFilter, setStatusFilter] = useState([]); // array of statuses
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState('scheduled'); // 'scheduled' | 'center' | 'service' | 'status'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [pageSize, setPageSize] = useState(10); // 5 | 10 | 20
  const [page, setPage] = useState(1); // 1-based index

  const supabase = useMemo(() => getSupabaseClient(), []);
  const supabaseEnabled = useMemo(() => isSupabaseEnabled(), []);

  // Helper: normalize status text
  const norm = (s) => String(s || '').trim().toLowerCase();

  // Load data from source
  useEffect(() => {
    let isMounted = true;

    async function loadSupabase() {
      if (!user) {
        setAllBookings([]);
        setStatus('success');
        return;
      }
      setStatus('loading');
      setError(null);

      try {
        // TODO: When Supabase is enabled, use server-side filters, sorting, and pagination.
        // Example (guarded): apply .in for status, .gte/.lte for slot.start_at, .order, and .range for pagination.
        // Also add TODO: fetch total count via .select({ count: 'exact', head: true }) to compute total pages.
        let query = supabase
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
          .eq('user_id', user.id);

        // Guarded server-side filters (future enablement)
        if (statusFilter.length > 0) {
          // e.g., query = query.in('status', statusFilter);
          // TODO: enable when Supabase mode is active
        }
        if (dateFrom) {
          // e.g., query = query.gte('service_slots.start_at', new Date(dateFrom).toISOString());
        }
        if (dateTo) {
          // e.g., query = query.lte('service_slots.end_at', new Date(dateTo).toISOString());
        }

        // Guarded server-side sorting (future enablement)
        if (sortField === 'scheduled') {
          // e.g., query = query.order('service_slots.start_at', { ascending: sortOrder === 'asc' });
        } else if (sortField === 'center') {
          // e.g., query = query.order('service_centers.name', { ascending: sortOrder === 'asc' });
        } else if (sortField === 'service') {
          // e.g., query = query.order('service_types.name', { ascending: sortOrder === 'asc' });
        } else if (sortField === 'status') {
          // e.g., query = query.order('status', { ascending: sortOrder === 'asc' });
        }

        // Guarded server-side pagination (future enablement)
        // const from = (page - 1) * pageSize;
        // const to = from + pageSize - 1;
        // query = query.range(from, to);

        const { data, error: qErr } = await query.order('created_at', { ascending: false });
        if (qErr) {
          throw qErr;
        }
        if (!isMounted) return;
        setAllBookings(data || []);
        setStatus('success');

        // TODO: When server-side mode is enabled, also fetch total count to compute total pages.
        // const { count } = await supabase.from('service_bookings').select('*', { count: 'exact', head: true });
        // setTotalCount(count ?? 0);

      } catch (e) {
        console.error('Failed to load bookings', e);
        if (!isMounted) return;
        setError(e?.message || 'Failed to load bookings');
        setStatus('error');
      }
    }

    function loadMock() {
      // When in mock mode, use 'mock-user' as consistent fallback identifier
      const uid = user?.id || 'mock-user';
      setStatus('loading');
      try {
        const data = listMockBookingsByUser(uid);
        if (!isMounted) return;
        setAllBookings(data || []);
        setStatus('success');
      } catch (e) {
        console.error('Failed to load mock bookings', e);
        if (!isMounted) return;
        setError(e?.message || 'Failed to load bookings');
        setStatus('error');
      }
    }

    // Initial load or when dependencies change (user or supabase toggle)
    if (!userLoading) {
      if (supabaseEnabled) {
        loadSupabase();
      } else {
        loadMock();
      }
    }

    // Subscribe to mock changes so list refreshes immediately after Review success
    let unsubscribe = null;
    if (!supabaseEnabled) {
      unsubscribe = subscribeMockBookingsChanged(() => {
        if (!isMounted) return;
        loadMock();
      });
    }

    return () => { isMounted = false; unsubscribe?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading, supabaseEnabled, supabase, page, pageSize, sortField, sortOrder, statusFilter.join(','), dateFrom, dateTo]);

  // Client-side filtering, sorting, and pagination when in mock mode (and as a fallback)
  const processed = useMemo(() => {
    let list = Array.isArray(allBookings) ? [...allBookings] : [];

    // Filter by status (multi-select)
    if (statusFilter.length > 0) {
      const set = new Set(statusFilter.map(norm));
      list = list.filter(b => set.has(norm(b.status)));
    }

    // Filter by date range (based on service_slots.start_at/end_at if available, else created_at)
    const parseDateSafe = (v) => {
      try {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d;
      } catch { return null; }
    };

    const from = dateFrom ? parseDateSafe(dateFrom) : null;
    const to = dateTo ? parseDateSafe(`${dateTo}T23:59:59`) : null;

    if (from || to) {
      list = list.filter(b => {
        const start = b?.service_slots?.start_at ? parseDateSafe(b.service_slots.start_at) : parseDateSafe(b.created_at);
        if (!start) return false;
        if (from && start < from) return false;
        if (to && start > to) return false;
        return true;
      });
    }

    // Sorting
    const compareStr = (a, b) => String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
    list.sort((a, b) => {
      let dir = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'scheduled') {
        const atA = a?.service_slots?.start_at || a?.created_at;
        const atB = b?.service_slots?.start_at || b?.created_at;
        const aTime = new Date(atA || 0).getTime();
        const bTime = new Date(atB || 0).getTime();
        return (aTime - bTime) * dir;
      }
      if (sortField === 'center') {
        return compareStr(a?.service_centers?.name, b?.service_centers?.name) * dir;
      }
      if (sortField === 'service') {
        return compareStr(a?.service_types?.name, b?.service_types?.name) * dir;
      }
      if (sortField === 'status') {
        return compareStr(a?.status, b?.status) * dir;
      }
      return 0;
    });

    return list;
  }, [allBookings, statusFilter, dateFrom, dateTo, sortField, sortOrder]);

  // Pagination
  const totalItems = processed.length; // TODO (Supabase mode): use server-side total count
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStartIdx = (currentPage - 1) * pageSize;
  const pageEndIdx = pageStartIdx + pageSize;
  const pageItems = processed.slice(pageStartIdx, pageEndIdx);

  useEffect(() => {
    // If filters/sorts or page size change, reset to first page to avoid empty page
    setPage(1);
  }, [statusFilter.join(','), dateFrom, dateTo, sortField, sortOrder, pageSize]);

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

  // Accessible controls for filters, sorting, and pagination
  function Controls() {
    const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    const toggleStatus = (val) => {
      const v = norm(val);
      setStatusFilter((prev) => (prev.includes(v) ? prev.filter(s => s !== v) : [...prev, v]));
    };
    const onSortChange = (e) => setSortField(e.target.value);
    const onOrderChange = (e) => setSortOrder(e.target.value);
    const onPageSizeChange = (e) => setPageSize(Number(e.target.value));

    return (
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Status multi-select via checkboxes for accessibility */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="label">Status</legend>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              {statuses.map(s => (
                <label key={s} className="subtitle" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    aria-label={`Filter status ${s}`}
                    checked={statusFilter.includes(s)}
                    onChange={() => toggleStatus(s)}
                  />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Date range */}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <div>
              <label className="label" htmlFor="date-from">From</label>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Filter from date"
              />
            </div>
            <div>
              <label className="label" htmlFor="date-to">To</label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="Filter to date"
              />
            </div>
          </div>

          {/* Sorting */}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <div>
              <label className="label" htmlFor="sort-field">Sort by</label>
              <select id="sort-field" value={sortField} onChange={onSortChange} aria-label="Sort field">
                <option value="scheduled">Scheduled time</option>
                <option value="center">Service center</option>
                <option value="service">Service type</option>
                <option value="status">Status</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="sort-order">Order</label>
              <select id="sort-order" value={sortOrder} onChange={onOrderChange} aria-label="Sort order">
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          {/* Page size */}
          <div>
            <label className="label" htmlFor="page-size">Page size</label>
            <select id="page-size" value={pageSize} onChange={onPageSizeChange} aria-label="Page size">
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>

          {/* Reset filters */}
          <div style={{ marginLeft: 'auto' }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => { setStatusFilter([]); setDateFrom(''); setDateTo(''); }}
              aria-label="Reset filters"
            >
              Reset filters
            </button>
          </div>
        </div>
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

    if (!Array.isArray(pageItems) || pageItems.length === 0) {
      return (
        <div className="card">
          <div className="card--section">
            <strong>No bookings match your filters</strong>
            <p className="muted" style={{ margin: 0 }}>Try adjusting status or date range.</p>
          </div>
        </div>
      );
    }

    // Responsive cards on mobile, table on large screens
    return (
      <div className="stack">
        {/* Cards (mobile-first) */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
          {pageItems.map((b) => {
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

        {/* Pagination controls */}
        <nav className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }} aria-label="Pagination">
          <div className="subtitle">Page {currentPage} of {totalPages}</div>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              Prev
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-disabled={currentPage >= totalPages}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </nav>

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
          {!supabaseEnabled && (
            <p className="subtitle" style={{ margin: 0, marginTop: 4 }}>
              TODO: Supabase disabled. Reading from local mock store.
            </p>
          )}
        </header>

        <Controls />

        <Content />
      </section>
    </main>
  );
}
