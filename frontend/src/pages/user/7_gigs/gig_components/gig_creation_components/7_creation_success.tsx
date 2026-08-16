import React, { useEffect } from "react";
import SuccessModal from "@/components/ui/SuccessModal";

interface CreationSuccessProps {
  isOpen: boolean;
  onConfirm: () => void;
  autoCloseMs?: number;
}

export const CreationSuccess: React.FC<CreationSuccessProps> = ({
  isOpen,
  onConfirm,
  autoCloseMs = 2800,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Auto-close timer
    const timer = setTimeout(() => {
      onConfirm();
    }, autoCloseMs);

    return () => clearTimeout(timer);
  }, [isOpen, autoCloseMs, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="relative z-[300]">
      {/* Base SuccessModal with built-in confetti trigger */}
      <SuccessModal
        isOpen={isOpen}
        message="Your service is now live in the marketplace and ready to receive orders."
        onConfirm={onConfirm}
      />
    </div>
  );
};

export default CreationSuccess;
