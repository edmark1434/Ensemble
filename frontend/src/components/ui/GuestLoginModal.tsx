import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, LogIn, UserPlus } from 'lucide-react';
import { createPortal } from 'react-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GuestLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export const GuestLoginModal: React.FC<GuestLoginModalProps> = ({
  isOpen,
  onClose,
  title = "Oops! You need to log in first",
  message = "Please sign in or create an account to perform this action. Join Ensemble to access all features!"
}) => {
  const navigate = useNavigate();

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        >
          {/* Backdrop click handler */}
          <div className="absolute inset-0" onClick={onClose} />
          
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-2xl dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 dark:shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-500/10 ring-8 ring-blue-500/5">
                <DotLottieReact src="/icons/lottie/login.lottie" loop autoplay style={{ width: 64, height: 64 }} />
              </div>
              
              <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {title}
              </h3>
              
              <p className="mb-8 text-sm leading-relaxed text-gray-500 dark:text-zinc-400 px-2">
                {message}
              </p>
              
              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => {
                    onClose();
                    navigate('/login');
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-4 text-sm font-bold text-gray-900 transition hover:bg-gray-200 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 active:scale-[0.97]"
                >
                  <LogIn className="h-4 w-4" />
                  Log In
                </button>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/signup');
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 text-sm font-bold text-white shadow-xl shadow-blue-500/20 transition hover:bg-blue-700 active:scale-[0.97]"
                >
                  <UserPlus className="h-4 w-4" />
                  Sign Up
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
