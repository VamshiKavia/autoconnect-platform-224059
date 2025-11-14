import { useEffect, useMemo, useState } from "react";
import getSupabaseClient from "../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * PartsList - Fetches and displays parts from the Supabase table "Car parts".
 *
 * - Uses read-only operations (no writes).
 * - Client-side search across "title" and "Description".
 * - Category filter populated from fetched data ("Category" column).
 * - Displays image_url, title, Category in grid cards.
 * - Detail modal shows Description and Features (supports text or JSON).
 * - Loading, error, and empty states.
 */
export default function PartsList() {
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [active, setActive] = useState(null); // selected item for modal

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const supabase = getSupabaseClient();
        // Table name contains a space; must be quoted.
        // Selecting explicit columns to avoid surprises.
        const query = supabase
          .from('"Car parts"')
          .select('id, title, "Description", "Category", "Features", image_url, created_at, updated_at')
          .order("created_at", { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        if (cancelled) return;

        const safeData = Array.isArray(data) ? data : [];
        setRows(safeData);

        // Build category list from data (unique, sorted), add "All"
        const cats = Array.from(
          new Set(
            safeData
              .map((r) => (r?.Category ?? "").toString().trim())
              .filter((v) => v.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b));
        setCategories(["All", ...cats]);
      } catch (e) {
        // Avoid logging sensitive details
        setErr(e?.message || "Failed to load parts from Supabase.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Search + filter (client-side)
  useEffect(() => {
    const search = q.trim().toLowerCase();
    const selectedCat = (cat || "All").toString();

    const result = rows.filter((r) => {
      const matchesCat = selectedCat === "All" || (r?.Category || "") === selectedCat;
      if (!matchesCat) return false;

      if (!search) return true;

      const title = (r?.title || "").toString().toLowerCase();
      const desc = (r?.Description || "").toString().toLowerCase();
      return title.includes(search) || desc.includes(search);
    });

    setFiltered(result);
  }, [q, cat, rows]);

  const empty = !loading && !err && filtered.length === 0;

  function renderFeatures(features) {
    // Features can be text or JSON; display safely.
    if (features == null) return null;
    if (typeof features === "string") {
      const trimmed = features.trim();
      if (!trimmed) return null;

      // Try to detect JSON-like strings
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return (
            <ul style={{ marginTop: 6, paddingLeft: 18 }}>
              {parsed.map((it, idx) => (
                <li key={idx}>{String(it)}</li>
              ))}
            </ul>
          );
        }
        if (parsed && typeof parsed === "object") {
          return (
            <pre style={{ marginTop: 6, background: "#fff", padding: 8, borderRadius: 8, overflow: "auto" }}>
              {JSON.stringify(parsed, null, 2)}
            </pre>
          );
        }
      } catch {
        // not JSON; fall through to text
      }
      return <div style={{ marginTop: 6 }}>{trimmed}</div>;
    }

    if (Array.isArray(features)) {
      return (
        <ul style={{ marginTop: 6, paddingLeft: 18 }}>
          {features.map((it, idx) => (
            <li key={idx}>{String(it)}</li>
          ))}
        </ul>
      );
    }

    if (typeof features === "object") {
      return (
        <pre style={{ marginTop: 6, background: "#fff", padding: 8, borderRadius: 8, overflow: "auto" }}>
          {JSON.stringify(features, null, 2)}
        </pre>
      );
    }

    return <div style={{ marginTop: 6 }}>{String(features)}</div>;
  }

  return (
    <section aria-label="Parts listing">
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: "1 1 260px", minWidth: 240 }}>
            <label className="label" htmlFor="parts-search">Search</label>
            <input
              id="parts-search"
              className="input"
              placeholder="Search by title or description..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search parts"
            />
          </div>
          <div style={{ width: 220, minWidth: 200 }}>
            <label className="label" htmlFor="parts-category">Category</label>
            <select
              id="parts-category"
              className="input"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              aria-label="Filter by category"
            >
              {categories.map((c) => (
                <option key={c || "empty"} value={c}>
                  {c || "Uncategorized"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="card">Loading parts...</div>}
      {err && (
        <div className="card" style={{ color: "var(--error)" }}>
          {err}
        </div>
      )}
      {empty && (
        <div className="card" style={{ color: "var(--muted)" }}>
          No parts found. Try adjusting your search or category.
        </div>
      )}

      {!loading && !err && filtered.length > 0 && (
        <div className="grid">
          {filtered.map((r) => {
            const img = r?.image_url || "";
            const title = r?.title || "Untitled";
            const category = r?.Category || "Uncategorized";
            return (
              <article key={r.id} className="card launch-card" style={{ gridColumn: "span 4" }}>
                <figure style={{ margin: 0 }}>
                  {/* Graceful image handling */}
                  {img ? (
                    <img
                      src={img}
                      alt={`${title} image`}
                      className="hover-zoom card-media"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  <figcaption className="sr-only">{title}</figcaption>
                </figure>
                <div style={{ height: 10 }} />
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <h3 className="section-title" style={{ marginBottom: 4 }}>{title}</h3>
                  <span className="subtitle" style={{ whiteSpace: "nowrap" }}>{category}</span>
                </div>
                <div style={{ height: 10 }} />
                <button className="btn" onClick={() => setActive(r)} aria-label={`View details for ${title}`}>
                  View details
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* Simple modal for details */}
      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="part-detail-title"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target.classList.contains("modal-backdrop")) setActive(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17,24,39,0.48)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 720,
              width: "100%",
              background: "var(--bg)",
              borderColor: "#E5E7EB",
            }}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3 id="part-detail-title" className="section-title" style={{ marginBottom: 8 }}>
                {active?.title || "Untitled"}
              </h3>
              <button className="btn secondary" onClick={() => setActive(null)} aria-label="Close details">
                Close
              </button>
            </div>
            <div className="subtitle" style={{ marginBottom: 10 }}>
              {active?.Category || "Uncategorized"}
            </div>

            {active?.image_url ? (
              <img
                src={active.image_url}
                alt={`${active?.title || "Part"} image`}
                loading="lazy"
                className="img-responsive"
                style={{ borderRadius: 8, background: "linear-gradient(135deg, #eef2ff, #f9fafb)" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}

            {active?.Description ? (
              <>
                <h4 className="section-title" style={{ marginTop: 12, marginBottom: 6 }}>Description</h4>
                <div style={{ lineHeight: 1.6 }}>{active.Description}</div>
              </>
            ) : null}

            {active?.Features ? (
              <>
                <h4 className="section-title" style={{ marginTop: 12, marginBottom: 6 }}>Features</h4>
                {renderFeatures(active.Features)}
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
