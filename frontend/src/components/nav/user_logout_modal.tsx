import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion, AnimatePresence } from "framer-motion";

interface UserLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const UserLogoutModal: React.FC<UserLogoutModalProps> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-[400px] rounded-3xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-2xl dark:shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500/10 ring-8 ring-red-500/5">
                <DotLottieReact src="/icons/lottie/logout.lottie" loop autoplay style={{ width: 64, height: 64 }} />
              </div>
            </div>

            <div className="text-center">
              <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Confirm Logout
              </h2>
              <p className="px-4 text-sm leading-relaxed text-gray-500 dark:text-zinc-400">
                Are you sure you want to log out? You will need to re-authenticate to access your workspace.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={onConfirm}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red-500 py-4 text-sm font-bold text-white shadow-xl shadow-red-500/20 transition-all duration-300 hover:bg-red-600 active:scale-[0.97]"
              >
                Sign Out Now
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/5 py-4 text-sm font-semibold text-gray-700 dark:text-zinc-400 transition hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
              >
                Stay Logged In
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UserLogoutModal;
