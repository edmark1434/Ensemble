// src/pages/user/1_home/home_components/home_featured.tsx
import { forwardRef } from "react";
import { HomeFeaturedJobs } from "./home_featured_jobs";
import { HomeFeaturedGigs } from "./home_featured_gigs";
import {
  HomeFeaturedAssets,
  AssetCardSkeleton,
  FilterButtonSkeleton,
} from "./home_featured_assets";

export { AssetCardSkeleton, FilterButtonSkeleton };

interface HomeFeaturedProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const HomeFeatured = forwardRef<HTMLDivElement, HomeFeaturedProps>(
  ({ searchQuery }, ref) => {
    return (
      <div ref={ref} className="mt-8 space-y-12">
        <HomeFeaturedJobs />
        <HomeFeaturedGigs />
        <HomeFeaturedAssets searchQuery={searchQuery} />
      </div>
    );
  }
);

HomeFeatured.displayName = "HomeFeatured";