import React, { useEffect } from "react";
import SuccessModal from "@/components/ui/SuccessModal";

interface OrderCreationSuccessProps {
  isOpen: boolean;
  onConfirm: () => void;
  autoCloseMs?: number;
}

export const OrderCreationSuccess: React.FC<OrderCreationSuccessProps> = ({
  isOpen,
  onConfirm,
  autoCloseMs = 2800,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      onConfirm();
    }, autoCloseMs);

    return () => clearTimeout(timer);
  }, [isOpen, autoCloseMs, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="relative z-[300]">
      <SuccessModal
        isOpen={isOpen}
        title="Order Sent!"
        message="Your order application and milestone terms have been submitted to the client. You will be notified when they review it."
        onConfirm={onConfirm}
      />
    </div>
  );
};

export default OrderCreationSuccess;