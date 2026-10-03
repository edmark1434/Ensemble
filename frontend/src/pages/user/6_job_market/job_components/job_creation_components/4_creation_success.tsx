import React, { useEffect } from "react";
import SuccessModal from "@/components/ui/SuccessModal";

interface CreationSuccessProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  autoCloseMs?: number;
}

export const CreationSuccess: React.FC<CreationSuccessProps> = ({
  isOpen,
  title = "Successfully Posted!",
  message = "Your job post is now live. Freelancers can now send their applications and you'll be notified.",
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
        title={title}
        message={message}
        onConfirm={onConfirm}
      />
    </div>
  );
};

export default CreationSuccess;