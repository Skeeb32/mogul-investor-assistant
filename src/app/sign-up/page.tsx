import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Home, ShieldCheck } from "lucide-react";
import { getIdentity } from "@/lib/auth/identity";
import { SignUpForm } from "@/components/sign-up-form";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (await getIdentity()) redirect("/");

  return (
    <main className="sign-in-shell">
      <section className="sign-in-story">
        <Link className="brand" href="/" aria-label="Mogul home"><span className="brand-mark">m</span><span>mogul</span></Link>
        <div>
          <div className="eyebrow">A CLEARER VIEW OF REAL ESTATE</div>
          <h1>Your portfolio,<br />in a new light.</h1>
          <p>Create a private account to get started with your Mogul investor assistant.</p>
        </div>
        <div className="sign-in-security"><ShieldCheck size={14} /> Your account and documents stay isolated to your Mogul account.</div>
      </section>
      <section className="sign-in-card sign-up-card">
        <div className="avatar" style={{ marginBottom: 18 }}><Home size={14} /></div>
        <h2>Create your account</h2>
        <p>Start with a private investor account.</p>
        <SignUpForm />
        <div className="auth-switch"><Link href="/sign-in"><ArrowLeft size={12} aria-hidden="true" /> Back to sign in</Link></div>
        <p className="sign-in-security">Use at least 14 characters for your password. Email verification and password recovery are not available yet.</p>
      </section>
    </main>
  );
}
