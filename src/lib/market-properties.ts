export type MarketProperty = {
  id: string;
  name: string;
  city: string;
  state: string;
  propertyType: string;
  strategy: string;
  status: "Open" | "Coming soon" | "Fully subscribed";
  imageUrl: string;
  price: number;
  minimumInvestment: number;
  targetRaise: number;
  amountRaised: number;
  annualYield: number;
  targetIrr: number;
  moic: number;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  occupancy: number;
  loanToValue: number;
  monthlyRent: number;
  description: string;
  highlights: string[];
};

// Fictional listing data for the preview catalog. These are not available offerings.
export const marketProperties: MarketProperty[] = [
  {
    id: "axelrod-house", name: "The Axelrod", city: "Houston", state: "TX", propertyType: "Single family", strategy: "Cash flow", status: "Open",
    imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85",
    price: 885000, minimumInvestment: 2500, targetRaise: 620000, amountRaised: 487500, annualYield: 8.4, targetIrr: 14.2, moic: 1.9, squareFeet: 3120, bedrooms: 5, bathrooms: 3.5, occupancy: 0.96, loanToValue: 68, monthlyRent: 7850,
    description: "A renovated, income-producing home in a high-demand Houston neighborhood, with a flexible floor plan and a private outdoor living area.",
    highlights: ["Renovated in 2024", "Near major employment centers", "Leased through next spring"],
  },
  {
    id: "the-shiv", name: "The Shiv", city: "Austin", state: "TX", propertyType: "Short-term rental", strategy: "Existing Airbnb", status: "Open",
    imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85",
    price: 1240000, minimumInvestment: 5000, targetRaise: 890000, amountRaised: 618000, annualYield: 9.1, targetIrr: 16.8, moic: 2.1, squareFeet: 2780, bedrooms: 4, bathrooms: 3, occupancy: 0.81, loanToValue: 65, monthlyRent: 11300,
    description: "A design-forward short-stay property near Austin's central districts, modeled with seasonal occupancy and professional management.",
    highlights: ["Furnished and guest-ready", "Professional operator in place", "Multiple revenue channels"],
  },
  {
    id: "wambsgans", name: "The Wambsgans", city: "Ramsey", state: "NJ", propertyType: "Multifamily", strategy: "Modified sale leaseback", status: "Coming soon",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
    price: 1760000, minimumInvestment: 10000, targetRaise: 1280000, amountRaised: 0, annualYield: 7.2, targetIrr: 12.7, moic: 1.7, squareFeet: 4960, bedrooms: 8, bathrooms: 5, occupancy: 0.92, loanToValue: 70, monthlyRent: 16400,
    description: "A suburban residential property with a planned leaseback period and a mix of long-term rental demand drivers.",
    highlights: ["Transit-connected location", "Diversified unit mix", "Offering materials in preparation"],
  },
  {
    id: "logan", name: "The Logan", city: "Atlanta", state: "GA", propertyType: "Single family", strategy: "Cash flowing", status: "Open",
    imageUrl: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=85",
    price: 742000, minimumInvestment: 2500, targetRaise: 520000, amountRaised: 394000, annualYield: 8.8, targetIrr: 15.4, moic: 2.0, squareFeet: 2910, bedrooms: 4, bathrooms: 3, occupancy: 0.98, loanToValue: 67, monthlyRent: 6940,
    description: "A stabilized Atlanta home with updated interiors, a fenced yard, and access to several growing employment corridors.",
    highlights: ["Current lease in place", "Recent capital improvements", "Walkable neighborhood amenities"],
  },
  {
    id: "kendall", name: "The Kendall", city: "Phoenix", state: "AZ", propertyType: "Single family", strategy: "High growth", status: "Open",
    imageUrl: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=85",
    price: 968000, minimumInvestment: 5000, targetRaise: 700000, amountRaised: 452000, annualYield: 7.6, targetIrr: 17.1, moic: 2.2, squareFeet: 3380, bedrooms: 5, bathrooms: 3, occupancy: 0.89, loanToValue: 69, monthlyRent: 8200,
    description: "A pool home in a fast-growing Phoenix submarket, with a rental plan that balances current income and long-term value creation.",
    highlights: ["Population growth corridor", "Pool and outdoor amenities", "Value-add plan under review"],
  },
  {
    id: "roman", name: "The Roman", city: "Brooklyn", state: "NY", propertyType: "Multifamily", strategy: "Cash flowing", status: "Fully subscribed",
    imageUrl: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85",
    price: 2380000, minimumInvestment: 10000, targetRaise: 1680000, amountRaised: 1680000, annualYield: 6.9, targetIrr: 13.3, moic: 1.8, squareFeet: 5620, bedrooms: 12, bathrooms: 8, occupancy: 0.95, loanToValue: 64, monthlyRent: 22100,
    description: "A renovated multifamily residence with multiple income streams in an established Brooklyn rental market.",
    highlights: ["Fully subscribed in preview", "Recent building systems upgrade", "Long-term rental demand"],
  },
];
