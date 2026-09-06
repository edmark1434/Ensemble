import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useGlobalState from "@/lib/global_state";

const VerificationRequiredModal = () => {
  const isVerificationModalOpen = useGlobalState((state) => state.isVerificationModalOpen);
  const verificationModalMessage = useGlobalState((state) => state.verificationModalMessage);
  const setIsVerificationModalOpen = useGlobalState((state) => state.setIsVerificationModalOpen);
  const isSidebarCollapsed = useGlobalState((state) => state.isSidebarCollapsed);
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isVerificationModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`fixed top-0 bottom-0 right-0 left-0 \${isSidebarCollapsed ? 'md:left-20' : 'md:left-64'} z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300`}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-500/10 blur-[80px]" />
          </div>

          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[400px] rounded-[2rem] border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-8 text-center shadow-2xl backdrop-blur-2xl z-10"
          >
            <div className="mx-auto mb-2 w-48 h-48 flex items-center justify-center relative -mt-6">
              <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-xl" />
              <DotLottieReact src="/icons/lottie/verify.lottie" autoplay loop className="w-full h-full relative z-10 scale-125 drop-shadow-2xl" />
            </div>

            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
              Verify First
            </h3>
            <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed mb-8 max-w-[340px] mx-auto font-medium">
              {verificationModalMessage || "Verify your account before posting jobs, posting gigs, or submitting proposals."}
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsVerificationModalOpen(false);
                  navigate("/verification"); 
                }}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 text-xs font-bold uppercase tracking-wider text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25"
              >
                Verify Now
              </button>
              <button
                onClick={() => setIsVerificationModalOpen(false)}
                className="w-full rounded-xl bg-transparent py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 transition-all hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
              >
                Later (Cancel)
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VerificationRequiredModal;
