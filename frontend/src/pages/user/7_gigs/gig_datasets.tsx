import { sampleCategories } from "../6_job_market/job_datasets";

export type QuestionnaireType = "fill-in-blank" | "file-upload" | "multiple-choice";

export interface Questionnaire {
  type: QuestionnaireType;
  question: string;
  required: boolean;
  limit?: number; // for multiple choice
  multipleAnswer?: boolean;
  options?: string[]; // for multiple choice
}

export interface GigTier {
  title: string;
  tierName: string;
  description: string;
  daysOfDelivery: number;
  revisions: number;
  price: number;
}

export interface Milestone {
  name: string;
  description: string;
}

export interface Gig {
  id: string;
  postedBy: string;
  clientAvatar?: string;
  title: string;
  description: string;
  category: string;
  status?: string;
  slots: number;
  termsOfService: string;
  skills: string[];
  firstDraftDelivery: string;
  thumbnail: string;
  gallery: string[];
  milestones: Milestone[];
  tiers: GigTier[];
  additionalWorkRate: number;
  questionnaires: Questionnaire[];
  
  // UI helpers (similar to Jobs)
  postedAt: string;
  timeAgo: string;
  clientRating: number;
  ratingCount: number;
  isSaved: boolean;
  isOwnGig: boolean;
}

