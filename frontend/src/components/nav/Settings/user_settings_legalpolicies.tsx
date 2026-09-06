import React from "react";
import { ExternalLink } from "lucide-react";

export const UserSettingsLegalPolicies: React.FC = () => {

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Legal & Policies</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Review legal documentation, terms, and privacy policies.</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => window.open("/landing/TermsOfService", "_blank")}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-all text-left"
        >
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Terms of Service</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Read our platform rules and agreement conditions.</p>
          </div>
          <ExternalLink className="h-4 w-4 text-zinc-500" />
        </button>

        <button
          onClick={() => window.open("/landing/PrivacyPolicy", "_blank")}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-all text-left"
        >
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Privacy Policy</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Learn how your data is processed and guarded.</p>
          </div>
          <ExternalLink className="h-4 w-4 text-zinc-500" />
        </button>
      </div>
    </div>
  );
};