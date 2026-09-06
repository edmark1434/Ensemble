import React from 'react';
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useNavigate } from "react-router-dom";

export const UnverifiedOverlay = ({ featureName = "this area" }: { featureName?: string }) => {
  const navigate = useNavigate();
  return (
    <div className="absolute inset-0 z-40 bg-gray-50 dark:bg-dark-base">
      <div className="sticky top-[73px] h-[calc(100vh-73px)] w-full flex flex-col items-center justify-center p-4 text-center pb-32">
      <div className="mx-auto mb-4 w-56 h-56 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl" />
        <DotLottieReact src="/icons/lottie/verify.lottie" autoplay loop className="w-full h-full relative z-10 drop-shadow-2xl scale-125" />
      </div>
      <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Verify First to View</h2>
      <p className="text-base text-gray-800 dark:text-zinc-200 max-w-lg mx-auto mb-10 leading-relaxed font-semibold">
        You need a verified account to view and manage {featureName}. Please complete verification to unlock this feature.
      </p>
      <button 
        onClick={() => navigate('/verification')}
        className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-10 py-4 text-sm font-bold uppercase tracking-wider text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-blue-500/25 pointer-events-auto"
      >
        Verify Now
      </button>
      </div>
    </div>
  );
};
