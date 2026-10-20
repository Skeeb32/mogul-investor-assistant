"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownWideNarrow, Building2, ChevronDown, Filter, Search, SlidersHorizontal } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { PropertyDetailDialog } from "@/components/property-detail-dialog";
import type { MarketProperty } from "@/lib/market-properties";

type CatalogResponse = { properties: MarketProperty[]; source: string; disclaimer: string };

export function PropertyMarket({ onToast }: { onToast: (message: string) => void }) {
  const [properties, setProperties] = useState<MarketProperty[]>([]);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("ALL");
  const [type, setType] = useState("all");
  const [strategy, setStrategy] = useState("all");
  const [sort, setSort] = useState("featured");
  const [selected, setSelected] = useState<MarketProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const query = useMemo(() => new URLSearchParams({ search, state, type, strategy, sort }).toString(), [search, state, type, strategy, sort]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      fetch(`/api/market/properties?${query}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(response.status === 401 ? "Sign in to view property listings." : "The property catalog could not be loaded.");
          return await response.json() as CatalogResponse;
        })
        .then((data) => setProperties(data.properties))
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === "AbortError") return;
          setError(reason instanceof Error ? reason.message : "The property catalog could not be loaded.");
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, search ? 220 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, reloadKey, search]);

  const openCount = properties.filter((property) => property.status === "Open").length;

  return (
    <section className="property-market" aria-labelledby="property-market-title">
      <div className="property-market-heading">
        <div><div className="eyebrow">MOGUL PROPERTY MARKET <span className="demo-chip"><i />SAMPLE LISTINGS</span></div><h1 id="property-market-title">Find your next investment.</h1><p>Explore residential opportunities across growing U.S. markets.</p></div>
        <div className="property-market-count"><span className="property-market-count-icon"><Building2 size={17} /></span><span><b>{loading ? "—" : properties.length}</b><small>sample properties</small></span></div>
      </div>
      <div className="property-catalog-note"><span className="property-catalog-dot" /><span>Preview catalog</span><b>Fictional listings and modeled returns</b><span className="property-catalog-separator">·</span><span>{openCount} currently open</span></div>
      <div className="property-filter-bar">
        <label className="property-search"><Search size={16} /><span className="sr-only">Search properties</span><input type="search" placeholder="Search by property or market" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="property-select"><Filter size={14} /><span className="sr-only">Filter by state</span><select value={state} onChange={(event) => setState(event.target.value)}><option value="ALL">All states</option><option value="AZ">Arizona</option><option value="GA">Georgia</option><option value="NJ">New Jersey</option><option value="NY">New York</option><option value="TX">Texas</option></select><ChevronDown size={13} /></label>
        <label className="property-select property-type-select"><Building2 size={14} /><span className="sr-only">Filter by property type</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">All property types</option><option value="single family">Single family</option><option value="multifamily">Multifamily</option><option value="short-term rental">Short-term rental</option></select><ChevronDown size={13} /></label>
        <label className="property-select property-strategy-select"><SlidersHorizontal size={14} /><span className="sr-only">Filter by strategy</span><select value={strategy} onChange={(event) => setStrategy(event.target.value)}><option value="all">All strategies</option><option value="cash flow">Cash flow</option><option value="cash flowing">Cash flowing</option><option value="existing airbnb">Existing Airbnb</option><option value="high growth">High growth</option><option value="modified sale leaseback">Modified sale leaseback</option></select><ChevronDown size={13} /></label>
        <label className="property-select property-sort-select"><ArrowDownWideNarrow size={14} /><span className="sr-only">Sort properties</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="yield">Highest yield</option><option value="price">Lowest price</option></select><ChevronDown size={13} /></label>
      </div>
      {error && <div className="property-catalog-error" role="alert"><span>{error}</span><button onClick={() => setReloadKey((value) => value + 1)}>Try again</button></div>}
      {loading ? <div className="market-property-grid" aria-busy="true" aria-label="Loading investment properties">{Array.from({ length: 6 }, (_, index) => <div className="market-property-skeleton" key={index}><div /><span /><span /><span /></div>)}</div>
        : properties.length === 0 ? <div className="property-empty-state"><Building2 size={24} /><h2>No properties match these filters</h2><p>Try another state, property type, or search term.</p><button onClick={() => { setSearch(""); setState("ALL"); setType("all"); setStrategy("all"); }}>Clear filters</button></div>
          : <div className="market-property-grid">{properties.map((property) => <PropertyCard key={property.id} property={property} onDetails={setSelected} onInvest={(item) => onToast(`${item.name} is a sample listing. Investment transactions are not enabled.`)} />)}</div>}
      <p className="property-market-disclaimer">Returns, rental income, funding totals, and occupancy are fictional examples for interface preview only. They are not verified market data or a promise of performance.</p>
      <PropertyDetailDialog property={selected} onClose={() => setSelected(null)} onInvest={(item) => onToast(`${item.name} is a sample listing. Investment transactions are not enabled.`)} />
    </section>
  );
}
