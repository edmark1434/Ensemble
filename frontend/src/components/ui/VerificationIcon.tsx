import React from "react";

export interface VerificationIconProps {
  verified?: boolean | null;
  className?: string;
  sizeClassName?: string;
  showTooltip?: boolean;
}

export const VerificationIcon: React.FC<VerificationIconProps> = ({
  verified,
  className = "",
  sizeClassName = "w-3.5 h-3.5",
  showTooltip = true,
}) => {
  if (!verified) return null;

  return (
    <img
      src="/icons/verification/lvl2_verified.png"
      alt="Verified"
      title={showTooltip ? "Verified" : undefined}
      className={`inline-block object-contain shrink-0 align-middle ${sizeClassName} ${className}`}
      loading="lazy"
    />
  );
};

export default VerificationIcon;
