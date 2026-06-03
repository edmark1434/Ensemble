import React, { useState, useEffect } from "react";
import { LogOut } from "lucide-react";

interface UserLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const UserLogoutModal: React.FC<UserLogoutModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isOpen, countdown]);

  useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isOpen) setCountdown(3);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /* CRITICAL FIX: fixed inset-0 and z- */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[400px] rounded-3xl border border-white/10 bg-[#0d0f1a] p-8 shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500 ring-8 ring-red-500/5">
            <LogOut className="h-10 w-10" />
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Confirm Logout
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed px-4">
            Are you sure you want to log out? You will need to re-authenticate to access your workspace.
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={countdown > 0}
            className={`flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-sm font-bold transition-all duration-300 ${
              countdown > 0
                ? "bg-red-500/10 text-red-500/40 cursor-not-allowed border border-red-500/10"
                : "bg-red-500 text-white hover:bg-red-600 active:scale-[0.97] shadow-xl shadow-red-500/20"
            }`}
          >
            {countdown > 0 ? (
              <span>Unlocking in {countdown}s</span>
            ) : (
              "Sign Out Now"
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full rounded-2xl border border-white/5 bg-white/5 py-4 text-sm font-semibold text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            Stay Logged In
          </button>
        </div>

        {/*/!* Security Footer *!/*/}
        {/*<div className="mt-8 flex items-center justify-center gap-2 opacity-30">*/}
        {/*   <div className="h-px w-8 bg-zinc-500" />*/}
        {/*   <AlertTriangle className="h-3 w-3 text-zinc-500" />*/}
        {/*   <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Secure Session</span>*/}
        {/*   <div className="h-px w-8 bg-zinc-500" />*/}
        {/*</div>*/}
      </div>
    </div>
  );
};

export default UserLogoutModal;