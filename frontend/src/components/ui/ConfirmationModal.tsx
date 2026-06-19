import React from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title = "Discard Changes?",
  message,
  confirmText = "Yes, Discard",
  cancelText = "No, Keep Editing",
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    /* Shifted coordinate mapping base offset to match your user menu dashboard alignment precisely */
    <div className="fixed top-0 bottom-0 right-0 left-0 md:left-64 z- flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-red-500/5 blur-[60px]" />
      </div>

      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d0f1a]/90 p-6 text-center shadow-2xl animate-scale-up backdrop-blur-xl z-10">
        <div className="mx-auto mb-4 flex h-14 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
          <AlertTriangle className="h-6 w-6 stroke-" />
        </div>

        <h3 className="text-lg font-bold text-white mb-2 tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-6 max-w-[260px] mx-auto">
          {message}
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className="w-full rounded-xl bg-red-500 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-red-600 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-red-500/10"
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="w-full rounded-xl bg-white/5 border border-white/10 py-3 text-xs font-bold uppercase tracking-wider text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;