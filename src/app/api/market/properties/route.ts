import { NextRequest, NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth/identity";
import { marketProperties } from "@/lib/market-properties";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const search = request.nextUrl.searchParams.get("search")?.trim().slice(0, 80).toLowerCase();
  const state = request.nextUrl.searchParams.get("state")?.trim().toUpperCase();
  const propertyType = request.nextUrl.searchParams.get("type")?.trim().toLowerCase();
  const strategy = request.nextUrl.searchParams.get("strategy")?.trim().toLowerCase();
  const sort = request.nextUrl.searchParams.get("sort") ?? "featured";

  let properties = marketProperties.filter((property) => {
    const matchesSearch = !search || [property.name, property.city, property.state, property.strategy, property.propertyType]
      .some((value) => value.toLowerCase().includes(search));
    return matchesSearch
      && (!state || state === "ALL" || property.state === state)
      && (!propertyType || propertyType === "all" || property.propertyType.toLowerCase() === propertyType)
      && (!strategy || strategy === "all" || property.strategy.toLowerCase() === strategy);
  });

  if (sort === "yield") properties = [...properties].sort((a, b) => b.annualYield - a.annualYield);
  if (sort === "price") properties = [...properties].sort((a, b) => a.price - b.price);

  return NextResponse.json({
    properties,
    source: "illustrative_sample_catalog",
    updatedAt: new Date().toISOString(),
    disclaimer: "All listings and performance figures are fictional examples, not real offerings or investment advice.",
  }, { headers: { "Cache-Control": "private, no-store" } });
}
