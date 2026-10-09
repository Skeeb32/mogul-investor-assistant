"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { ArrowUp, Paperclip, Square } from "lucide-react";
import { MessageList } from "@/components/message-list";
import { VoiceControls } from "@/components/voice-controls";

type Props = {
  conversationId: string;
  openAiConfigured: boolean;
  canUpload: boolean;
  onConversationUpdate: () => void;
  onUpload: () => void;
  onToast: (message: string) => void;
  promptToSend: string;
  onPromptSent: () => void;
};

function getText(message: UIMessage) {
  return message.parts.filter((part) => part.type === "text").map((part) => part.text).join("");
}

export function ChatPanel({ conversationId, openAiConfigured, canUpload, onConversationUpdate, onUpload, onToast, promptToSend, onPromptSent }: Props) {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioEnabledRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { id, messages, sendMessage, status, stop, setMessages, error, clearError } = useChat({
    id: conversationId,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id: chatId, messages: currentMessages }) => ({
        body: { id: chatId, message: currentMessages[currentMessages.length - 1] },
      }),
    }),
    onFinish: ({ message }) => {
      onConversationUpdate();
      const responseText = getText(message);
      if (responseText && audioEnabledRef.current) void speakText(responseText);
    },
    onError: (chatError) => onToast(chatError.message || "The assistant could not finish that response."),
  });

  useEffect(() => {
    let active = true;
    fetch("/api/conversations/" + encodeURIComponent(id), { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ messages: UIMessage[] }> : null)
      .then((conversation) => {
        if (active && conversation?.messages.length) setMessages(conversation.messages);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [id, setMessages]);

  useEffect(() => () => {
    try { audioSourceRef.current?.stop(); } catch {
      // The source may have ended between render and unmount.
    }
    void audioContextRef.current?.close();
  }, []);

  async function enableAudio() {
    if (!openAiConfigured) {
      onToast("Add OPENAI_API_KEY to enable spoken responses.");
      return;
    }
    try {
      const context = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = context;
      await context.resume();
      audioEnabledRef.current = true;
      setAudioEnabled(true);
      onToast("Spoken responses are on.");
    } catch {
      onToast("Audio could not start in this browser.");
    }
  }

  function toggleAudio() {
    if (audioEnabledRef.current) {
      audioEnabledRef.current = false;
      setAudioEnabled(false);
      stopAudio();
      onToast("Spoken responses are off.");
      return;
    }
    void enableAudio();
  }

  async function speakText(text: string) {
    const context = audioContextRef.current;
    if (!context || !audioEnabledRef.current || !openAiConfigured) return;
    try {
      const response = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 1800) }),
      });
      if (!response.ok) throw new Error("Speech generation failed.");
      const bytes = await response.arrayBuffer();
      const audio = await context.decodeAudioData(bytes);
      const source = context.createBufferSource();
      source.buffer = audio;
      source.connect(context.destination);
      audioSourceRef.current = source;
      source.start();
      source.onended = () => { if (audioSourceRef.current === source) audioSourceRef.current = null; };
    } catch {
      onToast("Spoken audio could not be generated. Your text answer is still available.");
    }
  }

  function stopAudio() {
    try { audioSourceRef.current?.stop(); } catch {
      // The source may have ended before the stop request.
    }
    audioSourceRef.current = null;
  }

  const submitText = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || status !== "ready") return;
    setInput("");
    clearError();
    if (textareaRef.current) textareaRef.current.style.height = "38px";
    await sendMessage({ text: clean });
    onConversationUpdate();
  }, [clearError, onConversationUpdate, sendMessage, status]);

  useEffect(() => {
    if (!promptToSend || status !== "ready") return;
    // This effect bridges a prompt request from the separate context panel into the active chat.
    onPromptSent();
    void submitText(promptToSend);
  }, [onPromptSent, promptToSend, status, submitText]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitText(input);
  }

  function handleInput(value: string) {
    setInput(value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "38px";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }

  const busy = status === "submitted" || status === "streaming";

  return (
    <section className="chat-card" aria-label="Mogul assistant chat">
      <header className="chat-heading">
        <div><h2>Ask Mogul</h2><p>Portfolio answers from your account · property answers from your documents</p></div>
        <span className="assistant-status"><i />{openAiConfigured ? "Ready to help" : "Setup needed"}</span>
      </header>
      <MessageList messages={messages} busy={busy} onSuggestion={(suggestion) => void submitText(suggestion)} />
      {error && <div className="chat-error" role="alert">{error.message}</div>}
      {!openAiConfigured && <div className="chat-error" role="status">The chat is ready once <code>OPENAI_API_KEY</code> is set in your local environment.</div>}
      <div className="composer-wrap">
        <VoiceControls
          audioEnabled={audioEnabled}
          listening={listening}
          onToggleAudio={toggleAudio}
          onListeningChange={setListening}
          onStartListening={stopAudio}
          onTranscript={(transcript) => void submitText(transcript)}
        />
        <form className="composer" onSubmit={submit}>
          {canUpload && <button type="button" className="toolbar-button" title="Upload a property or market document" aria-label="Upload a document" onClick={onUpload}><Paperclip /></button>}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => handleInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submitText(input);
              }
            }}
            placeholder={openAiConfigured ? "Ask about your portfolio, properties, or documents…" : "Set up OpenAI to start a conversation…"}
            aria-label="Message Mogul"
            maxLength={4000}
            rows={1}
            disabled={!openAiConfigured || busy}
          />
          {busy
            ? <button className="send-button" type="button" onClick={stop} aria-label="Stop response"><Square /></button>
            : <button className="send-button" type="submit" disabled={!input.trim() || !openAiConfigured} aria-label="Send message"><ArrowUp /></button>}
        </form>
        <div className="composer-footnote"><span>Mogul can make mistakes. Check important information against the source.</span><span>{input.length}/4000</span></div>
      </div>
    </section>
  );
}
