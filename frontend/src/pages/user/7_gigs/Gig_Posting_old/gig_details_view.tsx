import React, { useState } from "react";
import { X, Send, Check, Clock, RefreshCcw, Star } from "lucide-react";

interface GigDetailsViewProps {
  gig: any;
  onClose: () => void;
}

const GigDetailsView: React.FC<GigDetailsViewProps> = ({ gig, onClose }) => {
  const [selectedTier, setSelectedTier] = useState<"basic" | "standard" | "premium">("standard");
  const current = gig.tiers[selectedTier];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z- transition-opacity" onClick={onClose} />

      {/* Right Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-1/2 bg-dark-surface border-l border-white/10 z- shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header Image */}
        <div className="relative h-64 shrink-0 bg-dark-base border-b border-white/5">
          <img src={gig.thumbnail} alt="" className="w-full h-full object-cover opacity-60" />
          <button onClick={onClose} className="absolute top-5 left-5 h-10 w-10 flex items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:scale-110">
            <X className="h-5 w-5" />
          </button>
          <div className="absolute inset-0 bg-gradient-to-t from-dark-surface to-transparent" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          <div>
            <h2 className="text-2xl font-bold text-white leading-tight mb-4">{gig.title}</h2>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-white font-bold border border-white/10">
                {gig.seller.charAt(0)}
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-bold text-white">{gig.seller}</p>
                <div className="flex items-center gap-1 text-[11px] text-yellow-500 font-bold">
                  <Star className="h-3 w-3 fill-current" />
                  <span>{gig.rating} ({gig.reviews} Reviews)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Selective Tiers Switcher */}
          <div className="space-y-4">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              {(["basic", "standard", "premium"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTier(t)}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${selectedTier === t ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-black text-white">{current.price.toLocaleString()}</h3>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{current.label}</span>
              </div>

              <div className="flex gap-4 mb-6 text-[11px] font-bold text-zinc-400">
                 <span className="flex items-center gap-1.5"><Clock size={14} className="text-blue-500" /> {current.delivery}</span>
                 <span className="flex items-center gap-1.5"><RefreshCcw size={14} className="text-blue-500" /> {current.revisions} Revisions</span>
              </div>

              <ul className="space-y-3">
                {current.features.map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-xs text-zinc-400">
                    <Check size={14} className="text-blue-500" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-widest text-zinc-500">Service Description</h4>
            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line bg-white/[0.01] border border-white/5 p-4 rounded-xl">
              {gig.description}
            </p>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 border-t border-white/10 bg-dark-surface shrink-0">
          <button className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
            <Send className="h-4 w-4" /> Send Request for {selectedTier.toUpperCase()}
          </button>
          <p className="text-center text-[10px] text-zinc-600 mt-4 uppercase font-bold tracking-widest">Safe & Secure Escrow Protection</p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
      `}</style>
    </>
  );
};

export default GigDetailsView;