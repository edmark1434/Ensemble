// src/pages/user/1_home/home_components/home_featured_jobs.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  ArrowRight,
  CircleDollarSign,
  Wrench,
  Bookmark,
} from "lucide-react";

export interface Job {
  id: string;
  title: string;
  description: string;
  status: "Open" | "Closed";
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Expert";
  priceRange: string;
  minBudget: number;
  postedBy: string;
  postedAt: string;
  timeAgo: string;
  clientRating: number;
  ratingCount: number;
  positionsNeeded: number;
  applicantsCount: number;
  timeline: string;
  thumbnail: string;
  skills?: string[];
  isSaved?: boolean;
  isOwnPost?: boolean;
}

export const sampleJobs: Job[] = [
  {
    id: "JP001",
    title: "Wedding Video Edit - Romantic Style",
    description:
      "Looking for an experienced editor to create a 10-minute wedding highlight reel. Must be proficient in color grading and narrative storytelling. Raw footage provided is around 50GB in 4K.",
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
    thumbnail:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    skills: ["Multi-cam Editing", "Color Grading", "DaVinci Resolve", "Audio Sync"],
    isSaved: true,
    isOwnPost: false,
  },
  {
    id: "JP002",
    title: "YouTube Channel Intro Animation",
    description:
      "Need a 10-second animated intro for a tech review channel. Should include clean typography, slick sound effects, and source project delivery file formats.",
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
    thumbnail:
      "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80",
    skills: ["After Effects", "Motion Graphics", "Sound Design", "Typography"],
    isSaved: false,
    isOwnPost: true,
  },
  {
    id: "JP003",
    title: "Corporate Brand Identity Video",
    description:
      "Seeking a professional video creator to craft a high-end promotional commercial sequence highlighting global enterprise logistics infrastructure updates.",
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
    thumbnail:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
    skills: ["Premiere Pro", "Branding", "Commercial Edit", "4K Rendering"],
    isSaved: false,
    isOwnPost: false,
  },
];

export const HomeFeaturedJobs: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold tracking-tight text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Latest Job Posts
          </h2>
          <p
            className="text-xs text-zinc-400"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Fresh opportunities from verified clients seeking editors
          </p>
        </div>
        <button
          onClick={() => navigate("/jobs/postings")}
          className="flex items-center gap-1 text-xs font-semibold text-white transition hover:text-zinc-300"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Browse All Jobs <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
        {sampleJobs.slice(0, 3).map((job: Job) => (
          <div
            key={job.id}
            onClick={() => navigate(`/jobs/postings/${job.id}`)}
            className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0d0f1a]/40 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.06] cursor-pointer"
          >
            <div>
              {/* Thumbnail Image */}
              <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
                <img
                  src={job.thumbnail}
                  alt={job.title}
                  className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <button
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute top-2 right-2 rounded-full bg-black/50 p-1.5 backdrop-blur-sm transition ${
                    job.isSaved ? "text-yellow-500" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${job.isSaved ? "fill-current" : ""}`} />
                </button>
              </div>

              {/* Category & Status Pills */}
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-medium ${
                    job.status === "Open"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : "border-red-500/20 bg-red-500/10 text-red-400"
                  }`}
                >
                  {job.status}
                </span>
                <span className="rounded border border-white/10 bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                  {job.difficulty}
                </span>
                <span className="rounded border border-white/10 bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                  {job.category}
                </span>
              </div>

              {/* Price Range */}
              <div className="mb-1 flex items-center gap-1 text-base font-black text-yellow-500">
                <CircleDollarSign className="h-4 w-4 shrink-0 text-yellow-500" />
                <span>{job.priceRange}</span>
              </div>

              {/* Title & Description */}
              <h3
                className="mb-1 line-clamp-1 text-base font-bold text-white transition-colors group-hover:text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {job.title}
              </h3>
              <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                {job.description}
              </p>

              {/* Skill Badges */}
              {Array.isArray(job.skills) && job.skills.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <Wrench className="h-3 w-3 shrink-0 text-zinc-400" />
                  {job.skills.slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md border border-white/10 bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.skills.length > 3 && (
                    <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                      +{job.skills.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] font-medium text-zinc-400">
              <div className="flex items-center gap-1.5 truncate">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-[9px] font-bold text-white">
                  {job.postedBy.charAt(0)}
                </div>
                <span className="truncate font-semibold text-zinc-300">{job.postedBy}</span>
              </div>

              <div className="ml-2 flex shrink-0 items-center gap-1 text-[10px] text-zinc-400">
                <Clock className="h-3 w-3 text-zinc-500" />
                <span>{job.timeAgo}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};