import React from "react";
import { X } from "lucide-react";

interface UserNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserNotificationModal: React.FC<UserNotificationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-white/10 bg-[#0d0f1a] shadow-2xl backdrop-blur-xl overflow-hidden animate-fade-in z-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <h3 className="text-sm font-semibold text-white">Notifications</h3>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Notification List */}
      <div className="max-h-[400px] overflow-y-auto p-2 scrollbar-thin">
        {/* Example Notification Item */}
        <div className="flex flex-col gap-1 rounded-lg p-3 transition hover:bg-white/5 cursor-pointer">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-blue-400">Project Update</span>
            <span className="text-[10px] text-zinc-500">2m ago</span>
          </div>
          <p className="text-sm text-zinc-300">Your proposal for "UI Design" was viewed.</p>
        </div>

        {/* Empty State placeholder */}
        <div className="py-10 text-center">
          <p className="text-xs text-zinc-500">No new notifications</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 p-3 text-center">
        <button className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">
          Mark all as read
        </button>
      </div>
    </div>
  );
};

export default UserNotificationModal;