// src/pages/user/4_forums/forum_modals/LeaveGroupModal.tsx
import { useState } from "react";
import { X, LogOut } from "lucide-react";

interface LeaveGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  onConfirm: () => Promise<void> | void;
}

const LeaveGroupModal: React.FC<LeaveGroupModalProps> = ({
  isOpen,
  onClose,
  groupName,
  onConfirm,
}) => {
  const [isLeaving, setIsLeaving] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLeaving(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-fade-in-modal">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Leave Group
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 dark:text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
          Are you sure you want to leave <span className="text-zinc-900 dark:text-white font-semibold">{groupName}</span>?
        </p>
        <p className="text-xs text-zinc-500 mb-6">
          You will lose access to all group posts and discussions. You can rejoin later if the group is public.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLeaving}
            className="flex-1 rounded-full bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 cursor-pointer"
          >
            {isLeaving ? "Leaving..." : "Yes, Leave Group"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-zinc-200 dark:border-white/15 bg-zinc-100 dark:bg-white/5 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveGroupModal;