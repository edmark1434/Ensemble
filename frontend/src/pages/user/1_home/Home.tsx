// src/pages/user/1_home/Home.tsx
import React, { useState, useEffect, useRef } from "react";
import UserHeader from "@/components/nav/user_header";
import useGlobalState from "@/lib/global_state";

// Subcomponents
import { HomeBanner, WelcomeCardSkeleton } from "./home_components/home_banner";
import {
  HomeFeatured,
  AssetCardSkeleton,
  FilterButtonSkeleton,
} from "./home_components/home_featured";

const Home: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const assetsSectionRef = useRef<HTMLDivElement>(null);

  console.log("userInfo from global state:", useGlobalState((state) => state.user));

  // Simulate loading on mount
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#080a12]">
        <UserHeader pageTitle="Home" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <WelcomeCardSkeleton />

          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="h-7 w-40 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
                <div className="mt-1 h-4 w-48 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
              </div>
              <div className="h-5 w-32 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
            </div>

            <div className="flex flex-col gap-6 lg:flex-row">
              {/* Sidebar Filters Skeletons */}
              <div className="lg:w-64">
                <div className="sticky top-48 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
                  <div className="mb-4">
                    <div className="mb-2 h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <FilterButtonSkeleton key={i} />
                      ))}
                    </div>
                  </div>
                  <div className="my-4 h-px bg-gray-200 dark:bg-white/10" />
                  <div className="mb-4">
                    <div className="mb-2 h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <FilterButtonSkeleton key={i} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Asset Grid Skeletons */}
              <div className="flex-1">
                <div className="mb-4 h-5 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-white/5" />
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <AssetCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080a12]">
      {/* Top Header */}
      <UserHeader pageTitle="Home" credits={1250} />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        {/* 1. Welcome Banner with Collapsible Search & Quick Actions */}
        <HomeBanner searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        {/* 2. Featured Content (Latest Job Posts -> Top Services -> Popular Assets) */}
        <HomeFeatured
          ref={assetsSectionRef}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Home;
