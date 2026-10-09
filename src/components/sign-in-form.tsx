"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Home, ShieldCheck } from "lucide-react";

export function SignInForm({ demoMode }: { demoMode: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false, redirectTo: "/" });
    if (result?.error) {
      setError("We couldn’t sign you in with those details.");
      setBusy(false);
      return;
    }
    router.push("/");
  }

  return (
    <main className="sign-in-shell">
      <section className="sign-in-story">
        <Link className="brand" href="/" aria-label="Mogul home"><span className="brand-mark">m</span><span>mogul</span></Link>
        <div>
          <div className="eyebrow">A CLEARER VIEW OF REAL ESTATE</div>
          <h1>Your portfolio,<br />in a new light.</h1>
          <p>Ask a question. Find a document. Understand the homes behind your investment.</p>
        </div>
        <div className="sign-in-security"><ShieldCheck size={14} /> Your account and documents stay isolated to your Mogul account.</div>
      </section>
      <section className="sign-in-card">
        <div className="avatar" style={{ marginBottom: 18 }}><Home size={14} /></div>
        <h2>Welcome back</h2>
        <p>Sign in to continue to your investor assistant.</p>
        <form className="sign-in-form" onSubmit={submit}>
          <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
          {error && <div className="sign-in-error" role="alert">{error}</div>}
          <button className="sign-in-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : <>Sign in <ArrowRight size={13} style={{ verticalAlign: "middle", marginLeft: 6 }} /></>}</button>
        </form>
        {demoMode && <div className="sign-in-demo">Demo mode is enabled. Seed the sample investor account with the values in your local <code>.env</code> file.</div>}
        <p className="sign-in-security">This prototype uses account-scoped data and role checks. Never share your password or API keys.</p>
      </section>
    </main>
  );
}
