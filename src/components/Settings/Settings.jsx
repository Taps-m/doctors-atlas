import React, { useEffect, useRef, useState } from "react";
import { Camera, Copy, Check, Trash2, UserCircle2, Building2, Upload } from "lucide-react";
import { api } from "../../api";
import "./Settings.css";

const ROLE_LABEL = { doctor: "Doctor", admin: "Admin", staff: "Staff" };

/** Resize + compress a chosen image client-side before it's ever sent
 * to the backend, so a phone photo doesn't blow past the payload limit. */
function resizeImage(file, maxSize = 220, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Settings
 * Standalone page (same treatment as the other modules) with three
 * sections: your own profile (name + photo), your password, and -
 * for doctors/admins only - the clinic name plus a lightweight team
 * view built on the existing "staff joins with a clinic_id" sign-up
 * flow (no new invite system needed).
 */
export default function Settings() {
  const [user, setUser] = useState(null);
  const [loadError, setLoadError] = useState("");

  // Profile
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const fileInputRef = useRef(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  // Clinic & team (doctor/admin only)
  const [clinic, setClinic] = useState(null);
  const [clinicName, setClinicName] = useState("");
  const [clinicLogo, setClinicLogo] = useState(""); // "" = no logo set
  const [clinicSaving, setClinicSaving] = useState(false);
  const [clinicMsg, setClinicMsg] = useState("");
  const [staff, setStaff] = useState(null);
  const [staffErr, setStaffErr] = useState("");
  const [busyStaffId, setBusyStaffId] = useState(null);
  const [copied, setCopied] = useState(false);

  const canManageClinic = user && (user.role === "doctor" || user.role === "admin");

  useEffect(() => {
    api
      .me()
      .then((me) => {
        setUser(me);
        setName(me.name || "");
        setAvatarUrl(me.avatar_url || "");
      })
      .catch((err) => setLoadError(err.message || "Could not load your account"));
  }, []);

  useEffect(() => {
    if (!canManageClinic) return;
    api
      .getClinic()
      .then((c) => {
        setClinic(c);
        setClinicName(c.name);
        setClinicLogo(c.logo_url || "");
      })
      .catch((err) => setClinicMsg(err.message || "Could not load clinic details"));
    api
      .listStaff()
      .then(setStaff)
      .catch((err) => setStaffErr(err.message || "Could not load your team"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageClinic]);

  async function handlePickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setAvatarUrl(dataUrl);
    } catch {
      setProfileErr("Could not read that image - try a different file");
    }
  }

  async function handlePickClinicLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setClinicLogo(dataUrl);
    } catch {
      setClinicMsg("Could not read that image - try a different file");
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileErr("");
    setProfileMsg("");
    try {
      const updated = await api.updateProfile({ name: name.trim(), avatarUrl });
      setUser(updated);
      setProfileMsg("Saved.");
    } catch (err) {
      setProfileErr(err.message || "Could not save your profile");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwErr("");
    setPwMsg("");
    if (newPassword !== confirmPassword) {
      setPwErr("New password and confirmation don't match");
      return;
    }
    setPwSaving(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setPwMsg("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwErr(err.message || "Could not update your password");
    } finally {
      setPwSaving(false);
    }
  }

  async function handleSaveClinic(e) {
    e.preventDefault();
    setClinicSaving(true);
    setClinicMsg("");
    try {
      const updated = await api.updateClinic({
        name: clinicName.trim(),
        logoUrl: clinicLogo, // "" clears it, which the API treats as remove
      });
      setClinic(updated);
      setClinicLogo(updated.logo_url || "");
      setClinicMsg("Saved.");
    } catch (err) {
      setClinicMsg(err.message || "Could not save your clinic details");
    } finally {
      setClinicSaving(false);
    }
  }

  async function handleCopyInvite() {
    if (!clinic) return;
    try {
      await navigator.clipboard.writeText(String(clinic.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable - the code is still visible on screen */
    }
  }

  async function handleRemoveStaff(member) {
    if (!window.confirm(`Remove ${member.name} from your clinic?`)) return;
    setBusyStaffId(member.id);
    try {
      await api.removeStaff(member.id);
      setStaff((list) => list.filter((m) => m.id !== member.id));
    } catch (err) {
      setStaffErr(err.message || "Could not remove this team member");
    } finally {
      setBusyStaffId(null);
    }
  }

  if (loadError) {
    return (
      <div className="set-page">
        <div className="set-page__head">
          <h2>Settings</h2>
        </div>
        <div className="set-error">{loadError}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="set-page">
        <div className="set-page__head">
          <h2>Settings</h2>
        </div>
        <div className="set-loading">Loading your account...</div>
      </div>
    );
  }

  return (
    <div className="set-page">
      <div className="set-page__head">
        <h2>Settings</h2>
        <p>Your profile, your password, and - if you run the clinic - its name and team.</p>
      </div>

      <div className="set-section">
        <h3>Profile</h3>
        <form className="set-card" onSubmit={handleSaveProfile}>
          <div className="set-profile-row">
            <button
              type="button"
              className="set-avatar"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change photo"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" />
              ) : (
                <UserCircle2 size={40} />
              )}
              <span className="set-avatar__badge">
                <Camera size={13} />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePickPhoto}
              style={{ display: "none" }}
            />
            <div className="set-field">
              <label>Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
              <div className="set-field__sub">{user.email} &middot; {ROLE_LABEL[user.role] || user.role}</div>
            </div>
          </div>

          {profileErr && <div className="set-error">{profileErr}</div>}
          {profileMsg && <div className="set-success">{profileMsg}</div>}

          <button type="submit" className="set-btn set-btn--primary" disabled={profileSaving}>
            {profileSaving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      <div className="set-section">
        <h3>Password</h3>
        <form className="set-card" onSubmit={handleChangePassword}>
          <div className="set-field">
            <label>Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="set-field-row">
            <div className="set-field">
              <label>New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="set-field">
              <label>Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>

          {pwErr && <div className="set-error">{pwErr}</div>}
          {pwMsg && <div className="set-success">{pwMsg}</div>}

          <button type="submit" className="set-btn set-btn--primary" disabled={pwSaving}>
            {pwSaving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {canManageClinic && (
        <div className="set-section">
          <h3>Clinic &amp; Team</h3>
          <form className="set-card" onSubmit={handleSaveClinic}>
            <div className="set-field">
              <label>Clinic name</label>
              <input value={clinicName} onChange={(e) => setClinicName(e.target.value)} required />
            </div>

            {/* Entirely optional - the clinic works fine with no logo,
                and the sidebar falls back to a generic icon. */}
            <div className="set-field">
              <label>Clinic logo (optional)</label>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: clinicLogo ? "#fff" : "#f1f4f9",
                    border: "1px solid #e2e6ee",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {clinicLogo ? (
                    <img
                      src={clinicLogo}
                      alt="Clinic logo"
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <Building2 size={20} color="#94a0b4" />
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label
                    className="set-btn set-btn--ghost"
                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Upload size={14} /> {clinicLogo ? "Change logo" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePickClinicLogo}
                      style={{ display: "none" }}
                    />
                  </label>
                  {clinicLogo && (
                    <button
                      type="button"
                      className="set-btn set-btn--ghost"
                      onClick={() => setClinicLogo("")}
                      style={{ fontSize: 12 }}
                    >
                      Remove logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {clinicMsg && <div className={clinicMsg === "Saved." ? "set-success" : "set-error"}>{clinicMsg}</div>}
            <button type="submit" className="set-btn set-btn--primary" disabled={clinicSaving}>
              {clinicSaving ? "Saving..." : "Save Clinic Details"}
            </button>
          </form>

          <div className="set-card">
            <div className="set-invite">
              <div>
                <div className="set-invite__label">Your clinic's invite code</div>
                <div className="set-invite__sub">
                  Share this with staff - they enter it as "Clinic ID" when they sign up, and it joins them straight into your clinic.
                </div>
              </div>
              <button type="button" className="set-btn set-btn--ghost" onClick={handleCopyInvite}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {clinic ? clinic.id : "..."}
              </button>
            </div>
          </div>

          <div className="set-card">
            <div className="set-team__title">Team members</div>
            {staffErr && <div className="set-error">{staffErr}</div>}
            {staff === null ? (
              <div className="set-loading">Loading your team...</div>
            ) : staff.length === 0 ? (
              <div className="set-empty">No staff accounts yet. Share your invite code above to add one.</div>
            ) : (
              <div className="set-team__list">
                {staff.map((m) => (
                  <div className="set-team__row" key={m.id}>
                    <div>
                      <div className="set-team__name">{m.name}</div>
                      <div className="set-team__email">{m.email}</div>
                    </div>
                    <span className={`set-role set-role--${m.role}`}>{ROLE_LABEL[m.role] || m.role}</span>
                    {m.role === "staff" && (
                      <button
                        type="button"
                        className="set-btn set-btn--icon"
                        onClick={() => handleRemoveStaff(m)}
                        disabled={busyStaffId === m.id}
                        aria-label={`Remove ${m.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
