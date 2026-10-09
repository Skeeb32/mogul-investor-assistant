import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/auth/identity";
import { SignInForm } from "@/components/sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  if (await getIdentity()) redirect("/");
  const params = await searchParams;
  return <SignInForm demoMode={process.env.DEMO_MODE === "true"} accountCreated={params.created === "1"} />;
}
