import React, { useState } from "react";
import { api } from "../../api";
import "./Auth.css";

/**
 * Login
 * Simple email/password form for both roles (admin and doctor).
 * On success it stores the JWT (via api.js) and calls onLoggedIn(role).
 */

function resizeImage(file, maxSize = 160, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


export default function Login({ onLoggedIn }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [role, setRole] = useState("doctor");
  const [avatarDataUrl, setAvatarDataUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  async function handlePhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setAvatarDataUrl(dataUrl);
    } catch (err) {
      setError("Couldn't process that photo, please try a different one.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result;
      if (mode === "login") {
        result = await api.login({ email, password });
      } else {
                result = await api.register({ name, email, password, role, clinicName, avatarUrl: avatarDataUrl });
      }
      onLoggedIn && onLoggedIn(result.role);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Doctors Atlas</h1>
        <p className="auth-tagline">Navigate your practice. Grow with confidence.</p>
        <p className="auth-sub">
          {mode === "login" ? "Log in to your practice dashboard" : "Create your account"}
        </p>

        {mode === "register" && (
          <>
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />

            <label>I am a</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>

            {role === "doctor" && (
              <>
                <label>Clinic name</label>
                <input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Optional" />
              </>
            )}

            <label>Profile photo (optional)</label>
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
            {avatarDataUrl && (
              <img
                src={avatarDataUrl}
                alt="Preview"
                style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", margin: "8px auto", display: "block" }}
              />
            )}
          </>
        )}

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
        </button>

        <button
          type="button"
          className="auth-switch"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
        </button>
      </form>
    </div>
  );
}
