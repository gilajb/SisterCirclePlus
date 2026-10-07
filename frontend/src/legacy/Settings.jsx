import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { requireAuth, removeToken } from "@/lib/auth";

const C = {
  bg: "#F7F3F0", white: "#FFFFFF", pink: "#D4547A",
  charcoal: "#1A1A1A", body: "#444444", muted: "#888888",
  border: "#E8E0DC", mauve: "#6B3A4A",
  errorBg: "#FEF2F2", errorBorder: "#FECACA", errorText: "#B91C1C",
};

const TIER_LABELS = { free: "Free", under_18: "Under-18 (discounted)", standard: "Standard", premium: "Premium" };

const spinnerStyle = `@keyframes st-spin { to { transform: rotate(360deg); } }`;

function flattenErrors(err) {
  if (!err.response?.data) return "Something went wrong. Please try again.";
  const data = err.response.data;
  if (typeof data === "string") return data;
  const messages = Object.values(data).flat();
  return messages.length ? messages.join(" ") : "Something went wrong.";
}

function Spinner() {
  return (
    <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: C.white, borderRadius: "50%", animation: "st-spin 0.7s linear infinite" }} />
  );
}

function PasswordField({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "13px", fontWeight: "600", color: C.charcoal, fontFamily: "system-ui, sans-serif" }}>{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "11px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "14px", fontFamily: "system-ui, sans-serif", color: C.charcoal, outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}

function DeleteAccountModal({ username, onClose, onDeleted }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const canDelete = confirmText.trim().toLowerCase() === "delete my account";

  async function handleDelete() {
    setError("");
    setDeleting(true);
    try {
      await api.delete("/api/user/delete/");
      onDeleted();
    } catch {
      setError("Couldn't delete your account right now. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} onClick={deleting ? undefined : onClose} />
      <div style={{ position: "relative", background: C.white, borderRadius: "16px", padding: "32px", maxWidth: "420px", width: "calc(100% - 40px)", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ fontSize: "18px", fontWeight: "700", color: C.errorText, fontFamily: "Georgia, serif" }}>Delete your account?</div>
        <p style={{ fontSize: "14px", color: C.body, fontFamily: "system-ui, sans-serif", margin: 0, lineHeight: "1.6" }}>
          This permanently deletes <strong>{username}</strong>'s account and every symptom check you've ever submitted.
          This cannot be undone.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", fontWeight: "600", color: C.charcoal, fontFamily: "system-ui, sans-serif" }}>
            Type <strong>delete my account</strong> to confirm
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="delete my account"
            style={{ width: "100%", padding: "12px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "14px", fontFamily: "system-ui, sans-serif", color: C.charcoal, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        {error && (
          <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: C.errorText, fontFamily: "system-ui, sans-serif" }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{ flex: 1, background: C.white, color: C.body, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "12px", fontSize: "14px", fontWeight: "600", cursor: deleting ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            style={{
              flex: 1, background: canDelete && !deleting ? C.errorText : "#E8B4B0", color: C.white,
              border: "none", borderRadius: "8px", padding: "12px", fontSize: "14px", fontWeight: "700",
              cursor: canDelete && !deleting ? "pointer" : "not-allowed", fontFamily: "system-ui, sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            {deleting ? <><Spinner /> Deleting…</> : "Delete My Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [exportState, setExportState] = useState("idle"); // idle | loading | done | error

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [changePasswordState, setChangePasswordState] = useState("idle"); // idle | loading | done | error
  const [changePasswordError, setChangePasswordError] = useState("");

  useEffect(() => {
    if (!requireAuth(navigate)) return;
    setAuthChecked(true);
  }, [navigate]);

  useEffect(() => {
    if (!authChecked) return;
    api.get("/api/auth/me/")
      .then((res) => setMe(res.data))
      .catch(() => setMeError("Couldn't load your account details right now."));
  }, [authChecked]);

  function handleDeleted() {
    removeToken();
    setShowDeleteModal(false);
    setDeleted(true);
  }

  async function handleChangePassword() {
    setChangePasswordError("");
    if (!currentPassword || !newPassword || !newPassword2) {
      setChangePasswordError("Please fill in all three fields.");
      return;
    }
    setChangePasswordState("loading");
    try {
      await api.post("/api/auth/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
        new_password2: newPassword2,
      });
      setChangePasswordState("done");
      setCurrentPassword("");
      setNewPassword("");
      setNewPassword2("");
    } catch (err) {
      setChangePasswordError(flattenErrors(err));
      setChangePasswordState("error");
    }
  }

  async function handleExport() {
    setExportState("loading");
    try {
      const { data } = await api.get("/api/user/export/");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sistercircle-data-export-${me?.username || "account"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportState("done");
    } catch {
      setExportState("error");
    }
  }

  if (!authChecked) return null;

  if (deleted) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: "420px", width: "100%", background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "40px 32px", textAlign: "center", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontSize: "32px" }}>✓</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>Your account has been deleted</div>
          <p style={{ fontSize: "14px", color: C.body, fontFamily: "system-ui, sans-serif", margin: 0 }}>
            Your account and all associated data have been permanently removed.
          </p>
          <Link to="/" style={{ textDecoration: "none" }}>
            <button style={{ width: "100%", background: C.mauve, color: C.white, border: "none", borderRadius: "10px", padding: "14px", fontSize: "15px", fontWeight: "700", cursor: "pointer", fontFamily: "system-ui, sans-serif", marginTop: "8px" }}>
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <style>{spinnerStyle}</style>
      {showDeleteModal && (
        <DeleteAccountModal
          username={me?.username || "your account"}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={handleDeleted}
        />
      )}

      <div style={{ padding: "24px 48px", borderBottom: `1px solid ${C.border}` }}>
        <Link to="/dashboard" style={{ fontSize: "18px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none" }}>SisterCircle+</Link>
      </div>

      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "48px 24px", display: "flex", flexDirection: "column", gap: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "800", color: C.charcoal, fontFamily: "Georgia, serif", margin: 0 }}>Account Settings</h1>

        {meError && (
          <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: "10px", padding: "14px 16px", fontSize: "13px", color: C.errorText, fontFamily: "system-ui, sans-serif" }}>{meError}</div>
        )}

        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "28px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif", margin: "0 0 16px" }}>Your Account</h2>
          {me ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                ["Username", me.username],
                ["Email", me.email],
                ["Plan", TIER_LABELS[me.tier] || me.tier],
                ["Email verified", me.email_verified ? "Yes" : "No"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontFamily: "system-ui, sans-serif" }}>
                  <span style={{ color: C.muted }}>{label}</span>
                  <span style={{ color: C.charcoal, fontWeight: "600" }}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif", margin: 0 }}>Loading…</p>
          )}
        </div>

        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "28px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif", margin: "0 0 16px" }}>Change Password</h2>
          {changePasswordState === "done" ? (
            <p style={{ fontSize: "13px", color: "#2E7D52", fontFamily: "system-ui, sans-serif", margin: 0, fontWeight: "600" }}>✓ Your password has been changed.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <PasswordField label="Current Password" value={currentPassword} onChange={setCurrentPassword} />
              <PasswordField label="New Password" value={newPassword} onChange={setNewPassword} />
              <PasswordField label="Confirm New Password" value={newPassword2} onChange={setNewPassword2} />
              {changePasswordError && (
                <p style={{ fontSize: "12px", color: C.errorText, fontFamily: "system-ui, sans-serif", margin: 0 }}>{changePasswordError}</p>
              )}
              <button
                onClick={handleChangePassword}
                disabled={changePasswordState === "loading"}
                style={{ background: changePasswordState === "loading" ? C.body : C.mauve, color: C.white, border: "none", borderRadius: "8px", padding: "12px 20px", fontSize: "14px", fontWeight: "700", cursor: changePasswordState === "loading" ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", alignSelf: "flex-start" }}
              >
                {changePasswordState === "loading" ? <><Spinner /> Updating…</> : "Update Password"}
              </button>
            </div>
          )}
        </div>

        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "28px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif", margin: "0 0 8px" }}>Your Data</h2>
          <p style={{ fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif", margin: "0 0 16px", lineHeight: "1.6" }}>
            Download a copy of your account details and every symptom check you've submitted, as a JSON file.
          </p>
          <button
            onClick={handleExport}
            disabled={exportState === "loading"}
            style={{ background: exportState === "loading" ? C.muted : C.mauve, color: C.white, border: "none", borderRadius: "8px", padding: "12px 20px", fontSize: "14px", fontWeight: "700", cursor: exportState === "loading" ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", gap: "8px" }}
          >
            {exportState === "loading" ? <><Spinner /> Preparing…</> : "Export My Data"}
          </button>
          {exportState === "done" && (
            <p style={{ fontSize: "12px", color: "#2E7D52", fontFamily: "system-ui, sans-serif", margin: "10px 0 0" }}>✓ Downloaded</p>
          )}
          {exportState === "error" && (
            <p style={{ fontSize: "12px", color: C.errorText, fontFamily: "system-ui, sans-serif", margin: "10px 0 0" }}>Couldn't export your data right now. Please try again.</p>
          )}
        </div>

        <div style={{ background: C.white, border: `1px solid ${C.errorBorder}`, borderRadius: "16px", padding: "28px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: C.errorText, fontFamily: "Georgia, serif", margin: "0 0 8px" }}>Danger Zone</h2>
          <p style={{ fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif", margin: "0 0 16px", lineHeight: "1.6" }}>
            Permanently delete your account and every symptom check you've submitted. This cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{ background: C.white, color: C.errorText, border: `1px solid ${C.errorText}`, borderRadius: "8px", padding: "12px 20px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
          >
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}
