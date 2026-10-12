import React, { useEffect } from "react";
import SuccessModal from "@/components/ui/SuccessModal";

interface CreationSuccessProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onClose?: () => void;
  autoCloseMs?: number;
}

export const CreationSuccess: React.FC<CreationSuccessProps> = ({
  isOpen,
  title = "Successfully Posted!",
  message = "Your job post is now live. Freelancers can now send their applications and you'll be notified.",
  onConfirm,
  onClose,
  autoCloseMs = 2800,
}) => {
  const handleAction = () => {
    if (onConfirm) onConfirm();
    else if (onClose) onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    // Auto-close timer
    const timer = setTimeout(() => {
      handleAction();
    }, autoCloseMs);

    return () => clearTimeout(timer);
  }, [isOpen, autoCloseMs, onConfirm, onClose]);

  if (!isOpen) return null;

  return (
    <div className="relative z-[300]">
      {/* Base SuccessModal with built-in confetti trigger */}
      <SuccessModal
        isOpen={isOpen}
        title={title}
        message={message}
        onConfirm={handleAction}
      />
    </div>
  );
};

export default CreationSuccess;