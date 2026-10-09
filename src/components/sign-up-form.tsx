"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "We couldn’t create your account. Please try again.");
        setBusy(false);
        return;
      }

      const signInResult = await signIn("credentials", { email, password, redirect: false, redirectTo: "/" });
      if (signInResult?.error) {
        router.push("/sign-in?created=1");
        return;
      }
      router.push("/");
    } catch {
      setError("We couldn’t create your account. Please check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form className="sign-in-form" onSubmit={submit}>
      <label htmlFor="sign-up-name">Full name
        <input id="sign-up-name" name="name" type="text" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={160} required />
      </label>
      <label htmlFor="sign-up-email">Email address
        <input id="sign-up-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={320} required />
      </label>
      <label htmlFor="sign-up-password">Password
        <input id="sign-up-password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={14} maxLength={128} required />
      </label>
      {error && <div className="sign-in-error" role="alert">{error}</div>}
      <button className="sign-in-submit" type="submit" disabled={busy}>
        <span>{busy ? "Creating account…" : "Create account"}</span>
        {!busy && <ArrowRight size={14} aria-hidden="true" />}
      </button>
    </form>
  );
}
