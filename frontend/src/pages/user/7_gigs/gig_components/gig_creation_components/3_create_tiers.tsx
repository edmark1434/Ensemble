import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  HelpCircle,
  Sparkles,
  Layers,
  Crown,
  Package,
  Clock,
  RotateCcw,
  Check,
  X,
  FileText,
  Pencil,
  AlertCircle,
  Zap,
  Video,
  Mic,
  Film,
  Palette,
  Coins,
  Loader2,
  PackagePlus,
  FolderArchive,
  Subtitles,
  Volume2,
  Smartphone,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/axios";
import { CreditIcon } from "@/components/ui/credit-icon";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";
import type { GigTier, GigAddOn } from "../../gig_datasets";

interface CreateTiersProps {
  tiers: GigTier[];
  setTiers: React.Dispatch<React.SetStateAction<GigTier[]>>;
  addOns?: GigAddOn[];
  setAddOns?: React.Dispatch<React.SetStateAction<GigAddOn[]>>;
  gigTitle?: string;
  gigDescription?: string;
  gigCategory?: string;
  gigSkills?: string[];
  isTeam?: boolean;
  additionalWorkRate?: number;
  setAdditionalWorkRate?: React.Dispatch<React.SetStateAction<number>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBack: () => void;
  onNext: () => void;
}

const TIER_TEMPLATES: Record<string, { subtitle: string; icon: React.ComponentType<{ className?: string }>; badgeColor: string; borderColor: string }> = {
  Basic: {
    subtitle: "Starter / Essential Package",
    icon: Package,
    badgeColor: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700",
    borderColor: "border-zinc-200 dark:border-zinc-800",
  },
  Standard: {
    subtitle: "Recommended / Core Offering",
    icon: Layers,
    badgeColor: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700",
    borderColor: "border-zinc-200 dark:border-zinc-800",
  },
  Premium: {
    subtitle: "Broadcast / VIP Production",
    icon: Crown,
    badgeColor: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700",
    borderColor: "border-zinc-200 dark:border-zinc-800",
  },
};

const ADDON_PRESETS = [
  {
    title: "Include Project Source Files",
    description: "Organized Premiere Pro / DaVinci project archive & assets",
    price: 100,
    icon: FolderArchive,
  },
  {
    title: "Subtitles & Animated Captions",
    description: "Burned-in kinetic captions and standalone .srt subtitle file",
    price: 35,
    icon: Subtitles,
  },
  {
    title: "Cinematic Color Grading Pass",
    description: "Shot matching, DaVinci LUTs & film grain emulation",
    price: 50,
    icon: Palette,
  },
  {
    title: "Commercial Sound Design & Foley",
    description: "SFX layering, ambient audio sweetening & mastering",
    price: 50,
    icon: Volume2,
  },
  {
    title: "Additional Vertical Cut (9:16)",
    description: "Paced vertical crop export for TikTok, Reels & Shorts",
    price: 60,
    icon: Smartphone,
  },
  {
    title: "Custom Video Thumbnail",
    description: "High-CTR YouTube/social cover graphic (.psd / .png)",
    price: 30,
    icon: ImageIcon,
  },
  {
    title: "Additional Revision Pass",
    description: "One extra round of comprehensive client edit feedback",
    price: 40,
    icon: RotateCcw,
  },
  {
    title: "24-Hour Rush Processing",
    description: "Expedited front-of-queue priority delivery",
    price: 75,
    icon: Zap,
  },
];

const AI_TIER_INSPIRATIONS_ROW_1 = [
  {
    icon: Zap,
    label: "24-Hour Rush Turnaround",
    prompt: "Include a 24-hour rush turnaround priority option for the highest tier, while keeping standard delivery times for the lower tiers.",
  },
  {
    icon: Layers,
    label: "Essential to Master Tiering",
    prompt: "Structure the tiers from a clean rough cut (Basic), to a polished multi-cam edit (Standard), up to a complete broadcast master with sound design (Premium).",
  },
  {
    icon: Video,
    label: "4K Master Delivery",
    prompt: "Include full 4K Ultra-HD 60fps export and uncompressed ProRes archives for the standard and premium packages.",
  },
  {
    icon: Mic,
    label: "Sound Design & Foley",
    prompt: "Include multitrack sound effects, ambient foley design, and commercial broadcast audio leveling across the upper tiers.",
  },
  {
    icon: Sparkles,
    label: "Motion Graphics & Titles",
    prompt: "Add custom kinetic typography, branded lower thirds, and animated intro/outro sequences in the top tier.",
  },
  {
    icon: Film,
    label: "Cinematic Color Grade",
    prompt: "Provide advanced DaVinci Resolve color grading, multi-camera shot matching, and film grain emulation.",
  },
];

