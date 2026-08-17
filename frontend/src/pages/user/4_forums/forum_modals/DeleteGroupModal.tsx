// src/pages/user/4_forums/forum_modals/DeleteGroupModal.tsx
import { useState } from "react";
import { X, Trash2 } from "lucide-react";

interface DeleteGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  onConfirm: () => void;
}

const DeleteGroupModal: React.FC<DeleteGroupModalProps> = ({
  isOpen,
  onClose,
  groupName,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (confirmText !== groupName) return;
    setIsDeleting(true);
    onConfirm();
    setTimeout(() => {
      setIsDeleting(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-modal">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-dark-surface p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-400" />
            <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Delete Group
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
          Are you sure you want to delete <span className="text-white font-medium">{groupName}</span>?
        </p>
        <p className="text-xs text-zinc-500 mb-4">
          This action cannot be undone. All posts, comments, and member data will be permanently lost.
        </p>

        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Type <span className="text-white">{groupName}</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={groupName}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/50"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={isDeleting || confirmText !== groupName}
            className="flex-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-medium text-white transition hover:scale-105 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Yes, Delete Group"}
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

export default DeleteGroupModal;