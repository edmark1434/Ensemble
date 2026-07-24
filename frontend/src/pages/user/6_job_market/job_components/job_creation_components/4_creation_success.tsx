import React from "react";
import SuccessModal from "@/components/ui/SuccessModal";

interface CreationSuccessProps {
  isOpen: boolean;
  onConfirm: () => void;
}

export const CreationSuccess: React.FC<CreationSuccessProps> = ({ isOpen, onConfirm }) => {
  return (
    <SuccessModal
      isOpen={isOpen}
      message="Your job post is now live. Freelancers can now send their applications and you'll be notified."
      onConfirm={onConfirm}
    />
  );
};

export default CreationSuccess;