const AI_TIER_INSPIRATIONS_ROW_2 = [
  {
    icon: Crown,
    label: "Multi-Platform Aspect Ratios",
    prompt: "Deliver final videos in multiple aspect ratios (16:9 widescreen, 9:16 vertical reels/TikTok, and 1:1 square) in the VIP package.",
  },
  {
    icon: RotateCcw,
    label: "Unlimited Revisions",
    prompt: "Provide unlimited revision passes in the top tier and 2 revision passes on standard tier.",
  },
  {
    icon: Coins,
    label: "Budget-Friendly Starter",
    prompt: "Keep the entry-level basic tier very affordable under 100 Credits for quick, low-complexity edits.",
  },
  {
    icon: Palette,
    label: "Channel Branding Assets",
    prompt: "Include YouTube thumbnail source files, banner cutouts, and chapter markers in the premium package.",
  },
  {
    icon: Package,
    label: "Raw Project Files Archive",
    prompt: "Provide complete organized Premiere Pro / DaVinci Resolve project files and asset archives in the highest tier.",
  },
  {
    icon: Check,
    label: "Commercial Usage Rights",
    prompt: "Include full commercial broadcast rights and perpetual digital advertising licenses across all deliverables.",
  },
];

export const CreateTiers: React.FC<CreateTiersProps> = ({
  tiers,
  setTiers,
  addOns = [],
  setAddOns,
  gigTitle = "",
  gigDescription = "",
  gigCategory = "",
  gigSkills = [],
  isTeam = false,
  errors,
  setErrors,
  onBack,
  onNext,
}) => {
  // Add-ons State Management
  const [localAddOns, setLocalAddOns] = useState<GigAddOn[]>([]);
  const currentAddOns = addOns || localAddOns;
  const dispatchAddOns = setAddOns || setLocalAddOns;

  // Add-on Modal State (Name and Price only)
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [editingAddonIndex, setEditingAddonIndex] = useState<number | null>(null);
  const [modalAddonName, setModalAddonName] = useState("");
  const [modalAddonPrice, setModalAddonPrice] = useState<number>(50);
  const [modalAddonError, setModalAddonError] = useState<string | null>(null);

  const openCreateAddonModal = () => {
    setEditingAddonIndex(null);
    setModalAddonName("");
    setModalAddonPrice(50);
    setModalAddonError(null);
    setIsAddonModalOpen(true);
  };

  const openEditAddonModal = (index: number) => {
    const addon = currentAddOns[index];
    if (!addon) return;
    setEditingAddonIndex(index);
    setModalAddonName(addon.title);
    setModalAddonPrice(addon.price || 50);
    setModalAddonError(null);
    setIsAddonModalOpen(true);
  };

  const handleSaveModalAddon = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = modalAddonName.trim();
    if (!trimmed) {
      setModalAddonError("Please enter an add-on title");
      return;
    }
    if (modalAddonPrice <= 0) {
      setModalAddonError("Price must be at least 1 Credit");
      return;
    }

    if (editingAddonIndex !== null && editingAddonIndex >= 0) {
      const updated = [...currentAddOns];
      updated[editingAddonIndex] = {
        ...updated[editingAddonIndex],
        title: trimmed,
        price: modalAddonPrice,
      };
      dispatchAddOns(updated);
      showSuccessToast(`Updated add-on: ${trimmed}`);
    } else {
      const newAddon: GigAddOn = {
        id: "addon-" + Date.now(),
        title: trimmed,
        price: modalAddonPrice,
      };
      dispatchAddOns([...currentAddOns, newAddon]);
      showSuccessToast(`Added add-on: ${trimmed}`);
    }
    setIsAddonModalOpen(false);
  };

  const handleAddPresetAddOn = (preset: typeof ADDON_PRESETS[0]) => {
    if (currentAddOns.some((a) => a.title.trim().toLowerCase() === preset.title.trim().toLowerCase())) {
      showErrorToast(`"${preset.title}" is already added!`);
      return;
    }
    const newAddon: GigAddOn = {
      id: "addon-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
      title: preset.title,
      description: preset.description,
      price: preset.price,
    };
    dispatchAddOns([...currentAddOns, newAddon]);
    showSuccessToast(`Added add-on: ${preset.title}`);
  };

  const handleRemoveAddOn = (index: number) => {
    const updated = [...currentAddOns];
    updated.splice(index, 1);
    dispatchAddOns(updated);
  };

  const updateAddOn = (index: number, field: keyof GigAddOn, value: any) => {
    const updated = [...currentAddOns];
    updated[index] = { ...updated[index], [field]: value };
    dispatchAddOns(updated);
  };
  // Joed AI Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const [aiTierCount, setAiTierCount] = useState<number>(tiers.length || 3);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Cooldown timer tracking (3 minutes)
  const COOLDOWN_KEY = "ensemble_joed_tiers_cooldown";
  const [aiCooldownLeft, setAiCooldownLeft] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(COOLDOWN_KEY);
      if (stored) {
        const remaining = Math.max(0, Math.ceil((parseInt(stored, 10) - Date.now()) / 1000));
        return remaining;
      }
    } catch {
      // ignore
    }
    return 0;
  });

  useEffect(() => {
    if (aiCooldownLeft <= 0) return;
    const interval = setInterval(() => {
      setAiCooldownLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          try {
            localStorage.removeItem(COOLDOWN_KEY);
          } catch {
            // ignore
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [aiCooldownLeft]);

  const aiPromptWordCount = aiCustomPrompt.trim()
    ? aiCustomPrompt.trim().split(/\s+/).length
    : 0;
  const isGenerateDisabled = isGeneratingAi || aiCooldownLeft > 0;

  // Set number of tiers (1, 2, or 3)
  const handleSetTierCount = (targetCount: number) => {
    const validCount = Math.min(3, Math.max(1, targetCount));
    if (validCount === tiers.length) return;

    if (validCount === 1) {
      // Single tier
      if (tiers.length >= 1) {
        setTiers([
          {
            ...tiers[0],
            tierName: "Standard",
            title: tiers[0].title || "Turnkey Video Production",
            description: tiers[0].description || "Complete full-service edit with sound sync, pacing assembly, color grading, and 4K master delivery.",
          },
        ]);
      } else {
        setTiers([
          {
            tierName: "Standard",
            title: "Turnkey Video Production",
            description: "Complete full-service edit with sound sync, pacing assembly, color grading, and 4K master delivery.",
            daysOfDelivery: 3,
            revisions: 2,
            price: 250,
          },
        ]);
      }
    } else if (validCount === 2) {
      // 2 Tiers: Basic, Standard
      const t0 = tiers[0] || {
        tierName: "Basic",
        title: "Essential Cut & Polish",
        description: "Clean cut, audio leveling, subtitles, and basic color correction for short-form clips.",
        daysOfDelivery: 2,
        revisions: 1,
        price: 150,
      };
      const t1 = tiers[1] || {
        tierName: "Standard",
        title: "Pro Cinematic Delivery",
        description: "Full dynamic editing, custom sound design, animated motion titles, and multi-cam sync.",
        daysOfDelivery: 4,
        revisions: 2,
        price: (t0.price || 150) + 200,
      };
      setTiers([
        { ...t0, tierName: "Basic" },
        { ...t1, tierName: "Standard" },
      ]);
    } else {
      // 3 Tiers: Basic, Standard, Premium
      const t0 = tiers[0] || {
        tierName: "Basic",
        title: "Essential Cut & Polish",
        description: "Clean cut, audio leveling, subtitles, and basic color correction for short-form video projects.",
        daysOfDelivery: 2,
        revisions: 1,
        price: 150,
      };
      const t1 = tiers[1] || {
        tierName: "Standard",
        title: "Pro Cinematic Delivery",
        description: "High-quality output with advanced sound design, color grade, motion graphics, and multi-cam sync.",
        daysOfDelivery: 4,
        revisions: 2,
        price: (t0.price || 150) + 200,
      };
      const t2 = tiers[2] || {
        tierName: "Premium",
        title: "Broadcast Master Package",
        description: "Full end-to-end cinema production, multi-format delivery, custom motion graphics, and rush turnaround.",
        daysOfDelivery: 7,
        revisions: 3,
        price: (t1.price || 350) + 350,
      };
      setTiers([
        { ...t0, tierName: "Basic" },
        { ...t1, tierName: "Standard" },
        { ...t2, tierName: "Premium" },
      ]);
    }
  };

  const updateTier = (index: number, field: keyof GigTier, value: any) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
    clearError(`tier_${index}_${field}`);
  };

  const clearError = (key: string) => {
    setErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  // Generate with Joed AI
  const handleGenerateWithJoed = async () => {
    if (isGeneratingAi || aiCooldownLeft > 0) return;
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const res = await api.post("/api/chat/generate-gig-tiers", {
        tierCount: aiTierCount,
        title: gigTitle,
        description: gigDescription,
        category: gigCategory,
        skills: gigSkills,
        isTeam,
        prompt: aiCustomPrompt.trim(),
      });

      if (res.data?.success && Array.isArray(res.data?.data?.tiers) && res.data.data.tiers.length > 0) {
        setTiers(res.data.data.tiers);
        showSuccessToast(`Joed AI generated ${res.data.data.tiers.length} commercial package tiers!`);
        setIsAiModalOpen(false);

        // Start 3-minute cooldown
        const cooldownExpiry = Date.now() + 180 * 1000;
        try {
          localStorage.setItem(COOLDOWN_KEY, String(cooldownExpiry));
        } catch {
          // ignore
        }
        setAiCooldownLeft(180);
      } else {
        setAiError(res.data?.message || "Joed AI could not generate tiers right now. Please try again.");
      }
    } catch (err: any) {
      console.error("Joed AI tiers generation error:", err);
      setAiError(err.response?.data?.message || "Joed AI is currently unavailable. Please try again.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-6 text-left font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header & AI Trigger Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Pricing Tiers & Packages</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Configure deliverables, delivery turnaround, included revisions, and base prices for your client packages.
          </p>
        </div>

        {/* Generate Tiers with Joed Button (Matching Job Core Specification) */}
        <button
          type="button"
          onClick={() => {
            setAiTierCount(tiers.length || 3);
            setIsAiModalOpen(true);
          }}
          disabled={aiCooldownLeft > 0}
          className={`relative overflow-hidden inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0 ${
            aiCooldownLeft > 0
              ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/40 shadow-blue-500/20 ring-1 ring-white/20 hover:shadow-md hover:shadow-blue-500/30"
          }`}
          title={
            aiCooldownLeft > 0
              ? `Joed AI on cooldown (${Math.floor(aiCooldownLeft / 60)}:${String(aiCooldownLeft % 60).padStart(2, "0")})`
              : "Generate Commercial Tiers with Joed AI"
          }
        >
          {aiCooldownLeft === 0 && (
            <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none animate-shine-gleam" />
          )}
          {aiCooldownLeft > 0 ? (
            <>
              <Clock className="h-3.5 w-3.5 animate-spin text-gray-400 dark:text-zinc-500 shrink-0" />
              <span>Cooldown ({Math.floor(aiCooldownLeft / 60)}:{String(aiCooldownLeft % 60).padStart(2, "0")})</span>
            </>
          ) : (
            <>
              <img src="/ensemble_lg.svg" alt="Ensemble" className="h-3.5 w-3.5 shrink-0 rounded-xs" />
              <span>Generate with Joed AI!</span>
            </>
          )}
        </button>
      </div>

      {/* Tier Structure Selector Header Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
              Package Structure
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Select how many packages to offer buyers ({tiers.length} Active)
            </span>
          </div>
        </div>

        {/* 1, 2, 3 Tier Pills */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xs self-start sm:self-auto">
          {[1, 2, 3].map((count) => {
            const isSelected = tiers.length === count;
            const label = count === 1 ? "1 Tier (Single)" : count === 2 ? "2 Tiers (Standard)" : "3 Tiers (Full Suite)";
            return (
              <button
                key={count}
                type="button"
                onClick={() => handleSetTierCount(count)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                }`}
              >
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tiers Container */}
      <div className="space-y-4">
        <div
          className={`grid gap-4 ${
            tiers.length === 1
              ? "grid-cols-1 max-w-xl mx-auto"
              : tiers.length === 2
              ? "grid-cols-1 lg:grid-cols-2 max-w-4xl mx-auto"
              : "grid-cols-1 xl:grid-cols-3"
          }`}
        >
          <AnimatePresence mode="popLayout">
            {tiers.map((tier, index) => {
              const meta = TIER_TEMPLATES[tier.tierName] || TIER_TEMPLATES.Standard;
              const TierIcon = meta.icon;

              return (
                <motion.div
                  key={`tier-${tier.tierName}-${index}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className={`relative rounded-2xl border bg-white dark:bg-zinc-900/60 p-4 sm:p-5 flex flex-col gap-3.5 shadow-2xs transition-all ${meta.borderColor}`}
                >
                  {/* Card Header: Badge & Tier Index */}
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-zinc-100 dark:border-zinc-800">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5 ${meta.badgeColor}`}>
                      <TierIcon className="h-3.5 w-3.5" />
                      <span>{tier.tierName} Tier</span>
                    </span>

                    <span className="text-[10px] text-zinc-400 font-medium">
                      Tier {index + 1} of {tiers.length}
                    </span>
                  </div>

                  {/* Tier Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Pencil className="h-3 w-3 text-zinc-400" /> Package Title
                      </span>
                      <span className="text-[9px] text-zinc-400 font-normal">
                        {tier.title?.length || 0}/80
                      </span>
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      placeholder={
                        tier.tierName === "Basic"
                          ? "e.g. Essential Cut & Polish"
                          : tier.tierName === "Standard"
                          ? "e.g. Pro Cinematic Delivery"
                          : "e.g. Broadcast Master Suite"
                      }
                      value={tier.title}
                      onChange={(e) => updateTier(index, "title", e.target.value)}
                      className={`w-full rounded-xl border bg-white dark:bg-zinc-800/70 shadow-xs px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none transition-all ${
                        errors[`tier_${index}_title`]
                          ? "border-red-500/50 focus:border-red-500"
                          : "border-gray-200 dark:border-zinc-700 focus:border-blue-500/60"
                      }`}
                    />
                  </div>

                  {/* Description / Deliverable Scope */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3 text-zinc-400" /> Included Scope & Deliverables
                      </span>
                      <span className="text-[9px] text-zinc-400 font-normal">
                        {tier.description?.length || 0}/200
                      </span>
                    </label>
                    <textarea
                      maxLength={200}
                      placeholder={
                        tier.tierName === "Basic"
                          ? "Clean cut, audio sync, subtitles, and basic color correction up to 60s."
                          : tier.tierName === "Standard"
                          ? "Full dynamic editing, custom sound design, motion titles, color grade up to 5 mins."
                          : "Commercial master delivery, multitrack audio, advanced grading, 4K exports & rush priority."
                      }
                      value={tier.description}
                      onChange={(e) => updateTier(index, "description", e.target.value)}
                      className={`w-full h-20 rounded-xl border bg-white dark:bg-zinc-800/70 shadow-xs px-3 py-2 text-xs text-gray-900 dark:text-white outline-none transition-all resize-none leading-relaxed ${
                        errors[`tier_${index}_description`]
                          ? "border-red-500/50 focus:border-red-500"
                          : "border-gray-200 dark:border-zinc-700 focus:border-blue-500/60"
                      }`}
                    />
                  </div>

                  {/* Delivery Turnaround & Revisions Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {/* Delivery (Days) */}
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        <span>Delivery</span>
                      </label>
                      <div className="flex items-center justify-between border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800 p-1 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateTier(index, "daysOfDelivery", Math.max(1, tier.daysOfDelivery - 1))}
                          className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-700 shadow-2xs text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-600 transition cursor-pointer"
                          title="Decrease 1 Day"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-bold text-xs select-none text-gray-900 dark:text-white">
                          {tier.daysOfDelivery} {tier.daysOfDelivery === 1 ? "Day" : "Days"}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateTier(index, "daysOfDelivery", Math.min(30, tier.daysOfDelivery + 1))}
                          className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-700 shadow-2xs text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-600 transition cursor-pointer"
                          title="Increase 1 Day"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Revisions Included */}
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1 flex items-center gap-1">
                        <RotateCcw className="h-3 w-3 text-purple-500" />
                        <span>Revisions</span>
                      </label>
                      <div className="flex items-center justify-between border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800 p-1 shadow-2xs">
                        <button
                          type="button"
                          disabled={tier.revisions <= 0}
                          onClick={() => updateTier(index, "revisions", Math.max(0, tier.revisions - 1))}
                          className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-700 shadow-2xs text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                          title="Decrease Revisions"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-bold text-xs select-none text-gray-900 dark:text-white">
                          {tier.revisions === 0 ? "None" : tier.revisions}
                        </span>
                        <button
                          type="button"
                          disabled={tier.revisions >= 10}
                          onClick={() => updateTier(index, "revisions", Math.min(10, tier.revisions + 1))}
                          className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-700 shadow-2xs text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                          title="Increase Revisions"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Package Price in Credits */}
                  <div className="mt-auto pt-2">
                    <label className="text-[9px] font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1 block">
                      Package Price
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                        <CreditIcon className="h-4 w-4 text-amber-500" />
                      </div>
                      <input
                        type="number"
                        min="5"
                        step="5"
                        value={tier.price || ""}
                        onChange={(e) => updateTier(index, "price", parseInt(e.target.value) || 0)}
                        placeholder="Price in Credits"
                        className={`w-full rounded-xl border bg-white dark:bg-zinc-800/80 shadow-xs pl-9 pr-14 py-2.5 text-sm font-black text-gray-900 dark:text-white outline-none transition-all ${
                          errors[`tier_${index}_price`]
                            ? "border-red-500/50 focus:border-red-500"
                            : "border-gray-200 dark:border-zinc-700 focus:border-blue-500/60"
                        }`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 pointer-events-none">
                        Credits
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Service Add-ons & Extras Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
                <PackagePlus className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
                Service Add-ons & Extras (Optional)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {currentAddOns.length} Active
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Offer optional service extras that buyers can check off during checkout on any package for an extra fixed price.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateAddonModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto hover:border-zinc-300 dark:hover:border-zinc-600"
          >
            <Plus className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Add Custom Add-on</span>
          </button>
        </div>

        {/* Quick Preset Inspirations (Neat Clickable Cards Grid) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Quick Preset Inspirations (Click to add):
            </span>
            <span className="text-[10px] text-zinc-400">
              One-click add to your service
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {ADDON_PRESETS.map((preset, idx) => {
              const isAlreadyAdded = currentAddOns.some(
                (a) => a.title.trim().toLowerCase() === preset.title.trim().toLowerCase()
              );
              const PresetIcon = preset.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAlreadyAdded}
                  onClick={() => handleAddPresetAddOn(preset)}
                  className={`group relative p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 shadow-2xs ${
                    isAlreadyAdded
                      ? "border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-850/60 opacity-60 cursor-not-allowed"
                      : "border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500/60 dark:hover:border-blue-500/50 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 active:scale-[0.98] cursor-pointer"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors">
                        <PresetIcon className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex items-center gap-1 font-black text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/40">
                        <CreditIcon className="h-3 w-3" />
                        <span>+{preset.price}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                        {preset.title}
                      </h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-tight">
                        {preset.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] font-semibold">
                    <span className={isAlreadyAdded ? "text-zinc-400 font-medium" : "text-blue-600 dark:text-blue-400 flex items-center gap-1 font-bold"}>
                      {isAlreadyAdded ? "✓ Added" : "+ Add add-on"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Add-ons List */}
        <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Active Add-ons</span>
              <span className="text-[10px] font-normal text-zinc-400 normal-case">
                ({currentAddOns.length} configured)
              </span>
            </span>
          </div>

          {currentAddOns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {currentAddOns.map((addon, index) => (
                <div
                  key={addon.id || index}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shadow-2xs group hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
                        <PackagePlus className="h-3.5 w-3.5" />
                      </span>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {addon.title}
                      </h4>
                    </div>
                    {addon.description && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate pl-6">
                        {addon.description}
                      </p>
                    )}
                    <div className="pl-6">
                      <span className="text-[10px] font-medium text-zinc-400">
                        Optional buyer check-box on any tier
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 font-black text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200/60 dark:border-blue-800/40">
                      <CreditIcon className="h-3 w-3" />
                      <span>+{addon.price} Cr</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditAddonModal(index)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      title="Edit add-on"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveAddOn(index)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                      title="Remove add-on"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-400 dark:text-zinc-500 flex flex-col items-center justify-center gap-1">
              <PackagePlus className="h-5 w-5 text-zinc-400 opacity-60 mb-0.5" />
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">No add-ons added yet</span>
              <span className="text-[11px] text-zinc-400">Pick a preset above or click "Add Custom Add-on" to create your own.</span>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Custom Add-on Modal (Portaled) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isAddonModalOpen && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsAddonModalOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden z-10 flex flex-col"
                >
                  {/* Header */}
                  <div className="px-6 py-4.5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
                        <PackagePlus className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                          {editingAddonIndex !== null ? "Edit Service Add-on" : "Add Service Add-on"}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                          Specify the add-on name and extra fixed price in Credits.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddonModalOpen(false)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Form Body */}
                  <form onSubmit={handleSaveModalAddon}>
                    <div className="p-6 space-y-4">
                      {/* Add-on Name */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider">
                            Add-on Name / Title:
                          </label>
                          <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                            {modalAddonName.length}/50
                          </span>
                        </div>
                        <input
                          type="text"
                          maxLength={50}
                          autoFocus
                          placeholder="e.g. Include Project Source Files, Vertical Cut (9:16)"
                          value={modalAddonName}
                          onChange={(e) => {
                            setModalAddonName(e.target.value);
                            if (modalAddonError) setModalAddonError(null);
                          }}
                          className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/40 p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition"
                        />
                      </div>

                      {/* Extra Price in Credits */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block">
                          Extra Price (in Credits):
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-zinc-400 pointer-events-none">
                            <CreditIcon className="h-4 w-4" />
                          </span>
                          <input
                            type="number"
                            min={5}
                            max={5000}
                            step={5}
                            value={modalAddonPrice || ""}
                            onChange={(e) => {
                              setModalAddonPrice(Math.max(0, parseInt(e.target.value) || 0));
                              if (modalAddonError) setModalAddonError(null);
                            }}
                            className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/40 pl-10 pr-14 py-2.5 text-sm font-black text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute right-3.5 text-xs font-bold text-zinc-400 pointer-events-none">
                            Credits
                          </span>
                        </div>

                        {/* Quick price presets */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] text-zinc-400 font-medium mr-1">Quick select:</span>
                          {[25, 35, 50, 75, 100, 150].map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => setModalAddonPrice(amount)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                modalAddonPrice === amount
                                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                  : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                              }`}
                            >
                              +{amount} Cr
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Error Banner */}
                      {modalAddonError && (
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{modalAddonError}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3.5 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsAddonModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition cursor-pointer"
                      >
                        {editingAddonIndex !== null ? "Save Changes" : "Add Add-on"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
      
      {/* Actions */}
      <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 font-bold hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs focus:outline-none cursor-pointer"
        >
          Go Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-3 text-xs font-bold transition focus:outline-none shadow-md cursor-pointer"
        >
          Continue to Final Review <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Generate Tiers with Joed AI Modal (Portaled) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isAiModalOpen && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Embedded CSS Keyframes for Infinite Marquee Carousel */}
                <style>{`
                  @keyframes aiMarqueeLeft {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-50%); }
                  }
                  @keyframes aiMarqueeRight {
                    0% { transform: translateX(-50%); }
                    100% { transform: translateX(0%); }
                  }
                  .ai-marquee-left {
                    display: flex;
                    width: max-content;
                    animation: aiMarqueeLeft 38s linear infinite;
                  }
                  .ai-marquee-right {
                    display: flex;
                    width: max-content;
                    animation: aiMarqueeRight 38s linear infinite;
                  }
                  .ai-marquee-left:hover,
                  .ai-marquee-right:hover {
                    animation-play-state: paused;
                  }
                `}</style>

                {/* Full-screen Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !isGeneratingAi && setIsAiModalOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
                >
                  {/* Modal Header */}
                  <div className="px-6 py-4.5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src="/ensemble_lg.svg"
                        alt="Ensemble"
                        className="h-7 w-7 shrink-0 invert dark:invert-0 object-contain"
                      />
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-1.5">
                          <span>Generate Tiers with Joed AI!</span>
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                          Automatically design structured commercial packages tailored to your service.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={() => setIsAiModalOpen(false)}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6 space-y-4 overflow-y-auto">
                    {/* Context Summary Pill */}
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
                        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                        <span>Service Context:</span>
                      </div>
                      <p className="line-clamp-1 italic text-zinc-700 dark:text-zinc-300">
                        "{gigTitle || "Professional Video Production Service"}"
                      </p>
                      <div className="text-[10px] text-zinc-400">
                        Category: {gigCategory || "Video Editing"} • {isTeam ? "Team / Studio" : "Solo Freelancer"}
                      </div>
                    </div>

                    {/* Tier Count Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">
                        Select How Many Tiers to Generate:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map((count) => {
                          const isSelected = aiTierCount === count;
                          return (
                            <button
                              key={count}
                              type="button"
                              onClick={() => setAiTierCount(count)}
                              className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                  : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60"
                              }`}
                            >
                              {count === 1 ? "1 Tier" : count === 2 ? "2 Tiers" : "3 Tiers"}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Optional Custom Instructions Input */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">
                          Custom Focus or Tier Notes (Optional):
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                            {aiPromptWordCount} {aiPromptWordCount === 1 ? "word" : "words"} &bull; {aiCustomPrompt.length}/1000
                          </span>
                        </div>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={aiCustomPrompt}
                        onChange={(e) => {
                          setAiCustomPrompt(e.target.value);
                          if (aiError) setAiError(null);
                        }}
                        placeholder="e.g. Include a 24-hour rush turnaround for the top tier, keep the entry tier under 100 Cr, offer multi-cam sync..."
                        className={`w-full rounded-xl border bg-gray-50/50 dark:bg-zinc-800/40 p-3 text-xs text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-800 placeholder:text-gray-400 dark:placeholder:text-zinc-500 leading-relaxed resize-none font-medium transition-all ${
                          aiError
                            ? "border-red-400 dark:border-red-500/60 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                            : "border-gray-200 dark:border-zinc-700/80 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        }`}
                      />
                    </div>

                    {/* Continuous 2-Row Infinite Marquee Carousel */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Quick Ideas</span>
                          <span className="text-[10px] font-normal text-gray-400 dark:text-zinc-500 normal-case">
                            (Click to autofill)
                          </span>
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                          Hover to pause
                        </span>
                      </div>

                      <div className="relative overflow-hidden py-1 -mx-6 px-6">
                        {/* Gradient edge masks for smooth fade */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none" />
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none" />

                        {/* Row 1 - slides left */}
                        <div className="ai-marquee-left gap-2 mb-2">
                          {[...AI_TIER_INSPIRATIONS_ROW_1, ...AI_TIER_INSPIRATIONS_ROW_1].map((item, idx) => {
                            const IconComp = item.icon;
                            return (
                              <button
                                key={`r1-${item.label}-${idx}`}
                                type="button"
                                onClick={() => {
                                  setAiCustomPrompt(item.prompt);
                                  if (aiError) setAiError(null);
                                }}
                                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 dark:bg-zinc-800/80 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-zinc-700/80 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95"
                              >
                                <IconComp className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-400 group-hover:text-blue-500 transition-colors shrink-0" />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Row 2 - slides right */}
                        <div className="ai-marquee-right gap-2">
                          {[...AI_TIER_INSPIRATIONS_ROW_2, ...AI_TIER_INSPIRATIONS_ROW_2].map((item, idx) => {
                            const IconComp = item.icon;
                            return (
                              <button
                                key={`r2-${item.label}-${idx}`}
                                type="button"
                                onClick={() => {
                                  setAiCustomPrompt(item.prompt);
                                  if (aiError) setAiError(null);
                                }}
                                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 dark:bg-zinc-800/80 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-zinc-700/80 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95"
                              >
                                <IconComp className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-400 group-hover:text-blue-500 transition-colors shrink-0" />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Cooldown notice matching Job Post design */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/70 text-xs text-gray-600 dark:text-zinc-300">
                      <Clock className="h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-400" />
                      <span className="font-medium">
                        {aiCooldownLeft > 0
                          ? `Cooldown active: ${Math.floor(aiCooldownLeft / 60)}:${String(aiCooldownLeft % 60).padStart(2, "0")} remaining.`
                          : "3-minute cooldown applies after generation."}
                      </span>
                    </div>

                    {/* Error display */}
                    {aiError && (
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{aiError}</span>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-3.5 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={() => setIsAiModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={isGenerateDisabled}
                      onClick={handleGenerateWithJoed}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 flex-1 ${
                        !isGenerateDisabled
                          ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
                          : "bg-gray-100 dark:bg-zinc-800/80 text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700/60 cursor-not-allowed opacity-70"
                      }`}
                      title={
                        isGeneratingAi
                          ? "Joed AI is designing your package tiers..."
                          : aiCooldownLeft > 0
                          ? `Cooldown active (${Math.floor(aiCooldownLeft / 60)}:${String(aiCooldownLeft % 60).padStart(2, "0")})`
                          : "Generate Commercial Tiers with Joed AI"
                      }
                    >
                      {isGeneratingAi ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                          <span>Designing Packages with Joed...</span>
                        </>
                      ) : aiCooldownLeft > 0 ? (
                        <>
                          <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500" />
                          <span>
                            Cooldown ({Math.floor(aiCooldownLeft / 60)}:{String(aiCooldownLeft % 60).padStart(2, "0")})
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-white" />
                          <span>Generate {aiTierCount} {aiTierCount === 1 ? "Tier" : "Tiers"} Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export default CreateTiers;
