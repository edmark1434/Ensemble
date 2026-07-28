import type { ProposalItemData } from "./proposals_components/proposals_list";

export const sampleIncomingProposals: ProposalItemData[] = [
  {
    id: "PROP-IN-01",
    jobId: "JP002",
    jobTitle: "YouTube Channel Intro Animation",
    partyName: "Alex Rivera",
    rating: 4.9,
    bidAmount: 12000,
    additionalWorkRate: 20,
    coverLetter: "I have created over 30+ tech intro animations. Ready to craft a high-energy intro in After Effects.",
    tosContent: "1. Source files delivered upon project completion.\n2. Revisions beyond milestone quotas billed at +20% additional work rate.",
    submittedAt: "2 hours ago",
    status: "Pending",
    type: "incoming",
    milestones: [
      { id: "m1", name: "Storyboard Pass", description: "Design styleframes and timing.", hours: 5, revisions: 2 },
      { id: "m2", name: "Final Render & SFX", description: "Master render and source files.", hours: 5, revisions: 1 },
    ],
  },
];

export const sampleSentProposals: ProposalItemData[] = [
  {
    id: "PROP-SENT-01",
    jobId: "JP001",
    jobTitle: "Wedding Video Edit - Romantic Style",
    partyName: "Edmark Talingting",
    bidAmount: 32000,
    additionalWorkRate: 20,
    coverLetter: "I have extensive experience with multi-cam wedding edits and cinematic color passes in DaVinci Resolve.",
    tosContent: "1. Raw footage remains client property.\n2. All color passes provided in 4K format.",
    submittedAt: "Oct 24, 2026",
    status: "Pending",
    type: "sent",
    milestones: [
      { id: "m101", name: "Multi-cam Sync & Highlights Pass", description: "10-minute wedding timeline draft.", hours: 15, revisions: 2 },
      { id: "m102", name: "Color Pass & Master Audio", description: "Final color grade and sound sync.", hours: 10, revisions: 1 },
    ],
  },
];

export const proposalCategories = [
  { label: "All", count: 12 },
  { label: "YouTube", count: 4 },
  { label: "Events", count: 5 },
  { label: "Corporate", count: 3 },
];