"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { DashboardOverview } from "@/components/context-panel";

type Props = { open: boolean; overview: DashboardOverview; onClose: () => void; onComplete: (message: string) => void };

export function DocumentUploader({ open, overview, onClose, onComplete }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState("other");
  const [propertyId, setPropertyId] = useState("");
  const [sourceDate, setSourceDate] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    setError("");
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a PDF, DOCX, HTML, CSV, or text file.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("file", file);
    form.set("title", title || file.name);
    form.set("sourceType", sourceType);
    if (propertyId) form.set("propertyId", propertyId);
    if (sourceDate) form.set("sourceDate", sourceDate);
    if (url) form.set("url", url);

    try {
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const result = await response.json() as { message?: string; error?: string; duplicate?: boolean };
      if (!response.ok) {
        setError(result.error || result.message || "The document could not be indexed.");
        return;
      }
      setFile(null);
      setTitle("");
      setSourceType("other");
      setPropertyId("");
      setSourceDate("");
      setUrl("");
      close();
      onComplete(result.message || "Document indexed.");
    } catch {
      setError("The upload could not be completed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog className="upload-dialog" ref={dialogRef} onClose={onClose} aria-labelledby="upload-title">
      <button type="button" className="dialog-close" onClick={close} aria-label="Close upload dialog"><X size={16} /></button>
      <h2 id="upload-title">Add a property document</h2>
      <p>Files are extracted, split into searchable passages, and stored in your account namespace. Use documents you’re authorized to upload.</p>
      <form onSubmit={submit}>
        <div className="upload-fields">
          <label>Document file<input type="file" accept=".pdf,.docx,.html,.htm,.csv,.txt,application/pdf,text/plain,text/csv,text/html" onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setFile(selected);
            if (!title && selected) setTitle(selected.name.replace(/\.[^.]+$/, ""));
          }} /></label>
          <label>Display title<input type="text" value={title} maxLength={240} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Document type<select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
            <option value="other">Other</option><option value="listing">Listing</option><option value="market_report">Market report</option><option value="lease">Lease</option><option value="contract">Contract</option><option value="investment_memo">Investment memo</option><option value="property_note">Property note</option>
          </select></label>
          <label>Related property<select value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
            <option value="">Account-wide document</option>{overview.holdings.map((holding) => <option key={holding.propertyId} value={holding.propertyId}>{holding.propertyName}</option>)}
          </select></label>
          <div className="upload-row">
            <label>Document date<input type="date" value={sourceDate} onChange={(event) => setSourceDate(event.target.value)} /></label>
            <label>Source link<input type="url" value={url} placeholder="https://…" onChange={(event) => setUrl(event.target.value)} /></label>
          </div>
        </div>
        {error && <div className="sign-in-error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
        <div className="upload-actions"><button type="button" className="quiet-button" onClick={close}>Cancel</button><button className="primary-button" type="submit" disabled={busy}>{busy ? "Indexing…" : "Index document"}</button></div>
      </form>
    </dialog>
  );
}
