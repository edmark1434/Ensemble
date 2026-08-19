import React from 'react';
import { Plus } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  lottieSrc?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  lottieSrc = "/icons/lottie/no-result.lottie"
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-14 text-center rounded-3xl border border-dashed border-gray-200 dark:border-white/10 bg-transparent transition-all ${className}`}>
      {/* Centered DotLottieReact Container */}
      <div className="mb-4 h-32 w-32 sm:h-36 sm:w-36 grayscale opacity-80 flex items-center justify-center">
        <DotLottieReact src={lottieSrc} autoplay loop />
      </div>

      <div className="max-w-md space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-medium">
          {description}
        </p>
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 transition-all duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyState;