"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Menu } from "lucide-react";
import { AppSidebar, type ConversationSummary } from "@/components/app-sidebar";
import { AssistantChatWidget } from "@/components/assistant-chat-widget";
import { ContextPanel, MetricSummary, type DashboardOverview } from "@/components/context-panel";
import { DocumentUploader } from "@/components/document-uploader";

type IdentityView = { name: string; email: string; role: "investor" | "analyst" | "admin" };

export function AssistantWorkspace({ identity, overview: initialOverview, initialConversationId, openAiConfigured }: {
  identity: IdentityView;
  overview: DashboardOverview;
  initialConversationId: string;
  openAiConfigured: boolean;
}) {
  const [overview, setOverview] = useState(initialOverview);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [queuedPrompt, setQueuedPrompt] = useState("");
  const [toast, setToast] = useState("");
  const canUpload = identity.role === "analyst" || identity.role === "admin";

  const refreshConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      if (response.ok) setConversations(await response.json() as ConversationSummary[]);
    } catch {
      // Keep the dashboard available if this refresh cannot reach the API.
    }
  }, []);

  const refreshOverview = useCallback(async () => {
    try {
      const response = await fetch("/api/overview", { cache: "no-store" });
      if (response.ok) setOverview(await response.json() as DashboardOverview);
    } catch {
      // Keep the last server-rendered portfolio summary on refresh errors.
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/conversations", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as ConversationSummary[] : null)
      .then((items) => { if (active && items) setConversations(items); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("mogul.current-conversation", conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function newConversation() {
    setConversationId(window.crypto.randomUUID());
    setSidebarOpen(false);
    setChatOpen(true);
  }

  function selectConversation(id: string) {
    setConversationId(id);
    setSidebarOpen(false);
    setChatOpen(true);
  }

  function navigate(section: string) {
    if (section === "Assistant") {
      setChatOpen(true);
      return;
    }
    if (section === "Documents" && canUpload) {
      setUploadOpen(true);
      return;
    }
    if (section === "Properties" || section === "Portfolio") {
      document.querySelector(".context-column")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setToast(section === "Portfolio" ? "Your portfolio summary is shown beside the conversation." : "Your property holdings are shown beside the conversation.");
      return;
    }
    if (section !== "Assistant") setToast(section + " is available through your investor assistant.");
  }

  function requestPrompt(prompt: string) {
    setQueuedPrompt(prompt);
    setChatOpen(true);
  }

  return (
    <div className="app-shell">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        name={identity.name}
        role={identity.role}
        conversations={conversations}
        activeId={conversationId}
        onNewChat={newConversation}
        onSelectChat={selectConversation}
        onNavigate={navigate}
      />
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={18} /></button>
          <div className="breadcrumbs"><span>Investor portal</span><span> / </span><b>Assistant</b></div>
          <div className="top-actions"><span className="market-status"><i />Account data protected</span><span className="top-avatar">{identity.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span></div>
        </header>

        <div className="page-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">YOUR MOGUL ACCOUNT <span className="demo-chip"><i />SAMPLE DATA</span></div>
              <h1>Good morning, {identity.name.split(" ")[0]}<span className="period">.</span></h1>
              <p className="welcome-sub">Ask about your investments, property notes, or recent account activity.</p>
            </div>
          </section>

          <MetricSummary overview={overview} />

          <section className="content-layout">
            <ContextPanel overview={overview} onAsk={requestPrompt} />
          </section>

          <footer className="footer">
            <span>Sample investor environment · All account, property, and market figures are synthetic.</span>
            <div className="footer-links"><span>Assistant answers are informational, not investment, tax, or legal advice.</span></div>
          </footer>
        </div>
      </main>
      <DocumentUploader
        open={uploadOpen}
        overview={overview}
        onClose={() => setUploadOpen(false)}
        onComplete={(message) => { setToast(message); void refreshOverview(); }}
      />
      <AssistantChatWidget
        key={conversationId}
        open={chatOpen}
        onOpen={() => setChatOpen(true)}
        onClose={() => setChatOpen(false)}
        conversationId={conversationId}
        openAiConfigured={openAiConfigured}
        canUpload={canUpload}
        onConversationUpdate={() => { void refreshConversations(); }}
        onUpload={() => setUploadOpen(true)}
        onToast={setToast}
        promptToSend={queuedPrompt}
        onPromptSent={() => setQueuedPrompt("")}
      />
      <div className={toast ? "toast show" : "toast"} role="status" aria-live="polite"><Bot size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />{toast}</div>
    </div>
  );
}
