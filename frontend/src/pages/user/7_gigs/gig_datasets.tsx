import { sampleCategories } from "../6_job_market/job_datasets";

export type QuestionnaireType = "fill-in-blank" | "file-upload" | "multiple-choice";

export interface Questionnaire {
  id?: string;
  type: QuestionnaireType | string;
  question: string;
  required?: boolean;
  isRequired?: boolean;
  limit?: number; // for multiple choice
  multipleAnswer?: boolean;
  allowMultiple?: boolean;
  options?: string[]; // for multiple choice
  fileTypes?: string[]; // "image", "document", "video" etc
  fileLimit?: number;
}

export interface GigTier {
  tierId?: string;
  title: string;
  tierName: string;
  description: string;
  daysOfDelivery: number;
  revisions: number;
  price: number;
}

export interface GigAddOn {
  id?: string;
  title: string;
  description?: string;
  price: number;
  deliveryDays?: number;
}

export interface Milestone {
  id?: string;
  name: string;
  description: string;
  tasks?: (string | { title?: string; task?: string; description?: string })[];
}

export interface Gig {
  id: string;
  client_account_id?: string;
  creator_account_id?: string;
  postedBy: string;
  clientAvatar?: string;
  title: string;
  description: string;
  category: string;
  status?: string;
  hasPendingOrder?: boolean;
  pendingOrderId?: string;
  slots: number;
  termsOfService: string;
  skills: string[];
  firstDraftDelivery: string;
  thumbnail: string;
  gallery: string[];
  milestones: Milestone[];
  tiers: GigTier[];
  addOns?: GigAddOn[];
  additionalWorkRate: number;
  questionnaires: Questionnaire[];
  reviews?: {
    ratingId: string;
    stars: number;
    feedback: string;
    createdAt: string;
    reviewerName: string;
    reviewerAvatar?: string;
  }[];

  // UI & Ranking helpers
  postedAt: string;
  timeAgo: string;
  clientRating: number;
  ratingCount: number;
  isSaved: boolean;
  isOwnGig: boolean;
  canManageGig?: boolean;
  isPersonalGig?: boolean;
  savesCount?: number;
  ordersCount?: number;
  pendingOrdersCount?: number;
  freelancerAccountId?: string;
  team_id?: string | null;
  teamId?: string | null;
  team_visibility?: "Public" | "Private" | string | null;
  teamVisibility?: "Public" | "Private" | string | null;
  is_team?: boolean;
  isTeam?: boolean;
}

const daysAgoIso = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

