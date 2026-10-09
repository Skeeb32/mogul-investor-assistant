"use client";

import { useRef, useState } from "react";
import { Mic, MicOff, Waves } from "lucide-react";

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => Recognition;
type SpeechWindow = Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };

type Props = {
  audioEnabled: boolean;
  listening: boolean;
  onToggleAudio: () => void;
  onListeningChange: (listening: boolean) => void;
  onStartListening: () => void;
  onTranscript: (text: string) => void;
};

export function VoiceControls({ audioEnabled, listening, onToggleAudio, onListeningChange, onStartListening, onTranscript }: Props) {
  const recognitionRef = useRef<Recognition | null>(null);
  const handsFreeRef = useRef(false);
  const shouldListenRef = useRef(false);
  const finalTextRef = useRef("");
  const [handsFree, setHandsFree] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  function constructorForBrowser() {
    const speechWindow = window as SpeechWindow;
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
  }

  function createRecognition() {
    const Constructor = constructorForBrowser();
    if (!Constructor) {
      setVoiceError("Voice input is not available in this browser.");
      return null;
    }
    const recognition = new Constructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const segments: string[] = [];
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) segments.push(result[0].transcript);
        else interim += result[0].transcript;
      }
      finalTextRef.current = (finalTextRef.current + " " + segments.join(" ")).trim();
      if (finalTextRef.current || interim) setVoiceError("");
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed") setVoiceError("Allow microphone access in your browser to use voice input.");
      else if (event.error !== "no-speech" && event.error !== "aborted") setVoiceError("Voice input stopped. Try the microphone again.");
      if (event.error === "not-allowed") {
        shouldListenRef.current = false;
        onListeningChange(false);
      }
    };
    recognition.onend = () => {
      const transcript = finalTextRef.current.trim();
      finalTextRef.current = "";
      onListeningChange(false);
      if (transcript) onTranscript(transcript);
      if (shouldListenRef.current && handsFreeRef.current) {
        window.setTimeout(() => startRecognition(true), 260);
      }
    };
    recognitionRef.current = recognition;
    return recognition;
  }

  function startRecognition(keepListening: boolean) {
    if (!recognitionRef.current && !createRecognition()) return;
    shouldListenRef.current = keepListening || handsFreeRef.current;
    onStartListening();
    onListeningChange(true);
    setVoiceError("");
    try {
      recognitionRef.current?.start();
    } catch {
      // A second start can race the browser's previous onend event.
    }
  }

  function stopRecognition() {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
  }

  function toggleHandsFree() {
    const enabled = !handsFreeRef.current;
    handsFreeRef.current = enabled;
    setHandsFree(enabled);
    if (enabled) startRecognition(true);
    else stopRecognition();
  }

  return (
    <div className="voice-toolbar">
      <button className={`toolbar-button ${audioEnabled ? "enabled" : ""}`} type="button" onClick={onToggleAudio} aria-pressed={audioEnabled} title={audioEnabled ? "Turn spoken assistant responses off" : "Enable spoken assistant responses"}>
        <Waves />{audioEnabled ? "Audio on" : "Enable audio"}
      </button>
      <button
        className={`toolbar-button mic-button ${listening ? "enabled" : ""}`}
        type="button"
        onPointerDown={(event) => { if (!handsFreeRef.current) { event.preventDefault(); startRecognition(false); } }}
        onPointerUp={() => { if (!handsFreeRef.current) stopRecognition(); }}
        onPointerCancel={() => { if (!handsFreeRef.current) stopRecognition(); }}
        onKeyDown={(event) => { if ((event.key === " " || event.key === "Enter") && !handsFreeRef.current) startRecognition(false); }}
        onKeyUp={(event) => { if ((event.key === " " || event.key === "Enter") && !handsFreeRef.current) stopRecognition(); }}
        aria-label={handsFree ? "Stop microphone" : "Hold to talk"}
        title={handsFree ? "Stop listening" : "Hold to talk"}
      >{listening ? <Mic /> : <MicOff />}{listening ? "Listening…" : "Hold to talk"}</button>
      <button className={`toolbar-button ${handsFree ? "enabled" : ""}`} type="button" onClick={toggleHandsFree} aria-pressed={handsFree} title="Listen continuously and send each spoken question">
        <span aria-hidden="true">{handsFree ? "●" : "○"}</span>Hands-free
      </button>
      <span className="toolbar-spacer" />
      {voiceError && <span className="voice-hint" role="status">{voiceError}</span>}
      {!voiceError && listening && <span className="voice-hint" aria-live="polite">Listening for speech. Starting the mic interrupts audio.</span>}
    </div>
  );
}
