"use client";

import { useEffect, useRef } from "react";
import { Bot, MessageCircle } from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";

type Props = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  conversationId: string;
  openAiConfigured: boolean;
  canUpload: boolean;
  onConversationUpdate: () => void;
  onUpload: () => void;
  onToast: (message: string) => void;
  promptToSend: string;
  onPromptSent: () => void;
};

export function AssistantChatWidget({
  open,
  onOpen,
  onClose,
  ...chatProps
}: Props) {
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open) closeRef.current?.focus();
    else if (wasOpenRef.current) launcherRef.current?.focus();
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  return (
    <div className="assistant-widget">
      <div
        id="mogul-assistant-popup"
        className="assistant-popover"
        role="dialog"
        aria-label="Mogul investor assistant"
        aria-modal={false}
        hidden={!open}
      >
        <ChatPanel {...chatProps} onClose={onClose} closeButtonRef={closeRef} />
      </div>
      <button
        ref={launcherRef}
        className={`assistant-launcher ${open ? "is-open" : ""}`}
        type="button"
        onClick={open ? onClose : onOpen}
        aria-expanded={open}
        aria-controls="mogul-assistant-popup"
        aria-label={open ? "Close Mogul assistant" : "Open Mogul assistant"}
      >
        {open ? <MessageCircle aria-hidden="true" /> : <Bot aria-hidden="true" />}
        <span>{open ? "Close" : "Ask Mogul"}</span>
      </button>
    </div>
  );
}
