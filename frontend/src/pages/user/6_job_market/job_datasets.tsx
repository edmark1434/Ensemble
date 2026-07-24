import type { Job } from "./job_components/job_lists";

export const sampleJobs: Job[] = [
  {
    id: "JP001",
    title: "Wedding Video Edit - Romantic Style",
    description: "Looking for an experienced editor to create a 10-minute wedding highlight reel. Must be proficient in color grading and narrative storytelling. Raw footage provided is around 50GB in 4K.\n\nRequirements:\n• Advanced Multi-cam editing\n• Dynamic Audio syncing & sound design\n• High-end cinematic color grading matching log profiles.",
    status: "Open",
    category: "Events",
    difficulty: "Intermediate",
    priceRange: "28,000 ~ 36,000",
    minBudget: 28000,
    postedBy: "Edmark Talingting",
    postedAt: "Oct 24, 2026 • 2:30 PM",
    timeAgo: "Posted 2 hours ago",
    clientRating: 4.5,
    ratingCount: 12,
    positionsNeeded: 3,
    applicantsCount: 28,
    timeline: "3-5 Days",
    thumbnail: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    isSaved: true,
    isOwnPost: false
  },
  {
    id: "JP002",
    title: "YouTube Channel Intro Animation",
    description: "Need a 10-second animated intro for a tech review channel. Should include clean typography, slick sound effects, and source project delivery file formats.",
    status: "Open",
    category: "YouTube",
    difficulty: "Beginner",
    priceRange: "12,000 ~ 14,000",
    minBudget: 12000,
    postedBy: "Jodeci Pacibe",
    postedAt: "Oct 24, 2026 • 11:15 AM",
    timeAgo: "Posted 2 hours ago",
    clientRating: 4.5,
    ratingCount: 5,
    positionsNeeded: 1,
    applicantsCount: 33,
    timeline: "1-3 Days",
    thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80",
    isSaved: false,
    isOwnPost: true
  },
  {
    id: "JP003",
    title: "Corporate Brand Identity Video",
    description: "Seeking a professional video creator to craft a high-end promotional commercial sequence highlighting global enterprise logistics infrastructure updates.",
    status: "Open",
    category: "Corporate",
    difficulty: "Expert",
    priceRange: "45,000 ~ 60,000",
    minBudget: 45000,
    postedBy: "Sarah Chen",
    postedAt: "Oct 24, 2026 • 9:00 AM",
    timeAgo: "Posted 5 hours ago",
    clientRating: 4.9,
    ratingCount: 42,
    positionsNeeded: 2,
    applicantsCount: 14,
    timeline: "1-2 Weeks",
    thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
    isSaved: false,
    isOwnPost: false
  }
];

export const sampleCategories = [
  { label: "All", count: 748 },
  { label: "Social", count: 119 },
  { label: "YouTube", count: 101 },
  { label: "Corporate", count: 78 },
  { label: "Events", count: 65 }
];