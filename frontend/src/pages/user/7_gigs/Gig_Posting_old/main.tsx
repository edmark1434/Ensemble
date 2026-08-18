import React, { useState, useMemo } from "react";
import { Plus, Search, Bookmark, Grid3x3, Briefcase } from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useNavigate, useParams } from "react-router-dom";

// Modular Imports
import CategoriesSidebar from "./CategoriesSidebar";
import FilterSidebar from "./FilterSidebar";
import GigCard from "./gig_card";
import GigDetailsView from "./gig_details_view";

const SAMPLE_GIGS = [
  {
    id: "GIG-001",
    title: "Professional Wedding Highlights & Cinematic Color Grading",
    thumbnail: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    seller: "Edmark Talingting",
    rating: 4.9,
    reviews: 124,
    startingPrice: 5500,
    category: "Events",
    slotsAvailable: 3,
    description: "I will provide high-end cinematic post-production for your wedding footage. Includes multi-cam syncing, narrative storytelling, and professional LUT application.",
    tiers: {
      basic: { label: "Highlight Reel", price: 5500, delivery: "3 Days", revisions: 2, features: ["3 Minute Edit", "Color Grading", "Standard Transitions"] },
      standard: { label: "Standard Full Movie", price: 12000, delivery: "7 Days", revisions: 5, features: ["15 Minute Edit", "Multi-cam Sync", "Sound Design", "4K Export"] },
      premium: { label: "Director's Cut Bundle", price: 25000, delivery: "14 Days", revisions: -1, features: ["Unlimited Length", "Raw Footage Org", "Premium Sound Library", "RAW Export"] }
    }
  },
  {
    id: "GIG-002",
    title: "YouTube Intro Animation & Branding Package",
    thumbnail: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80",
    seller: "Jodeci Pacibe",
    rating: 4.5,
    reviews: 33,
    startingPrice: 1200,
    category: "YouTube",
    slotsAvailable: 10,
    description: "Need a high-energy intro for your channel? I specialize in 2D and 3D motion graphics that hook viewers in the first 5 seconds.",
    tiers: {
      basic: { label: "Basic Intro", price: 1200, delivery: "2 Days", revisions: 1, features: ["5 Sec Animation", "1080p", "Logo Provided by You"] },
      standard: { label: "Pro Branding", price: 4500, delivery: "5 Days", revisions: 3, features: ["15 Sec Animation", "Sound Effects", "Source Files"] },
      premium: { label: "Ultimate Creator", price: 8000, delivery: "7 Days", revisions: 5, features: ["Intro + Outro", "Lower Thirds", "4K", "Commercial Use"] }
    }
  },
  {
    id: "GIG-003",
    title: "Corporate Interview Clean-up & Dialogue Leveling",
    thumbnail: "https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&w=600&q=80",
    seller: "Joehanes Lauglaug",
    rating: 5.0,
    reviews: 8,
    startingPrice: 3000,
    category: "Corporate",
    slotsAvailable: 2,
    description: "Clean audio is 50% of the video. I will remove background noise, clicks, and hums from your corporate interviews and balance dialogue levels.",
    tiers: {
      basic: { label: "Single Mic", price: 3000, delivery: "1 Day", revisions: 1, features: ["Noise Removal", "EQ", "Limiting"] },
      standard: { label: "Dual Mic Sync", price: 6000, delivery: "2 Days", revisions: 2, features: ["Matching Levels", "Breath Removal", "De-essing"] },
      premium: { label: "Full Podcast Mix", price: 10000, delivery: "4 Days", revisions: 3, features: ["Music Bed Integration", "Mastering", "Show Notes Markers"] }
    }
  }
];

type TabType = "all" | "saved" | "my-gigs";

