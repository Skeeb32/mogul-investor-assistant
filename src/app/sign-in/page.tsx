import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/auth/identity";
import { SignInForm } from "@/components/sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (await getIdentity()) redirect("/");
  return <SignInForm demoMode={process.env.DEMO_MODE === "true"} />;
}
