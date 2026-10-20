"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ArrowUpRight, Bath, BedDouble, Building2, Check, MapPin, Ruler, X } from "lucide-react";
import type { MarketProperty } from "@/lib/market-properties";

const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

export function PropertyDetailDialog({ property, onClose, onInvest }: {
  property: MarketProperty | null;
  onClose: () => void;
  onInvest: (property: MarketProperty) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (property && dialog && !dialog.open) dialog.showModal();
    if (!property && dialog?.open) dialog.close();
  }, [property]);

  return (
    <dialog ref={dialogRef} className="property-detail-dialog" onClose={onClose} onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}>
      {property && <>
        <header className="property-detail-header"><div><span className="property-detail-eyebrow">{property.strategy} · {property.propertyType}</span><h2>{property.name}</h2><p><MapPin size={14} />{property.city}, {property.state}</p></div><button className="property-dialog-close" aria-label="Close property details" onClick={onClose}><X size={18} /></button></header>
        <div className="property-detail-photos"><Image src={property.imageUrl} alt={`${property.name} property exterior`} width={1200} height={700} unoptimized /><div className="property-photo-note"><Building2 size={14} />Illustrative property photo</div></div>
        <div className="property-detail-metrics"><div><span>Annual yield</span><b>{property.annualYield.toFixed(1)}%</b></div><div><span>Target IRR</span><b>{property.targetIrr.toFixed(1)}%</b></div><div><span>Target profit multiple</span><b>{property.moic.toFixed(1)}x</b></div><div><span>Occupancy</span><b>{Math.round(property.occupancy * 100)}%</b></div></div>
        <div className="property-detail-layout"><section className="property-detail-main"><h3>{property.propertyType} in {property.city}, {property.state}</h3><p className="property-detail-description">{property.description}</p><div className="property-detail-specs"><span><BedDouble size={15} />{property.bedrooms} bedrooms</span><span><Bath size={15} />{property.bathrooms} bathrooms</span><span><Ruler size={15} />{property.squareFeet.toLocaleString()} sq ft</span></div><div className="property-detail-facts"><div><span>Purchase price</span><b>{money(property.price)}</b></div><div><span>Loan-to-value</span><b>{property.loanToValue}%</b></div><div><span>Illustrative monthly rent</span><b>{money(property.monthlyRent)}</b></div><div><span>Target raise</span><b>{money(property.targetRaise)}</b></div></div><h3 className="property-highlights-title">Property highlights</h3><ul className="property-highlights">{property.highlights.map((highlight) => <li key={highlight}><Check size={14} />{highlight}</li>)}</ul></section>
          <aside className="property-invest-panel"><b className="property-invest-name">{property.name}</b><span>{property.city}, {property.state}</span><div className="property-invest-raise"><span>{money(property.amountRaised)} raised</span><b>of {money(property.targetRaise)}</b></div><button className="property-invest-button" disabled={property.status !== "Open"} onClick={() => onInvest(property)}>{property.status === "Open" ? "Invest now" : property.status}<ArrowUpRight size={15} /></button><small>Sample opportunity only. No investment transactions are available in this preview.</small></aside>
        </div>
        <p className="property-detail-disclaimer">Illustrative sample listing and model estimates; not a live offering, verified property record, or investment advice.</p>
      </>}
    </dialog>
  );
}
