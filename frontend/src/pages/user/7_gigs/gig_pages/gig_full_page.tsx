import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GigRichText } from "../gig_components/GigRichText";
import { ArrowLeft, Loader2 } from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import api from "@/lib/axios";
import type { Gig } from "../gig_datasets";
import { sampleGigs } from "../gig_datasets";

const GigFullPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGig = async () => {
      try {
        const response = await api.get("/api/gigs");
        if (response.data.success && response.data.data) {
          const mappedGigs = response.data.data.map((g: any) => {
            const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || '';
            const mapUrl = (path: string) => {
              if (!path) return undefined;
              if (!cloudFrontUrl && path.includes('public')) return undefined;
              if (path.startsWith('http') || path.startsWith('/')) return path;
              return `${cloudFrontUrl}${path.startsWith('/') ? '' : '/'}${path}`;
            };
            
            return {
              ...g,
              thumbnail: mapUrl(g.thumbnail) || "https://d2dl0agwn9kque.cloudfront.net/gig_thumbnails/ede6f8d1-cc62-4afd-be9f-11f044d86122/placeholder_1787040672764_8a5d64b3.png",
              clientAvatar: g.clientAvatar ? `${cloudFrontUrl}${g.clientAvatar.startsWith('/') ? '' : '/'}${g.clientAvatar}` : undefined,
              gallery: (g.gallery || []).map((p: string) => mapUrl(p))
            };
          });
          const found = mappedGigs.find((g: Gig) => g.id === id) || sampleGigs.find((g) => g.id === id);
          setGig(found || null);
        } else {
          setGig(sampleGigs.find((g) => g.id === id) || null);
        }
      } catch (error) {
        console.error("Failed to fetch gig details:", error);
        setGig(sampleGigs.find((g) => g.id === id) || null);
      } finally {
        setLoading(false);
      }
    };
    fetchGig();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
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
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex flex-col w-full relative">
      {/* Sticky Headers Container */}
      <div className="sticky top-0 z-40 bg-white dark:bg-dark-base flex flex-col border-b border-gray-200 dark:border-white/10 shadow-sm">
        <div className="z-50">
          <UserHeader pageTitle="Gig Market" credits={1250} />
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
        <GigRichText gig={gig} onClose={() => navigate(`/gigs/services`)} layout="page" />
      </div>
    </div>
  );
};

export default GigFullPage;
