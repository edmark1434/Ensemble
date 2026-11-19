import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GigRichText } from "../gig_components/GigRichText";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import ShapeGrid from "@/components/ui/ShapeGrid";
import UserHeader from "@/components/nav/user_header";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";
import { resolveAvatarPath } from "@/lib/accountAvatars";
import type { Gig } from "../gig_datasets";

const GigFullPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useGlobalState((state) => state.theme);
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchGig = async () => {
      const startedAt = Date.now();
      setLoading(true);
      try {
        const response = await api.get(`/api/gigs/${id}`);
        if (response.data.success && response.data.data) {
          const g = response.data.data;
          const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || "";
          const mapUrl = (path: string) => {
            if (!path) return undefined;
            if (!cloudFrontUrl && path.includes("public")) return undefined;
            if (path.startsWith("http") || path.startsWith("/")) return path;
            return `${cloudFrontUrl}${path.startsWith("/") ? "" : "/"}${path}`;
          };

          const creatorAccountId =
            g.client_account_id ||
            g.creator_account_id ||
            g.account_id ||
            g.accountId ||
            g.user_id ||
            g.userId ||
            g.account?.account_id ||
            g.creator?.account_id ||
            g.user?.account_id ||
            g.postedById;

          const resolvedTos =
            g.termsOfService ||
            g.terms_of_service ||
            g.terms ||
            g.tos ||
            g.service_terms ||
            "";

          setGig({
            ...g,
            client_account_id: creatorAccountId,
            freelancerSubscriptionPlan: g.freelancerSubscriptionPlan || g.freelancer_subscription_plan || "Free",
            termsOfService: resolvedTos,
            terms_of_service: resolvedTos,
            thumbnail: mapUrl(g.thumbnail) || "https://d2dl0agwn9kque.cloudfront.net/gig_thumbnails/ede6f8d1-cc62-4afd-be9f-11f044d86122/placeholder_1787040672764_8a5d64b3.png",
            clientAvatar: resolveAvatarPath(g.clientAvatar || g.client_avatar_path),
            gallery: (g.gallery || []).map((p: string) => mapUrl(p))
          });
        } else {
          setGig(null);
        }
      } catch (error) {
        console.error("Failed to fetch gig details:", error);
        setGig(null);
      } finally {
        const remaining = Math.max(0, 650 - (Date.now() - startedAt));
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchGig();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white flex items-center justify-center p-6 font-['Plus_Jakarta_Sans'] overflow-hidden">
        <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
          <ShapeGrid
            shape="square"
            squareSize={48}
            direction="diagonal"
            speed={0.4}
            borderColor={theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.07)"}
            hoverFillColor={theme === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
            hoverTrailAmount={3}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 flex flex-col items-center gap-3 text-center"
        >
          <div className="w-40 h-40 flex items-center justify-center">
            <DotLottieReact
              src="/icons/lottie/loading-ensemble.lottie"
              loop
              autoplay
            />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
              Loading Service Details
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Retrieving service tiers, deliverables, and portfolio...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Service not found</h2>
        <button onClick={() => navigate("/gigs/services")} className="mt-4 text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-gray-50 dark:bg-dark-base flex flex-col w-full relative"
    >
      {/* Sticky Headers Container */}
      <div className="sticky top-0 z-40 bg-white dark:bg-dark-base flex flex-col border-b border-gray-200 dark:border-white/10 shadow-sm">
        <div className="z-50">
          <UserHeader pageTitle="Gig Market" />
        </div>
        <div className="border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center">
          <button
            onClick={() => navigate(`/gigs/services`)}
            className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Market
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] w-full mx-auto py-8 px-4">
        <GigRichText
          gig={gig}
          isLoading={loading}
          onClose={() => navigate(`/gigs/services`)}
          layout="page"
        />
      </div>
    </motion.div>
  );
};

export default GigFullPage;