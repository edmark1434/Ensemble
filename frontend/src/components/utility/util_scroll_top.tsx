import { useState, useEffect, type FC } from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UtilScrollTopProps {
  threshold?: number;
}

const UtilScrollTop: FC<UtilScrollTopProps> = ({ threshold = 300 }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 30, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 30, x: "-50%" }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-0 left-1/2 z-40 flex h-10 w-20 items-center justify-center rounded-t-full border-t border-x border-white/10 bg-[#0d0f1a]/85 text-white/80 shadow-2xl backdrop-blur-md transition-all duration-300 hover:h-12 hover:bg-blue-600 hover:text-white hover:border-blue-400/50 hover:shadow-[0_0_20px_rgba(37,99,235,0.6)] active:scale-95 group overflow-hidden"
        >
          {/* Subtle Radar/Pulse Glow Effect */}
          <span className="absolute inset-0 -z-10 rounded-t-full bg-blue-500/20 opacity-0 group-hover:animate-ping" />

          {/* Icon & Stacked Text Container */}
          <div className="flex flex-col items-center justify-center transition-transform duration-300 group-hover:-translate-y-0.5">
            <ArrowUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />

            <span className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 ease-in-out group-hover:max-h-4 group-hover:opacity-100 text-[9px] font-extrabold tracking-widest leading-none mt-0.5 uppercase">
              TOP
            </span>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default UtilScrollTop;