import React from "react";
import { LogOut } from "lucide-react";

interface UserLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const UserLogoutModal: React.FC<UserLogoutModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/80 backdrop-blur-md transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[400px] rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] p-8 shadow-2xl dark:shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500 ring-8 ring-red-500/5">
            <LogOut className="h-10 w-10" />
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
      </div>
    </div>
  );
};

export default UserLogoutModal;
