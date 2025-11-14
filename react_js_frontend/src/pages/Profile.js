import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import getSupabaseClient from "../lib/supabaseClient";

/**
// PUBLIC_INTERFACE
 * Profile - display and update Supabase user metadata (display_name, avatar_url).
 *
 * - Email is read-only
 * - Updates via supabase.auth.updateUser({ data: { ... } })
 */
export default function Profile() {
  const { user, refreshUser } = useAuth();
  const supabase = getSupabaseClient();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const meta = user?.user_metadata || {};
    setDisplayName(meta.display_name || "");
    setAvatarUrl(meta.avatar_url || "");
  }, [user]);

  async function onSave(e) {
    e.preventDefault();
    setStatus("");
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          avatar_url: avatarUrl,
        },
      });
      if (error) throw error;
      await refreshUser();
      setStatus("Saved");
      setTimeout(() => setStatus(""), 1500);
    } catch (e2) {
      setStatus(e2?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <h2 className="section-title">Your Profile</h2>
      <p className="subtitle">Manage your account details.</p>

      <form className="card" onSubmit={onSave} style={{ maxWidth: 640 }}>
        <div className="row" style={{ gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Email</label>
            <input className="input" value={user?.email || ""} disabled readOnly />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Display name</label>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
          </div>
        </div>

        <div style={{ height: 12 }} />
        <label className="label">Avatar URL</label>
        <input
          className="input"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/avatar.png"
        />

        {avatarUrl ? (
          <>
            <div style={{ height: 12 }} />
            <div className="row" style={{ gap: 16 }}>
              <img
                src={avatarUrl}
                alt="Profile avatar preview"
                style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", background: "#fff" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="subtitle">Preview</div>
            </div>
          </>
        ) : null}

        <div className="row" style={{ justifyContent: "space-between", marginTop: 16 }}>
          <div style={{ color: status === "Saved" ? "var(--success)" : "var(--error)" }}>
            {status}
          </div>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
