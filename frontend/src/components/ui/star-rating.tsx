import React from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  count?: number;
  size?: "sm" | "md" | "lg";
}

export const StarRating: React.FC<StarRatingProps> = ({ value, count = 5, size = "sm" }) => {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };
  
  const iconSize = sizeClasses[size];

  return (
    <div className="flex gap-0.5">
      {[...Array(count)].map((_, i) => {
        const fillPercent = Math.max(0, Math.min(1, value - i)) * 100;
        return (
          <div key={i} className="relative">
            {/* Background Outline Star */}
            <Star className={`${iconSize} text-gray-300 dark:text-zinc-700`} />
            
            {/* Filled Star Overlay (supports partial fill via width clipping) */}
            {fillPercent > 0 && (
              <div
                className="absolute top-0 left-0 overflow-hidden text-amber-500"
                style={{ width: `${fillPercent}%` }}
              >
                <Star className={`${iconSize} fill-current`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
