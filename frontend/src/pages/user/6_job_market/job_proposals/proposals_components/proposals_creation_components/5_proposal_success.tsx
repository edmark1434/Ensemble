import React, { useEffect } from "react";
import SuccessModal from "@/components/ui/SuccessModal";

interface ProposalCreationSuccessProps {
  isOpen: boolean;
  onConfirm: () => void;
  autoCloseMs?: number;
}

export const ProposalCreationSuccess: React.FC<ProposalCreationSuccessProps> = ({
  isOpen,
  onConfirm,
  autoCloseMs = 4500,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Auto-close timer allowing user to celebrate and enjoy confetti
    const timer = setTimeout(() => {
      onConfirm();
    }, autoCloseMs);

    return () => clearTimeout(timer);
  }, [isOpen, autoCloseMs, onConfirm]);

  if (!isOpen) return null;

  return (
    <SuccessModal
      isOpen={isOpen}
      title="Proposal Sent!"
      message="Your proposal application and milestone terms have been submitted to the client. You will be notified when they review it."
      onConfirm={onConfirm}
      standalone={true}
    />
  );
};

export default ProposalCreationSuccess;
