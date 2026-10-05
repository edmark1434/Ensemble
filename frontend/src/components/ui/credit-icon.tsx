import { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const CREDIT_ANIMATION_URL = '/icons/lottie/credit.lottie';
let creditAnimation: Promise<ArrayBuffer> | null = null;

const loadCreditAnimation = () => {
  creditAnimation ??= fetch(CREDIT_ANIMATION_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load ${CREDIT_ANIMATION_URL}`);
      return response.arrayBuffer();
    })
    .catch((error) => {
      creditAnimation = null;
      throw error;
    });
  return creditAnimation;
};

export const CreditIcon = ({ className }: { className?: string }) => {
  const [data, setData] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    let active = true;
    loadCreditAnimation()
      .then((buffer) => { if (active) setData(buffer.slice(0)); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <div className="scale-[1.6] w-full h-full flex items-center justify-center">
        {data && <DotLottieReact data={data} loop autoplay />}
      </div>
    </div>
  );
};