export const sampleGigs: Gig[] = [
  // =========================================================================
  // ARCHETYPE A: HIGH-EFFORT NEWCOMERS ("Rising Creators" — 0 reviews, 100% complete, fresh)
  // =========================================================================
  {
    id: "gig-rising-docu-01",
    postedBy: "Kenji Takahashi",
    clientAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    title: "4K YouTube Documentary & Video Essay Editing with 3D Motion Maps",
    description:
      "I craft high-retention investigative documentaries and deep-dive video essays inspired by Johnny Harris, Vox, and Lemmino. Every timeline includes custom GeoLayers 3D map animations, newspaper highlight callouts, archival B-roll pacing, and broadcast-level sound design.",
    category: "YouTube",
    status: "Open",
    slots: 6,
    ordersCount: 0,
    pendingOrdersCount: 0,
    clientRating: 0,
    ratingCount: 0,
    savesCount: 9,
    postedAt: daysAgoIso(1),
    timeAgo: "1d ago",
    isSaved: false,
    isOwnGig: false,
    firstDraftDelivery: "3 Days",
    additionalWorkRate: 20,
    termsOfService:
      "1. Voiceover track and script must be finalized prior to Milestone 1.\n2. All custom After Effects map comps and Premiere project files are included in Standard and Premium tiers.",
    skills: ["Documentary", "After Effects", "GeoLayers", "Premiere Pro", "Sound Design"],
    thumbnail: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=900&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80"
    ],
    milestones: [
      { name: "Phase 1: Script Breakdown & Animatic", description: "Audio sync, pacing assembly, and map storyboard markers." },
      { name: "Phase 2: Motion Graphics & Archival B-Roll", description: "Custom 3D map flyovers, kinetic text, and SFX layering." },
      { name: "Phase 3: Color Grade & Final 4K Master", description: "Rec.709 film look and -14 LUFS YouTube audio master." }
    ],
    tiers: [
      { tierName: "Basic", title: "Chapter Hook & Intro (3 Min)", description: "High-retention 3-minute documentary hook with 2 custom motion graphics.", price: 650, daysOfDelivery: 3, revisions: 2 },
      { tierName: "Standard", title: "Full Video Essay (10-12 Min)", description: "Complete 12-min documentary edit with 3D maps, B-roll, and sound design.", price: 1650, daysOfDelivery: 6, revisions: 3 },
      { tierName: "Premium", title: "Feature Investigation (20+ Min)", description: "20+ min investigative film + project files + 3 vertical teaser shorts.", price: 3100, daysOfDelivery: 10, revisions: 5 }
    ],
    questionnaires: [
      { type: "text", question: "Share a link to your recorded voiceover and script.", isRequired: true },
      { type: "text", question: "What visual style or reference channel should we match?", isRequired: true }
    ]
  },
  {
    id: "gig-rising-saas-02",
    postedBy: "Elena Rostova",
    clientAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80",
    title: "Bespoke SaaS Product Launch Trailers & UI Motion Graphics",
    description:
      "Turn your software or AI product into a high-converting Apple/Linear-style launch video. I recreate your UI in vector layers inside After Effects for buttery-smooth 60fps cursor animations, 3D glassmorphic cards, and synced kinetic typography.",
    category: "Corporate",
    status: "Open",
    slots: 5,
    ordersCount: 1,
    pendingOrdersCount: 0,
    clientRating: 0,
    ratingCount: 0,
    savesCount: 14,
    postedAt: daysAgoIso(2),
    timeAgo: "2d ago",
    isSaved: false,
    isOwnGig: false,
    firstDraftDelivery: "2 Days",
    additionalWorkRate: 15,
    termsOfService:
      "1. Brand guidelines (SVG logos, fonts, hex palette) must be provided before kickoff.\n2. Delivered in 4K 60fps MP4 and ProRes 422.",
    skills: ["After Effects", "Motion Graphics", "SaaS Promo", "UI Animation", "Sound Design"],
    thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80"
    ],
    milestones: [
      { name: "Phase 1: Storyboard & Styleframes", description: "Visual moodboard and key UI screen layouts." },
      { name: "Phase 2: UI Motion & Kinetic Typography", description: "Full 60fps animation pass with camera rigs." },
      { name: "Phase 3: Sound FX & Multi-Aspect Delivery", description: "Tactile UI clicks, whooshes, and 16:9 + 1:1 renders." }
    ],
    tiers: [
      { tierName: "Basic", title: "Feature Spotlight (30s)", description: "30-second UI motion teaser for Product Hunt or X/Twitter.", price: 800, daysOfDelivery: 3, revisions: 2 },
      { tierName: "Standard", title: "Full Launch Trailer (60s)", description: "60-second flagship SaaS launch trailer with custom sound design.", price: 1800, daysOfDelivery: 6, revisions: 3 },
      { tierName: "Premium", title: "Launch Suite + AE Source (90s)", description: "90-second launch film + 3 social cutdowns + After Effects source files.", price: 3200, daysOfDelivery: 10, revisions: 5 }
    ],
    questionnaires: [
      { type: "text", question: "Provide your product URL or Figma link.", isRequired: true }
    ]
  },

  // =========================================================================
  // ARCHETYPE B: PROVEN VETERANS (AVAILABLE — High ratings + open slots)
  // =========================================================================
  {
    id: "gig-veteran-wedding-03",
    postedBy: "Marco Vance",
    clientAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
    title: "Cinematic 4K Wedding Highlight Film & S-Log3 Color Grading",
    description:
      "With over 60 luxury weddings edited, I weave multi-camera ceremony vows, speeches, and candid moments into an emotional narrative film. Includes bespoke DaVinci Resolve film emulation grading, 32-bit audio mastering, and licensed music pacing.",
    category: "Events",
    status: "Open",
    slots: 5,
    ordersCount: 24,
    pendingOrdersCount: 1,
    clientRating: 4.9,
    ratingCount: 18,
    savesCount: 31,
    postedAt: daysAgoIso(28),
    timeAgo: "28d ago",
    isSaved: false,
    isOwnGig: false,
    firstDraftDelivery: "4 Days",
    additionalWorkRate: 20,
    termsOfService:
      "1. Proxy or S-Log3/C-Log footage must be uploaded via cloud drive.\n2. Up to 3 rounds of timeline revisions included.",
    skills: ["Wedding Video", "DaVinci Resolve", "Color Grading", "Multi-Cam", "Audio Mastering"],
    thumbnail: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80"
    ],
    milestones: [
      { name: "Phase 1: Multi-Cam Sync & Vow Selection", description: "Syncing all camera angles and selecting emotional speech arcs." },
      { name: "Phase 2: Narrative Cut & Music Pacing", description: "Full highlight timeline assembly." },
      { name: "Phase 3: DaVinci Resolve Grade & 4K Export", description: "Skin-tone matching, film grain, and final delivery." }
    ],
    tiers: [
      { tierName: "Basic", title: "60s Social Teaser Trailer", description: "Vertical + horizontal 60-second cinematic wedding trailer.", price: 950, daysOfDelivery: 4, revisions: 2 },
      { tierName: "Standard", title: "6-8 Min Highlight Film", description: "Signature narrative wedding film with S-Log3 color grading.", price: 2600, daysOfDelivery: 8, revisions: 3 },
      { tierName: "Premium", title: "Full Documentary + Highlight", description: "8-min highlight + 30-min ceremony/speeches edit + raw project.", price: 4800, daysOfDelivery: 14, revisions: 5 }
    ],
    questionnaires: [
      { type: "text", question: "What camera profile (S-Log3, C-Log, Rec.709) was used?", isRequired: true }
    ]
  },

  // =========================================================================
  // ARCHETYPE C: PROVEN VETERAN (BUSY QUEUE — 5.0★ rating, but 5/5 slots full)
  // =========================================================================
  {
    id: "gig-veteran-busy-shorts-04",
    postedBy: "Chloe Jenkins",
    clientAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80",
    title: "Viral TikTok, IG Reels & YouTube Shorts Retention Batch",
    description:
      "High-velocity short-form editing built around 3-second hook retention, kinetic word-by-word captions, custom sound effects, and B-roll cutaways. Trusted by top creators and podcasters.",
    category: "Social",
    status: "Open",
    slots: 5,
    ordersCount: 32,
    pendingOrdersCount: 5, // Full queue -> availability score drops so open creators rank higher!
    clientRating: 5.0,
    ratingCount: 15,
    savesCount: 42,
    postedAt: daysAgoIso(45),
    timeAgo: "45d ago",
    isSaved: false,
    isOwnGig: false,
    firstDraftDelivery: "2 Days",
    additionalWorkRate: 25,
    termsOfService:
      "1. Raw talking-head or podcast timestamps required before starting.\n2. Delivered in 1080x1920 60fps.",
    skills: ["Short-Form", "TikTok", "Reels", "Kinetic Typography", "Premiere Pro"],
    thumbnail: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=900&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=900&q=80"
    ],
    milestones: [
      { name: "Phase 1: Hook Selection & Rough Trim", description: "Cutting dead air and locking the first 3 seconds." },
      { name: "Phase 2: Kinetic Captions & SFX Master", description: "Animated subtitles, zooms, and final vertical export." }
    ],
    tiers: [
      { tierName: "Basic", title: "2 Viral Shorts Pack", description: "2 vertical 60-second edits with animated captions.", price: 400, daysOfDelivery: 2, revisions: 1 },
      { tierName: "Standard", title: "5 Viral Shorts Batch", description: "5 vertical shorts with B-roll, memes, and sound design.", price: 950, daysOfDelivery: 5, revisions: 2 },
      { tierName: "Premium", title: "12 Monthly Shorts Engine", description: "12 vertical shorts + custom brand caption templates.", price: 2100, daysOfDelivery: 12, revisions: 4 }
    ],
    questionnaires: [
      { type: "text", question: "Share your raw footage folder and preferred caption colors.", isRequired: true }
    ]
  },

  // =========================================================================
  // ARCHETYPE D: LOW-EFFORT / INCOMPLETE LISTING (Ranks at bottom until improved)
  // =========================================================================
  {
    id: "gig-low-effort-05",
    postedBy: "DevonPrice",
    clientAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80",
    title: "Basic Video Cutting & Trimming Service",
    description: "I will trim your raw video clips and combine them into one MP4 file.",
    category: "YouTube",
    status: "Open",
    slots: 3,
    ordersCount: 0,
    pendingOrdersCount: 0,
    clientRating: 0,
    ratingCount: 0,
    savesCount: 0,
    postedAt: daysAgoIso(18),
    timeAgo: "18d ago",
    isSaved: false,
    isOwnGig: false,
    firstDraftDelivery: "3 Days",
    additionalWorkRate: 10,
    termsOfService: "",
    skills: ["Video Editing"],
    thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80"
    ],
    milestones: [],
    tiers: [
      { tierName: "Basic", title: "Simple Cut", description: "Basic video trimming up to 5 mins.", price: 250, daysOfDelivery: 3, revisions: 1 }
    ],
    questionnaires: []
  }
];
