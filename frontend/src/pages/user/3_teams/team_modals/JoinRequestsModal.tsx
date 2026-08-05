// src/components/modals/JoinRequestsModal.tsx
import { useState } from "react";
import { X, Check, XCircle, UserPlus, Calendar } from "lucide-react";

interface JoinRequest {
  id: number;
  name: string;
  avatar: string;
  requestedAt: string;
  message?: string;
}

interface JoinRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: JoinRequest[];
  onAccept: (requestId: number) => void;
  onReject: (requestId: number) => void;
}

const JoinRequestsModal: React.FC<JoinRequestsModalProps> = ({
  isOpen,
  onClose,
  requests,
  onAccept,
  onReject,
}) => {
  const [processingId, setProcessingId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleAccept = (id: number) => {
    setProcessingId(id);
    onAccept(id);
    setTimeout(() => setProcessingId(null), 500);
  };

  const handleReject = (id: number) => {
    setProcessingId(id);
    onReject(id);
    setTimeout(() => setProcessingId(null), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-modal">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0f1a] p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-400" />
            <h3
              className="text-xl font-semibold text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Join Requests
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-4">
          Users requesting to join your team
        </p>

        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <UserPlus className="mb-3 h-12 w-12 text-zinc-500" />
            <h3 className="text-lg font-semibold text-white">
              No pending requests
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              When someone requests to join, they'll appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 transition-all duration-300 hover:border-white/20"
              >
                <img
                  src={request.avatar}
                  alt={request.name}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-white/20"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {request.name}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3 text-zinc-500" />
                    <p className="text-xs text-zinc-500">
                      Requested {request.requestedAt}
                    </p>
                  </div>
                  {request.message && (
                    <p className="text-xs text-zinc-400 mt-1 italic">
                      "{request.message}"
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(request.id)}
                    disabled={processingId === request.id}
                    className="rounded-lg bg-green-500/20 p-2 text-green-400 transition hover:bg-green-500/30 hover:scale-105 disabled:opacity-50"
                    title="Accept"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id}
                    className="rounded-lg bg-red-500/20 p-2 text-red-400 transition hover:bg-red-500/30 hover:scale-105 disabled:opacity-50"
                    title="Reject"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/5 px-6 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinRequestsModal;
