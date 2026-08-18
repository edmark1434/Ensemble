// src/components/modals/LeaveTeamModal.tsx
import { useState } from "react";
import { X, LogOut } from "lucide-react";

interface LeaveTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  onConfirm: () => void;
}

const LeaveTeamModal: React.FC<LeaveTeamModalProps> = ({
  isOpen,
  onClose,
  teamName,
  onConfirm,
}) => {
  const [isLeaving, setIsLeaving] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setIsLeaving(true);
    onConfirm();
    setTimeout(() => {
      setIsLeaving(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-dark-surface p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-red-400" />
            <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Leave Team
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-2">
          Are you sure you want to leave <span className="text-white font-medium">{teamName}</span>?
        </p>
        <p className="text-xs text-zinc-500 mb-6">
          You will lose access to all team resources, projects, and conversations. You can rejoin later if invited.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={isLeaving}
            className="flex-1 rounded-full bg-gradient-to-r from-red-500 to-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:scale-105 disabled:opacity-50"
          >
            {isLeaving ? "Leaving..." : "Yes, Leave Team"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveTeamModal;