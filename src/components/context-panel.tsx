"use client";

import { Building2, FileText, MapPin } from "lucide-react";

export type DashboardOverview = {
  totals: { invested: number; currentValue: number; unrealizedGrowth: number; distributionYtd: number; occupancy: number };
  holdings: Array<{
    investmentId: string;
    propertyId: string;
    propertyName: string;
    city: string;
    state: string;
    assetClass: string;
    amountInvested: number;
    currentValue: number;
    distributionYtd: number;
    occupancy: number;
    imageUrl: string | null;
  }>;
  activity: Array<{ id: string; kind: string; amount: number; description: string; occurredAt: Date | string; propertyName: string | null }>;
  recentDocuments: Array<{ id: string; title: string; sourceType: string; sourceDate: Date | string | null; url: string | null }>;
  markets: string[];
};

function dollars(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function dateLabel(value: Date | string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function ContextPanel({ overview, onAsk }: { overview: DashboardOverview; onAsk: (prompt: string) => void }) {
  const recentDistributions = overview.activity.filter((item) => item.kind === "distribution").slice(0, 3);
  return (
    <aside className="context-column" aria-label="Portfolio context">
      <section className="context-card">
        <div className="context-heading"><h3>Your holdings</h3><span>{overview.holdings.length} properties</span></div>
        {overview.holdings.length === 0 ? <p className="disclosure-note">There are no holdings in this account yet.</p> : overview.holdings.slice(0, 4).map((holding) => (
          <button className="holding-item context-action" key={holding.investmentId} onClick={() => onAsk("Tell me about my investment in " + holding.propertyName + ".")}>
            <span className="holding-swatch"><Building2 /></span>
            <span className="holding-details"><b>{holding.propertyName}</b><small>{holding.city}, {holding.state}</small></span>
            <span className="holding-value">{dollars(holding.currentValue)}<small>{Math.round(holding.occupancy * 1000) / 10}% occupied</small></span>
          </button>
        ))}
        <svg className="mini-chart" viewBox="0 0 220 45" preserveAspectRatio="none" role="img" aria-label="Illustrative portfolio trend"><path d="M0 37 C20 36 24 29 43 31 S66 21 85 25 S109 18 125 19 S144 11 162 15 S181 6 199 8 S211 4 220 2 L220 45 L0 45Z" /></svg>
        <div className="disclosure-note">Sample portfolio trend from demo account data.</div>
      </section>

      <section className="context-card">
        <div className="context-heading"><h3>Recent documents</h3><span>{overview.recentDocuments.length} items</span></div>
        {overview.recentDocuments.length === 0
          ? <p className="disclosure-note">Property reports and notes appear here after indexing.</p>
          : overview.recentDocuments.slice(0, 3).map((document) => (
            <button className="recent-item context-action" key={document.id} onClick={() => onAsk("Summarize the document “" + document.title + "”.")}>
              <span className="recent-icon"><FileText /></span><span className="recent-copy"><b>{document.title}</b><small>{document.sourceType.replaceAll("_", " ")} · {dateLabel(document.sourceDate)}</small></span>
            </button>
          ))}
        <div className="disclosure-note">Document answers include source references when available.</div>
      </section>

      <section className="context-card">
        <div className="context-heading"><h3>Recent distributions</h3><span>ACTIVITY</span></div>
        {recentDistributions.length === 0 ? <p className="disclosure-note">No recent distributions found.</p> : recentDistributions.map((item) => (
          <div className="activity-line" key={item.id}><span>{item.propertyName ?? item.description}</span><b>+{dollars(item.amount)}</b></div>
        ))}
        <div className="activity-line"><span>Total this year</span><b>{dollars(overview.totals.distributionYtd)}</b></div>
        <div className="disclosure-note"><MapPin size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />{overview.markets.join(" · ") || "No active markets"}</div>
      </section>
    </aside>
  );
}

export function MetricSummary({ overview }: { overview: DashboardOverview }) {
  const metrics = [
    { label: "Portfolio value", value: dollars(overview.totals.currentValue), detail: "Across " + overview.holdings.length + " properties", change: overview.totals.unrealizedGrowth >= 0 ? "+" + dollars(overview.totals.unrealizedGrowth) : dollars(overview.totals.unrealizedGrowth) },
    { label: "Total invested", value: dollars(overview.totals.invested), detail: "Current account holdings" },
    { label: "Distributions · YTD", value: dollars(overview.totals.distributionYtd), detail: "From recorded transactions" },
    { label: "Occupancy", value: (overview.totals.occupancy * 100).toFixed(1) + "%", detail: "Average across holdings" },
  ];
  return (
    <section className="metric-grid" aria-label="Portfolio summary">
      {metrics.map((metric) => <article className="metric-card" key={metric.label}>
        <div className="metric-label">{metric.label}{metric.change && <span className="metric-change">{metric.change}</span>}</div>
        <div className="metric-value">{metric.value}</div><div className="metric-sub">{metric.detail}</div>
      </article>)}
    </section>
  );
}
