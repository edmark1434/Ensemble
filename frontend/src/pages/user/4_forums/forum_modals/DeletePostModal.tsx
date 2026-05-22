// src/pages/user/4_forums/forum_modals/DeletePostModal.tsx
import { Trash2, AlertTriangle } from "lucide-react";

interface DeletePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  postTitle: string;
}

const DeletePostModal: React.FC<DeletePostModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  postTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-modal">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0f1a] p-6 shadow-2xl animate-scale-in">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
            <Trash2 className="h-6 w-6 text-red-400" />
          </div>

          <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Delete Discussion
          </h3>

          <p className="mt-2 text-sm text-zinc-400">
            Are you sure you want to delete "<span className="text-white font-medium">{postTitle}</span>"?
          </p>

          <div className="mt-2 flex items-center gap-2 rounded-lg bg-yellow-500/10 p-3 border border-yellow-500/20">
            <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
            <p className="text-xs text-yellow-400 text-left">
              This action cannot be undone. All replies and attachments will be permanently deleted.
            </p>
          </div>

          <div className="mt-6 flex gap-3 w-full">
            <button
              onClick={onConfirm}
              className="flex-1 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 hover:scale-105"
            >
              Delete
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

      <style>{`
        @keyframes fade-in-modal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-modal {
          animation: fade-in-modal 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default DeletePostModal;