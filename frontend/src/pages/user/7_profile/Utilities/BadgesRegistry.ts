import type { BadgeMetadata } from "@/pages/user/7_profile/Displays/BadgeSideSection_ProfileDisplay.tsx";

export const badgesRegistry: BadgeMetadata[] = [
  {
    id: "acc-b1",
    name: "Alpha Tester",
    description: "Granted to core ecosystem pioneers who tested the platform during its early alpha stages.",
    icon: "/icons/badges/alpha_b.png", // Corrected path from your public directory
    borderColor: "#ae3bf6", // Electric Blue Border
    glowColor: "#923bf6",
    condition: "Access, explore, and report infrastructural feedback on Ensemble during alpha phase operations.",
    dateObtained: "Early Adopter Access"
  },
  {
    id: "acc-b1_b",
    name: "Beta Tester",
    description: "Granted to core ecosystem pioneers who tested the platform during its early beta stages.",
    icon: "/icons/badges/beta_b.png", // Corrected path from your public directory
    borderColor: "#ae3bf6", // Electric Blue Border
    glowColor: "#923bf6",
    condition: "Access, explore, and report infrastructural feedback on Ensemble during alpha phase operations.",
    dateObtained: "Early Adopter Access"
  },
  {
    id: "acc-b2",
    name: "Fresh Freelancer",
    description: "Granted to users who have newly started becoming freelancer in this platform.",
    icon: "/icons/badges/freelance_1.png", // Corrected path from your public directory
    borderColor: "#10b981", // Emerald Green Border
    glowColor: "#10b981",
    condition: "Successfully complete and secure a verified close-out rating on your very first Freelancer gig contract.",
    dateObtained: "Initial Deployment"
  },
  {
    id: "acc-b3",
    name: "Fresh Client",
    description: "Granted to users who have successfully became a Client for the first time.",
    icon: "/icons/badges/client_1.png", // Corrected path from your public directory
    borderColor: "#10b981", // Emerald Green Border
    glowColor: "#a855f7",
    condition: "Successfully post, fund, and close out your very first contract node as a verified platform Client.",
    dateObtained: "Initial Commission"
  },
  {
    id: "acc-b4",
    name: "Fresh Creator",
    description: "Granted to users who have successfully uploaded their first Asset",
    icon: "/icons/badges/asset_1.png", // Corrected path from your public directory
    borderColor: "#10b981", // Emerald Green Border
    glowColor: "#a855f7",
    condition: "Successfully post, fund, and close out your very first contract node as a verified platform Client.",
    dateObtained: "Initial Commission"
  }
];