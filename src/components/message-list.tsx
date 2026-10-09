"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { ArrowUpRight, Bot, FileText } from "lucide-react";

type Citation = { documentId: string; title: string; url: string | null; sourceType: string; sourceDate: string | null };
type MessageWithMetadata = UIMessage & { metadata?: { citations?: Citation[] } };

function textFromMessage(message: UIMessage) {
  return message.parts.filter((part) => part.type === "text").map((part) => part.text).join("");
}

function citationsFromMessage(message: MessageWithMetadata) {
  const citations = new Map<string, Citation>();
  for (const citation of message.metadata?.citations ?? []) citations.set(citation.documentId, citation);
  for (const part of message.parts) {
    const toolPart = part as unknown as { type: string; output?: { evidence?: { citation?: Citation }[] } };
    if (!toolPart.type.startsWith("tool-searchDocuments")) continue;
    for (const item of toolPart.output?.evidence ?? []) {
      if (item.citation?.documentId) citations.set(item.citation.documentId, item.citation);
    }
  }
  return [...citations.values()];
}

export function MessageList({ messages, busy, onSuggestion }: {
  messages: UIMessage[];
  busy: boolean;
  onSuggestion: (text: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, busy]);

  return (
    <div className="message-list" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
      {messages.length === 0 ? (
        <div className="welcome-message">
          <div className="eyebrow">YOUR INVESTOR ASSISTANT</div>
          <h3>A clearer picture starts with a question.</h3>
          <p>Ask about your portfolio, a property report, or recent account activity. Answers about your account come from authenticated records; property and market answers cite your documents.</p>
          <div className="suggestion-grid">
            <button className="suggestion-button" onClick={() => onSuggestion("Give me a quick overview of my portfolio and recent activity.")}><span>PORTFOLIO</span>Give me a quick overview of my portfolio.</button>
            <button className="suggestion-button" onClick={() => onSuggestion("What changed in the Clinton Hill Q3 operating update?")}><span>DOCUMENTS</span>What changed in the Clinton Hill Q3 update?</button>
            <button className="suggestion-button" onClick={() => onSuggestion("Show my distributions from the last 12 months.")}><span>ACTIVITY</span>Show my distributions from the last 12 months.</button>
            <button className="suggestion-button" onClick={() => onSuggestion("Which property has the highest occupancy?")}><span>PROPERTIES</span>Which property has the highest occupancy?</button>
          </div>
        </div>
      ) : messages.map((message) => {
        if (message.role !== "user" && message.role !== "assistant") return null;
        const assistant = message.role === "assistant";
        const text = textFromMessage(message);
        const citations = assistant ? citationsFromMessage(message as MessageWithMetadata) : [];
        return (
          <article className={`message-row ${assistant ? "assistant" : "user"}`} key={message.id}>
            <span className={`message-mark ${assistant ? "" : "user-mark"}`} aria-hidden="true">{assistant ? <Bot /> : "SC"}</span>
            <div className="message-content">
              <div className="message-bubble">{text}</div>
              {citations.length > 0 && (
                <div className="citation-list" aria-label="Sources">
                  {citations.map((citation) => citation.url
                    ? <a className="citation-link" key={citation.documentId} href={citation.url} target="_blank" rel="noreferrer"><FileText /><span>{citation.title}</span><ArrowUpRight /></a>
                    : <span className="citation-link" key={citation.documentId}><FileText /><span>{citation.title}</span></span>)}
                </div>
              )}
            </div>
          </article>
        );
      })}
      {busy && <div className="message-row assistant" aria-label="Mogul is responding"><span className="message-mark"><Bot /></span><span className="typing-indicator"><i /><i /><i /></span></div>}
      <div ref={endRef} />
    </div>
  );
}
