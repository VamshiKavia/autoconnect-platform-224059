import { useEffect, useState } from "react";
import { apiGet, apiPut, getAuthHeader } from "../api/client";

/**
// PUBLIC_INTERFACE
 * Profile - view and update user profile (mock)
 */
export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet("/profile", { headers: { ...getAuthHeader() } });
        setProfile(data);
      } catch (e) {
        setProfile(null);
      }
    }
    load();
  }, []);

  const onSave = async (e) => {
    e.preventDefault();
    setStatus("");
    try {
      const updated = await apiPut(
        "/profile",
        {
          email: profile.email,
          name: profile.name,
          bio: profile.bio || "",
          phone: profile.phone || "",
          created_at: profile.created_at,
        },
        { headers: { ...getAuthHeader() } }
      );
      setProfile(updated);
      setStatus("Saved");
      setTimeout(() => setStatus(""), 1500);
    } catch (e) {
      setStatus("Failed to save");
    }
  };

  if (!profile) {
    return (
      <div className="container">
        <div className="card">Sign in to view your profile.</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 className="section-title">Your Profile</h2>
      <p className="subtitle">Manage your personal information.</p>
      <form className="card" onSubmit={onSave} style={{ maxWidth: 640 }}>
        <div className="row" style={{ gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Email</label>
            <input className="input" value={profile.email} disabled readOnly />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Name</label>
            <input
              className="input"
              value={profile.name || ""}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
        </div>
        <div style={{ height: 12 }} />
        <label className="label">Phone</label>
        <input
          className="input"
          value={profile.phone || ""}
          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
        />
        <div style={{ height: 12 }} />
        <label className="label">Bio</label>
        <textarea
          className="input"
          rows={4}
          value={profile.bio || ""}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
        />
        <div className="row" style={{ justifyContent: "space-between", marginTop: 16 }}>
          <div style={{ color: status === "Saved" ? "var(--success)" : "var(--error)" }}>
            {status}
          </div>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  );
}
