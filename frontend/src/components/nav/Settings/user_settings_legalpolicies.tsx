import React from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

export const UserSettingsLegalPolicies: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Legal & Policies</h2>
        <p className="text-xs text-zinc-400 mt-1">Review legal documentation, terms, and privacy policies.</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => navigate("/landing/TermsOfService")}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left"
        >
          <div>
            <p className="text-sm font-medium text-white">Terms of Service</p>
            <p className="text-xs text-zinc-400">Read our platform rules and agreement conditions.</p>
          </div>
          <ExternalLink className="h-4 w-4 text-zinc-500" />
        </button>

        <button
          onClick={() => navigate("/landing/PrivacyPolicy")}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left"
        >
          <div>
            <p className="text-sm font-medium text-white">Privacy Policy</p>
            <p className="text-xs text-zinc-400">Learn how your data is processed and guarded.</p>
          </div>
          <ExternalLink className="h-4 w-4 text-zinc-500" />
        </button>
      </div>
    </div>
  );
};