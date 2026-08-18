// src/components/modals/RemoveMemberModal.tsx
import { useState } from "react";
import { X, UserMinus } from "lucide-react";

interface RemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  onConfirm: (reason: string) => void;
}

const RemoveMemberModal: React.FC<RemoveMemberModalProps> = ({
  isOpen,
  onClose,
  memberName,
  onConfirm,
}) => {
  const [reason, setReason] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setIsRemoving(true);
    onConfirm(reason);
    setTimeout(() => {
      setIsRemoving(false);
      onClose();
      setReason("");
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-modal">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-dark-surface p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-red-400" />
            <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Remove Member
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
          Are you sure you want to remove <span className="text-white font-medium">{memberName}</span> from this team?
        </p>
        <p className="text-xs text-zinc-500 mb-4">
          They will lose access to all team resources and conversations.
        </p>

        {/* Reason */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Reason for removal (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide a reason for removing this member..."
            rows={3}
            className="w-full rounded-lg border border-white/15 bg-dark-surface px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={isRemoving}
            className="flex-1 rounded-full bg-gradient-to-r from-red-500 to-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:scale-105 disabled:opacity-50"
          >
            {isRemoving ? "Removing..." : "Yes, Remove Member"}
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

export default RemoveMemberModal;