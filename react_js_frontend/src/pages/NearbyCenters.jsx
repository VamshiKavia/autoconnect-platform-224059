import React, { useEffect, useMemo, useState } from 'react';
import styles from './NearbyCenters.module.css';

// PUBLIC_INTERFACE
export default function NearbyCenters() {
  /**
   * NearbyCenters page displays a responsive layout with a map placeholder and a list of service centers.
   * It includes filters (search, service type, open now), accessible semantics, and minimalist theme styling.
   *
   * Behavior:
   * - Desktop: two-column layout (left list, right map).
   * - Mobile: stacked layout (map on top, list below).
   * - Filters are wired to local state; data is mocked locally for now.
   * - Loading skeletons, empty state, and error area are provided.
   *
   * Future integration:
   * - Replace map placeholder with live map SDK and wire markers to list selection.
   * - Replace local mock data with backend/API data.
   */
  const [query, setQuery] = useState('');
  const [serviceType, setServiceType] = useState('all');
  const [openNow, setOpenNow] = useState(false);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Mock dataset to simulate service centers
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg('');
    // simulate async fetch
    const timer = setTimeout(() => {
      if (cancelled) return;
      try {
        const mock = [
          {
            id: 'c1',
            name: 'Ocean Motors Downtown',
            address: '123 Harbor St, Seaside City',
            city: 'Seaside City',
            phone: '(555) 123-4567',
            hours: 'Mon-Fri 8:00-18:00',
            open: true,
            services: ['maintenance', 'repair'],
            distanceKm: 2.1
          },
          {
            id: 'c2',
            name: 'Coastal Auto Service',
            address: '77 Pier Ave, Bayview',
            city: 'Bayview',
            phone: '(555) 987-6543',
            hours: 'Mon-Sat 9:00-17:00',
            open: false,
            services: ['repair'],
            distanceKm: 8.4
          },
          {
            id: 'c3',
            name: 'Harborline Service Center',
            address: '400 Marina Blvd, Seaside City',
            city: 'Seaside City',
            phone: '(555) 222-3344',
            hours: 'Daily 10:00-20:00',
            open: true,
            services: ['maintenance', 'parts'],
            distanceKm: 5.7
          }
        ];
        setCenters(mock);
      } catch (e) {
        setErrorMsg('Unable to load nearby centers. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 550);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const filtered = useMemo(() => {
    return centers.filter((c) => {
      const matchesQuery =
        !query ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.city.toLowerCase().includes(query.toLowerCase()) ||
        c.address.toLowerCase().includes(query.toLowerCase());
      const matchesService =
        serviceType === 'all' || c.services.includes(serviceType);
      const matchesOpen = !openNow || c.open;
      return matchesQuery && matchesService && matchesOpen;
    });
  }, [centers, query, serviceType, openNow]);

  const handleDirections = (center) => {
    // PUBLIC_INTERFACE
    /**
     * Open mapped directions for a given center in a new tab/window.
     * This is a placeholder for a more robust deep linking strategy.
     */
    const destination = encodeURIComponent(`${center.name} ${center.address}`);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className={styles.page} aria-labelledby="nearby-centers-title">
      <section className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 id="nearby-centers-title" className={styles.title}>
            Nearby Service Centers
          </h1>
          <p className={styles.subtitle}>
            Find authorized centers near you. Use the filters to refine your search and get directions instantly.
          </p>
        </div>
      </section>

      <section className={styles.controlsSection} aria-label="Filters">
        <div className={styles.controlsRow}>
          <label htmlFor="search-input" className={styles.visuallyHidden}>
            Search by city or center name
          </label>
          <input
            id="search-input"
            type="search"
            aria-label="Search by city or center name"
            placeholder="Search by city or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.input}
          />

          <label htmlFor="service-select" className={styles.visuallyHidden}>
            Service type
          </label>
          <select
            id="service-select"
            aria-label="Filter by service type"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className={styles.select}
          >
            <option value="all">All services</option>
            <option value="maintenance">Maintenance</option>
            <option value="repair">Repair</option>
            <option value="parts">Parts</option>
          </select>

          <div className={styles.toggleWrap}>
            <input
              id="open-now-toggle"
              type="checkbox"
              checked={openNow}
              onChange={(e) => setOpenNow(e.target.checked)}
              className={styles.checkbox}
              aria-checked={openNow}
              aria-label="Show centers open now"
            />
            <label htmlFor="open-now-toggle" className={styles.toggleLabel}>
              Open now
            </label>
          </div>
        </div>
      </section>

      <section className={styles.layout} aria-label="Map and list">
        <div className={styles.listPanel} role="region" aria-label="Centers list">
          {errorMsg && (
            <div role="alert" className={styles.errorBox}>
              {errorMsg}
            </div>
          )}

          {loading ? (
            <ul className={styles.cardList} aria-busy="true" aria-live="polite">
              {[1, 2, 3].map((n) => (
                <li key={n} className={`${styles.card} ${styles.skeleton}`} aria-hidden="true">
                  <div className={styles.skelTitle} />
                  <div className={styles.skelLine} />
                  <div className={styles.skelLineShort} />
                  <div className={styles.skelFooter} />
                </li>
              ))}
            </ul>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState} role="status" aria-live="polite">
              <h2 className={styles.emptyTitle}>No centers match your filters</h2>
              <p className={styles.emptyDesc}>Try adjusting your search or service type.</p>
            </div>
          ) : (
            <ul className={styles.cardList} aria-live="polite">
              {filtered.map((c) => (
                <li key={c.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.centerName}>{c.name}</h3>
                    <span className={styles.distanceBadge} aria-label={`Distance ${c.distanceKm.toFixed(1)} kilometers`}>
                      {c.distanceKm.toFixed(1)} km
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <p className={styles.address} aria-label={`Address ${c.address}`}>
                      {c.address}
                    </p>
                    <p className={styles.hours} aria-label={`Hours ${c.hours}`}>
                      Hours: {c.hours}
                      <span
                        className={c.open ? styles.statusOpen : styles.statusClosed}
                        aria-label={c.open ? 'Open now' : 'Closed now'}
                      >
                        {c.open ? ' • Open' : ' • Closed'}
                      </span>
                    </p>
                    <p className={styles.phone} aria-label={`Phone number ${c.phone}`}>
                      {c.phone}
                    </p>
                    <div className={styles.serviceChips} aria-label="Available services">
                      {c.services.map((s) => (
                        <span key={s} className={styles.chip} aria-label={`Service ${s}`}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={styles.cardFooter}>
                    <button
                      type="button"
                      onClick={() => handleDirections(c)}
                      className={styles.ctaButton}
                      aria-label={`Get directions to ${c.name}`}
                    >
                      Get Directions
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className={styles.mapPanel}
          role="region"
          aria-label="Map"
        >
          <div className={styles.mapContainer} role="img" aria-label="Map placeholder">
            <div className={styles.mapPlaceholderInner}>
              <span className={styles.mapTitle}>Map Coming Soon</span>
              <p className={styles.mapSubText}>
                TODO: Integrate map SDK and show markers synced with the list.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
