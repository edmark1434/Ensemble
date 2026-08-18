import React from "react";
import { Star, Clock, Bookmark } from "lucide-react";

interface GigCardProps {
  gig: any;
  isSaved: boolean;
  onSave: () => void;
  onClick: () => void;
}

const GigCard: React.FC<GigCardProps> = ({ gig, isSaved, onSave, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="group flex flex-col md:flex-row gap-6 rounded-2xl border border-white/10 bg-dark-surface/40 p-5 transition-all cursor-pointer hover:border-white/20"
    >
      {/* Left Side: Thumbnail Display Box */}
      <div className="h-40 w-full md:w-64 shrink-0 overflow-hidden rounded-xl bg-dark-surface border border-white/5 relative">
        <img
          src={gig.thumbnail}
          alt=""
          className="h-full w-full object-cover opacity-80 transition-transform group-hover:scale-105 duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Right Side: Detailed Content Layout */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Top Row Badges */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-wrap gap-2">
              <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-green-500/20">
                Open
              </span>
              <span className="bg-white/5 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                {gig.category}
              </span>
            </div>
            {/* Bookmark Indicator */}
            <button
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              className={`transition-colors ${isSaved ? "text-yellow-500" : "text-zinc-600 hover:text-white"}`}
            >
              <Bookmark className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
            </button>
          </div>

          {/* Pricing Row */}
          <div className="text-yellow-500 text-lg font-black mb-1">
            {gig.startingPrice.toLocaleString()}
          </div>

          {/* Title and Scope Copy Block */}
          <h3 className="text-white text-xl font-bold mb-1.5 group-hover:text-blue-400 transition-colors truncate">
            {gig.title}
          </h3>
          <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed mb-3">
            {gig.description}
          </p>
        </div>

        {/* Lower Metadata Row Footer */}
        <div className="mt-2 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] font-bold text-zinc-500 uppercase tracking-widest gap-3">

          {/* Seller Identity - Ratings now integrated under the name */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-[11px] text-white font-bold border border-white/10 overflow-hidden">
              {gig.seller.charAt(0)}
            </div>
            <div className="text-left leading-tight">
              <p className="text-xs font-bold text-zinc-300 normal-case">{gig.seller}</p>
              {/* Rating and Reviews Displayed Under Name */}
              <div className="flex items-center gap-1 text-[10px] text-yellow-500 mt-0.5">
                <Star className="h-2.5 w-2.5 fill-current" />
                <span>{gig.rating}</span>
                <span className="text-zinc-600 font-medium ml-0.5">({gig.reviews} reviews)</span>
              </div>
            </div>
          </div>

          {/* Status Metrics */}
          <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400 tracking-wider">
            <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
              {gig.slotsAvailable} Slots Available
            </span>
            <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
              {gig.reviews} Requests
            </span>
            <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1 text-zinc-500">
              <Clock className="h-3 w-3" /> {gig.tiers.standard.delivery}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GigCard;