import React, { useState } from "react";
import { motion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const loadingTitles = [
  "Loading Account",
  "Hold on tight",
  "Yeah wait a second..",
  "Just a moment",
  "Brewing up your space",
  "Setting things up",
  "Patience is a virtue, right?",
  "Hang on while we work our magic",
  "Still loading, yeah wait..",
  "Refining edits and touches...",
  "Applying final edits, hang on...",
  "Tweaking the code, yeah wait...",
  "Polishing up those edits..."
];

export const ProfileLoadingState: React.FC = () => {
  const [randomTitle] = useState(() => {
    return loadingTitles[Math.floor(Math.random() * loadingTitles.length)];
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-3"
      >
        {/* Larger Lottie Animation Player */}
        <div className="w-48 h-48 flex items-center justify-center">
          <DotLottieReact
            src="/icons/lottie/loading-ensemble.lottie"
            loop
            autoplay
          />
        </div>

        {/* Randomized Heading & Fixed Subtitle */}
        <div className="text-center space-y-1">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
            {randomTitle}
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Building the platform so yeah wait..
          </p>
        </div>
      </motion.div>
    </div>
  );
};