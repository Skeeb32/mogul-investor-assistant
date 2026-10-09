import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { AssistantWorkspace } from "@/components/assistant-workspace";
import { getIdentity } from "@/lib/auth/identity";
import { getOverview } from "@/lib/overview";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const identity = await getIdentity();
  if (!identity) redirect("/sign-in");
  const overview = await getOverview(identity);
  return (
    <AssistantWorkspace
      identity={{ name: identity.name, email: identity.email, role: identity.role }}
      overview={overview}
      initialConversationId={randomUUID()}
      openAiConfigured={Boolean(process.env.OPENAI_API_KEY)}
    />
  );
}
