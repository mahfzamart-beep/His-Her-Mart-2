"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function AdminResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) setRecovery(true);
    return () => subscription.unsubscribe();
  }, []);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    if (!supabase) { setError("Password reset is unavailable right now."); setBusy(false); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== "undefined" ? window.location.origin + "/admin/reset-password" : undefined
    });
    if (error) setError(error.message);
    else setMessage("If this email is registered, a password reset link has been sent. Check your inbox and spam folder.");
    setBusy(false);
  }

  async function saveNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    if (!supabase) { setError("Password update is unavailable right now."); setBusy(false); return; }
    if (password.length < 10) { setError("Use at least 10 characters for your new password."); setBusy(false); return; }
    if (password !== confirm) { setError("The passwords do not match."); setBusy(false); return; }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else { setMessage("Password updated. You can now sign in to the admin dashboard."); setRecovery(false); setPassword(""); setConfirm(""); }
    setBusy(false);
  }

  return <main className="admin-shell admin-login-shell">
    <Link href="/admin" className="admin-back"><ArrowLeft size={15} /> Back to admin sign in</Link>
    <section className="admin-login-card">
      <div className="admin-brand-mark"><ShieldCheck size={22} /></div>
      <p className="eyebrow">SECURE ACCOUNT ACCESS</p>
      <h1>{recovery ? "Set a new password" : "Reset admin password"}</h1>
      <p className="admin-muted">{recovery ? "Choose a strong password that you do not use on other websites." : "We will email a secure password-reset link if the account exists."}</p>
      {recovery ? <form onSubmit={saveNewPassword} className="admin-login-form">
        <label>New password<input type="password" minLength={10} required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label>Confirm new password<input type="password" minLength={10} required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        <button className="primary-btn" disabled={busy}>{busy ? "UPDATING…" : "UPDATE PASSWORD"}</button>
      </form> : <form onSubmit={requestReset} className="admin-login-form">
        <label>Admin email<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="store-admin@example.com" /></label>
        <button className="primary-btn" disabled={busy}>{busy ? "SENDING…" : "SEND RESET LINK"}</button>
      </form>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      {message && <p className="admin-success" role="status">{message}</p>}
    </section>
  </main>;
}