const GigMarketplace: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // URL parameter for dynamic routing
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [savedGigs, setSavedGigs] = useState<string[]>([]);

  // Filter States based on your requirements
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    priceSort: null as "inc" | "dec" | null,
    slotsValue: "",
    slotsSort: null as "inc" | "dec" | null,
    minRating: 0,
  });

  // Handle Route Matching for ID
  const selectedGig = useMemo(() => SAMPLE_GIGS.find(g => g.id === id), [id]);

  const toggleSave = (gigId: string) => {
    setSavedGigs(prev =>
      prev.includes(gigId) ? prev.filter(i => i !== gigId) : [...prev, gigId]
    );
  };

  const filteredGigs = useMemo(() => {
    let result = [...SAMPLE_GIGS];

    // Tab Filter
    if (activeTab === "saved") {
      result = result.filter(g => savedGigs.includes(g.id));
    }

    // Category Filter
    if (activeCategory !== "All") {
      result = result.filter(g => g.category === activeCategory);
    }

    // Search Filter
    if (searchQuery) {
      result = result.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Rating Filter
    if (filters.minRating > 0) {
      result = result.filter(g => g.rating >= filters.minRating);
    }

    // Budget Range
    if (filters.minPrice) result = result.filter(g => g.startingPrice >= Number(filters.minPrice));
    if (filters.maxPrice) result = result.filter(g => g.startingPrice <= Number(filters.maxPrice));

    // Budget Sort
    if (filters.priceSort === "inc") result.sort((a, b) => a.startingPrice - b.startingPrice);
    if (filters.priceSort === "dec") result.sort((a, b) => b.startingPrice - a.startingPrice);

    // Slots Filter & Sort
    if (filters.slotsValue) result = result.filter(g => g.slotsAvailable >= Number(filters.slotsValue));
    if (filters.slotsSort === "inc") result.sort((a, b) => a.slotsAvailable - b.slotsAvailable);
    if (filters.slotsSort === "dec") result.sort((a, b) => b.slotsAvailable - a.slotsAvailable);

    return result;
  }, [searchQuery, activeCategory, activeTab, savedGigs, filters]);

    return (
    <div className="w-full min-h-screen bg-dark-base text-white overflow-x-hidden relative">
      <UserHeader pageTitle="Gig Marketplace" credits={1250} />

      <div className="mx-auto max-w-7xl p-6 md:p-8 w-full">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center w-full">
          <button onClick={() => navigate("/gigs/create")} className="shrink-0 flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:scale-105">
            <Plus className="h-4 w-4" /> <span>Post a Gig</span>
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search for services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        <div className="mb-8 flex gap-1 border-b border-white/10">
          {[
            { id: "all", label: "All Gigs", icon: <Grid3x3 className="h-4 w-4" /> },
            { id: "saved", label: "Saved", icon: <Bookmark className="h-4 w-4" /> },
            { id: "my-gigs", label: "My Gig Posts", icon: <Briefcase className="h-4 w-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${activeTab === tab.id ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5" : "text-zinc-400 hover:text-white"}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          <div className="space-y-6 sticky top-24">
            <CategoriesSidebar
              categories={[
                { label: "All", count: SAMPLE_GIGS.length },
                { label: "YouTube", count: 1 },
                { label: "Corporate", count: 1 },
                { label: "Events", count: 1 }
              ]}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
            <FilterSidebar
              filters={filters}
              setters={{
                setMinPrice: (v) => setFilters(f => ({...f, minPrice: v})),
                setMaxPrice: (v) => setFilters(f => ({...f, maxPrice: v})),
                setPriceSort: (v) => setFilters(f => ({...f, priceSort: v})),
                setSlotsValue: (v) => setFilters(f => ({...f, slotsValue: v})),
                setSlotsSort: (v) => setFilters(f => ({...f, slotsSort: v})),
                setMinRating: (v) => setFilters(f => ({...f, minRating: v}))
              }}
              onClear={() => setFilters({ minPrice: "", maxPrice: "", priceSort: null, slotsValue: "", slotsSort: null, minRating: 0 })}
            />
          </div>

          <div className="lg:col-span-3 space-y-4">
            {filteredGigs.map((gig) => (
              <GigCard
                key={gig.id}
                gig={gig}
                isSaved={savedGigs.includes(gig.id)}
                onSave={() => toggleSave(gig.id)}
                onClick={() => navigate(`/gigs/${gig.id}`)}
              />
            ))}
          </div>
        </div>
      </div>

      {selectedGig && <GigDetailsView gig={selectedGig} onClose={() => navigate("/gigs")} />}
    </div>
  );
};

export default GigMarketplace;