import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * ServiceTypeStep - Step 2: Choose a service type from Supabase.
 *
 * Query (diagnostic-friendly, no filters):
 *   supabase
 *     .from('services_catalog')
 *     .select('id,name,description,image_url')
 *     .order('name', { ascending: true })
 *
 * Diagnostics:
 * - Adds a temporary count() query to log total rows visible to current role.
 * - Logs env presence (no secrets), and count vs. fetched length.
 *
 * UX:
 * - Improves empty-state with a Retry CTA.
 * - If table truly has zero rows (count=0), shows guidance that no services are configured.
 * - If RLS limits rows or permission errors occur, surfaces error.code/message and RLS guidance.
 * - Adds a Seed button that inserts sample rows (Oil Change, Brake Check, Car Washing, Car Painting)
 *   into public.services_catalog using existing Supabase env vars and client. After successful insert,
 *   triggers re-fetch to show the fresh data.
 *
 * Validates: One service type must be selected.
 */
export default function ServiceTypeStep({ onValidChange }) {
  const { serviceType, setServiceType } = useBooking();
  const [selected, setSelected] = useState(serviceType?.id || "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rlsWarning, setRlsWarning] = useState("");
  const [visibleCount, setVisibleCount] = useState(null); // number | null
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState("");
  const [seedSuccess, setSeedSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    setRlsWarning("");
    try {
      const hasUrl = !!process.env.REACT_APP_SUPABASE_URL;
      const hasKey = !!process.env.REACT_APP_SUPABASE_KEY;
      // eslint-disable-next-line no-console
      console.debug("[ServiceTypeStep] Env check", {
        hasUrl,
        hasKey,
        NODE_ENV: process.env.NODE_ENV,
      });

      const supabase = getSupabaseClient();

      // 1) Diagnostic count() - unfiltered, simple columns
      const { count, error: countError } = await supabase
        .from("services_catalog")
        .select("id", { count: "exact", head: true });
      if (countError) {
        // Non-fatal for listing, but report
        // eslint-disable-next-line no-console
        console.warn("[ServiceTypeStep] count() error", {
          code: countError.code,
          message: countError.message,
        });
      } else {
        setVisibleCount(typeof count === "number" ? count : null);
      }

      // 2) Fetch rows - explicit select without filters
      const { data, error } = await supabase
        .from("services_catalog")
        .select("id,name,description,image_url")
        .order("name", { ascending: true });

      // eslint-disable-next-line no-console
      console.log("[ServiceTypeStep] Supabase load response", { data, error });

      if (error) throw error;

      const safe = Array.isArray(data) ? data : [];
      setRows(safe);

      // eslint-disable-next-line no-console
      console.debug("[ServiceTypeStep] fetched rows", {
        fetchedLength: safe.length,
        visibleCount: typeof count === "number" ? count : null,
      });
    } catch (e) {
      const code = e?.code || "";
      const message = e?.message || "";
      const details = e?.details || "";
      const hint = e?.hint || "";
      const raw = String(`${message} ${details} ${hint}` || "").toLowerCase();

      let friendly = "Failed to load service types from services_catalog.";
      if (
        raw.includes("permission") ||
        raw.includes("rls") ||
        raw.includes("not authorized") ||
        raw.includes("policy") ||
        raw.includes("violates row-level security")
      ) {
        friendly =
          "You do not have access to view service types (services_catalog). RLS policies may be preventing SELECT.";
        setRlsWarning(
          "RLS hint: In Supabase, create a SELECT policy on public.services_catalog for anon/authenticated (as appropriate)."
        );
      } else if (raw.includes("relation") && raw.includes("does not exist")) {
        friendly = "Table not found. Verify the name public.services_catalog in your Supabase project.";
      } else if (raw.includes("fetch") || raw.includes("network") || raw.includes("url")) {
        friendly = "Unable to reach Supabase. Check REACT_APP_SUPABASE_URL and connectivity.";
      }

      setErr(
        `${friendly} ${code ? `(code: ${code})` : ""} ${message ? `— ${message}` : ""}${
          details ? ` — ${details}` : ""
        }${hint ? ` — ${hint}` : ""}`
      );
      // eslint-disable-next-line no-console
      console.error("[ServiceTypeStep] load error", {
        code,
        message,
        details,
        hint,
        stack: e?.stack,
        table: "services_catalog",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // PUBLIC_INTERFACE
  async function seedServicesCatalog() {
    /**
     * Inserts sample rows into public.services_catalog:
     * - Oil Change, Brake Check, Car Washing, Car Painting
     * Columns used: name, description, image_url (only if exists)
     * Uses anon key/env vars already configured via Supabase client.
     */
    setSeedError("");
    setSeedSuccess(false);
    setSeeding(true);
    try {
      const supabase = getSupabaseClient();

      const samples = [
        {
          name: "Oil Change",
          description: "Engine oil and filter replacement with multi-point inspection.",
          image_url: "/assets/oil-change.png",
        },
        {
          name: "Brake Check",
          description: "Brake pads, rotors, and fluid inspection for safety and performance.",
          image_url: "/assets/brake-check.png",
        },
        {
          name: "Car Washing",
          description: "Exterior wash and interior vacuum with optional detailing.",
          image_url: "/assets/car-wash.png",
        },
        {
          name: "Car Painting",
          description: "Premium body repainting and scratch repair with color matching.",
          image_url: "/assets/car-painting.png",
        },
      ];

      // First attempt with aligned columns: name, description, image_url
      let { data: insData, error: insertErr } = await supabase.from("services_catalog").insert(
        samples.map((s) => ({
          name: s.name,
          description: s.description,
          image_url: s.image_url,
        }))
      );

      // eslint-disable-next-line no-console
      console.log("[ServiceTypeStep] Supabase seed insert response", { data: insData, error: insertErr });

      if (insertErr) {
        const code = insertErr.code || "";
        const message = insertErr.message || "";
        const details = insertErr.details || "";
        const hint = insertErr.hint || "";
        const raw = `${message} ${details} ${hint}`.toLowerCase();

        // Detect RLS/permission errors explicitly and surface guidance
        const isRls =
          raw.includes("permission") ||
          raw.includes("not authorized") ||
          raw.includes("policy") ||
          raw.includes("rls") ||
          raw.includes("violates row-level security");

        const imageUrlMissing =
          raw.includes("column") &&
          raw.includes("image_url") &&
          (raw.includes("does not exist") || raw.includes("missing") || raw.includes("unknown"));

        if (isRls) {
          setSeedError(
            `Insert blocked by RLS/permissions ${code ? `(code: ${code})` : ""} — ${message}${
              details ? ` — ${details}` : ""
            }${hint ? ` — ${hint}` : ""}. RLS hint: Create an INSERT policy on public.services_catalog for your role.`
          );
          // Log full response
          // eslint-disable-next-line no-console
          console.error("[ServiceTypeStep] seed RLS/permission error", {
            code,
            message,
            details,
            hint,
          });
          return;
        }

        if (imageUrlMissing) {
          // Retry without image_url if the column is not present in schema
          const { data: retryData, error: retryErr } = await supabase
            .from("services_catalog")
            .insert(samples.map((s) => ({ name: s.name, description: s.description })));

          // eslint-disable-next-line no-console
          console.log("[ServiceTypeStep] Supabase seed retry (no image_url) response", {
            data: retryData,
            error: retryErr,
          });

          if (retryErr) {
            throw retryErr;
          }
        } else {
          // Unknown error, rethrow to surface code/message
          throw insertErr;
        }
      }

      setSeedSuccess(true);

      // After successful insert, re-fetch list
      await load();
    } catch (e) {
      const code = e?.code || "";
      const message = e?.message || "Failed to seed services_catalog.";
      const details = e?.details || "";
      const hint = e?.hint || "";
      setSeedError(
        `${message} ${code ? `(code: ${code})` : ""}${details ? ` — ${details}` : ""}${
          hint ? ` — ${hint}` : ""
        }`
      );
      // eslint-disable-next-line no-console
      console.error("[ServiceTypeStep] seed error", { code, message, details, hint, stack: e?.stack });
    } finally {
      setSeeding(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Normalize rows for UI/booking context
  const normalized = useMemo(() => {
    return (rows || []).map((r) => ({
      id: r?.id,
      name: r?.name ?? "",
      description: r?.description ?? "",
      image_url: r?.image_url ?? "",
    }));
  }, [rows]);

  useEffect(() => {
    const found = normalized.find((s) => String(s.id) === String(selected)) || null;
    const mapped = found
      ? {
          id: found.id,
          name: found.name || "Service",
          description: found.description || "",
          image_url: found.image_url || "",
        }
      : null;
    setServiceType(mapped);
    onValidChange?.(!!mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, normalized]);

  const empty = !loading && !err && normalized.length === 0;

  function EmptyState() {
    // If count is zero, inform that no services are configured at all.
    const noConfigured = typeof visibleCount === "number" && visibleCount === 0;
    return (
      <div className="card" style={{ color: "var(--muted)" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            {noConfigured ? (
              <>
                <div className="section-title" style={{ marginBottom: 6 }}>
                  No services configured
                </div>
                <div className="subtitle" style={{ marginBottom: 0 }}>
                  The services_catalog table is currently empty. You can seed sample service types now.
                </div>
              </>
            ) : (
              <>
                <div className="section-title" style={{ marginBottom: 6 }}>
                  No service types found
                </div>
                <div className="subtitle" style={{ marginBottom: 0 }}>
                  Try again in a moment. If this persists, verify RLS and that services_catalog has rows.
                </div>
              </>
            )}
            {seedError && (
              <div className="card" style={{ color: "var(--error)", marginTop: 8, background: "#fff" }}>
                {seedError}
              </div>
            )}
            {seedSuccess && !seedError && (
              <div
                className="card"
                role="status"
                aria-live="polite"
                style={{ color: "var(--success)", marginTop: 8, background: "#fff" }}
              >
                ✓ Sample services inserted successfully.
              </div>
            )}
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn secondary" onClick={load} aria-label="Retry loading service types">
              Retry
            </button>
            <button
              className="btn"
              onClick={seedServicesCatalog}
              disabled={seeding}
              aria-disabled={seeding}
              aria-label="Seed sample service types into services_catalog"
              title="Insert Oil Change, Brake Check, Car Washing, Car Painting"
            >
              {seeding ? "Seeding..." : "Seed sample services"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" aria-labelledby="servicetype-step-title">
      <h3 id="servicetype-step-title" className="section-title">Select Service Type</h3>
      <p className="subtitle">Choose a service to continue.</p>

      {rlsWarning && (
        <div
          className="card"
          style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)" }}
        >
          RLS: {rlsWarning}
        </div>
      )}

      {loading && <div className="card">Loading service types...</div>}
      {err && (
        <div className="card" style={{ color: "var(--error)" }}>
          {err}
          <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button
              className="btn secondary"
              onClick={load}
              aria-label="Retry loading after error"
              disabled={seeding}
              aria-disabled={seeding}
            >
              Retry
            </button>
            <button
              className="btn"
              onClick={seedServicesCatalog}
              disabled={seeding}
              aria-disabled={seeding}
              aria-label="Seed sample service types after error"
            >
              {seeding ? "Seeding..." : "Seed sample services"}
            </button>
          </div>
        </div>
      )}
      {seedSuccess && !err && (
        <div
          className="card"
          role="status"
          aria-live="polite"
          style={{ color: "var(--success)", borderColor: "#A7F3D0", background: "#ECFDF5", marginTop: 12 }}
        >
          ✓ Sample services inserted successfully.
        </div>
      )}
      {empty && <EmptyState />}

      {!loading && !err && normalized.length > 0 && (
        <div className="grid">
          {normalized.map((svc) => {
            const active = String(selected) === String(svc.id);
            return (
              <button
                key={svc.id}
                className="card"
                style={{
                  gridColumn: "span 4",
                  textAlign: "left",
                  borderColor: active ? "#93C5FD" : "#E5E7EB",
                  background: active ? "#F3F4F6" : "var(--surface)",
                  cursor: "pointer",
                }}
                onClick={() => setSelected(svc.id)}
                aria-pressed={active}
                aria-label={`Select ${svc.name || "Service"}`}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{svc.name || "Service"}</strong>
                </div>
                {svc.description ? (
                  <div className="subtitle" style={{ marginTop: 6 }}>{svc.description}</div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
