import React, { useState, useEffect } from "react";
import { X, Check, Briefcase, Laptop, User } from "lucide-react";
import api from "@/lib/axios.ts";
import { toast } from "react-hot-toast";

interface AccountTagsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoles: string[];
  onSave: (newRoles: string[]) => void;
}

const ROLE_OPTIONS = [
  {
    name: "Client",
    icon: Briefcase,
    description: "You are looking to hire talent and manage projects.",
  },
  {
    name: "Freelancer",
    icon: Laptop,
    description: "You offer your skills and services to clients.",
  },
  {
    name: "Enthusiast",
    icon: User,
    description: "You are here to explore, learn, and connect.",
  },
];

export default function AccountTagsEditModal({
  isOpen,
  onClose,
  currentRoles,
  onSave,
}: AccountTagsEditModalProps) {
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRoles([...currentRoles]);
    }
  }, [isOpen, currentRoles]);

  if (!isOpen) return null;

  const handleRoleToggle = (roleName: string) => {
    setRoles((prev) => {
      if (prev.includes(roleName)) {
        return prev.filter((r) => r !== roleName);
      } else {
        return [...prev, roleName];
      }
    });
  };

  const handleSave = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await api.put("/api/accounts/update-profile-details", {
        original: { roles: currentRoles },
        updates: { roles: roles },
      });

      if (response.data.success) {
        toast.success("Account Tags updated successfully");
        onSave(roles);
        onClose();
      } else {
        toast.error(response.data.message || "Failed to update Account Tags");
      }
    } catch (error: any) {
      console.error("Error updating Account Tags:", error);
      toast.error(error.response?.data?.message || "Failed to update Account Tags");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-['Plus Jakarta Sans',sans-serif]">
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base p-6 shadow-2xl text-gray-900 dark:text-white transition-all duration-300">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold tracking-tight mb-5">Edit Account Tags</h2>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-2">
            Select the tags that best describe your role on the platform.
          </p>
          <div className="flex flex-col gap-3">
            {ROLE_OPTIONS.map((roleOpt) => {
              const isSelected = roles.includes(roleOpt.name);
              const Icon = roleOpt.icon;
              return (
                <button
                  key={roleOpt.name}
                  type="button"
                  onClick={() => handleRoleToggle(roleOpt.name)}
                  disabled={isLoading}
                  className={`flex items-start gap-3 w-full p-3 rounded-xl text-left transition-colors border ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30"
                      : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10"
                  }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg ${isSelected ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-white'}`}>
                      {roleOpt.name}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-zinc-400 leading-snug mt-0.5">
                      {roleOpt.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 border-t border-gray-200 dark:border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-zinc-400 text-xs font-semibold rounded-lg hover:text-gray-900 dark:hover:text-white transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-blue-600 transition shadow-lg shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                Save Changes <Check className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
