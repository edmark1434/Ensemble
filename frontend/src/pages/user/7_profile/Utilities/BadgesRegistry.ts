import type { BadgeMetadata } from "@/pages/user/7_profile/Displays/BadgeSideSection_ProfileDisplay.tsx";

export const badgesRegistry: BadgeMetadata[] = [
  // --- CORE ECOSYSTEM FOUNDATION TRACKS ---
  {
    id: "acc-alpha",
    name: "Alpha Tester",
    description: "Granted to core ecosystem pioneers who tested the platform during its early alpha stages.",
    icon: "/icons/badges/alpha_b.png",
    borderColor: "#ae3bf6",
    glowColor: "#923bf6",
    condition: "Access, explore, and report infrastructural feedback on Ensemble during alpha phase operations.",
    dateObtained: "Early Adopter Access"
  },
  {
    id: "acc-beta",
    name: "Beta Tester",
    description: "Granted to core ecosystem pioneers who tested the platform during its early beta stages.",
    icon: "/icons/badges/beta_b.png",
    borderColor: "#3b82f6",
    glowColor: "#1d4ed8",
    condition: "Participate in workspace optimization and platform testing during open beta operations.",
    dateObtained: "Early Adopter Access"
  },

  // --- FREELANCE RANK PROGRESSION TRACKS ---
  {
    id: "acc-freelance-1",
    name: "Fresh Freelancer",
    description: "Granted to users who have newly started becoming a freelancer on this platform.",
    icon: "/icons/badges/freelance_1.png",
    borderColor: "#10b981", // Green
    glowColor: "#10b981",
    condition: "Successfully complete and secure a verified close-out rating on your very first Freelancer gig contract.",
    dateObtained: "Initial Deployment"
  },
  {
    id: "acc-freelance-2",
    name: "Rising Freelancer",
    description: "Granted to active freelancers establishing a consistent workspace pipeline.",
    icon: "/icons/badges/freelance_2.png",
    borderColor: "#3b82f6", // Blue
    glowColor: "#3b82f6",
    condition: "Maintain a high rating track across multiple successful workspace project completions.",
    dateObtained: "Active Status Verified"
  },
  {
    id: "acc-freelance-3",
    name: "Elite Freelancer",
    description: "Granted to high-tier freelancers delivering premium-grade production deliverables.",
    icon: "/icons/badges/freelance_3.png",
    borderColor: "#a855f7", // Purple
    glowColor: "#a855f7",
    condition: "Secure priority milestones and long-term retainer agreements with recognized clients.",
    dateObtained: "Elite Clearance"
  },
  {
    id: "acc-freelance-4",
    name: "Grand Freelancer",
    description: "The absolute pinnacle of freelance production excellence across the platform ecosystem.",
    icon: "/icons/badges/freelance_4.png",
    borderColor: "#eab308", // Gold
    glowColor: "#eab308",
    condition: "Master elite status operations with absolute client retention and flawless workspace feedback metrics.",
    dateObtained: "Legendary Status"
  },

  // --- CLIENT RANK PROGRESSION TRACKS ---
  {
    id: "acc-client-1",
    name: "Fresh Client",
    description: "Granted to users who have successfully become a Client for the first time.",
    icon: "/icons/badges/client_1.png",
    borderColor: "#10b981", // Green
    glowColor: "#10b981",
    condition: "Successfully post, fund, and close out your very first contract node as a verified platform Client.",
    dateObtained: "Initial Commission"
  },
  {
    id: "acc-client-2",
    name: "Rising Client",
    description: "Granted to clients expanding their workforce layout and regular contract deployments.",
    icon: "/icons/badges/client_2.png",
    borderColor: "#3b82f6", // Blue
    glowColor: "#3b82f6",
    condition: "Initiate and clear multiple community milestones with premium ratings provided to service providers.",
    dateObtained: "Enterprise Expansion"
  },
  {
    id: "acc-client-3",
    name: "Elite Client",
    description: "Granted to trusted high-volume spenders and milestone managers inside the hub.",
    icon: "/icons/badges/client_3.png",
    borderColor: "#a855f7", // Purple
    glowColor: "#a855f7",
    condition: "Maintain comprehensive commercial agreements with large-scale creator teams.",
    dateObtained: "Elite Tier Clearance"
  },
  {
    id: "acc-client-4",
    name: "Grand Client",
    description: "Ecosystem power client commanding substantial studio pipelines and commercial arrays.",
    icon: "/icons/badges/client_4.png",
    borderColor: "#eab308", // Gold
    glowColor: "#eab308",
    condition: "Fund and manage monumental ecosystem projects with exceptional platform standing.",
    dateObtained: "Vanguard Benefactor"
  },

  // --- CREATOR / ASSET RANK PROGRESSION TRACKS ---
  {
    id: "acc-asset-1",
    name: "Fresh Creator",
    description: "Granted to users who have successfully uploaded their first production asset.",
    icon: "/icons/badges/asset_1.png",
    borderColor: "#10b981", // Green
    glowColor: "#10b981",
    condition: "Upload a valid, checked production-ready template or utility to the marketplace.",
    dateObtained: "Initial Deployment"
  },
  {
    id: "acc-asset-2",
    name: "Rising Creator",
    description: "Granted to assets creators with growing distribution tracking metrics.",
    icon: "/icons/badges/asset_2.png",
    borderColor: "#3b82f6", // Blue
    glowColor: "#3b82f6",
    condition: "Cross multiple checked community item acquisitions and library save counts.",
    dateObtained: "Marketplace Verification"
  },
  {
    id: "acc-asset-3",
    name: "Elite Creator",
    description: "Granted to top-tier library authors crafting high-fidelity design standards.",
    icon: "/icons/badges/asset_3.png",
    borderColor: "#a855f7", // Purple
    glowColor: "#a855f7",
    condition: "Maintain massive volume distributions with outstanding technical reviews across digital stores.",
    dateObtained: "Elite Creator Clearance"
  },
  {
    id: "acc-asset-4",
    name: "Grand Creator",
    description: "Legendary library architect setting the structural baseline style across the global market.",
    icon: "/icons/badges/asset_4.png",
    borderColor: "#eab308", // Gold
    glowColor: "#eab308",
    condition: "Reach astronomical tier interactions and define modern standards for premium project assets.",
    dateObtained: "Master Architect Status"
  }
];