import React, { useEffect, useMemo, useState } from "react";
import { useBooking } from "./context";
import getSupabaseClient from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

/**
// PUBLIC_INTERFACE
 * VehicleStep - Step 1: Select/enter vehicle details.
 *
 * Validates: make, model. VIN optional.
 * Data: Reads user's vehicles from Supabase table "user_vehicles" using user_id.
 * Fields mapped: id, make, model, vin, nickname. VIN remains optional.
 *
 * Behavior:
 * - Shows a selectable list of saved vehicles (if any) from Supabase.
 * - Selecting a saved vehicle updates form fields (make, model, vin).
 * - Manual edit remains possible; validation unchanged.
 * - Loading, empty, and error states are implemented for the list.
 *
 * TODO(API - mutations):
 * - Add "Add vehicle" flow -> INSERT into user_vehicles
 * - Edit vehicle details -> UPDATE user_vehicles
 * - Delete vehicle -> DELETE from user_vehicles
 */
export default function VehicleStep({ onValidChange }) {
  const { vehicle, setVehicle } = useBooking();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  // Remove 'year' from local state shape; include optional id, nickname when selecting existing
  const [local, setLocal] = useState(
    vehicle && typeof vehicle === "object"
      ? {
          id: vehicle.id || undefined,
          make: vehicle.make || "",
          model: vehicle.model || "",
          vin: vehicle.vin || "",
          nickname: vehicle.nickname || "",
        }
      : { id: undefined, make: "", model: "", vin: "", nickname: "" }
  );
  const [touched, setTouched] = useState(false);

  // Supabase list state
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [vehicles, setVehicles] = useState([]);

  // Fetch vehicles for current user
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setListError("");
      try {
        // Use auth.getUser to ensure fresh user id if needed
        let userId = user?.id || null;
        if (!userId) {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          userId = data?.user?.id || null;
        }
        if (!userId) {
          // No authenticated user; show empty list
          if (!cancelled) {
            setVehicles([]);
          }
          return;
        }

        const { data, error } = await supabase
          .from("user_vehicles")
          .select("id, make, model, vin, nickname")
          .eq("user_id", userId)
          .order("id", { ascending: true });
        if (error) throw error;

        if (!cancelled) {
          setVehicles(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (!cancelled) {
          setListError(e?.message || "Failed to load your vehicles.");
          setVehicles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, user?.id]);

  // Keep upstream context state and validity in sync with local edits or selections
  useEffect(() => {
    const next = {
      id: local.id,
      make: local.make,
      model: local.model,
      vin: local.vin,
      nickname: local.nickname,
    };
    const valid = isValid(next);
    onValidChange?.(valid);
    setVehicle(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const emptyList = useMemo(() => !loading && !listError && vehicles.length === 0, [loading, listError, vehicles]);

  function isValid(v) {
    return !!(String(v.make || "").trim() && String(v.model || "").trim());
  }

  function selectExisting(v) {
    setLocal({
      id: v.id,
      make: v.make || "",
      model: v.model || "",
      vin: v.vin || "",
      nickname: v.nickname || "",
    });
    setTouched(false);
  }

  return (
    <div className="card" aria-labelledby="vehicle-step-title">
      <h3 id="vehicle-step-title" className="section-title">Select Vehicle</h3>
      <p className="subtitle">Choose a saved vehicle or enter your vehicle details. VIN is optional.</p>

      {/* Saved vehicles list */}
      <section aria-label="Saved vehicles">
        {loading && <div className="card" style={{ background: "var(--bg)" }}>Loading your vehicles...</div>}
        {listError && (
          <div className="card" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "var(--error)" }}>
            {listError}
          </div>
        )}
        {emptyList && (
          <div className="card" style={{ background: "var(--bg)", color: "var(--muted)" }}>
            You have no saved vehicles yet.
            {/* TODO(API): Add "Add Vehicle" action to save the current form to Supabase */}
          </div>
        )}

        {!loading && !listError && vehicles.length > 0 && (
          <div className="grid" style={{ marginBottom: 12 }}>
            {vehicles.map((v) => {
              const active =
                (local.id && local.id === v.id) ||
                (!local.id && local.make === v.make && local.model === v.model && (local.vin || "") === (v.vin || ""));
              const title = v.nickname?.trim()
                ? `${v.nickname} (${v.make || "-"} ${v.model || ""})`
                : `${v.make || "-"} ${v.model || ""}`;
              return (
                <button
                  key={v.id}
                  className="card"
                  style={{
                    gridColumn: "span 4",
                    textAlign: "left",
                    borderColor: active ? "#93C5FD" : "#E5E7EB",
                    background: active ? "#F3F4F6" : "var(--surface)",
                    cursor: "pointer",
                  }}
                  onClick={() => selectExisting(v)}
                  aria-pressed={active}
                  aria-label={`Select ${title}`}
                >
                  <strong>{title}</strong>
                  <div className="subtitle" style={{ marginTop: 4 }}>VIN: {v.vin || "—"}</div>
                  {/* TODO(API): Add small Edit/Delete buttons per item for future mutations */}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Manual entry form (kept as-is, drives validation and global booking state) */}
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
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 240 }}>
          <label className="label" htmlFor="vehicle-nickname">Nickname (optional)</label>
          <input
            id="vehicle-nickname"
            className="input"
            value={local.nickname}
            onChange={(e) => setLocal((s) => ({ ...s, nickname: e.target.value }))}
            placeholder="e.g., Daily Driver"
            maxLength={60}
          />
        </div>
      </div>

      {/* TODO(API): Add "Save this vehicle" button to insert/update in Supabase.
          - If local.id exists -> UPDATE user_vehicles where id
          - Else -> INSERT with user_id = current user id
          - Also add a small "Remove" link to DELETE user_vehicles
          These are intentionally not implemented in this step (read-only listing). */}
    </div>
  );
}

function FieldError({ text }) {
  return <div style={{ color: "var(--error)", marginTop: 6, fontSize: 13 }}>{text}</div>;
}
