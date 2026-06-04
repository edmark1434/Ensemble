import { useState } from "react";
import { X, Shield, Check, AlertCircle } from "lucide-react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, onAccept }) => {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // Uses a 2px fractional delta buffer to prevent sub-pixel rounding locks on high-DPI screens
    const isBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) <= 2;
    if (isBottom) {
      setScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    setIsAccepted(true);
    if (onAccept) onAccept();
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-300">
      <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-white/10 bg-[#0d0f1a] shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform scale-100">

        {/* Header - Fixed layout position */}
        <div className="flex items-center justify-between border-b border-white/10 p-5 bg-[#0d0f1a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-500/10 p-2 border border-blue-500/20">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Terms of Service
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Pane */}
        <div
          className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800"
          onScroll={handleScroll}
          style={{ scrollBehavior: "smooth" }}
        >
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">1. Acceptance of Terms</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              By accessing and using Ensemble ("the Platform"), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the Platform.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">2. Description of Service</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Ensemble provides a collaborative video editing platform that allows users to create, edit,
              share, and collaborate on video projects. The Platform includes features such as project management,
              team collaboration, asset marketplace, and job posting services.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">3. User Accounts</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              To access certain features, you must create an account. You are responsible for maintaining
              the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
            <ul className="list-disc list-inside text-sm text-zinc-400 space-y-2 pl-2">
              <li>You must be at least 13 years old to use the Platform</li>
              <li>You agree to provide accurate and complete information</li>
              <li>You are responsible for all content you post or share</li>
              <li>You may not share your account credentials with others</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">4. User Content</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              You retain ownership of any content you upload, post, or share on the Platform. By submitting content,
              you grant Ensemble a worldwide, non-exclusive, royalty-free license to host, store, and display your
              content as necessary to provide the service.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">5. Prohibited Conduct</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              You agree not to:
            </p>
            <ul className="list-disc list-inside text-sm text-zinc-400 space-y-2 pl-2">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Upload malicious code or viruses</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Impersonate another person or entity</li>
              <li>Use the Platform for unauthorized commercial purposes</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">6. Payment and Credits</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Certain features may require payment or the use of virtual credits. All payments are processed
              securely through our payment partners. Credits are non-refundable and have no cash value.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">7. Termination</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We reserve the right to suspend or terminate your account at our sole discretion, without notice,
              for conduct that violates these terms or is harmful to other users or the Platform.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">8. Disclaimer of Warranties</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              The Platform is provided "as is" without warranties of any kind. We do not guarantee that the
              Platform will be uninterrupted, error-free, or free of viruses or other harmful components.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">9. Limitation of Liability</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              To the maximum extent permitted by law, Ensemble shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages arising out of your use of the Platform.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">10. Changes to Terms</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We may modify these terms at any time. Continued use of the Platform after changes constitutes
              acceptance of the modified terms.
            </p>
          </div>

          {/* Context Informational Toast Card */}
          <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-4 mt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-300/80 leading-relaxed">
                Last updated: January 1, 2024. These terms are effective immediately for all users.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="border-t border-white/10 p-5 flex items-center justify-end gap-3 bg-[#0d0f1a] shrink-0">
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-zinc-400 transition-all duration-200 hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>

          <button
            onClick={handleAccept}
            disabled={!scrolledToBottom}
            className={`min-w-[180px] rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              scrolledToBottom
                ? "bg-white text-black hover:bg-zinc-200 cursor-pointer shadow-lg active:scale-95"
                : "bg-white/5 text-zinc-600 cursor-not-allowed border border-white/5"
            }`}
          >
            {isAccepted ? (
              <>
                <Check className="h-4 w-4 stroke-[3]" />
                Accepted
              </>
            ) : (
              "I Agree to the Terms"
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default TermsModal;