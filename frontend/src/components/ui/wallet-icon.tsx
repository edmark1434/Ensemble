// src/components/ui/wallet-icon.tsx
import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export const WalletIcon = ({ className }: { className?: string }) => {
  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <div className="scale-[1.6] w-full h-full flex items-center justify-center">
        <DotLottieReact
          src="/icons/lottie/wallet.lottie"
          loop
          autoplay
        />
      </div>
    </div>
  );
};