import { useState } from "react";
import { X, Trash2, AlertTriangle, LoaderCircle } from "lucide-react";

interface DeleteTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  onConfirm: () => Promise<void> | void;
}

const DeleteTeamModal: React.FC<DeleteTeamModalProps> = ({
  isOpen,
  onClose,
  teamName,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={() => !isDeleting && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-2xl overflow-hidden animate-scale-in font-['Plus_Jakarta_Sans',sans-serif]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Trash2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Delete Team
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Permanently remove this team
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="cursor-pointer rounded-lg p-1.5 text-gray-400 dark:text-zinc-400 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{teamName}</span>?
          </p>

          <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-3.5 py-3 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
              This action cannot be undone. All team members will lose access, and teams with active contracts cannot be deleted.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="cursor-pointer rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-zinc-300 transition active:scale-[0.98] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isDeleting}
            className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition active:scale-[0.98] shadow-sm disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Yes, Delete Team</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteTeamModal;
