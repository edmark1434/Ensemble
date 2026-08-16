import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { sampleGigs } from "../gig_datasets";
import { GigRichText } from "../gig_components/GigRichText";
import { ArrowLeft } from "lucide-react";
import UserHeader from "@/components/nav/user_header";

const GigFullPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const gig = sampleGigs.find((g) => g.id === id);

  if (!gig) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#080a12] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Service not found</h2>
        <button onClick={() => navigate("/gigs/services")} className="mt-4 text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080a12]">
      {/* Sticky Headers Container */}
      <div className="sticky top-0 z-20 bg-white dark:bg-[#0a0a0a] flex flex-col">
        <div className="z-10 border-b border-gray-200 dark:border-white/10">
          <UserHeader pageTitle="Gig Market" credits={1250} />
        </div>
        <div className="border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center">
          <button
            onClick={() => navigate(`/gigs/services/${gig.id}`)}
            className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Market
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] w-full mx-auto py-8 px-4">
        <GigRichText gig={gig} onClose={() => navigate(`/gigs/services/${gig.id}`)} layout="page" />
      </div>
    </div>
  );
};

export default GigFullPage;
