import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, LogIn, UserPlus } from 'lucide-react';
import { createPortal } from 'react-dom';

interface GuestLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export const GuestLoginModal: React.FC<GuestLoginModalProps> = ({
  isOpen,
  onClose,
  title = "Authentication Required",
  message = "You need to log in or sign up to perform this action. Join Ensemble to access all features!"
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md scale-100 transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-[#1a1b23] border border-gray-200 dark:border-white/10 animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <LogIn className="h-7 w-7" />
          </div>
          
          <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {title}
          </h3>
          
          <p className="mb-8 text-sm text-gray-500 dark:text-zinc-400">
            {message}
          </p>
          
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              onClick={() => navigate('/login')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-200 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <LogIn className="h-4 w-4" />
              Log In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