export const sampleGigs: Gig[] = [
  {
    id: "GIG001",
    postedBy: "Edmark Talingting",
    clientAvatar: "https://i.pravatar.cc/150?u=edmark",
    title: "I will edit a cinematic wedding highlight reel",
    description: "I will edit your raw wedding footage into a beautiful, cinematic 10-minute highlight reel. My style focuses on emotional storytelling, smooth transitions, and high-end color grading that matches modern log profiles.",
    category: "Events",
    slots: 3,
    termsOfService: "Standard Ensemble Terms of Service applies. Revisions must be requested within 3 days of delivery.",
    skills: ["Multi-cam Editing", "Color Grading", "DaVinci Resolve", "Audio Sync"],
    firstDraftDelivery: "7 Days",
    thumbnail: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=600&q=80"
    ],
    milestones: [
      { name: "Rough Cut", description: "Initial assembly of the best shots synced to your chosen music." },
      { name: "Final Polish", description: "Color grading, sound design, and final transitions applied." }
    ],
    tiers: [
      {
        tierName: "Basic",
        title: "3-Minute Teaser",
        description: "A short, fast-paced teaser for social media.",
        daysOfDelivery: 4,
        revisions: 1,
        price: 15000
      },
      {
        tierName: "Standard",
        title: "10-Minute Highlight",
        description: "The full cinematic highlight reel with professional color grading.",
        daysOfDelivery: 7,
        revisions: 2,
        price: 28000
      },
      {
        tierName: "Premium",
        title: "Full Documentary Edit",
        description: "10-minute highlight + full 60-minute documentary style cut of the entire day.",
        daysOfDelivery: 14,
        revisions: 3,
        price: 50000
      }
    ],
    additionalWorkRate: 500,
    questionnaires: [
      {
        type: "multiple-choice",
        question: "What is the overall vibe you want for the video?",
        required: true,
        multipleAnswer: false,
        options: ["Romantic & Slow", "Upbeat & Fun", "Documentary Style", "Moody & Cinematic"]
      },
      {
        type: "file-upload",
        question: "Please upload your chosen background music track (if any).",
        required: false
      }
    ],
    postedAt: "Oct 24, 2026 • 2:30 PM",
    timeAgo: "Posted 2 hours ago",
    clientRating: 4.8,
    ratingCount: 24,
    isSaved: true,
    isOwnGig: false
  },
  {
    id: "GIG002",
    postedBy: "Jodeci Pacibe",
    clientAvatar: "https://i.pravatar.cc/150?u=jodeci",
    title: "I will create a high-retention YouTube intro animation",
    description: "I will create a slick, 10-second animated intro for your tech review or vlog channel. Includes clean typography and punchy sound effects.",
    category: "YouTube",
    slots: 10,
    termsOfService: "Custom assets provided will not be resold.",
    skills: ["After Effects", "Motion Graphics", "Sound Design", "Typography"],
    firstDraftDelivery: "2 Days",
    thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80",
    gallery: [],
    milestones: [],
    tiers: [
      {
        tierName: "Standard",
        title: "10-Second Intro",
        description: "Standard 10-second intro with basic sound design.",
        daysOfDelivery: 3,
        revisions: 2,
        price: 8000
      },
      {
        tierName: "Premium",
        title: "Intro + Outro + Lower Thirds",
        description: "Full channel branding package including intro, outro screen, and 3 custom lower thirds.",
        daysOfDelivery: 5,
        revisions: 3,
        price: 15000
      }
    ],
    additionalWorkRate: 200,
    questionnaires: [
      {
        type: "fill-in-blank",
        question: "What is your channel's main URL?",
        required: true
      },
      {
        type: "file-upload",
        question: "Please upload your channel logo (Vector/PNG with transparent background).",
        required: true
      }
    ],
    postedAt: "Oct 25, 2026 • 10:00 AM",
    timeAgo: "Posted 1 hour ago",
    clientRating: 4.9,
    ratingCount: 56,
    isSaved: false,
    isOwnGig: true
  },
  {
    id: "GIG003",
    postedBy: "Sarah Jenkins",
    clientAvatar: "https://i.pravatar.cc/150?u=sarah",
    title: "I will mix and master your indie pop track",
    description: "I will provide professional mixing and mastering for your indie pop or rock track. I specialize in getting that warm, analog feel while ensuring your song sounds punchy and competitive on Spotify and Apple Music.",
    category: "Audio",
    slots: 5,
    termsOfService: "Stems must be provided as 24-bit WAV files. Maximum of 40 tracks per song.",
    skills: ["Mixing", "Mastering", "Pro Tools", "Vocal Tuning"],
    firstDraftDelivery: "4 Days",
    thumbnail: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1516280440502-861f23c7b74f?auto=format&fit=crop&w=600&q=80"
    ],
    milestones: [
      { name: "Initial Mix", description: "First pass of the mix for structural feedback." },
      { name: "Final Master", description: "Polished and mastered track ready for distribution." }
    ],
    tiers: [
      {
        tierName: "Basic",
        title: "Mastering Only",
        description: "Professional mastering for a pre-mixed stereo track.",
        daysOfDelivery: 2,
        revisions: 1,
        price: 5000
      },
      {
        tierName: "Standard",
        title: "Mix & Master (Up to 20 stems)",
        description: "Full mix and master for a standard track.",
        daysOfDelivery: 4,
        revisions: 2,
        price: 15000
      },
      {
        tierName: "Premium",
        title: "Mix, Master & Pitch Correction",
        description: "Full mix and master plus manual vocal tuning for up to 3 vocal tracks.",
        daysOfDelivery: 7,
        revisions: 3,
        price: 25000
      }
    ],
    additionalWorkRate: 300,
    questionnaires: [
      {
        type: "fill-in-blank",
        question: "What is the BPM and Key of the song?",
        required: true
      },
      {
        type: "file-upload",
        question: "Please provide a reference track that has the sonic vibe you're going for.",
        required: true
      }
    ],
    postedAt: "Oct 26, 2026 • 9:15 AM",
    timeAgo: "Posted 5 hours ago",
    clientRating: 5.0,
    ratingCount: 112,
    isSaved: false,
    isOwnGig: false
  },
  {
    id: "GIG004",
    postedBy: "Markus D",
    clientAvatar: "https://i.pravatar.cc/150?u=markus",
    title: "I will design a modern minimalist logo for your startup",
    description: "A strong brand starts with a memorable logo. I will design a modern, minimalist logo that perfectly encapsulates your startup's vision and appeals to your target audience. All packages include high-res files.",
    category: "Design",
    slots: 2,
    termsOfService: "Concepts will be delivered in watermark until final approval.",
    skills: ["Illustrator", "Vector Graphics", "Brand Identity", "Minimalism"],
    firstDraftDelivery: "3 Days",
    thumbnail: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1626785774625-ddcddc3445e9?auto=format&fit=crop&w=600&q=80"
    ],
    milestones: [],
    tiers: [
      {
        tierName: "Standard",
        title: "2 Logo Concepts",
        description: "2 minimalist logo concepts. Includes JPG and transparent PNG.",
        daysOfDelivery: 3,
        revisions: 2,
        price: 12000
      },
      {
        tierName: "Premium",
        title: "Full Brand Kit",
        description: "3 logo concepts, vector source files, color palette, and typography guidelines.",
        daysOfDelivery: 5,
        revisions: 99,
        price: 35000
      }
    ],
    additionalWorkRate: 0,
    questionnaires: [
      {
        type: "fill-in-blank",
        question: "What is the exact text you want in the logo?",
        required: true
      },
      {
        type: "multiple-choice",
        question: "What style of logo do you prefer?",
        required: true,
        options: ["Wordmark (Text only)", "Lettermark (Initials)", "Pictorial (Icon + Text)", "Abstract"]
      }
    ],
    postedAt: "Oct 26, 2026 • 1:00 PM",
    timeAgo: "Posted 1 hour ago",
    clientRating: 4.7,
    ratingCount: 89,
    isSaved: true,
    isOwnGig: false
  },
  {
    id: "GIG005",
    postedBy: "Elena Rostova",
    clientAvatar: "https://i.pravatar.cc/150?u=elena",
    title: "I will translate your app from English to Spanish",
    description: "I am a native Spanish speaker with a background in software engineering. I will accurately localize your web or mobile app into Latin American or Castilian Spanish, ensuring proper context and technical accuracy.",
    category: "Writing",
    slots: 1,
    termsOfService: "Prices are per 1000 words. For apps exceeding 5000 words, please request a custom offer.",
    skills: ["Localization", "Translation", "Spanish", "Technical Writing"],
    firstDraftDelivery: "2 Days",
    thumbnail: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
    gallery: [],
    milestones: [],
    tiers: [
      {
        tierName: "Standard",
        title: "Up to 1000 words",
        description: "Translation of up to 1000 words of UI text or documentation.",
        daysOfDelivery: 2,
        revisions: 1,
        price: 4000
      }
    ],
    additionalWorkRate: 0,
    questionnaires: [
      {
        type: "multiple-choice",
        question: "Which Spanish dialect do you prefer?",
        required: true,
        options: ["Latin American (Neutral)", "Castilian (Spain)", "Mexican"]
      },
      {
        type: "file-upload",
        question: "Please upload your JSON, CSV, or strings file.",
        required: true
      }
    ],
    postedAt: "Oct 25, 2026 • 4:45 PM",
    timeAgo: "Posted 21 hours ago",
    clientRating: 4.9,
    ratingCount: 42,
    isSaved: false,
    isOwnGig: false
  },
  {
    id: "GIG006",
    postedBy: "CodeNinja Studios",
    clientAvatar: "https://i.pravatar.cc/150?u=codeninja",
    title: "I will build a custom React dashboard for your data",
    description: "Need to visualize your business metrics? I will build a responsive, interactive data dashboard using React, TailwindCSS, and Recharts. Includes integration with your REST API or Firebase.",
    category: "Programming",
    slots: 2,
    termsOfService: "Client must provide API endpoints or database access prior to the start date.",
    skills: ["React", "TypeScript", "TailwindCSS", "Data Visualization"],
    firstDraftDelivery: "10 Days",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80"
    ],
    milestones: [
      { name: "UI Mockup Approval", description: "Review and approve the static dashboard layout." },
      { name: "API Integration", description: "Wiring up the frontend to your data sources." },
      { name: "Final Delivery", description: "Handoff of the source code and deployment instructions." }
    ],
    tiers: [
      {
        tierName: "Basic",
        title: "Static UI Only",
        description: "Up to 3 dashboard views built with mock data. No API integration.",
        daysOfDelivery: 5,
        revisions: 1,
        price: 20000
      },
      {
        tierName: "Standard",
        title: "Fully Functional Dashboard",
        description: "Up to 5 views, fully integrated with your API. Includes 4 interactive charts.",
        daysOfDelivery: 14,
        revisions: 2,
        price: 65000
      }
    ],
    additionalWorkRate: 1500,
    questionnaires: [
      {
        type: "fill-in-blank",
        question: "What backend stack or API will we be connecting to?",
        required: true
      },
      {
        type: "fill-in-blank",
        question: "Please list the primary KPIs or metrics you need visualized.",
        required: true
      }
    ],
    postedAt: "Oct 26, 2026 • 8:00 AM",
    timeAgo: "Posted 6 hours ago",
    clientRating: 5.0,
    ratingCount: 204,
    isSaved: true,
    isOwnGig: false
  }
];

// Re-export categories from jobs so they stay in sync
export { sampleCategories };
