"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bot, Building2, ChartNoAxesCombined, FileText, History, LogOut, Plus } from "lucide-react";

export type ConversationSummary = { id: string; title: string; updatedAt: string };
type Props = {
  open: boolean;
  onClose: () => void;
  name: string;
  role: string;
  conversations: ConversationSummary[];
  activeId: string;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onNavigate: (section: string) => void;
};

export function AppSidebar(props: Props) {
  const [activeSection, setActiveSection] = useState("Assistant");
  const { open, onClose, name, role, conversations, activeId, onNewChat, onSelectChat, onNavigate } = props;
  const initials = name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  function navigate(section: string) {
    setActiveSection(section);
    onNavigate(section);
    onClose();
  }

  return (
    <>
      <button className={`mobile-overlay ${open ? "open" : ""}`} onClick={onClose} aria-label="Close navigation" />
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Main navigation">
        <Link className="brand" href="/" aria-label="Mogul home"><span className="brand-mark">m</span><span>mogul</span></Link>
        <div className="sidebar-label">INVESTOR PORTAL</div>
        <nav className="sidebar-nav">
          <button className={`sidebar-link ${activeSection === "Assistant" ? "active" : ""}`} onClick={() => navigate("Assistant")}><Bot />Assistant</button>
          <button className={`sidebar-link ${activeSection === "Properties" ? "active" : ""}`} onClick={() => navigate("Properties")}><Building2 />Properties</button>
          <button className={`sidebar-link ${activeSection === "Portfolio" ? "active" : ""}`} onClick={() => navigate("Portfolio")}><ChartNoAxesCombined />My portfolio</button>
          <button className={`sidebar-link ${activeSection === "Documents" ? "active" : ""}`} onClick={() => navigate("Documents")}><FileText />Documents</button>
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-label">RECENT CONVERSATIONS</div>
        <button className="sidebar-link" onClick={onNewChat}><Plus />New conversation</button>
        <div className="sidebar-nav conversation-nav">
          {conversations.slice(0, 7).map((conversation) => (
            <button key={conversation.id} className={`sidebar-link conversation-link ${activeId === conversation.id ? "active" : ""}`} title={conversation.title} onClick={() => onSelectChat(conversation.id)}>
              <History /><span>{conversation.title || "New conversation"}</span>
            </button>
          ))}
          {conversations.length === 0 && <div className="sidebar-empty">Your conversations will appear here.</div>}
        </div>
        <div className="sidebar-bottom">
          <div className="support-card"><i className="support-dot" /><div><b>Here when you need us</b><small>Talk to an investment specialist</small></div><span style={{ marginLeft: "auto", color: "#708275" }}>↗</span></div>
          <button className="profile-button" onClick={() => signOut({ redirectTo: "/sign-in" })} aria-label="Sign out">
            <span className="avatar">{initials}</span><span className="profile-copy"><b>{name}</b><small>{role} account</small></span><LogOut size={14} className="profile-more" />
          </button>
        </div>
      </aside>
    </>
  );
}
