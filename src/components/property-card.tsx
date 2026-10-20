"use client";

import Image from "next/image";
import { Bath, BedDouble, Heart, MapPin, Ruler } from "lucide-react";
import { useState } from "react";
import type { MarketProperty } from "@/lib/market-properties";

const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

export function PropertyCard({ property, onDetails, onInvest }: {
  property: MarketProperty;
  onDetails: (property: MarketProperty) => void;
  onInvest: (property: MarketProperty) => void;
}) {
  const [favorite, setFavorite] = useState(false);
  const funding = Math.min(100, Math.round(property.amountRaised / property.targetRaise * 100));

  return (
    <article className="market-property-card">
      <div className="market-property-image-wrap">
        <Image className="market-property-image" src={property.imageUrl} alt={`${property.propertyType} investment property in ${property.city}, ${property.state}`} width={720} height={480} unoptimized />
        <span className="property-strategy-pill">{property.strategy}</span>
        <button className={`property-favorite ${favorite ? "is-favorite" : ""}`} type="button" aria-label={favorite ? `Remove ${property.name} from saved properties` : `Save ${property.name}`} aria-pressed={favorite} onClick={() => setFavorite((saved) => !saved)}><Heart size={16} fill={favorite ? "currentColor" : "none"} /></button>
        <span className={`property-status status-${property.status.toLowerCase().replaceAll(" ", "-")}`}>{property.status}</span>
      </div>
      <div className="market-property-body">
        <div className="market-property-title-row">
          <div><button className="market-property-title" onClick={() => onDetails(property)}>{property.name}</button><p className="market-property-location"><MapPin size={12} />{property.city}, {property.state}</p></div>
          <div className="market-property-minimum">Min. {money(property.minimumInvestment)}</div>
        </div>
        <div className="market-property-specs" aria-label="Property details">
          <span><BedDouble size={13} />{property.bedrooms} beds</span><span><Bath size={13} />{property.bathrooms} baths</span><span><Ruler size={13} />{property.squareFeet.toLocaleString()} sq ft</span>
        </div>
        <div className="property-funding"><div className="property-funding-label"><span>{money(property.amountRaised)} raised</span><span>{funding}% of {money(property.targetRaise)}</span></div><div className="property-progress" role="progressbar" aria-label={`${property.name} funding progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={funding}><span style={{ width: `${funding}%` }} /></div></div>
        <div className="property-card-metrics"><div><b>{property.annualYield.toFixed(1)}%</b><span>Annual yield</span></div><div><b>{property.targetIrr.toFixed(1)}%</b><span>Target IRR</span></div><div><b>{property.moic.toFixed(1)}x</b><span>Target MOIC</span></div></div>
        <div className="market-property-actions"><button className="property-invest-button" disabled={property.status !== "Open"} onClick={() => onInvest(property)}>{property.status === "Open" ? "Invest now" : property.status}</button><button className="property-learn-button" onClick={() => onDetails(property)}>Learn more <span aria-hidden="true">›</span></button></div>
      </div>
    </article>
  );
}
