import React, { useEffect, useMemo, useState } from "react";
import { useBooking } from "./context";
import { useAuth } from "../../context/AuthContext";
import getSupabaseClient from "../../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * VehicleStep - Step 1: Select/enter vehicle details.
 *
 * Data:
 * - If user is signed in, loads their vehicles from Supabase:
 *   table: vehicles (id, make, model, year, image_url, owner_id, updated_at)
 *   filter: eq('owner_id', user.id) ordered by updated_at desc
 * - Allows selecting a vehicle OR entering details manually (fallback).
 *
 * Validates: make, model. VIN optional. Year displayed if available; not required.
 */
export default function VehicleStep({ onValidChange }) {
  const { vehicle, setVehicle } = useBooking();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  // local manual entry state (year is optional and not required by validation)
  const [local, setLocal] = useState(
    vehicle && typeof vehicle === "object"
      ? {
          make: vehicle.make || "",
          model: vehicle.model || "",
          vin: vehicle.vin || "",
          year: vehicle.year || "",
        }
      : { make: "", model: "", vin: "", year: "" }
  );
  const [touched, setTouched] = useState(false);

  // vehicles from DB
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(!!user);
  const [err, setErr] = useState("");

  // which selection mode: "select" (from list) or "manual"
  const [mode, setMode] = useState("select");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr("");
      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("id, make, model, year, image_url, owner_id, updated_at")
          .eq("owner_id", user.id)
          .order("updated_at", { ascending: false });
        if (error) throw error;
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        // RLS and permission friendly messaging
        const msg = (e?.message || "").toLowerCase();
        if (msg.includes("permission") || msg.includes("rls") || msg.includes("not authorized")) {
          setErr("You do not have access to view vehicles. Please check your account or try manual entry.");
        } else {
          setErr("Failed to load your vehicles. You can continue with manual entry.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  // derive validity and update booking context live
  useEffect(() => {
    const valid = isValid(local);
    onValidChange?.(valid);
    // Update global booking vehicle summary (store selected fields)
    setVehicle({
      make: (local.make || "").trim(),
      model: (local.model || "").trim(),
      vin: (local.vin || "").trim(),
      year: local.year || "", // optional
      // image_url from selection (manual mode won't have it)
      image_url: local.image_url || "",
      id: local.id || null, // keep selected vehicle id when chosen
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  // Build a simple vehicle label for list display
  const vehicleLabel = useMemo(() => {
    const make = (local.make || "").trim();
    const model = (local.model || "").trim();
    const year = local.year ? String(local.year) : "";
    return [year, make, model].filter(Boolean).join(" • ");
  }, [local]);

  function isValid(v) {
    return !!(String(v.make || "").trim() && String(v.model || "").trim());
  }

  function selectRow(r) {
    setMode("select");
    setLocal({
      id: r.id,
      make: r.make || "",
      model: r.model || "",
      year: r.year || "",
      vin: "", // VIN not stored in this table per spec; user can add manually if desired
      image_url: r.image_url || "",
    });
    setTouched(true);
  }

  return (
    <div className="card" aria-labelledby="vehicle-step-title">
      <h3 id="vehicle-step-title" className="section-title">Select Vehicle</h3>
      <p className="subtitle">
        {user
          ? "Choose one of your vehicles or enter details manually."
          : "You’re not signed in. Enter your vehicle details to continue."}
      </p>

      {/* Auth-aware list from Supabase */}
      {user && (
        <div className="card" style={{ background: "var(--bg)", marginBottom: 12 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="label">Your vehicles</div>
            <div className="row" style={{ gap: 8 }}>
              <button
                className={"btn " + (mode === "select" ? "" : "secondary")}
                onClick={() => setMode("select")}
                aria-pressed={mode === "select"}
              >
                Select from list
              </button>
              <button
                className={"btn " + (mode === "manual" ? "" : "secondary")}
                onClick={() => setMode("manual")}
                aria-pressed={mode === "manual"}
              >
                Manual entry
              </button>
            </div>
          </div>

          {loading && <div className="card">Loading your vehicles...</div>}
          {err && <div className="card" style={{ color: "var(--error)" }}>{err}</div>}
          {!loading && !err && rows.length === 0 && (
            <div className="card" style={{ color: "var(--muted)" }}>
              No vehicles found. Use manual entry below.
            </div>
          )}

          {!loading && !err && rows.length > 0 && mode === "select" && (
            <div className="grid" style={{ marginTop: 8 }}>
              {rows.map((r) => {
                const active = local?.id === r.id;
                const title = [r.year, r.make, r.model].filter(Boolean).join(" • ") || "Vehicle";
                return (
                  <article
                    key={r.id}
                    className="card"
                    style={{
                      gridColumn: "span 6",
                      borderColor: active ? "#93C5FD" : "#E5E7EB",
                      background: active ? "#F3F4F6" : "var(--surface)",
                      cursor: "pointer",
                    }}
                    onClick={() => selectRow(r)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectRow(r);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Select ${title}`}
                    aria-pressed={active}
                  >
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div>
                        <strong>{title}</strong>
                        {r.image_url ? (
                          <div style={{ marginTop: 8 }}>
                            <img
                              src={r.image_url}
                              alt={`${title} image`}
                              loading="lazy"
                              style={{ width: 180, height: 100, objectFit: "cover", borderRadius: 8 }}
                              onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <button className="btn">{active ? "Selected" : "Select"}</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Manual entry form (always available; default if not signed in) */}
      <div className="row" style={{ flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px", minWidth: 240 }}>
          <label className="label" htmlFor="vehicle-make">Make</label>
          <input
            id="vehicle-make"
            className="input"
            value={local.make}
            onChange={(e) => setLocal((s) => ({ ...s, make: e.target.value }))}
            placeholder="e.g., Hyundai"
            required
            onBlur={() => setTouched(true)}
          />
          {touched && !local.make && <FieldError text="Make is required" />}
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 240 }}>
          <label className="label" htmlFor="vehicle-model">Model</label>
          <input
            id="vehicle-model"
            className="input"
            value={local.model}
            onChange={(e) => setLocal((s) => ({ ...s, model: e.target.value }))}
            placeholder="e.g., i20"
            required
            onBlur={() => setTouched(true)}
          />
          {touched && !local.model && <FieldError text="Model is required" />}
        </div>
        <div style={{ width: 160, minWidth: 140 }}>
          <label className="label" htmlFor="vehicle-year">Year (optional)</label>
          <input
            id="vehicle-year"
            className="input"
            inputMode="numeric"
            value={local.year}
            onChange={(e) => setLocal((s) => ({ ...s, year: e.target.value.replace(/[^\\d]/g, "").slice(0, 4) }))}
            placeholder="e.g., 2020"
            maxLength={4}
          />
        </div>
      </div>

      <div className="row" style={{ flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ flex: "1 1 240px", minWidth: 240 }}>
          <label className="label" htmlFor="vehicle-vin">VIN (optional)</label>
          <input
            id="vehicle-vin"
            className="input"
            value={local.vin}
            onChange={(e) => setLocal((s) => ({ ...s, vin: e.target.value }))}
            placeholder="17-character VIN (optional)"
            maxLength={24}
          />
          <div className="subtitle" style={{ marginTop: 6 }}>
            {vehicleLabel ? `Current selection: ${vehicleLabel}` : "Provide make and model to proceed."}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldError({ text }) {
  return <div style={{ color: "var(--error)", marginTop: 6, fontSize: 13 }}>{text}</div>;
}
