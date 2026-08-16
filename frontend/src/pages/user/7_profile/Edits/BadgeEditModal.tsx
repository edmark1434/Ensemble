import React, { useState, useEffect } from "react";
import { X, Sparkles, AlertCircle, ArrowUp, ArrowDown, RefreshCw, List, LayoutGrid } from "lucide-react";
import { badgesRegistry } from "@/pages/user/7_profile/Utilities/BadgesRegistry.ts";
import type { BadgeMetadata } from "../Displays/BadgeSideSection_ProfileDisplay.tsx";

interface BadgeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedBadges: BadgeMetadata[];
  currentlyDisplayedBadges: BadgeMetadata[];
  onSave: (selectedBadges: BadgeMetadata[]) => void;
}

export const BadgeEditModal: React.FC<BadgeEditModalProps> = ({
  isOpen,
  onClose,
  unlockedBadges = [],
  currentlyDisplayedBadges = [],
  onSave,
}) => {
  const [selectedBadges, setSelectedBadges] = useState<BadgeMetadata[]>([]);
  const [inventoryMode, setInventoryMode] = useState<"RowList" | "BoxList">("BoxList");

  useEffect(() => {
    if (isOpen) {
      // Strictly limit the initial incoming badges to a maximum of 5 slots
      setSelectedBadges([...currentlyDisplayedBadges].slice(0, 5));
    }
  }, [isOpen, currentlyDisplayedBadges]);

  if (!isOpen) return null;

  const handleToggleBadge = (badge: BadgeMetadata, isUnlocked: boolean) => {
    if (!isUnlocked) return; // Cannot toggle locked badges

    const isSelected = selectedBadges.some((b) => b.id === badge.id);

    if (isSelected) {
      setSelectedBadges(selectedBadges.filter((b) => b.id !== badge.id));
    } else {
      if (selectedBadges.length >= 5) return;
      setSelectedBadges([...selectedBadges, badge]);
    }
  };

  const handleMoveOrder = (index: number, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedBadges.length) return;

    const reorderedList = [...selectedBadges];
    const temporarySwapHolder = reorderedList[index];
    reorderedList[index] = reorderedList[targetIndex];
    reorderedList[targetIndex] = temporarySwapHolder;

    setSelectedBadges(reorderedList);
  };

  const handleResetSelection = () => {
    setSelectedBadges([]);
  };

  const handleSave = () => {
    onSave(selectedBadges);
  };

    const emptySlotsCount = 5 - selectedBadges.length;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-zinc-900/40 dark:bg-black/80 backdrop-blur-md p-4 font-['Plus Jakarta Sans',sans-serif] text-zinc-800 dark:text-zinc-300 select-none animate-fadeIn">
      <div className="relative w-full max-w-5xl rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080a12] p-5 md:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] space-y-5 overflow-hidden max-h-[90vh] flex flex-col transition-colors duration-300">

        {/* Header Segment */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400 filter dark:drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wider uppercase text-zinc-900 dark:text-white">Curate & Arrange Badges</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Select and order your active profile showcase displays.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-white/5 transition duration-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Showcase Status Bar */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 text-[11px] flex-shrink-0">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <AlertCircle className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
            <span>Showcase Matrix Status:</span>
          </div>
          <span className={`font-mono font-bold tracking-wider text-xs ${selectedBadges.length === 5 ? "text-amber-600 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"}`}>
            {selectedBadges.length} <span className="text-[10px] text-zinc-400 dark:text-zinc-500">/</span> 5 Slots Active
          </span>
        </div>

        {/* Split Layout Frame */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 overflow-hidden flex-1 min-h-0">

          {/* LEFT PANEL: Available Inventory */}
          <div className="flex flex-col space-y-2.5 overflow-hidden">
            <div className="flex items-center justify-between flex-shrink-0">
              <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Available Inventory</span>

              <div className="flex items-center gap-2">
                {/* View Mode Switcher Options */}
                <div className="flex items-center border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02] p-0.5 rounded-lg mr-1">
                  <button
                    onClick={() => setInventoryMode("RowList")}
                    className={`p-1 rounded-md transition ${inventoryMode === "RowList" ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm dark:shadow-[0_0_8px_rgba(255,255,255,0.05)]" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
                    title="Display as Row Rows"
                  >
                    <List className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setInventoryMode("BoxList")}
                    className={`p-1 rounded-md transition ${inventoryMode === "BoxList" ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm dark:shadow-[0_0_8px_rgba(255,255,255,0.05)]" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
                    title="Display as Icon Grid Boxes"
                  >
                    <LayoutGrid className="h-3 w-3" />
                  </button>
                </div>

                <button
                  onClick={handleResetSelection}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition bg-zinc-50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/10 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/5 hover:border-red-200 dark:hover:border-red-500/20"
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Clear Selection
                </button>
              </div>
            </div>

            {/* Inventory Container Scroller Grid */}
            <div className="overflow-y-auto pr-1 flex-1 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
              <div className={inventoryMode === "RowList" ? "space-y-2" : "grid grid-cols-5 gap-3 pb-2 animate-fadeIn"}>
                {badgesRegistry.map((b) => {
                  const isUnlocked = unlockedBadges.some(ub => String(ub.id) === String(b.id));
                  const currentSlotIndex = selectedBadges.findIndex((item) => item.id === b.id);
                  const isSelected = currentSlotIndex !== -1;

                  return (
                    <div
                      key={b.id}
                      onClick={() => handleToggleBadge(b, isUnlocked)}
                      className={`group relative hover:z-50 flex items-center border transition-all duration-200 ${
                        inventoryMode === "RowList"
                          ? "gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.01]"
                          : "justify-center rounded-xl bg-zinc-50 dark:bg-white/[0.01] aspect-square p-2"
                      } ${!isUnlocked ? "grayscale cursor-not-allowed border-zinc-200 dark:border-white/5" : (isSelected ? "bg-zinc-100 dark:bg-white/[0.02] cursor-pointer" : "border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/[0.02] cursor-pointer")}`}
                      style={{ borderColor: isSelected ? b.borderColor : undefined }}
                    >
                      {/* Badge Icon Core */}
                      <div
                        className={`bg-white dark:bg-[#121624] border border-zinc-200 dark:border-white/10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          inventoryMode === "RowList" ? "w-11 h-11 p-2" : "w-14 h-14 p-2.5"
                        } ${isUnlocked ? "group-hover:scale-105" : "opacity-50"}`}
                        style={{ boxShadow: isSelected ? `0 0 12px ${b.glowColor}20` : undefined }}
                      >
                        <img src={b.icon} alt={b.name} className="w-full h-full object-contain filter drop-shadow-sm dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                      </div>

                      {/* Row List View Configurations */}
                      {inventoryMode === "RowList" ? (
                        <>
                          <div className={`space-y-0.5 flex-1 min-w-0 ${!isUnlocked ? 'opacity-50' : ''}`}>
                            <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 tracking-wide truncate">
                              {b.name} {!isUnlocked && <span className="ml-2 text-[10px] uppercase font-black text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-500/20">Locked</span>}
                            </h4>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium line-clamp-1 leading-normal">{b.description}</p>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate leading-normal pt-0.5">
                              <span className="text-zinc-500 dark:text-zinc-400/60 font-semibold">Criteria:</span> {b.condition}
                            </p>
                          </div>

                          <div className="flex-shrink-0 pl-1">
                            {isSelected ? (
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black font-mono border shadow-sm dark:shadow-[0_0_8px_rgba(0,0,0,0.3)] bg-white dark:bg-transparent"
                                style={{ borderColor: b.borderColor, color: b.borderColor, backgroundColor: `${b.glowColor}15` }}
                              >
                                {currentSlotIndex + 1}
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-zinc-200 dark:border-white/5 bg-zinc-100 dark:bg-white/[0.02] group-hover:border-zinc-300 dark:group-hover:border-white/20 transition-colors" />
                            )}
                          </div>
                        </>
                      ) : (
                        /* Box Grid Overlay Priority tags */
                        isSelected && (
                          <div
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black font-mono border shadow-sm dark:shadow-md z-10 bg-white dark:bg-[#080a12]"
                            style={{ borderColor: b.borderColor, color: b.borderColor }}
                          >
                            {currentSlotIndex + 1}
                          </div>
                        )
                      )}

                      {/* BoxList Tooltip Layer */}
                      {inventoryMode === "BoxList" && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 p-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#070913] shadow-lg dark:shadow-[0_10px_25px_rgba(0,0,0,0.5)] opacity-0 scale-95 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 z-50 whitespace-nowrap origin-left">
                          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white dark:border-r-[#070913]" />
                          <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-4 border-transparent border-r-zinc-200 dark:border-r-white/10 -z-10" />
                          <h5 className="font-extrabold text-[11px] text-zinc-900 dark:text-white tracking-wide px-1">
                            {b.name}
                            {!isUnlocked && <span className="ml-2 text-red-500 font-bold uppercase">(Locked)</span>}
                          </h5>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Live Display Order Configuration Section */}
          <div className="rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.01] p-4 flex flex-col overflow-hidden h-full">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/5 pb-2.5 flex-shrink-0">
              <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Live Display Order</span>
              <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 px-2 py-0.5 rounded-md">
                {selectedBadges.length} / 5 Active
              </span>
            </div>

            <div className="flex-1 my-3 pr-0.5 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-white/10 scrollbar-track-transparent min-h-0">
              {selectedBadges.map((b, index) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#0b0e17]/90 border border-zinc-200 dark:border-white/5 h-[46px] group/item animate-slideRight shadow-sm dark:shadow-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 w-4 text-center">{index + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-zinc-50 dark:bg-[#121624] p-1 border border-zinc-200 dark:border-white/10 flex-shrink-0">
                      <img src={b.icon} alt={b.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate pr-1">{b.name}</span>
                  </div>

                  <div className="flex items-center gap-0.5 flex-shrink-0 lg:opacity-60 lg:group-hover/item:opacity-100 transition">
                    <button
                      disabled={index === 0}
                      onClick={(e) => handleMoveOrder(index, "up", e)}
                      className="p-1 rounded bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      disabled={index === selectedBadges.length - 1}
                      onClick={(e) => handleMoveOrder(index, "down", e)}
                      className="p-1 rounded bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleToggleBadge(b, true)}
                      className="p-1 rounded text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 ml-0.5 transition"
                      title="Remove badge"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Fixed Empty Slot Array Range Check Wrapper */}
              {[...Array(Math.max(0, emptySlotsCount))].map((_, i) => {
                const globalSlotIndex = selectedBadges.length + i + 1;
                return (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center p-2 rounded-xl border border-dashed border-zinc-300 dark:border-white/5 bg-transparent h-[46px] select-none text-zinc-400 dark:text-zinc-600"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono font-bold opacity-50 dark:opacity-30 w-4 text-center">{globalSlotIndex}</span>
                      <div className="w-7 h-7 rounded-full border border-dashed border-zinc-300 dark:border-white/5 flex items-center justify-center flex-shrink-0 bg-zinc-50 dark:bg-white/[0.005]">
                        <span className="text-[8px] font-mono opacity-50 dark:opacity-25">+</span>
                      </div>
                      <span className="text-[10px] font-medium tracking-wide opacity-50 dark:opacity-25 italic">Empty Slot Asset</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Control Panel */}
            <div className="flex gap-2.5 pt-3 border-t border-zinc-200 dark:border-white/5 flex-shrink-0">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 text-xs font-bold transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-lg shadow-blue-500/30 dark:shadow-blue-600/20 transition duration-200"
              >
                Save Curations
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};