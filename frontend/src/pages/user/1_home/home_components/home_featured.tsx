// src/pages/user/1_home/home_components/home_featured.tsx
import { forwardRef, useEffect, useState, useMemo } from "react";
import { HomeFeaturedJobs } from "./home_featured_jobs";
import { HomeFeaturedGigs } from "./home_featured_gigs";
import {
  HomeFeaturedAssets,
  AssetCardSkeleton,
  FilterButtonSkeleton,
} from "./home_featured_assets";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";

export { AssetCardSkeleton, FilterButtonSkeleton };

interface HomeFeaturedProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

type HomeSectionKey = "jobs" | "gigs" | "assets";

const DEFAULT_SECTION_ORDER: HomeSectionKey[] = ["jobs", "gigs", "assets"];

const ROLE_TO_SECTION: Record<string, HomeSectionKey> = {
  client: "gigs",       // Client     -> Top Services
  freelancer: "jobs",   // Freelancer -> Latest Job Posts
  enthusiast: "assets", // Enthusiast -> Popular Assets
};

const extractRoleNames = (rawRoles: any): string[] => {
  if (!Array.isArray(rawRoles)) return [];
  return rawRoles
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return String(item.role_name || item.purpose_name || item.name || "").trim();
      }
      return "";
    })
    .filter(Boolean);
};

export const HomeFeatured = forwardRef<HTMLDivElement, HomeFeaturedProps>(
  ({ searchQuery }, ref) => {
    const user = useGlobalState((state) => state.user);
    const isGuestMode = useGlobalState((state) => state.isGuestMode);
    const [fetchedRoles, setFetchedRoles] = useState<string[] | null>(null);

    const userRolesFromState = useMemo(
      () => extractRoleNames(user?.roles || user?.role),
      [user?.roles, user?.role]
    );

    useEffect(() => {
      if (isGuestMode || !user?.account_id) {
        setFetchedRoles(null);
        return;
      }
      let isMounted = true;
      api
        .get(`/api/accounts/profile/${user.account_id}`)
        .then((res) => {
          if (!isMounted) return;
          const profileData = res.data?.profile || res.data?.data || res.data;
          const profile = Array.isArray(profileData) ? profileData[0] : profileData;
          const roles = extractRoleNames(profile?.roles || profile?.role);
          if (roles.length > 0) {
            setFetchedRoles(roles);
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }, [isGuestMode, user?.account_id]);

    // Full 1st / 2nd / 3rd section ordering based on the exact arrangement of Account Tags:
    // - Client     = Top Services ("gigs")
    // - Freelancer = Latest Job Posts ("jobs")
    // - Enthusiast = Popular Assets ("assets")
    // Any remaining unselected sections are appended in default order (jobs -> gigs -> assets).
    const sectionOrder = useMemo<HomeSectionKey[]>(() => {
      if (isGuestMode || !user) return DEFAULT_SECTION_ORDER;

      const effectiveRoles =
        fetchedRoles && fetchedRoles.length > 0 ? fetchedRoles : userRolesFromState;

      if (effectiveRoles.length === 0) return DEFAULT_SECTION_ORDER;

      const ordered: HomeSectionKey[] = [];
      for (const role of effectiveRoles) {
        const mapped = ROLE_TO_SECTION[role.toLowerCase()];
        if (mapped && !ordered.includes(mapped)) {
          ordered.push(mapped);
        }
      }

      for (const fallbackSection of DEFAULT_SECTION_ORDER) {
        if (!ordered.includes(fallbackSection)) {
          ordered.push(fallbackSection);
        }
      }

      return ordered;
    }, [isGuestMode, user, fetchedRoles, userRolesFromState]);

    return (
      <div ref={ref} className="mt-8 space-y-12">
        {sectionOrder.map((section) => {
          if (section === "jobs") return <HomeFeaturedJobs key="jobs" />;
          if (section === "gigs") return <HomeFeaturedGigs key="gigs" />;
          return <HomeFeaturedAssets key="assets" searchQuery={searchQuery} />;
        })}
      </div>
    );
  }
);

HomeFeatured.displayName = "HomeFeatured";
