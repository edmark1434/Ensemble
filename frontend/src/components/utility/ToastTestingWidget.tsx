import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, XCircle, Loader2, Info, GripHorizontal, Bell, User, Star } from "lucide-react";
import { showSuccessToast, showErrorToast, showLoadingToast, dismissToast, toastConfig } from "./toast";
import toast from "react-hot-toast";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";

export const ToastTestingWidget: React.FC = () => {
  const { user, setUser } = useGlobalState();
  const [isOpen, setIsOpen] = useState(false);
  const [toastText, setToastText] = useState("This is a test notification!");
  const [profileStatus, setProfileStatus] = useState("Pending");
  const [activeTab, setActiveTab] = useState<'toast' | 'profile' | 'membership'>('toast');

  useEffect(() => {
    const checkStatus = () => {
      const isDone = localStorage.getItem(`profileSetupCompleted_${user?.account_id}`) === 'true';
      setProfileStatus(isDone ? "Done" : "Pending");
    };
    checkStatus();
    
    window.addEventListener('profileSetupStatusUpdate', checkStatus);
    window.addEventListener('profileSetupReset', () => setTimeout(checkStatus, 100));
    
    return () => {
      window.removeEventListener('profileSetupStatusUpdate', checkStatus);
      window.removeEventListener('profileSetupReset', checkStatus);
    };
  }, [user?.account_id, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] pointer-events-none">
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-6 right-6 w-[320px] bg-white dark:bg-dark-surface/95 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
          >
            {/* Draggable Header */}
            <div className="flex items-center justify-between p-2.5 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] cursor-move select-none">
              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <GripHorizontal className="w-3.5 h-3.5 text-gray-400" />
                <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-900 dark:text-white">Dev Mode</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-white rounded hover:bg-gray-200 dark:hover:bg-white/10 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-2 pt-2 gap-1 border-b border-gray-200 dark:border-white/10">
              <button
                onClick={() => setActiveTab('toast')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-t-lg transition ${activeTab === 'toast' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
              >
                <Bell className="w-3 h-3" /> Toasts
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-t-lg transition ${activeTab === 'profile' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
              >
                <User className="w-3 h-3" /> Profile
              </button>
              <button
                onClick={() => setActiveTab('membership')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-t-lg transition ${activeTab === 'membership' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
              >
                <Star className="w-3 h-3" /> Subs
              </button>
            </div>

            {/* Body */}
            <div className="p-3 h-[120px]">
              {activeTab === 'toast' && (
                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      value={toastText}
                      onChange={(e) => setToastText(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded px-2.5 py-1.5 text-[11px] text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50 transition"
                      placeholder="Enter test message..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => showSuccessToast(toastText)} className="flex items-center gap-1.5 px-2 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded text-[10px] font-bold transition">
                      <CheckCircle className="w-3 h-3" /> Success
                    </button>
                    <button onClick={() => showErrorToast(toastText)} className="flex items-center gap-1.5 px-2 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 rounded text-[10px] font-bold transition">
                      <XCircle className="w-3 h-3" /> Error
                    </button>
                    <button onClick={() => { const id = showLoadingToast(toastText); setTimeout(() => dismissToast(id), 3000); }} className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded text-[10px] font-bold transition">
                      <Loader2 className="w-3 h-3" /> Load (3s)
                    </button>
                    <button onClick={() => toast(toastText, toastConfig.custom)} className="flex items-center gap-1.5 px-2 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded text-[10px] font-bold transition">
                      <Info className="w-3 h-3" /> Custom
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-2">
                  <button onClick={() => window.dispatchEvent(new Event('profileSetupShowCongrats'))} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 rounded text-[10px] font-bold transition">
                    <CheckCircle className="w-3 h-3" /> Show Congrats Modal
                  </button>
                  <button onClick={() => { window.dispatchEvent(new Event('profileSetupReset')); showSuccessToast("Resetting..."); }} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 rounded text-[10px] font-bold transition">
                    <CheckCircle className="w-3 h-3" /> Reset Setup [{profileStatus}]
                  </button>
                </div>
              )}

              {activeTab === 'membership' && (
                <div className="flex gap-1.5">
                  {['Free', 'Premium', 'Business'].map(tier => {
                    const isSelected = user?.subscription_type === tier || (!user?.subscription_type && tier === 'Free');
                    return (
                      <button
                        key={tier}
                        onClick={async () => {
                          try {
                            await api.post('/api/subscription/force-update', { tier });
                            setUser({ ...user, subscription_type: tier });
                            showSuccessToast(`${tier} Mode`);
                          } catch (err: any) {
                            const errMsg = err.response?.data?.message || err.response?.status || err.message || "Unknown error";
                            toast.error(`Failed: ${errMsg}`);
                          }
                        }}
                        className={`flex-1 py-1.5 rounded text-[10px] font-bold transition ${
                          isSelected ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                      >
                        {tier}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-3 py-1.5 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-white/10 text-center">
              <p className="text-[9px] font-medium text-gray-400">
                Alt + O to toggle
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
